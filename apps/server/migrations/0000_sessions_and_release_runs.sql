CREATE TABLE IF NOT EXISTS "robotman_game_sessions" (
	"session_id" text PRIMARY KEY NOT NULL,
	"game" text NOT NULL,
	"guild_id" text NOT NULL,
	"channel_id" text NOT NULL,
	"players" jsonb NOT NULL,
	"state" jsonb NOT NULL,
	"status" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "robotman_game_sessions_game_check" CHECK ("robotman_game_sessions"."game" in ('connect-four', 'hangman', 'tic-tac-toe')),
	CONSTRAINT "robotman_game_sessions_status_check" CHECK ("robotman_game_sessions"."status" in ('setting', 'active', 'finished', 'expired'))
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "robotman_release_list_runs" (
	"release_date" date PRIMARY KEY NOT NULL,
	"channel_id" text NOT NULL,
	"status" text NOT NULL,
	"attempted_at" timestamp with time zone NOT NULL,
	"posted_at" timestamp with time zone,
	"error_text" text,
	CONSTRAINT "robotman_release_list_runs_status_check" CHECK ("robotman_release_list_runs"."status" in ('running', 'posted', 'failed'))
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "robotman_game_sessions_expiry_idx" ON "robotman_game_sessions" USING btree ("expires_at") WHERE "robotman_game_sessions"."status" in ('setting', 'active');