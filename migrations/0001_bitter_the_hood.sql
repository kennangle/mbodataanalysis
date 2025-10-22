CREATE TABLE "import_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"data_types" text[] NOT NULL,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp NOT NULL,
	"progress" text DEFAULT '{}' NOT NULL,
	"current_data_type" text,
	"current_offset" integer DEFAULT 0,
	"error" text,
	"paused_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "password_reset_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "password_reset_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "scheduled_imports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"schedule" text DEFAULT '0 2 * * *' NOT NULL,
	"data_types" text DEFAULT 'students,classes,visits,sales' NOT NULL,
	"days_to_import" integer DEFAULT 7 NOT NULL,
	"last_run_at" timestamp,
	"last_run_status" text,
	"last_run_error" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "webhook_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"subscription_id" uuid,
	"message_id" text NOT NULL,
	"event_type" text NOT NULL,
	"event_data" text NOT NULL,
	"processed" boolean DEFAULT false NOT NULL,
	"processed_at" timestamp,
	"error" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "webhook_events_message_id_unique" UNIQUE("message_id")
);
--> statement-breakpoint
CREATE TABLE "webhook_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"event_type" text NOT NULL,
	"webhook_url" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"mindbody_subscription_id" text,
	"message_signature_key" text,
	"reference_id" text,
	"event_schema_version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "password_hash" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "revenue" ADD COLUMN "mindbody_sale_id" text;--> statement-breakpoint
ALTER TABLE "revenue" ADD COLUMN "mindbody_item_id" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "provider" text DEFAULT 'local' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "provider_id" text;--> statement-breakpoint
CREATE INDEX "import_jobs_org_idx" ON "import_jobs" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "import_jobs_status_idx" ON "import_jobs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "password_reset_tokens_user_idx" ON "password_reset_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "password_reset_tokens_token_idx" ON "password_reset_tokens" USING btree ("token");--> statement-breakpoint
CREATE INDEX "password_reset_tokens_expires_idx" ON "password_reset_tokens" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "scheduled_imports_org_idx" ON "scheduled_imports" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "webhook_events_org_idx" ON "webhook_events" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "webhook_events_message_idx" ON "webhook_events" USING btree ("message_id");--> statement-breakpoint
CREATE INDEX "webhook_events_processed_idx" ON "webhook_events" USING btree ("processed");--> statement-breakpoint
CREATE INDEX "webhook_subscriptions_org_idx" ON "webhook_subscriptions" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "webhook_subscriptions_status_idx" ON "webhook_subscriptions" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "revenue_unique_sale_item_idx" ON "revenue" USING btree ("organization_id","mindbody_sale_id","mindbody_item_id");