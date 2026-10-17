# 09: Build moderator commands and the weekly release schedule

**What to build:** Authorized moderators use release-list and shows, and Robotman continues posting the weekly comic release list on its schedule.

**Blocked by:** 01: Run Discord interactions and the API over HTTP

**Status:** resolved

- [x] Implement server-only release-list and shows commands with the required moderator access checks.
- [x] Keep the weekly release-list scheduled post, including its message and embed output.
- [x] Prevent duplicate scheduled posting when the deployment runs more than one instance.
- [x] Owner Discord commands and automatic news crossposting remain excluded; registration and administration use deployment tooling.

## Answer

Integrated moderator-only release-list and shows commands, including complete pagination within Discord embed limits. The weekly publisher defaults to Sunday midnight UTC for the following Tuesday and activates with a channel and bot token. Schedule settings are documented in README and .env.example. Reviewed migrations persist run records; PostgreSQL locking, leases, and deterministic channel-specific Discord nonces protect delivery across instances. Independent database clients verify duplicate suppression through the public scheduler interface.

Validation: all 53 integration tests passed with real disposable PostgreSQL; workspace build and typecheck passed. The fresh Docker deployment passed signed interaction and PostgreSQL readiness checks. Setup and credential requirements are documented in README.
