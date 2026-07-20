import { beforeEach, describe, expect, it, vi } from "vitest";

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

vi.mock("@/lib/auth", () => ({
  verifyRoleOrRedirect: vi
    .fn()
    .mockResolvedValue({ user: { id: "user-1" } }),
}));

vi.mock("@/lib/db", () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

// ── Imports (after mocks) ─────────────────────────────────────────────────────

import { revalidatePath } from "next/cache";
import { verifyRoleOrRedirect } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  archiveSession,
  createSession,
  listSessions,
  listSessionsEnsuringDefault,
  renameSession,
} from "./sessions";

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Creates a Drizzle-like chainable that resolves to `value` when awaited.
 * Every intermediate query-builder method (from, where, orderBy, etc.) returns
 * the same chain object. Terminal methods (returning, onConflictDoNothing) return
 * real Promises. The chain itself is thenable so `await chain.where(...)` works.
 */
function makeChain<T>(value: T) {
  const chain: Record<string, unknown> = {};

  const selfFn = () => {
    const fn = vi.fn();
    fn.mockReturnValue(chain);
    return fn;
  };

  chain.from = selfFn();
  chain.where = selfFn();
  chain.orderBy = selfFn();
  chain.innerJoin = selfFn();
  chain.leftJoin = selfFn();
  chain.groupBy = selfFn();
  chain.limit = selfFn();
  chain.offset = selfFn();
  chain.values = selfFn();
  chain.set = selfFn();
  chain.onConflictDoUpdate = selfFn();
  chain.returning = vi.fn().mockResolvedValue(value);
  chain.onConflictDoNothing = vi.fn().mockResolvedValue([]);
  // Make the chain itself awaitable for patterns like `await db.select().from().where()`
  (chain as { then: Function }).then = (resolve: Function, reject: Function) =>
    Promise.resolve(value).then(resolve as never, reject as never);
  (chain as { catch: Function }).catch = (fn: Function) =>
    Promise.resolve(value).catch(fn as never);

  return chain;
}

/**
 * Produces a Postgres unique-violation error (code 23505) wrapped the same way
 * Drizzle wraps driver errors — the code lives on `cause`, not on the outer error.
 */
function uniqueViolation() {
  const cause = Object.assign(new Error("unique_violation"), { code: "23505" });
  return Object.assign(new Error("query failed"), { cause });
}

const SESSION_1 = { id: "session-1", title: "Session 1" };
const SESSION_2 = { id: "session-2", title: "Session 2" };

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("listSessions", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns sessions owned by the current user", async () => {
    vi.mocked(db.select).mockReturnValue(makeChain([SESSION_1, SESSION_2]));

    const result = await listSessions();

    expect(result).toEqual([SESSION_1, SESSION_2]);
  });

  it("returns an empty array when the user has no sessions", async () => {
    vi.mocked(db.select).mockReturnValue(makeChain([]));

    expect(await listSessions()).toEqual([]);
  });

  it("verifies instructor or admin role", async () => {
    vi.mocked(db.select).mockReturnValue(makeChain([]));

    await listSessions();

    expect(verifyRoleOrRedirect).toHaveBeenCalledWith(["instructor", "admin"]);
  });

  it("propagates a redirect thrown by the auth check", async () => {
    vi.mocked(verifyRoleOrRedirect).mockRejectedValueOnce(
      new Error("NEXT_REDIRECT"),
    );

    await expect(listSessions()).rejects.toThrow("NEXT_REDIRECT");
  });
});

describe("listSessionsEnsuringDefault", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns existing sessions without inserting when at least one exists", async () => {
    vi.mocked(db.select).mockReturnValue(makeChain([SESSION_1]));

    const result = await listSessionsEnsuringDefault();

    expect(result).toEqual([SESSION_1]);
    expect(db.insert).not.toHaveBeenCalled();
  });

  it("inserts a default session and returns it when the user has none", async () => {
    const insertChain = makeChain(undefined);
    vi.mocked(db.select)
      .mockReturnValueOnce(makeChain([]))         // first check: no sessions
      .mockReturnValueOnce(makeChain([SESSION_1])); // after insert: default created
    vi.mocked(db.insert).mockReturnValue(insertChain);

    const result = await listSessionsEnsuringDefault();

    expect(db.insert).toHaveBeenCalledTimes(1);
    expect(insertChain.onConflictDoNothing).toHaveBeenCalled();
    expect(result).toEqual([SESSION_1]);
  });

  it("still returns sessions when a concurrent insert races for the same title", async () => {
    // onConflictDoNothing means the insert silently loses the race; the second
    // select then picks up the winner's row.
    const insertChain = makeChain(undefined);
    vi.mocked(db.select)
      .mockReturnValueOnce(makeChain([]))
      .mockReturnValueOnce(makeChain([SESSION_1]));
    vi.mocked(db.insert).mockReturnValue(insertChain);

    const result = await listSessionsEnsuringDefault();

    expect(result).toEqual([SESSION_1]);
  });
});

