CREATE TABLE "robotman_response_change_history" (
	"change_id" text PRIMARY KEY NOT NULL,
	"guild_id" text NOT NULL,
	"response_id" text NOT NULL,
	"action" text NOT NULL,
	"actor_id" text NOT NULL,
	"trigger" text NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "robotman_response_history_action_check" CHECK ("robotman_response_change_history"."action" in ('created', 'updated', 'deleted'))
);
--> statement-breakpoint
CREATE INDEX "robotman_response_history_guild_idx" ON "robotman_response_change_history" USING btree ("guild_id","occurred_at");