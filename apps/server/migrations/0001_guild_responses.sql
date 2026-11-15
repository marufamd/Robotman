CREATE TABLE "robotman_responses" (
	"response_id" text PRIMARY KEY NOT NULL,
	"guild_id" text NOT NULL,
	"trigger" text NOT NULL,
	"aliases" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"content" text DEFAULT '' NOT NULL,
	"embeds" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "robotman_responses_guild_idx" ON "robotman_responses" USING btree ("guild_id","trigger");