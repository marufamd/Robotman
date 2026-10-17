# 03: Manage Responses and Recommendation Entries from the dashboard

**What to build:** An authorized guild manager creates, views, edits, and deletes Responses and Recommendation Entries from the dashboard.

**Blocked by:** 01: Run Discord interactions and the API over HTTP; 02: Sign in to the dashboard and select a Managed Guild

**Status:** resolved

- [x] Responses retain content, exact triggers and aliases, embeds, and user/channel placeholders; substring wildcard matching is excluded.
- [x] Recommendation Entries support character, writer, moderator, and booster categories.
- [x] Data is scoped to the selected guild, and management permissions are rechecked on writes.
- [x] CRUD is available only through the dashboard; no Discord-side management commands, menus, or modals are introduced.

## Answer

Implemented dashboard CRUD for guild Responses and Recommendation Entries over authenticated GraphQL. PostgreSQL rows are guild-scoped, and every request rechecks current Discord ownership, Manage Server, or Administrator permission. Writes also require the session CSRF cookie and header. Response triggers and aliases are normalized and protected from case-insensitive collisions with a guild advisory transaction lock. Embed JSON is validated and retained with message text/placeholders. Recommendation Entries support character, writer, moderator, and booster categories with name, description, and link fields.

The dashboard exposes both collections after selecting an installed guild and supports create, edit, and delete. No Discord-side CRUD commands, menus, or modals were added. Reviewed migrations add the Responses and Recommendation Entry tables.

Validation: public GraphQL HTTP tests against real PostgreSQL cover CRUD, guild access, current permission checks, CSRF, trigger uniqueness, embed preservation, and all four Recommendation Entry categories. All 57 server tests passed. Workspace build and typecheck passed. A Chrome flow through the Vercel-style same-origin proxy exercised dashboard create, edit, and delete for both kinds of content against a local API fixture.