describe("createSession", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates Session 1 when the user has no sessions", async () => {
    vi.mocked(db.select).mockReturnValue(makeChain([]));
    vi.mocked(db.insert).mockReturnValue(makeChain([SESSION_1]));

    const result = await createSession();

    expect(result).toEqual({ ok: true, data: SESSION_1 });
    expect(revalidatePath).toHaveBeenCalledWith("/dashboard", "layout");
  });

  it("creates Session 2 when Session 1 already exists", async () => {
    const created = { id: "s2", title: "Session 2" };
    vi.mocked(db.select).mockReturnValue(makeChain([SESSION_1]));
    vi.mocked(db.insert).mockReturnValue(makeChain([created]));

    const result = await createSession();

    expect(result).toEqual({ ok: true, data: created });
  });

  it("uses the highest existing Session N number, skipping gaps", async () => {
    // User has Session 1 and Session 3 — next should be Session 4, not Session 2.
    const session3 = { id: "s3", title: "Session 3" };
    const created4 = { id: "s4", title: "Session 4" };
    vi.mocked(db.select).mockReturnValue(makeChain([SESSION_1, session3]));
    vi.mocked(db.insert).mockReturnValue(makeChain([created4]));

    const result = await createSession();

    expect(result).toEqual({ ok: true, data: created4 });
  });

  it("retries up to 3 times on unique violation, then returns an error", async () => {
    vi.mocked(db.select).mockReturnValue(makeChain([]));
    const failChain = makeChain(undefined);
    (failChain.returning as ReturnType<typeof vi.fn>).mockRejectedValue(
      uniqueViolation(),
    );
    vi.mocked(db.insert).mockReturnValue(failChain);

    const result = await createSession();

    expect(result).toEqual({
      ok: false,
      error: "Could not create a session. Please try again.",
    });
    expect(db.insert).toHaveBeenCalledTimes(3);
  });

  it("re-throws non-unique-violation errors immediately without retrying", async () => {
    vi.mocked(db.select).mockReturnValue(makeChain([]));
    const failChain = makeChain(undefined);
    (failChain.returning as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("connection lost"),
    );
    vi.mocked(db.insert).mockReturnValue(failChain);

    await expect(createSession()).rejects.toThrow("connection lost");
    expect(db.insert).toHaveBeenCalledTimes(1);
  });
});

describe("renameSession", () => {
  beforeEach(() => vi.clearAllMocks());

  it("updates the session title and revalidates", async () => {
    const updateChain = makeChain([{ id: SESSION_1.id }]);
    vi.mocked(db.update).mockReturnValue(updateChain);

    const result = await renameSession(SESSION_1.id, "New Name");

    expect(result).toEqual({ ok: true, data: undefined });
    expect(revalidatePath).toHaveBeenCalledWith("/dashboard", "layout");
  });

  it("trims leading and trailing whitespace before saving", async () => {
    const updateChain = makeChain([{ id: SESSION_1.id }]);
    vi.mocked(db.update).mockReturnValue(updateChain);

    await renameSession(SESSION_1.id, "  Trimmed  ");

    expect(updateChain.set).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Trimmed" }),
    );
  });

  it("returns an error immediately when the trimmed title is blank", async () => {
    const result = await renameSession(SESSION_1.id, "   ");

    expect(result).toEqual({ ok: false, error: "Session name cannot be empty." });
    expect(db.update).not.toHaveBeenCalled();
  });

  it("returns an error when the session is not found or belongs to another user", async () => {
    vi.mocked(db.update).mockReturnValue(makeChain([])); // returning() yields empty = not found

    const result = await renameSession("other-users-session", "New Name");

    expect(result).toEqual({ ok: false, error: "Session not found." });
  });

  it("returns a friendly message when the new title duplicates an existing one", async () => {
    const updateChain = makeChain(undefined);
    (updateChain.returning as ReturnType<typeof vi.fn>).mockRejectedValue(
      uniqueViolation(),
    );
    vi.mocked(db.update).mockReturnValue(updateChain);

    const result = await renameSession(SESSION_1.id, "Session 2");

    expect(result).toEqual({
      ok: false,
      error: `You already have a session named "Session 2".`,
    });
  });

  it("re-throws unexpected DB errors", async () => {
    const updateChain = makeChain(undefined);
    (updateChain.returning as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("db unreachable"),
    );
    vi.mocked(db.update).mockReturnValue(updateChain);

    await expect(renameSession(SESSION_1.id, "Fine")).rejects.toThrow(
      "db unreachable",
    );
  });
});

describe("archiveSession", () => {
  beforeEach(() => vi.clearAllMocks());

  it("archives a session when more than one active session exists", async () => {
    vi.mocked(db.select).mockReturnValue(makeChain([SESSION_1, SESSION_2]));
    vi.mocked(db.update).mockReturnValue(makeChain([{ id: SESSION_2.id }]));

    const result = await archiveSession(SESSION_2.id);

    expect(result).toEqual({ ok: true, data: undefined });
    expect(revalidatePath).toHaveBeenCalledWith("/dashboard", "layout");
  });

  it("blocks archiving when it would leave the user with no sessions", async () => {
    vi.mocked(db.select).mockReturnValue(makeChain([SESSION_1])); // only one

    const result = await archiveSession(SESSION_1.id);

    expect(result).toEqual({
      ok: false,
      error: "You must keep at least one session.",
    });
    expect(db.update).not.toHaveBeenCalled();
  });

  it("returns an error when the session is not found or belongs to another user", async () => {
    vi.mocked(db.select).mockReturnValue(makeChain([SESSION_1, SESSION_2]));
    vi.mocked(db.update).mockReturnValue(makeChain([])); // no rows updated

    const result = await archiveSession("wrong-id");

    expect(result).toEqual({ ok: false, error: "Session not found." });
  });

  it("does not revalidate when archiving fails", async () => {
    vi.mocked(db.select).mockReturnValue(makeChain([SESSION_1]));

    await archiveSession(SESSION_1.id);

    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
