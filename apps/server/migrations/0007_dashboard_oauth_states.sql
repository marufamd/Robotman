CREATE TABLE "robotman_dashboard_oauth_states" (
	"nonce_hash" text PRIMARY KEY NOT NULL,
	"state_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE INDEX "robotman_dashboard_oauth_states_expiry_idx" ON "robotman_dashboard_oauth_states" USING btree ("expires_at");