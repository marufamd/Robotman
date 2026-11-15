CREATE TABLE "robotman_response_settings" (
	"guild_id" text PRIMARY KEY NOT NULL,
	"introduction" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
ALTER TABLE "robotman_responses" ADD COLUMN "introduction_mode" text DEFAULT 'inherit' NOT NULL;--> statement-breakpoint
ALTER TABLE "robotman_responses" ADD COLUMN "introduction" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "robotman_responses" ADD CONSTRAINT "robotman_responses_introduction_mode_check" CHECK ("robotman_responses"."introduction_mode" in ('inherit', 'custom', 'none'));