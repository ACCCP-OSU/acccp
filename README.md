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

TODO

## Technology Stack

At its core, ACCCP is a Next.JS 16 application hosted on Vercel.
Below is a breakdown of the technologies the team used
to build out the app's functionality. (More details on these items
can be found later in this README.)

The following were used on the frontend to build the website:
- `React`: The component-based frontend framework used by Next.
- `Shadcn/UI`: Used for the majority of the frontend component designs.
Allows for quick iteration and customization of the site's pages.
- `TailwindCSS`: Used in combination with `Shadcn/UI` to style page content.

The following were used on the backend to build the API and database:
- `Supabase`: The application's database provider. An easy-to-use
PostgreSQL service.
- `Better Auth`: The application's authentication provider. Instructors
sign in with their email, and enter a one-time-password to verify their identity.
- `Resend`: The application's provider for sending verification OTP emails.
- `LiteLLM`: The application's AI model provider.

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
Sign-in is restricted to `@osu.edu` email addresses.

### Other useful commands

```bash
npm run lint       # ESLint
npm run typecheck  # TypeScript checks
npm run test       # Run the test suite (Vitest)
npm run format     # Format with Prettier
```
