CREATE TABLE "ai_queries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"query" text NOT NULL,
	"response" text,
	"tokens_used" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "attendance" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"schedule_id" uuid NOT NULL,
	"attended_at" timestamp NOT NULL,
	"status" text DEFAULT 'attended' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "class_schedules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"class_id" uuid NOT NULL,
	"mindbody_schedule_id" text,
	"start_time" timestamp NOT NULL,
	"end_time" timestamp NOT NULL,
	"location" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "classes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"mindbody_class_id" text,
	"name" text NOT NULL,
	"description" text,
	"instructor_name" text,
	"capacity" integer,
	"duration" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"mindbody_access_token" text,
	"mindbody_refresh_token" text,
	"mindbody_site_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "revenue" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"student_id" uuid,
	"amount" numeric(10, 2) NOT NULL,
	"type" text NOT NULL,
	"description" text,
	"transaction_date" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"sid" text PRIMARY KEY NOT NULL,
	"sess" text NOT NULL,
	"expire" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "students" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"mindbody_client_id" text,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"email" text,
	"phone" text,
	"status" text DEFAULT 'active' NOT NULL,
	"membership_type" text,
	"join_date" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"name" text NOT NULL,
	"role" text DEFAULT 'user' NOT NULL,
	"organization_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE INDEX "ai_queries_org_idx" ON "ai_queries" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "ai_queries_user_idx" ON "ai_queries" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "attendance_org_idx" ON "attendance" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "attendance_student_idx" ON "attendance" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "attendance_schedule_idx" ON "attendance" USING btree ("schedule_id");--> statement-breakpoint
CREATE INDEX "attendance_time_idx" ON "attendance" USING btree ("attended_at");--> statement-breakpoint
CREATE INDEX "schedules_org_idx" ON "class_schedules" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "schedules_class_idx" ON "class_schedules" USING btree ("class_id");--> statement-breakpoint
CREATE INDEX "schedules_time_idx" ON "class_schedules" USING btree ("start_time");--> statement-breakpoint
CREATE INDEX "classes_org_idx" ON "classes" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "revenue_org_idx" ON "revenue" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "revenue_student_idx" ON "revenue" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "revenue_date_idx" ON "revenue" USING btree ("transaction_date");--> statement-breakpoint
CREATE INDEX "sessions_expire_idx" ON "sessions" USING btree ("expire");--> statement-breakpoint
CREATE INDEX "students_org_idx" ON "students" USING btree ("organization_id");