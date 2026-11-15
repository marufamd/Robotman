ALTER TABLE "robotman_recommendation_entries" ADD COLUMN "aliases" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "robotman_recommendation_entries" ADD COLUMN "content" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "robotman_recommendation_entries" ADD COLUMN "embeds" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "robotman_recommendation_entries" ADD COLUMN "curator_name" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "robotman_recommendation_entries" ADD COLUMN "curator_user_id" text;--> statement-breakpoint
ALTER TABLE "robotman_recommendation_entries" ADD COLUMN "introduction_mode" text DEFAULT 'inherit' NOT NULL;--> statement-breakpoint
ALTER TABLE "robotman_recommendation_entries" ADD COLUMN "introduction" text DEFAULT '' NOT NULL;
--> statement-breakpoint
UPDATE robotman_recommendation_entries
SET embeds = jsonb_build_array(jsonb_strip_nulls(jsonb_build_object(
  'title', name || ' · ' || initcap(category),
  'description', nullif(description || CASE WHEN url <> '' AND url !~* '^https?://' THEN E'\n\n' || url ELSE '' END, ''),
  'url', CASE WHEN url ~* '^https?://' THEN url ELSE NULL END
))), curator_name = CASE WHEN category IN ('moderator', 'booster') THEN name ELSE '' END;
