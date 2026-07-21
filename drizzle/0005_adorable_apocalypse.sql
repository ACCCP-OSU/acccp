CREATE TYPE "public"."model_call_stage" AS ENUM('convert', 'validate');--> statement-breakpoint
CREATE TABLE "model_calls" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" uuid NOT NULL,
	"stage" "model_call_stage" NOT NULL,
	"model" text NOT NULL,
	"prompt_tokens" integer NOT NULL,
	"completion_tokens" integer NOT NULL,
	"cost_usd" numeric(12, 6),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "model_calls_prompt_tokens_nonnegative_chk" CHECK (prompt_tokens >= 0),
	CONSTRAINT "model_calls_completion_tokens_nonnegative_chk" CHECK (completion_tokens >= 0)
);
--> statement-breakpoint
ALTER TABLE "model_calls" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "model_calls" ADD CONSTRAINT "model_calls_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "public"."conversion_jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_model_calls_job_id" ON "model_calls" USING btree ("job_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_model_calls_created_at" ON "model_calls" USING btree ("created_at" timestamptz_ops);