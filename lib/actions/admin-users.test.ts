import { beforeEach, describe, expect, it, vi } from "vitest";

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

vi.mock("@/lib/auth", () => ({
  verifyRoleOrRedirect: vi
    .fn()
    .mockResolvedValue({ user: { id: "admin-1", role: "admin" } }),
}));

vi.mock("@/lib/db", () => ({
  db: {
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

// ── Imports (after mocks) ─────────────────────────────────────────────────────

import { revalidatePath } from "next/cache";
import { verifyRoleOrRedirect } from "@/lib/auth";
import { db } from "@/lib/db";
import { approveUser, rejectUser } from "./admin-users";

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeChain<T>(value: T) {
  const chain: Record<string, unknown> = {};

  const selfFn = () => {
    const fn = vi.fn();
    fn.mockReturnValue(chain);
    return fn;
  };

  chain.set = selfFn();
  chain.where = selfFn();
  (chain as { then: Function }).then = (resolve: Function, reject: Function) =>
    Promise.resolve(value).then(resolve as never, reject as never);
  (chain as { catch: Function }).catch = (fn: Function) =>
    Promise.resolve(value).catch(fn as never);

  return chain;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("approveUser", () => {
  beforeEach(() => vi.clearAllMocks());

  it("updates the user role to instructor", async () => {
    const updateChain = makeChain(undefined);
    vi.mocked(db.update).mockReturnValue(updateChain);

    await approveUser("user-42");

    expect(updateChain.set).toHaveBeenCalledWith({ role: "instructor" });
  });

  it("scopes the update to the target user id", async () => {
    const updateChain = makeChain(undefined);
    vi.mocked(db.update).mockReturnValue(updateChain);

    await approveUser("user-42");

    // where() must have been called (exact args involve drizzle internals, but
    // confirming the call ensures we're not running an un-scoped UPDATE).
    expect(updateChain.where).toHaveBeenCalled();
  });

  it("revalidates the admin path so the pending-users table refreshes", async () => {
    vi.mocked(db.update).mockReturnValue(makeChain(undefined));

    await approveUser("user-42");

    expect(revalidatePath).toHaveBeenCalledWith("/admin");
  });

  it("requires the caller to have the admin role", async () => {
    vi.mocked(db.update).mockReturnValue(makeChain(undefined));

    await approveUser("user-42");

    expect(verifyRoleOrRedirect).toHaveBeenCalledWith(["admin"]);
  });

  it("rejects before touching the DB when the caller lacks admin role", async () => {
    vi.mocked(verifyRoleOrRedirect).mockRejectedValueOnce(
      new Error("NEXT_REDIRECT"),
    );

    await expect(approveUser("user-42")).rejects.toThrow("NEXT_REDIRECT");
    expect(db.update).not.toHaveBeenCalled();
  });
});

describe("rejectUser", () => {
  beforeEach(() => vi.clearAllMocks());

  it("deletes the user row from the database", async () => {
    const deleteChain = makeChain(undefined);
    vi.mocked(db.delete).mockReturnValue(deleteChain);

    await rejectUser("user-42");

    expect(db.delete).toHaveBeenCalled();
    expect(deleteChain.where).toHaveBeenCalled();
  });

  it("revalidates the admin path so the pending-users table refreshes", async () => {
    vi.mocked(db.delete).mockReturnValue(makeChain(undefined));

    await rejectUser("user-42");

    expect(revalidatePath).toHaveBeenCalledWith("/admin");
  });

  it("requires the caller to have the admin role", async () => {
    vi.mocked(db.delete).mockReturnValue(makeChain(undefined));

    await rejectUser("user-42");

    expect(verifyRoleOrRedirect).toHaveBeenCalledWith(["admin"]);
  });

  it("rejects before touching the DB when the caller lacks admin role", async () => {
    vi.mocked(verifyRoleOrRedirect).mockRejectedValueOnce(
      new Error("NEXT_REDIRECT"),
    );

    await expect(rejectUser("user-42")).rejects.toThrow("NEXT_REDIRECT");
    expect(db.delete).not.toHaveBeenCalled();
  });
});
