# Accessible Canvas Content Conversion Platform

## Overview

The Accessible Canvas Content Conversion Platform (dubbed "ACCCP" by the development team)
is a centralized platform for OSU instructors to convert their DOCX course content into accessible
Canvas-ready HTML by leveraging state-of-the-art LLM AI models.

This project was developed as part of a summer 2026 CSE 5911 capstone session
at the Ohio State University by group members Adithya Balachandar, Braedon Salisbury,
Rudy Hartwig, and Theo Turner. It has been released as an MVP with the goal of improving
course content accessibility while also helping to meet a university-wide effort to be
compliant with ADA Title II and section 504 of the Rehabilitation Act by 2027.

## Contents

- [How the App Works](#how-the-app-works)
- [Repository Layout](#repository-layout)
- [Technology Stack](#technology-stack)
- [Setting up a Development Environment](#setting-up-a-development-environment)
- [Development Workflow](#development-workflow)

For deeper architecture notes (database schema, auth internals, the conversion
pipeline's persistence model, environment variable reference), see
[AGENTS.md](AGENTS.md) — it's written for AI coding agents but doubles as the
project's technical reference for humans.

## How the App Works

### Signing in and roles

- Users sign in at `/` with their **OSU email address** (`@osu.edu`, including
  subdomains like `buckeyemail.osu.edu` — non-OSU addresses are rejected). There
  are no passwords: a one-time password (OTP) is emailed to them, which they
  enter to complete sign-in. In local development the OTP is printed to the dev
  server terminal instead of emailed (see `EMAIL_PROVIDER` below).
- Every user has a role: `pending`, `instructor`, or `admin`. New sign-ups start
  as `pending` and are held at `/pending-approval` until an admin approves them
  from the admin dashboard. Rejecting a pending user deletes their account.

### Converting documents (instructor workflow)

1. After approval, instructors land on `/dashboard`. Work is organized into
   **sessions** (think folders/course contexts), listed in the sidebar. Sessions
   can be created, renamed, and archived; a default session is created
   automatically on first visit.
2. Inside a session, upload one or more `.docx` files via the file-upload area.
3. Click **Convert**. Each unlocked document is sent through a two-stage AI
   pipeline:
   - **Stage 1 — conversion**: the document's HTML is extracted (via mammoth)
     and an LLM rewrites it into semantic, WCAG-conscious, Canvas-ready HTML.
     Images become `{{PLACEHOLDER:imageN.ext}}` markers for the instructor to
     re-add in Canvas.
   - **Stage 2 — audit**: a second, independent LLM call reviews the generated
     HTML and returns a structured list of accessibility findings (missing alt
     text, heading skips, non-descriptive links, table issues, etc.), each
     tagged with the WCAG criterion it violates.
4. Click a converted document to open the **result dialog**: the pretty-printed
   HTML output, the accessibility findings, and buttons to copy the HTML or
   download it as an `.html` file — ready to paste into the Canvas RCE.
5. Locking a document (padlock icon in the table) excludes it from the next
   Convert run. Re-converting a document overwrites its previous output.
   Deleting a document removes it and its stored files.

### Admin dashboard

Admins get an **Admin** button in the dashboard header linking to `/admin`,
which provides:

- A **pending-user approval queue** (approve → `instructor`, or reject).
- **Job status** and **daily job** summaries.
- **Token usage and cost tracking** over a configurable day window, priced from
  LiteLLM's live model pricing at call time.
- A paginated **recent jobs** table (filename, requester, status, model,
  tokens, cost).

## Repository Layout

```
acccp/
├── app/                      # Next.js App Router — every route lives here
│   ├── page.tsx              #   "/" sign-in page (email OTP)
│   ├── dashboard/            #   Instructor workspace
│   │   ├── layout.tsx        #     Loads sessions, sidebar + admin nav button
│   │   ├── page.tsx          #     Default session view
│   │   └── [id]/page.tsx     #     Session-scoped document workspace
│   ├── admin/page.tsx        #   Admin metrics & user-approval dashboard
│   ├── pending-approval/     #   Holding page for unapproved users
│   ├── unauthorized/         #   Role-mismatch landing page
│   ├── not-found.tsx         #   404 page
│   └── api/
│       ├── auth/[...all]/    #   better-auth catch-all handler
│       ├── convert/          #   POST /api/convert — conversion orchestration
│       └── admin/model-info/ #   GET — live LiteLLM pricing (admin-only)
├── components/
│   └── ui/                   # shadcn primitives + hand-written app composites
│                             #   (document-workspace, document-table,
│                             #    conversion-result-dialog, file-upload,
│                             #    dashboard-sidebar, admin-metrics, ...)
├── contexts/
│   └── session-context.tsx   # SessionProvider — client state for sessions
├── hooks/                    # Shared React hooks (use-mobile)
├── lib/
│   ├── convert.ts            # ★ The DOCX → HTML conversion pipeline
│   ├── prompts/accessibility.ts  # Stage-1 system prompt (BUX/WCAG rules)
│   ├── litellm.ts            # LiteLLM API client + pricing/cost helpers
│   ├── auth.ts               # better-auth config + role-gate helpers
│   ├── auth-client.ts        # Client-side auth helpers
│   ├── email.ts              # OTP email delivery (console or Resend)
│   ├── db.ts                 # Drizzle/Postgres client
│   ├── db/schema.ts          # ★ Database schema (all tables & views)
│   ├── db/relations.ts       # Drizzle relations
│   ├── db/errors.ts          # Postgres error helpers (unique violations)
│   ├── storage.ts            # Supabase Storage client + object key helpers
│   ├── actions/              # Server actions
│   │   ├── sessions.ts       #   create/rename/archive sessions
│   │   ├── documents.ts      #   list/fetch-HTML/delete documents
│   │   ├── admin-metrics.ts  #   admin dashboard queries
│   │   └── admin-users.ts    #   approve/reject pending users
│   ├── conversion-status.ts  # job_status → UI status mapping
│   ├── metrics-math.ts       # Pure aggregation helpers (unit-tested)
│   ├── format.ts             # Byte/date display formatting
│   ├── types/document.ts     # Shared UI types (UploadedDocument, Session)
│   └── utils.ts              # cn() class-name helper
├── drizzle/                  # Generated SQL migrations (committed)
├── test/                     # Vitest unit tests
├── drizzle.config.ts         # drizzle-kit config
├── vitest.config.ts          # Test runner config ("@/" alias → repo root)
└── components.json           # shadcn/ui config
```

Good starting points for new contributors: [lib/convert.ts](lib/convert.ts)
(the core pipeline, heavily commented), [app/api/convert/route.ts](app/api/convert/route.ts)
(how a conversion is persisted), and [lib/db/schema.ts](lib/db/schema.ts)
(the data model).

## Technology Stack

At its core, ACCCP is a Next.JS 16 application hosted on Vercel.
Below is a breakdown of the technologies the team used
to build out the app's functionality.

The following were used on the frontend to build the website:

- `React`: The component-based frontend framework used by Next.
- `Shadcn/UI`: Used for the majority of the frontend component designs.
  Allows for quick iteration and customization of the site's pages.
- `TailwindCSS`: Used in combination with `Shadcn/UI` to style page content.

The following were used on the backend to build the API and database:

- `Supabase`: The application's database (PostgreSQL) and file-storage
  provider. Uploaded `.docx` sources and generated HTML outputs live in a
  private Supabase Storage bucket.
- `Drizzle ORM`: Type-safe database access and migration tooling
  (`drizzle-kit`).
- `Better Auth`: The application's authentication provider. Instructors
  sign in with their email, and enter a one-time-password to verify their identity.
- `Resend`: The application's provider for sending verification OTP emails.
- `LiteLLM`: The application's AI model provider (OSU-hosted proxy).
- `mammoth`: Extracts HTML from uploaded `.docx` files before the AI pass.
- `Vitest`: Unit test runner.

## Setting up a Development Environment

### Prerequisites

- **Node.js 24 (current LTS)** and **npm 11+** (bundled with Node 24).
- **Git**.
- Access to the team's shared **Supabase** project. Ask a team member to invite
  you as a collaborator on the project dashboard.
- An OSU **LiteLLM** API key. Ask a team member/admin to issue you a nano key
  on the OSU LiteLLM instance.

### 1. Clone and install dependencies

```bash
git clone <repo-url>
cd acccp
npm install
```

### 2. Configure environment variables

Create a `.env` file in the project root (it's git-ignored) with the
following variables:

```bash
# Database (Supabase Postgres connection string)
DATABASE_URL=

# Supabase (used for file storage)
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=

# Better Auth
BETTER_AUTH_SECRET=
BETTER_AUTH_URL=http://localhost:3000

# LiteLLM (AI model provider)
LITELLM_BASE_URL=
LITELLM_API_KEY=
LITELLM_MODEL=gpt-5.4-nano-2026-03-17

# Email (OTP sign-in codes)
EMAIL_PROVIDER=console
```

Where to find each value:

- `DATABASE_URL` / `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` — from the
  shared Supabase project dashboard, under **Project Settings → Data API**
  (`SUPABASE_URL`, service role key) and **Project Settings → Database**
  (connection string for `DATABASE_URL`; use the pooled connection string).
- `BETTER_AUTH_SECRET` — any random secret string, e.g. generate one with
  `openssl rand -base64 32`. `BETTER_AUTH_URL` should match the URL the app
  is running on (`http://localhost:3000` for local dev).
- `LITELLM_BASE_URL` / `LITELLM_API_KEY` — from whoever administers the OSU
  LiteLLM instance for this project; `LITELLM_MODEL` defaults to
  `gpt-5.4-nano-2026-03-17` if unset, so it can be omitted.
- `EMAIL_PROVIDER` — leave as `console` for local development; sign-in OTP
  codes are logged to the terminal instead of emailed, so no Resend setup is
  needed. To test real email delivery, set it to `resend` and add
  `RESEND_API_KEY` (from the [Resend dashboard](https://resend.com)) and
  `EMAIL_FROM` (a verified sending address/domain).

The full environment variable reference (which module reads each variable, and
gotchas like the pooled-connection requirement) is in
[AGENTS.md](AGENTS.md#required-environment-variables).

### 3. Set up the database

Apply the committed migrations to your database:

```bash
npm run db:migrate
```

If you change `lib/db/schema.ts`, generate a new migration with
`npm run db:generate` before running `db:migrate` again. `npm run db:studio`
opens Drizzle Studio for browsing the database.

### 4. Run the app

```bash
npm run dev
```

The app will be available at [http://localhost:3000](http://localhost:3000).
Sign-in is restricted to `@osu.edu` email addresses. Note that a freshly
signed-up user has the `pending` role — to reach the dashboard, promote your
user to `instructor` or `admin` directly in the database (`users.role`, e.g.
via `npm run db:studio`), or have an existing admin approve you at `/admin`.

## Development Workflow

### Everyday commands

```bash
npm run dev        # Start the dev server
npm run build      # Production build
npm run lint       # ESLint
npm run typecheck  # TypeScript checks
npm run test       # Run the test suite (Vitest)
npm run test:watch # Vitest in watch mode
npm run format     # Format with Prettier
```

### Testing

Unit tests live in [test/](test/) and run with Vitest (`npm run test`).
Current coverage focuses on the pure/mockable core: the conversion pipeline
(`convert.test.ts`, with mammoth/LiteLLM mocked), the LiteLLM client and cost
math (`litellm.test.ts`), admin metrics aggregation (`metrics-math.test.ts`),
and job-status mapping (`conversion-status.test.ts`). Tests use the same `@/`
path alias as the app (configured in `vitest.config.ts`).

### Testing the conversion pipeline from the CLI

You can run the DOCX → HTML pipeline standalone, without the web app, against
any local `.docx` file (requires the LiteLLM env vars in `.env`):

```bash
# bash / Git Bash
set -a && source .env && set +a
npx tsx lib/convert.ts path/to/file.docx
```

This prints the generated HTML and any accessibility findings to the terminal —
handy for iterating on the prompts in `lib/prompts/accessibility.ts`.

### Conventions

- Branch off `dev`; `main` is the release branch.
- UI primitives come from shadcn (`npx shadcn@latest add <name>` into
  `components/ui/`); app-specific composite components are hand-written in the
  same directory.
- Server-side authorization is centralized: gate pages/server actions with
  `verifyRoleOrRedirect(...)` and API routes with
  `verifyRoleOrUnauthorized(...)` from `lib/auth.ts` — never query on behalf of
  a user without one of these plus an ownership check.
