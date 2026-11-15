# Durable dashboard sessions

Status: implemented and verified.

## Agreed behavior

- Persist dashboard login and its Management Permission Snapshot in existing PostgreSQL. Keep a signed opaque session identifier in the browser; do not trust browser-stored permissions.
- Preserve identity and the first successful permission snapshot across restarts and deployments. Never refetch an existing snapshot on page loads or saves. A new sign-in captures a new snapshot.
- Expire sessions exactly seven days after sign-in, without renewal through activity. Browser sessions are independent; logout revokes only the current session.
- Deny protected requests on database failure, returning a retryable service error. Retain cookies and existing dashboard identity; do not misreport infrastructure failure as session expiry.
- Persist pending OAuth state with a ten-minute expiry and atomic single-use consumption. A restart during Discord authorization must not break the callback.
- On expiry while editing a Response, retain the draft in the current tab, prompt for sign-in, and require an explicit save retry. Never automatically resubmit mutations.
- Accept one final sign-in at initial deployment; do not migrate live memory sessions.

## Implementation plan

1. Add Drizzle schema and reviewed SQL migration for sessions and pending OAuth state. Store a hash of the random session identifier, identity, CSRF data, expiry, required OAuth credentials, and a nullable permission snapshot. Distinguish an unloaded snapshot from a successfully loaded empty list.
2. Introduce a PostgreSQL session store shared by auth and application database wiring. Load session identity once per HTTP request, propagate asynchronous access through GraphQL and content-author lookups, and avoid an authoritative cross-request memory cache. Closing an application must close resources without deleting durable sessions.
3. Persist login, state validation, session reads and current-session logout. Enforce expiry during reads independently of cleanup. Add bounded cleanup of expired session/state rows and preserve existing signed-cookie, secure-cookie and CSRF checks.
4. Initialize the first permission snapshot with database coordination so concurrent requests or server instances cannot overwrite it or race OAuth refreshes. Failed initialization stays retryable; do not keep a transaction open for the full seven-day session. Keep Bot Installation's existing one-minute memory cache separate.
5. Return distinct machine-readable unauthenticated and temporary-service errors. Update dashboard auth handling so an expired session prompts reauthentication, while a database outage preserves existing UI identity and offers retry. On initial load without known identity, show a service error rather than pretending the user is signed in or signed out.
6. Preserve the Response draft across same-tab OAuth navigation using tab-scoped sessionStorage, scoped to the original Discord user, server and Response/new editor. Restore only after the same user signs in and access is checked again; never save automatically. Clear the saved draft after successful save or explicit discard. A different user's sign-in must not load or submit the original user's draft.
7. Add PostgreSQL integration tests for restart persistence with Discord unavailable, cross-instance logout, exact seven-day expiry, OAuth state restart/replay/expiry, empty snapshots, concurrent initialization and database outage recovery. Verify CSRF still works after restart. Add focused dashboard checks for reauthentication, draft recovery and no automatic mutation retry.
8. Run server tests and relevant workspace typechecks/builds, document migration and stable SESSION_SECRET requirements, and update issue 02's follow-up status after implementation. Deploy schema before the new runtime; document the one-time sign-in and that rolling back to the memory implementation loses durable-session behavior.

## Validation scenarios

- Sign in, initialize permissions, stop the server, make Discord unavailable, restart, and read/write Responses with the same cookie and zero new Discord permission requests.
- Restart between OAuth redirect and callback; sign-in succeeds once and replay fails.
- Remove a manager's Discord permission: the stored snapshot remains authoritative until expiry or a new sign-in, as required by the existing v7 spec.
- Expire a session with an unsaved Response draft; sign in again, restore the draft for the same user, and save only after an explicit retry with fresh CSRF data.
- Disconnect and restore PostgreSQL: protected actions fail safely, cookies remain intact, and the same unexpired session recovers.

## Scope limits

No Redis, localStorage-based authorization, sliding expiry, sign-out-everywhere feature, periodic permission refresh, automatic mutation replay, or migration of existing memory sessions. No promise of draft recovery across devices or after closing the tab.

## References

- `docs/adr/0008-persist-dashboard-sessions.md`
- `.scratch/robotman-v7/spec.md`
- `.scratch/robotman-v7/issues/02-dashboard-login-guild-selection.md`

## Implementation result — 2026-11-02

Implemented in `apps/server/src/auth/session-store.ts`, the auth/application integration, and the dashboard auth and Response editor flows. Drizzle migrations 0006 and 0007 add sessions and OAuth state. Session identifiers and OAuth nonces/state are stored as hashes; session identity, credentials, CSRF data and the optional Management Permission Snapshot are stored server-side. Snapshot initialization uses a row lock and preserves refreshed OAuth credentials if the subsequent Discord server-list fetch fails. Expired rows are cleaned in bounded batches when a new sign-in starts; validity is always enforced during reads.

TDD used HTTP/OAuth and GraphQL with real disposable PostgreSQL, plus real-browser dashboard flows with mocked external API responses. Observed failures before fixes for restart identity, restart during OAuth, cross-instance duplicate snapshots, outage classification, same-request logout revocation, the missing reauthentication flow, and a hidden tab-storage failure message.

Validation: all 81 server integration tests passed on a fresh isolated PostgreSQL database; seven focused durable-auth tests passed again after the final REST error handling change. Three Playwright browser tests passed with Chromium, including fresh CSRF after reauthentication, explicit save, storage-quota failure without navigation, outage recovery and account isolation. Workspace build and typecheck passed. Reviewed desktop and 390px mobile prompt captures. The design detector reported only existing sidebar accent-border warnings; the sidebar design was retained.
