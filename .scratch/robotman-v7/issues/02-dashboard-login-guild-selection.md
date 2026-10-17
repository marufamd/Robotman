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
