-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE TYPE "public"."artifact_status" AS ENUM('available', 'expired', 'deleted');
CREATE TYPE "public"."artifact_type" AS ENUM('source_docx', 'extracted_text', 'html_output', 'validation_report', 'review_metadata');
CREATE TYPE "public"."finding_severity" AS ENUM('info', 'warning', 'error');
CREATE TYPE "public"."job_status" AS ENUM('queued', 'processing', 'needs_review', 'completed', 'failed', 'expired', 'cancelled');
CREATE TYPE "public"."review_status" AS ENUM('not_required', 'pending', 'reviewed');
CREATE TYPE "public"."user_role" AS ENUM('instructor', 'admin');
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"external_subject" text,
	"osu_name_dot_number" text,
	"email" text,
	"display_name" text,
	"role" "user_role" DEFAULT 'instructor' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_login_at" timestamp with time zone,
	CONSTRAINT "users_identity_present_chk" CHECK ((external_subject IS NOT NULL) OR (osu_name_dot_number IS NOT NULL) OR (email IS NOT NULL))
);

ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_user_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"course_label" text,
	"term_label" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone,
	CONSTRAINT "sessions_title_not_blank_chk" CHECK (btrim(title) <> ''::text)
);

ALTER TABLE "sessions" ENABLE ROW LEVEL SECURITY;
CREATE TABLE "documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"uploaded_by_user_id" uuid NOT NULL,
	"original_filename" text NOT NULL,
	"mime_type" text DEFAULT 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' NOT NULL,
	"file_size_bytes" bigint NOT NULL,
	"checksum_sha256" text,
	"page_count" integer,
	"replaced_by_document_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "documents_file_size_positive_chk" CHECK (file_size_bytes > 0),
	CONSTRAINT "documents_original_filename_not_blank_chk" CHECK (btrim(original_filename) <> ''::text),
	CONSTRAINT "documents_page_count_nonnegative_chk" CHECK ((page_count IS NULL) OR (page_count >= 0))
);

ALTER TABLE "documents" ENABLE ROW LEVEL SECURITY;
CREATE TABLE "artifacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" uuid NOT NULL,
	"artifact_type" "artifact_type" NOT NULL,
	"artifact_status" "artifact_status" DEFAULT 'available' NOT NULL,
	"filename" text NOT NULL,
	"mime_type" text NOT NULL,
	"storage_key" text NOT NULL,
	"file_size_bytes" bigint,
	"checksum_sha256" text,
	"preview_snippet" text,
	"is_user_downloadable" boolean DEFAULT true NOT NULL,
	"expires_at" timestamp with time zone DEFAULT (now() + '30 days'::interval) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "artifacts_file_size_nonnegative_chk" CHECK ((file_size_bytes IS NULL) OR (file_size_bytes >= 0)),
	CONSTRAINT "artifacts_filename_not_blank_chk" CHECK (btrim(filename) <> ''::text),
	CONSTRAINT "artifacts_storage_key_not_blank_chk" CHECK (btrim(storage_key) <> ''::text)
);

ALTER TABLE "artifacts" ENABLE ROW LEVEL SECURITY;
CREATE TABLE "validation_findings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" uuid NOT NULL,
	"severity" "finding_severity" NOT NULL,
	"category" text DEFAULT 'accessibility' NOT NULL,
	"rule_code" text,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"location" jsonb,
	"user_visible" boolean DEFAULT true NOT NULL,
	"resolved" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone,
	CONSTRAINT "validation_findings_message_not_blank_chk" CHECK (btrim(message) <> ''::text),
	CONSTRAINT "validation_findings_resolved_consistency_chk" CHECK (((resolved = true) AND (resolved_at IS NOT NULL)) OR (resolved = false)),
	CONSTRAINT "validation_findings_title_not_blank_chk" CHECK (btrim(title) <> ''::text)
);

ALTER TABLE "validation_findings" ENABLE ROW LEVEL SECURITY;
CREATE TABLE "job_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" uuid NOT NULL,
	"event_type" text NOT NULL,
	"message" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "job_events_event_type_not_blank_chk" CHECK (btrim(event_type) <> ''::text)
);

