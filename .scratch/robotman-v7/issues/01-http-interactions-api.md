# 01: Run Discord interactions and the API over HTTP

**What to build:** Build the new pnpm/Turborepo foundation from the ground up. Discord reaches the shared TypeScript server through a signature-verified HTTP endpoint, and that same Docker-hosted server exposes GraphQL backed by PostgreSQL.

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] The new orphan-branch source tree uses pnpm and Turborepo with separate server and dashboard applications and no inherited legacy runtime or dependencies.
- [x] Correctly signed Discord ping requests receive their acknowledgement; missing, invalid, and tampered signatures are rejected.
- [x] The shared server exposes PostgreSQL-backed GraphQL and runs with PostgreSQL in Docker, without a Gateway connection or Redis.

## Answer

Built a fresh pnpm/Turborepo workspace with the shared TypeScript HTTP server, a TanStack Start dashboard scaffold, and shared TypeScript configuration. Discord interaction signatures are checked over the original request bytes. GraphQL readiness uses Drizzle against PostgreSQL, and database failures return sanitized errors. Request bodies are bounded to one megabyte.

The Docker build prunes the workspace to the server and deploys its production dependencies. Compose starts only the server and PostgreSQL, and container health is verified through GraphQL. No legacy runtime, Gateway process, Redis, or retired commands are included.

Validation passed: both application builds, both application typechecks, eight HTTP integration tests against isolated real PostgreSQL, and the Docker deployment integration test. Tests cover signed pings, missing/invalid/tampered signatures, unsupported and malformed interactions, database success and failure, body limits, named GraphQL operations, and field validation. Test resources are removed afterward.

Red/green cycles were observed for the initial signed ping, unsupported interaction, database-backed GraphQL, database failure, request size limit, and Docker deployment. Runtime setup and repeatable validation commands are documented in the repository README. Dashboard authentication and retained business commands remain assigned to subsequent tickets.
