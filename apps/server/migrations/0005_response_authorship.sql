CREATE TABLE "robotman_discord_users" (
	"user_id" text PRIMARY KEY NOT NULL,
	"username" text NOT NULL
);
--> statement-breakpoint
CREATE INDEX "robotman_response_history_authorship_idx" ON "robotman_response_change_history" USING btree ("guild_id","response_id","action","occurred_at","change_id");