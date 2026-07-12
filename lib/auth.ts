import { betterAuth } from "better-auth";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { emailOTP } from "better-auth/plugins";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "./db";
import { users, authSessions, accounts, verifications } from "./db/schema";
import { sendOtpEmail } from "./email";

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