ALTER TABLE "job_events" ENABLE ROW LEVEL SECURITY;
CREATE TABLE "conversion_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid NOT NULL,
	"requested_by_user_id" uuid NOT NULL,
	"status" "job_status" DEFAULT 'queued' NOT NULL,
	"review_status" "review_status" DEFAULT 'pending' NOT NULL,
	"provider" text,
	"model_name" text,
	"prompt_version" text,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"reviewed_at" timestamp with time zone,
	"reviewed_by_user_id" uuid,
	"expires_at" timestamp with time zone DEFAULT (now() + '30 days'::interval) NOT NULL,
	"error_code" text,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "conversion_jobs_one_job_per_document" UNIQUE("document_id"),
	CONSTRAINT "conversion_jobs_attempt_count_nonnegative_chk" CHECK (attempt_count >= 0),
	CONSTRAINT "conversion_jobs_review_consistency_chk" CHECK (((review_status = 'reviewed'::review_status) AND (reviewed_at IS NOT NULL)) OR (review_status <> 'reviewed'::review_status))
);

ALTER TABLE "conversion_jobs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "documents" ADD CONSTRAINT "documents_replaced_by_document_id_fkey" FOREIGN KEY ("replaced_by_document_id") REFERENCES "public"."documents"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "documents" ADD CONSTRAINT "documents_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "documents" ADD CONSTRAINT "documents_uploaded_by_user_id_fkey" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "artifacts" ADD CONSTRAINT "artifacts_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "public"."conversion_jobs"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "validation_findings" ADD CONSTRAINT "validation_findings_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "public"."conversion_jobs"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "job_events" ADD CONSTRAINT "job_events_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "public"."conversion_jobs"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "conversion_jobs" ADD CONSTRAINT "conversion_jobs_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "conversion_jobs" ADD CONSTRAINT "conversion_jobs_requested_by_user_id_fkey" FOREIGN KEY ("requested_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "conversion_jobs" ADD CONSTRAINT "conversion_jobs_reviewed_by_user_id_fkey" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
CREATE UNIQUE INDEX "uq_users_email_lower" ON "users" USING btree (lower(email) text_ops) WHERE (email IS NOT NULL);
CREATE UNIQUE INDEX "uq_users_external_subject" ON "users" USING btree ("external_subject" text_ops) WHERE (external_subject IS NOT NULL);
CREATE UNIQUE INDEX "uq_users_osu_name_dot_number" ON "users" USING btree ("osu_name_dot_number" text_ops) WHERE (osu_name_dot_number IS NOT NULL);
CREATE INDEX "idx_sessions_owner_user_id" ON "sessions" USING btree ("owner_user_id" uuid_ops);
CREATE INDEX "idx_sessions_updated_at" ON "sessions" USING btree ("updated_at" timestamptz_ops);
CREATE UNIQUE INDEX "uq_active_session_title_per_user" ON "sessions" USING btree (owner_user_id text_ops,lower(title) text_ops) WHERE (archived_at IS NULL);
CREATE INDEX "idx_documents_created_at" ON "documents" USING btree ("created_at" timestamptz_ops);
CREATE INDEX "idx_documents_session_id" ON "documents" USING btree ("session_id" uuid_ops);
CREATE INDEX "idx_documents_uploaded_by_user_id" ON "documents" USING btree ("uploaded_by_user_id" uuid_ops);
CREATE INDEX "idx_artifacts_expires_at" ON "artifacts" USING btree ("expires_at" timestamptz_ops);
CREATE INDEX "idx_artifacts_job_id" ON "artifacts" USING btree ("job_id" uuid_ops);
CREATE INDEX "idx_artifacts_status" ON "artifacts" USING btree ("artifact_status" enum_ops);
CREATE INDEX "idx_artifacts_type" ON "artifacts" USING btree ("artifact_type" enum_ops);
CREATE UNIQUE INDEX "uq_available_artifact_per_job_type" ON "artifacts" USING btree ("job_id" uuid_ops,"artifact_type" uuid_ops) WHERE (artifact_status = 'available'::artifact_status);
CREATE INDEX "idx_validation_findings_category" ON "validation_findings" USING btree ("category" text_ops);
CREATE INDEX "idx_validation_findings_job_id" ON "validation_findings" USING btree ("job_id" uuid_ops);
CREATE INDEX "idx_validation_findings_location_gin" ON "validation_findings" USING gin ("location" jsonb_ops);
CREATE INDEX "idx_validation_findings_rule_code" ON "validation_findings" USING btree ("rule_code" text_ops);
CREATE INDEX "idx_validation_findings_severity" ON "validation_findings" USING btree ("severity" enum_ops);
CREATE INDEX "idx_job_events_created_at" ON "job_events" USING btree ("created_at" timestamptz_ops);
CREATE INDEX "idx_job_events_event_type" ON "job_events" USING btree ("event_type" text_ops);
CREATE INDEX "idx_job_events_job_id" ON "job_events" USING btree ("job_id" uuid_ops);
CREATE INDEX "idx_job_events_metadata_gin" ON "job_events" USING gin ("metadata" jsonb_ops);
CREATE INDEX "idx_conversion_jobs_created_at" ON "conversion_jobs" USING btree ("created_at" timestamptz_ops);
CREATE INDEX "idx_conversion_jobs_document_id" ON "conversion_jobs" USING btree ("document_id" uuid_ops);
CREATE INDEX "idx_conversion_jobs_expires_at" ON "conversion_jobs" USING btree ("expires_at" timestamptz_ops);
CREATE INDEX "idx_conversion_jobs_requested_by_user_id" ON "conversion_jobs" USING btree ("requested_by_user_id" uuid_ops);
CREATE INDEX "idx_conversion_jobs_review_status" ON "conversion_jobs" USING btree ("review_status" enum_ops);
CREATE INDEX "idx_conversion_jobs_status" ON "conversion_jobs" USING btree ("status" enum_ops);
CREATE VIEW "public"."admin_finding_summary" WITH (security_invoker = true) AS (SELECT severity, category, COALESCE(rule_code, 'uncoded'::text) AS rule_code, title, count(*) AS finding_count, count(*) FILTER (WHERE created_at >= (now() - '24:00:00'::interval)) AS findings_created_last_24h FROM validation_findings WHERE user_visible = true GROUP BY severity, category, (COALESCE(rule_code, 'uncoded'::text)), title ORDER BY (count(*)) DESC);
CREATE VIEW "public"."admin_retention_summary" WITH (security_invoker = true) AS (SELECT artifact_type, artifact_status, count(*) AS artifact_count, min(expires_at) AS next_expiration_at, max(expires_at) AS latest_expiration_at FROM artifacts GROUP BY artifact_type, artifact_status);
CREATE VIEW "public"."user_session_file_overview" WITH (security_invoker = true) AS (SELECT s.id AS session_id, s.owner_user_id, s.title AS session_title, d.id AS document_id, d.original_filename, d.file_size_bytes, d.page_count, d.created_at AS uploaded_at, j.id AS job_id, j.status, j.review_status, j.expires_at, j.error_code, j.error_message, html.id AS html_artifact_id, html.filename AS html_filename, html.storage_key AS html_storage_key, html.preview_snippet AS html_preview_snippet, count(vf.id) FILTER (WHERE vf.user_visible = true) AS visible_finding_count, count(vf.id) FILTER (WHERE vf.severity = 'error'::finding_severity AND vf.user_visible = true) AS visible_error_count, count(vf.id) FILTER (WHERE vf.severity = 'warning'::finding_severity AND vf.user_visible = true) AS visible_warning_count FROM sessions s JOIN documents d ON d.session_id = s.id LEFT JOIN conversion_jobs j ON j.document_id = d.id LEFT JOIN artifacts html ON html.job_id = j.id AND html.artifact_type = 'html_output'::artifact_type AND html.artifact_status = 'available'::artifact_status LEFT JOIN validation_findings vf ON vf.job_id = j.id WHERE d.deleted_at IS NULL GROUP BY s.id, s.owner_user_id, s.title, d.id, d.original_filename, d.file_size_bytes, d.page_count, d.created_at, j.id, j.status, j.review_status, j.expires_at, j.error_code, j.error_message, html.id, html.filename, html.storage_key, html.preview_snippet);
CREATE VIEW "public"."admin_job_status_summary" WITH (security_invoker = true) AS (SELECT status, count(*) AS job_count, count(*) FILTER (WHERE created_at >= (now() - '24:00:00'::interval)) AS jobs_created_last_24h, count(*) FILTER (WHERE completed_at >= (now() - '24:00:00'::interval)) AS jobs_completed_last_24h FROM conversion_jobs GROUP BY status);
CREATE VIEW "public"."admin_daily_job_summary" WITH (security_invoker = true) AS (SELECT date_trunc('day'::text, created_at)::date AS day, count(*) AS total_jobs, count(*) FILTER (WHERE status = 'completed'::job_status) AS completed_jobs, count(*) FILTER (WHERE status = 'failed'::job_status) AS failed_jobs, count(*) FILTER (WHERE status = 'needs_review'::job_status) AS needs_review_jobs, count(*) FILTER (WHERE status = 'expired'::job_status) AS expired_jobs FROM conversion_jobs GROUP BY (date_trunc('day'::text, created_at)::date) ORDER BY (date_trunc('day'::text, created_at)::date) DESC);
*/