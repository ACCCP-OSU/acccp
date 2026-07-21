import { betterAuth } from "better-auth";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { emailOTP } from "better-auth/plugins";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "./db";
import { users, authSessions, accounts, verifications } from "./db/schema";
import { sendOtpEmail } from "./email";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

// Ohio State issues every account an @osu.edu address (or a subdomain, e.g.
// buckeyemail.osu.edu); gating on this is what keeps sign-in scoped to OSU
// without needing Microsoft Entra tenant access we don't have for this project.
const OSU_EMAIL_REGEX = /@([a-z0-9-]+\.)*osu\.edu$/i;

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      users,
      authSessions,
      account: accounts,
      verification: verifications,
    },
  }),
  // Existing tables use Postgres-generated uuid defaults; let the DB assign ids
  // instead of better-auth's own id generator.
  advanced: {
    database: {
      generateId: false,
    },
  },
  emailAndPassword: {
    enabled: false,
  },
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (
        ctx.path === "/sign-in/email-otp" ||
        ctx.path === "/email-otp/send-verification-otp"
      ) {
        const email = ctx.body?.email as string | undefined;
        if (!email || !OSU_EMAIL_REGEX.test(email)) {
          throw new APIError("FORBIDDEN", {
            message: "Sign-in is restricted to @osu.edu email addresses.",
          });
        }
      }
    }),
  },
  plugins: [
    emailOTP({
      sendVerificationOTP: async ({ email, otp }) => {
        await sendOtpEmail(email, otp);
      },
    }),
  ],
  user: {
    modelName: "users",
    fields: {
      name: "displayName",
    },
    additionalFields: {
      role: {
        type: "string",
        input: false,
        defaultValue: "pending",
      },
    },
  },
  session: {
    modelName: "authSessions",
  },
});

export type Role = "pending" | "instructor" | "admin";

type Session = NonNullable<Awaited<ReturnType<typeof auth.api.getSession>>>;

/**
 * Verifies role on the current user session.
 * Redirects to "/unauthorized" on 401.
 * Redirects to "/" if no session.
 * @param permitted - Roles with permission.
 * @returns The verified session, so callers can read session.user.id.
 */
export async function verifyRoleOrRedirect(
  permitted: Role[]
): Promise<Session> {
  const session = await auth.api.getSession({ headers: await headers() });

  // Not logged in
  if (!session) {
    redirect("/");
  }

  // Doesn't have the proper role
  if (!permitted.includes(session.user.role as Role)) {
    redirect("/unauthorized");
  }

  return session;
}

/**
 * Verifies role on the current user session for use in API route handlers.
 * Returns the session on success, or a 401 NextResponse to return immediately
 * if the caller is unauthenticated or lacks a permitted role.
 * @param permitted - Roles with permission.
 */
export async function verifyRoleOrUnauthorized(
  permitted: Role[]
): Promise<{ session: Session } | { response: NextResponse }> {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session || !permitted.includes(session.user.role as Role)) {
    return {
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  return { session };
}
