CREATE TABLE "robotman_recommendation_entries" (
	"recommendation_id" text PRIMARY KEY NOT NULL,
	"guild_id" text NOT NULL,
	"category" text NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"url" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "robotman_recommendations_category_check" CHECK ("robotman_recommendation_entries"."category" in ('character', 'writer', 'moderator', 'booster'))
);
--> statement-breakpoint
CREATE INDEX "robotman_recommendations_guild_idx" ON "robotman_recommendation_entries" USING btree ("guild_id","category","name");