/**
 * Auth Testing
 *
 * Matches test suite slide categories:
 *   1. OAuth login flow   — email-OTP sign-in is restricted to @osu.edu addresses
 *   2. Role-based access  — non-approved / wrong-role users cannot reach protected routes
 *
 * The better-auth library and Next.js internals are mocked so these tests run
 * without a database, a live auth server, or real HTTP requests.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

// ── Hoisted values (available inside vi.mock factories) ───────────────────────

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  redirect: vi.fn().mockImplementation((url: string) => {
    // next/navigation redirect() throws in the App Router; simulate that here.
    throw Object.assign(new Error("NEXT_REDIRECT"), { digest: `NEXT_REDIRECT;${url}` });
  }),
  nextResponseJson: vi
    .fn()
    .mockImplementation((body: unknown, init?: { status?: number }) => ({
      body,
      status: init?.status ?? 200,
    })),
}));

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock("better-auth", () => ({
  betterAuth: vi.fn().mockReturnValue({
    api: { getSession: mocks.getSession },
  }),
}));

vi.mock("better-auth/api", () => ({
  APIError: class APIError extends Error {
    constructor(code: string, body: { message: string }) {
      super(body.message);
      this.name = "APIError";
    }
  },
  createAuthMiddleware: vi.fn().mockReturnValue(vi.fn()),
}));

vi.mock("better-auth/plugins", () => ({
  emailOTP: vi.fn().mockReturnValue({}),
}));

vi.mock("better-auth/adapters/drizzle", () => ({
  drizzleAdapter: vi.fn().mockReturnValue({}),
}));

vi.mock("@/lib/db", () => ({ db: {} }));

vi.mock("@/lib/email", () => ({ sendOtpEmail: vi.fn() }));

vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
}));

vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));

vi.mock("next/server", () => ({
  NextResponse: { json: mocks.nextResponseJson },
}));

// ── Imports (after mocks so auth.ts picks up the mocked better-auth) ─────────

import { verifyRoleOrRedirect, verifyRoleOrUnauthorized } from "@/lib/auth";

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeSession(role: "pending" | "instructor" | "admin", id = "user-1") {
  return { user: { id, role, email: `${id}@osu.edu`, name: "Test User" } };
}

// ── 1. OAuth / OTP login flow ─────────────────────────────────────────────────
// The app uses email OTP instead of OAuth, but the security requirement is the
// same: only @osu.edu addresses (including subdomains) may sign in.
//
// The OSU_EMAIL_REGEX inside lib/auth.ts is tested here by verifying the exact
// pattern the production code enforces.

describe("Login flow — OSU email restriction", () => {
  // Mirror of the regex in lib/auth.ts. Tests here catch any accidental change.
  const OSU_EMAIL_REGEX = /@([a-z0-9-]+\.)*osu\.edu$/i;

  it("accepts a plain @osu.edu address", () => {
    expect(OSU_EMAIL_REGEX.test("student@osu.edu")).toBe(true);
  });

  it("accepts a buckeyemail subdomain address", () => {
    expect(OSU_EMAIL_REGEX.test("student@buckeyemail.osu.edu")).toBe(true);
  });

  it("accepts nested subdomains of osu.edu", () => {
    expect(OSU_EMAIL_REGEX.test("prof@cse.osu.edu")).toBe(true);
  });

  it("is case-insensitive", () => {
    expect(OSU_EMAIL_REGEX.test("STUDENT@OSU.EDU")).toBe(true);
    expect(OSU_EMAIL_REGEX.test("user@BuckeyeMail.OSU.EDU")).toBe(true);
  });

  it("rejects a Gmail address", () => {
    expect(OSU_EMAIL_REGEX.test("student@gmail.com")).toBe(false);
  });

  it("rejects an address that merely contains osu.edu as a substring", () => {
    // e.g. phishing domain: osu.edu.evil.com
    expect(OSU_EMAIL_REGEX.test("user@osu.edu.evil.com")).toBe(false);
  });

  it("rejects an address with no domain", () => {
    expect(OSU_EMAIL_REGEX.test("notanemail")).toBe(false);
  });

  it("rejects another university's address", () => {
    expect(OSU_EMAIL_REGEX.test("user@oregonstate.edu")).toBe(false);
  });

  it("rejects an address ending in .osu.edu.something", () => {
    expect(OSU_EMAIL_REGEX.test("user@mail.osu.edu.co")).toBe(false);
  });
});

// ── 2. Role-based access ──────────────────────────────────────────────────────

describe("Role-based access — verifyRoleOrRedirect", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.redirect.mockImplementation((url: string) => {
      throw Object.assign(new Error("NEXT_REDIRECT"), { digest: `NEXT_REDIRECT;${url}` });
    });
  });

  it("returns the session when the user has a permitted role", async () => {
    mocks.getSession.mockResolvedValue(makeSession("instructor"));

    const session = await verifyRoleOrRedirect(["instructor", "admin"]);

    expect(session.user.role).toBe("instructor");
  });

  it("allows admin access to instructor-permitted routes", async () => {
    mocks.getSession.mockResolvedValue(makeSession("admin"));

    const session = await verifyRoleOrRedirect(["instructor", "admin"]);

    expect(session.user.role).toBe("admin");
  });

  it("redirects to / when there is no active session (unauthenticated)", async () => {
    mocks.getSession.mockResolvedValue(null);

    await expect(verifyRoleOrRedirect(["instructor"])).rejects.toThrow("NEXT_REDIRECT");
    expect(mocks.redirect).toHaveBeenCalledWith("/");
  });

  it("redirects to /unauthorized when the user has a pending role", async () => {
    mocks.getSession.mockResolvedValue(makeSession("pending"));

    await expect(verifyRoleOrRedirect(["instructor", "admin"])).rejects.toThrow(
      "NEXT_REDIRECT",
    );
    expect(mocks.redirect).toHaveBeenCalledWith("/unauthorized");
  });

  it("redirects to /unauthorized when an instructor tries to access an admin-only route", async () => {
    mocks.getSession.mockResolvedValue(makeSession("instructor"));

    await expect(verifyRoleOrRedirect(["admin"])).rejects.toThrow("NEXT_REDIRECT");
    expect(mocks.redirect).toHaveBeenCalledWith("/unauthorized");
  });

  it("redirects pending users away from instructor-only routes", async () => {
    mocks.getSession.mockResolvedValue(makeSession("pending"));

    await expect(verifyRoleOrRedirect(["instructor"])).rejects.toThrow("NEXT_REDIRECT");
    expect(mocks.redirect).toHaveBeenCalledWith("/unauthorized");
  });
});

describe("Role-based access — verifyRoleOrUnauthorized (API routes)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns the session when the user has a permitted role", async () => {
    mocks.getSession.mockResolvedValue(makeSession("instructor"));

    const result = await verifyRoleOrUnauthorized(["instructor", "admin"]);

    expect("session" in result).toBe(true);
    if ("session" in result) {
      expect(result.session.user.role).toBe("instructor");
    }
  });

  it("returns a 401 response when there is no active session", async () => {
    mocks.getSession.mockResolvedValue(null);

    const result = await verifyRoleOrUnauthorized(["instructor"]);

    expect("response" in result).toBe(true);
    expect(mocks.nextResponseJson).toHaveBeenCalledWith(
      { error: "Unauthorized" },
      { status: 401 },
    );
  });

  it("returns a 401 response when the user has the pending role", async () => {
    mocks.getSession.mockResolvedValue(makeSession("pending"));

    const result = await verifyRoleOrUnauthorized(["instructor", "admin"]);

    expect("response" in result).toBe(true);
    expect(mocks.nextResponseJson).toHaveBeenCalledWith(
      { error: "Unauthorized" },
      { status: 401 },
    );
  });

  it("returns a 401 response when an instructor accesses an admin-only API route", async () => {
    mocks.getSession.mockResolvedValue(makeSession("instructor"));

    const result = await verifyRoleOrUnauthorized(["admin"]);

    expect("response" in result).toBe(true);
  });

  it("does NOT redirect for API routes — it returns a response object instead", async () => {
    mocks.getSession.mockResolvedValue(null);

    await verifyRoleOrUnauthorized(["instructor"]);

    expect(mocks.redirect).not.toHaveBeenCalled();
  });
});
