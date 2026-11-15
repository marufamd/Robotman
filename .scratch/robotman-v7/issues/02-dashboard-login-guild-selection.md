# 02: Sign in to the dashboard and select a Managed Guild

**What to build:** A Discord user signs in to the TanStack Start dashboard and selects a Managed Guild. Installed guilds are usable; guilds without Robotman appear disabled with an invite action.

**Blocked by:** 01: Run Discord interactions and the API over HTTP

**Status:** resolved

- [x] Discord OAuth sign-in and sign-out work through the dashboard same-origin API proxy.
- [x] Managed Guild access follows ownership, Manage Server, or Administrator permissions.
- [x] Bot Installation status is checked through Discord REST with a brief server-local cache, without Redis.
- [x] The invite action requests bot and application-command scopes with permissions required by retained features.


## Answer

Implemented Discord OAuth login and logout, signed session cookies, CSRF protection, and the dashboard same-origin API proxy. Managed Guild selection checks ownership, Manage Server, or Administrator permission and installation status through cached Discord REST requests. Uninstalled guilds show a scoped invite action. Selection is retained in the dashboard URL. Sessions are process-local; a backend restart signs users out.

Validation: all 53 integration tests passed with real disposable PostgreSQL; workspace build and typecheck passed. The fresh Docker deployment passed signed interaction and PostgreSQL readiness checks. Setup and credential requirements are documented in README.

## Session caching correction — 2026-10-19

The first successful Discord server-list fetch after sign-in is cached for that session. All subsequent content reads and writes authorize against the cached ownership/Manage Server/Administrator snapshot, with CSRF still required for writes. There is no periodic permission refresh; signing out and back in, session expiry, or a server restart requires a new snapshot. This replaces the earlier fresh-Discord-check-on-every-write requirement at the user's request.

Bot Installation is resolved from one paginated bot-server list shared by all dashboard sessions, cached for one minute. Concurrent list loads share the same pending request. Auth transport remembers Discord's `Retry-After`/`retry_after` deadline and does not send more requests during that window. The dashboard loads local session identity independently of the server list, so an installation-list failure does not turn a signed-in user into an anonymous user or redirect them to sign-in.

Regression coverage includes concurrent loads, session reuse after OAuth-token expiry, fresh permissions on a new sign-in, retry-window suppression and recovery, and real PostgreSQL Response CRUD while Discord is unavailable with no additional Discord calls. All 74 server tests passed.

References: [Discord rate-limit response handling](https://docs.discord.com/developers/topics/rate-limits), [Get Current User Guilds](https://docs.discord.com/developers/resources/user#get-current-user-guilds).

## Durable sessions design — 2026-11-02

Implemented and verified follow-up: persist dashboard sessions and their Management Permission Snapshots in PostgreSQL with a signed opaque session identifier in the browser. This supersedes the process-local session limitation above: restarts preserve sign-in and the original snapshot. Keep a fixed seven-day lifetime, independent browser sessions, and logout scoped to the current session. A database outage denies protected requests with a retryable error, retaining the cookie and existing dashboard identity. Persist single-use OAuth state for ten minutes, preserve Response drafts in the current tab across reauthentication without automatic saving, and accept one final sign-in at initial rollout. See ADR-0008 and `.scratch/durable-dashboard-sessions/spec.md` for the follow-up plan.


The durable-session follow-up is complete. Migrations 0006/0007 add PostgreSQL sessions and single-use OAuth state. The suite passes 81 server tests and three browser recovery checks; workspace build/typecheck pass. See `.scratch/durable-dashboard-sessions/issues/01-persist-dashboard-sessions.md` for acceptance and rollout details.
