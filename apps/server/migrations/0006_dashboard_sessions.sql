CREATE TABLE "robotman_dashboard_sessions" (
	"token_hash" text PRIMARY KEY NOT NULL,
	"data" jsonb NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE INDEX "robotman_dashboard_sessions_expiry_idx" ON "robotman_dashboard_sessions" USING btree ("expires_at");