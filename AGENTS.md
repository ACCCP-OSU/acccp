<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## shadcn / UI structure

- UI primitives live in `components/ui/`. Add new ones via `npx shadcn@latest add <name>`.
- Primitives use `@base-ui/react`, `cn()` from `lib/utils.ts`, semantic design tokens from `app/globals.css`, and Lucide icons.
- App composites (`application-usage`, `dashboard-sidebar`, `document-workspace`, etc.) import sibling UI with `./`; pages and layouts use `@/components/ui/...`.
- Config: `components.json` — style `base-rhea`, CSS variables, Lucide icon library.
- Theme: forced light mode in `app/layout.tsx` (`ThemeProvider forcedTheme="light"`) to match Canvas.

### Installed primitives

accordion, badge, breadcrumb, button, card, dialog, dropdown-menu, field, input, input-otp, label, pagination, separator, sheet, sidebar, skeleton, table, tabs, tooltip

### App composites (hand-written on top of primitives)

`application-usage`, `dashboard-sidebar`, `dashboard-breadcrumb`, `document-table`, `document-workspace`, `conversion-result-dialog`, `file-upload`, `rename-dialog`, `session-button`, `admin-metrics`, `admin-table-pagination`, `pending-users-table`

## Data layer

- **Postgres via Supabase**, accessed with **Drizzle ORM** (`drizzle-orm/postgres-js`). Client setup: `lib/db.ts` (uses `prepare: false`, required by Supabase's transaction-mode pooler; caches the client on `globalThis` in dev to survive HMR). Schema: `lib/db/schema.ts`; relations: `lib/db/relations.ts`.
- Core tables: `users`, `auth_sessions`, `accounts`, `verifications` (better-auth's tables, mapped — see below), `sessions`, `documents`, `conversion_jobs`, `artifacts`, `validation_findings`, `job_events`, `model_calls`. Plus several `pgView`s for admin summaries (`admin_finding_summary`, `admin_retention_summary`, `admin_job_status_summary`, `admin_daily_job_summary`, `user_session_file_overview`).
- All tables have RLS enabled (`.enableRLS()`); app code goes through the Drizzle client with the app's own authorization checks (`verifyRoleOrRedirect` / `verifyRoleOrUnauthorized` in `lib/auth.ts`), not per-user Postgres roles.
- **Sessions and documents are persisted** (no longer in-memory demo state). `contexts/session-context.tsx` (`SessionProvider`) treats the `sessions` prop from the dashboard layout as server state; every mutation (`createSession`, `renameSession`, `archiveSession` in `lib/actions/sessions.ts`) goes through a server action that revalidates the layout. Document actions live in `lib/actions/documents.ts` (`listDocuments`, `getDocumentHtml` — output HTML lives in storage, not a column, so it's fetched on demand; `deleteDocument` — tombstones via `deleted_at`, then best-effort blob cleanup).
- `lib/db/errors.ts` (`isUniqueViolation`) detects Postgres `23505` by walking the error `cause` chain — Drizzle wraps driver errors, so `error.code` is never on the top-level error.
- Migrations: `npm run db:generate` / `db:migrate` / `db:push` / `db:studio` (drizzle-kit).

## Auth

- **better-auth**, configured in `lib/auth.ts`, using the **Drizzle adapter** against the same Postgres schema (`users`/`authSessions`/`accounts`/`verifications` tables above; `generateId: false` since Postgres assigns UUIDs). Client-side helpers: `lib/auth-client.ts`. Route handler: `app/api/auth/[...all]/route.ts`.
- Sign-in is **email OTP only** (`emailAndPassword` disabled), via the `emailOTP` plugin. A `before` hook on `/sign-in/email-otp` and `/email-otp/send-verification-otp` rejects any email that doesn't match `OSU_EMAIL_REGEX` (`@...osu.edu`, including subdomains like `buckeyemail.osu.edu`) — this is what scopes sign-in to OSU accounts without needing Microsoft Entra tenant access.
- OTP delivery: `lib/email.ts` (`sendOtpEmail`). `EMAIL_PROVIDER=console` (default) just logs the OTP for local dev; set to `resend` (with `RESEND_API_KEY` / `EMAIL_FROM`) to actually send via Resend.
- Users have a `role` field (`pending | instructor | admin`, default `pending`). Gate server components/actions with `verifyRoleOrRedirect(permitted)` and API routes with `verifyRoleOrUnauthorized(permitted)`, both in `lib/auth.ts`.

## Storage (Supabase Storage)

- `lib/storage.ts` is a server-only Supabase Storage client (bucket `documents`), built with the **service role key** — necessary because auth is better-auth, not Supabase Auth, so requests carry no Supabase JWT and an anon-key client would be treated as anonymous. Never import it from a client component. Ownership is enforced in app code before every call, same as the DB.
- Objects are keyed `sourceDocxKey(sessionId, documentId)` → `{sessionId}/{documentId}/source.docx` and `htmlOutputKey(sessionId, documentId)` → `{sessionId}/{documentId}/output.html`, grouped by session so a session's blobs can be swept together. Uploads use `upsert: true` (re-converting overwrites the previous output). Downloads for end users go through short-lived (`createSignedUrl`, default 5 min) signed URLs since the bucket is private.
- Required env vars: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.

## Document conversion pipeline (LiteLLM)

- `lib/litellm.ts` is the shared LiteLLM client: `callLiteLLM()` posts to `${LITELLM_BASE_URL}/chat/completions`, and `fetchModelPricing()` reads `${LITELLM_BASE_URL}/model/info` (5-min in-memory cache) to price calls via `computeCallCostUsd()`. Required env vars: `LITELLM_BASE_URL`, `LITELLM_API_KEY`, `LITELLM_MODEL` (defaults to `gpt-5.4-nano-2026-03-17`).
- `lib/convert.ts` (`convertDocx()`) runs a two-stage pipeline: mammoth extracts HTML from the uploaded `.docx` (images become `{{PLACEHOLDER:name}}` markers rather than embedded base64), stage 1 sends that HTML to LiteLLM to produce accessible Canvas HTML (`lib/prompts/accessibility.ts`), stage 2 sends the *output* HTML back to LiteLLM for an independent accessibility audit, returning structured `AccessibilityError[]` (WCAG-tagged, typed as `missing-alt | heading-skip | bad-link | no-table-caption | no-table-headers | missing-list-markup | empty-heading | color-only-meaning | h1-present | non-descriptive-link | missing-image | missing-link | other`). Can be run standalone: `npx tsx lib/convert.ts path/to/file.docx`.
- The stage-1 output is pretty-printed with **prettier** (`parser: "html"`) before validation/persistence — the system prompt tells the model *not* to format its own output; formatting failures fall back to the raw string rather than failing the conversion. Mammoth extraction warnings (unreadable images/links in the source `.docx`) are classified into `missing-image`/`missing-link` warnings and merged into the same `errors[]` list the frontend renders (see `classifyExtractionWarning`) — they're always warnings, never errors, since the pipeline can't recover content that isn't there.
- `lib/conversion-status.ts` (`toConversionStatus`) maps DB `job_status` values onto the dashboard's simpler `ConversionStatus` (`idle | queued | processing | success | error`; `needs_review` counts as success, `expired`/`cancelled` as error, no job row = `idle`). UI-facing types (`UploadedDocument`, `Session`) live in `lib/types/document.ts`.
- `POST /api/convert` (`app/api/convert/route.ts`) is the orchestration layer around `convertDocx()`: verifies the caller owns the target `sessionId`, inserts/reuses a `documents` row and uploads the source `.docx` to storage, upserts a `conversion_jobs` row (one job per document — a re-convert updates the existing row via `onConflictDoUpdate`, `attempt_count` increments), calls `convertDocx()` **outside** any DB transaction (a multi-second model call shouldn't pin a pooled connection), then on success in one transaction: uploads the HTML to storage, marks the job `completed`, upserts `source_docx`/`html_output` artifacts (one available artifact per type via `uq_available_artifact_per_job_type`), replaces `validation_findings` wholesale (no natural key), logs a `job_events` row, and inserts `model_calls`. On failure, still records any `model_calls` incurred before the throw (billable) and a `job_events` row, and marks the job `failed`.
- Per-call token usage/cost is captured as `ModelCallUsage[]` and persisted to `model_calls` (stage `convert`/`validate`), which backs the admin cost/token tracking metrics tab.
- `GET /api/admin/model-info` returns *live* pricing for the currently configured model straight from LiteLLM's `/model/info` (admin-only) — distinct from the historical per-call cost in `model_calls`, which is snapshotted at call time so past spend doesn't shift if LiteLLM's pricing changes later.

## Admin surfaces

- `app/admin/page.tsx` + `components/ui/admin-metrics.tsx` is the admin dashboard: pending-user approval queue, job status summary, token/cost usage over a configurable day window, and a paginated recent-jobs table (filename, requester, status, model, tokens, cost).
- `lib/actions/admin-metrics.ts` (all admin-role-gated via `verifyRoleOrRedirect(["admin"])`): `getUserRoleCounts`, `getJobStatusSummary`, `getTokenUsage(days)`, `getCostSummary(days)`, `listRecentJobs(page, pageSize)`, `listPendingUsersPage(page, pageSize)`. Pure aggregation/pagination helpers live in `lib/metrics-math.ts` (unit-tested).
- `lib/actions/admin-users.ts`: `approveUser` (flips role `pending → instructor`) and `rejectUser` (hard-deletes the user row — no soft delete). New users default to role `pending` and land on `app/pending-approval/page.tsx` until approved; `app/unauthorized/page.tsx` handles role-mismatch redirects from `verifyRoleOrRedirect`.

## Required environment variables

All read via `process.env` (no `.env.example` in the repo — check `.env` against this list). Missing required vars throw at first use, not at boot.

| Variable | Required | Used by | Notes |
|---|---|---|---|
| `DATABASE_URL` | Yes | `lib/db.ts`, `drizzle.config.ts` | Postgres connection string. Must point at Supabase's **transaction-mode pooler** (`prepare: false` is set to match). |
| `BETTER_AUTH_SECRET` | Yes | better-auth (implicit) | Signs sessions/tokens. |
| `BETTER_AUTH_URL` | Yes | better-auth (implicit) | Base URL better-auth issues callback/redirect links against, e.g. `http://localhost:3000` in dev. |
| `LITELLM_BASE_URL` | Yes | `lib/litellm.ts` | e.g. `https://litellm.cloud.osu.edu`. |
| `LITELLM_API_KEY` | Yes | `lib/litellm.ts` | |
| `LITELLM_MODEL` | No | `lib/litellm.ts` | Defaults to `gpt-5.4-nano-2026-03-17`. |
| `SUPABASE_URL` | Yes | `lib/storage.ts` | Project API URL (`https://<ref>.supabase.co`), not the Postgres connection string. |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | `lib/storage.ts` | Bypasses storage RLS; server-only, never expose to the client. |
| `EMAIL_PROVIDER` | No | `lib/email.ts` | `console` (default, logs OTP instead of sending) or `resend`. |
| `RESEND_API_KEY` | Only if `EMAIL_PROVIDER=resend` | `lib/email.ts` | |
| `EMAIL_FROM` | Only if `EMAIL_PROVIDER=resend` | `lib/email.ts` | Passed straight through to Resend's `from` field — must be a full sender **address** (e.g. `noreply@verify.acccp.teachertools.pro`) on a domain verified in the Resend account, not a bare domain. |
| `NODE_ENV` | No | `lib/db.ts` | Standard Next.js var; gates the dev-only global DB client cache. |

## Route map

- `app/page.tsx` — sign-in (email OTP).
- `app/dashboard/layout.tsx` — redirects signed-out users to `/` and `pending` users to `/pending-approval`, loads sessions via `listSessionsEnsuringDefault()`, provides `SessionProvider`, and shows an **Admin** header button (link to `/admin`) for admins; `app/dashboard/page.tsx` and `app/dashboard/[id]/page.tsx` — session-scoped document workspace.
- `app/admin/page.tsx` — admin metrics/user-approval dashboard (role `admin`); tabbed (users / metrics), links back to `/dashboard`.
- `app/pending-approval/page.tsx` — held here until an admin approves (role `pending`).
- `app/unauthorized/page.tsx` — role-mismatch landing page.
- `app/not-found.tsx` — 404 page with a link back to sign-in.
- `app/api/auth/[...all]/route.ts` — better-auth catch-all handler.
- `app/api/convert/route.ts`, `app/api/admin/model-info/route.ts` — described above.

## Tests

- Vitest, `npm run test` (or `test:watch`). Tests live in `test/`, node environment, `@/` alias mapped to the repo root in `vitest.config.ts`.
- Coverage targets the pure/mockable core: `convert.test.ts` (pipeline with mammoth/prettier/LiteLLM mocked), `litellm.test.ts` (client + cost math), `metrics-math.test.ts` (admin aggregation), `conversion-status.test.ts` (status mapping). No component/e2e tests yet.

## Gotchas

- The document `locked` flag is client-state only (`documents` has no locked column) — locking excludes a document from the next batch Convert run, and resets on reload.
- Uploaded files are held in client memory (`UploadedDocument.file`) until first conversion persists them; a document row + storage upload only happens on convert, not on upload.
