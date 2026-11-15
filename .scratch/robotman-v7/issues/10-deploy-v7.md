# 10: Deploy v7 and migrate existing data

**What to build:** Deploy the TanStack Start dashboard on Vercel and the shared server in Docker, then import retained existing data into the fresh Drizzle-defined PostgreSQL schema during a maintenance window.

**Blocked by:** 02: Sign in to the dashboard and select a Managed Guild; 04: Review Response change history; 05: Request Responses and browse Recommendations through Discord; 06: Build retained utility and fun commands; 07: Build retained lookup commands and repair search integrations; 08: Build Connect Four, Hangman, and Tic Tac Toe; 09: Build moderator commands and the weekly release schedule

**Status:** in-progress — importer (`apps/server/src/import-legacy.ts`), deploy stack and workflows implemented; see `docs/deployment.md`. Remaining: first real deployment and cutover.

- [ ] Same-origin dashboard API requests, including GraphQL and OAuth, reach the Docker server across the distinct deployment domains.
- [ ] Use reviewed SQL migrations for the fresh schema and inspect the deployed legacy export before finalizing mappings.
- [ ] Import Responses, Recommendation Entries, and change history; report unmappable records and verify the import before cutover.
- [ ] Wildcard rows import as ordinary exact-trigger Responses.
- [ ] Do not import retired leaderboard/rank or Trivia data into v7.
- [ ] Stop writes during cutover and retain the original database for rollback.
- [ ] Deployment documentation covers required configuration, command registration, and verification.
