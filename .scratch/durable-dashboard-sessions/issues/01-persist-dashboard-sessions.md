# 01: Preserve dashboard sign-in and permissions across restarts

Status: resolved

**What to build:** Persist dashboard sessions, their Management Permission Snapshots, and pending OAuth state in PostgreSQL. Preserve fixed expiry, per-browser logout, retryable outage behavior, and Response drafts through reauthentication.

## Acceptance

- [x] Session and snapshot survive application restart without new Discord permission requests.
- [x] Ten-minute single-use OAuth state survives a restart during sign-in.
- [x] Seven-day expiry is fixed; logout revokes the current browser across instances and within subsequent GraphQL mutation fields.
- [x] Concurrent instances capture one snapshot; a loaded empty snapshot persists too.
- [x] Database outages deny access with a retryable error and retain cookies.
- [x] Response drafts survive same-tab reauthentication only for the same user and server, with fresh CSRF and explicit save.
- [x] Storage failures keep the editor open and explain recovery.
- [x] Migrations, rollout requirements, automated checks and architecture decisions are documented.

## Answer

See [the implementation result](../spec.md) and [ADR-0008](../../../docs/adr/0008-persist-dashboard-sessions.md). Verified 81 server integration tests, seven final focused auth checks, three browser checks, workspace build and typecheck. The first deployment requires one final sign-in; keep SESSION_SECRET stable thereafter.
