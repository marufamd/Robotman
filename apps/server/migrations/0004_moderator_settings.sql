ALTER TABLE "robotman_release_list_runs" ADD COLUMN "guild_id" text NOT NULL DEFAULT '';
--> statement-breakpoint
UPDATE "robotman_release_list_runs" SET "guild_id" = 'legacy:' || "channel_id" WHERE "guild_id" = '';
--> statement-breakpoint
ALTER TABLE "robotman_release_list_runs" DROP CONSTRAINT "robotman_release_list_runs_pkey";
--> statement-breakpoint
ALTER TABLE "robotman_release_list_runs" ADD CONSTRAINT "robotman_release_list_runs_guild_id_release_date_pk" PRIMARY KEY ("guild_id", "release_date");
--> statement-breakpoint
ALTER TABLE "robotman_release_list_runs" ALTER COLUMN "guild_id" DROP DEFAULT;
--> statement-breakpoint
CREATE TABLE "robotman_moderator_settings" (
	"guild_id" text PRIMARY KEY NOT NULL,
	"release_list_channel_id" text,
	"release_list_day_of_week" integer DEFAULT 0 NOT NULL,
	"release_list_hour" integer DEFAULT 0 NOT NULL,
	"release_list_minute" integer DEFAULT 0 NOT NULL,
	"release_list_time_zone" text DEFAULT 'UTC' NOT NULL,
	"tvmaze_show_ids" jsonb NOT NULL,
	CONSTRAINT "robotman_moderator_settings_weekday_check" CHECK ("robotman_moderator_settings"."release_list_day_of_week" between 0 and 6),
	CONSTRAINT "robotman_moderator_settings_hour_check" CHECK ("robotman_moderator_settings"."release_list_hour" between 0 and 23),
	CONSTRAINT "robotman_moderator_settings_minute_check" CHECK ("robotman_moderator_settings"."release_list_minute" between 0 and 59)
);
