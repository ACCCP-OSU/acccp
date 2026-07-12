-- users.role is empty right now, so the enum type is recreated instead of
-- using ALTER TYPE ... ADD VALUE. Postgres forbids using a value added via
-- ADD VALUE within the same transaction that added it, which would break
-- when this file runs alongside 0002 (which defaults role to 'pending').
ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "role" TYPE text USING "role"::text;--> statement-breakpoint
DROP TYPE "public"."user_role";--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('pending', 'instructor', 'admin');--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "role" TYPE "public"."user_role" USING "role"::"public"."user_role";--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'instructor';--> statement-breakpoint
DROP INDEX "uq_users_email_lower";--> statement-breakpoint
DROP INDEX "uq_active_session_title_per_user";--> statement-breakpoint
CREATE UNIQUE INDEX "uq_users_email_lower" ON "users" USING btree (lower(email)) WHERE (email IS NOT NULL);--> statement-breakpoint
CREATE UNIQUE INDEX "uq_active_session_title_per_user" ON "sessions" USING btree (owner_user_id,lower(title)) WHERE (archived_at IS NULL);
