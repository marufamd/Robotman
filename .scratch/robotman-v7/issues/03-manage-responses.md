# 03: Manage Responses and Recommendation Entries from the dashboard

**What to build:** An authorized server manager creates, views, edits, and deletes Responses and Recommendation Entries from the dashboard.

**Blocked by:** 01: Run Discord interactions and the API over HTTP; 02: Sign in to the dashboard and select a Managed Guild

**Status:** resolved

- [x] Responses retain content, exact triggers and aliases, embeds, and all five legacy placeholders; substring wildcard matching is excluded.
- [x] Responses use dedicated Add/Edit pages, a visual multi-embed builder, inline Discord-limit validation, unknown embed-property preservation, and a live Discord-style preview.
- [x] Recommendation Entries support character, writer, moderator, and booster categories.
- [x] Data is scoped to the selected guild, and writes check management access from the signed-in session's cached server permissions.
- [x] CRUD is available only through the dashboard; no Discord-side management commands, menus, or modals are introduced.

## Answer

Implemented dashboard CRUD for server Responses and Recommendation Entries over authenticated GraphQL. PostgreSQL rows are guild-scoped, and every request checks ownership, Manage Server, or Administrator permission from the session's cached Discord server-list snapshot. Writes also require the session CSRF cookie and header. Response triggers and aliases are normalized and protected from case-insensitive collisions with a guild advisory transaction lock. Embed data is validated and retained with message text/placeholders. Recommendation Entries support character, writer, moderator, and booster categories with name, description, and link fields.

The dashboard exposes both collections after selecting an installed guild and supports create, edit, and delete. No Discord-side CRUD commands, menus, or modals were added. Reviewed migrations add the Responses and Recommendation Entry tables.

Validation: public GraphQL HTTP tests against real PostgreSQL cover CRUD, guild access, current permission checks, CSRF, trigger uniqueness, embed preservation, and all four Recommendation Entry categories. All 57 server tests passed. Workspace build and typecheck passed. A Chrome flow through the Vercel-style same-origin proxy exercised dashboard create, edit, and delete for both kinds of content against a local API fixture.

## Design update — 2026-10-19

The Response editor uses dedicated Add/Edit pages. Message text and embeds are independent optional sections, but a saved Response must contain text or at least one non-empty embed. Managers can add, remove, and reorder up to 10 visual embeds with title and URL, description, color, author, fields and inline options, thumbnail, image, footer, and timestamp controls. Validate Discord message/embed limits inline. When editing imported embeds, retain properties that are not exposed by the form without requiring raw JSON editing.

Show a live preview using `@skyra/discord-components-react`: place it beside the form on wide screens and below the form on narrow screens. Render the trigger and bot response, including Markdown and all five placeholders, using the signed-in manager and selected server; use `#general` as the example channel. Preserve v7 exact trigger/alias matching and do not restore wildcard or response-type controls.

The placeholders are `{user}` (requester mention), `{username}` (requester username), `{avatar}` (requester avatar URL), `{server}` (current server name), and `{channel}` (invocation channel mention). They apply to message text and textual embed properties.

## Design refinement — 2026-10-19

Keep the response editor's existing dashboard colors and visual language, but reduce the heading, section, control, and spacing scale on the editor pages only. Render the preview with Skyra's Discord message components as the visible message surface, including its `#general` channel context, and load Whitney from Skyra's font CDN with an explicit font override so the component library uses it. The sample user interaction is a `/response <trigger>` slash command and Robotman's reply is visibly attached to that command. Use the components' own spacing without extra vertical utility gaps or a second app-styled frame around the Discord surface.

## Implementation update — 2026-10-19

The Responses list links to dedicated create and edit routes. The editor builds Discord embed objects from accessible form controls and serializes them through the existing `embedsJson` GraphQL field, preserving properties that the form does not expose. `@skyra/discord-components-react` 4.0.2 renders the preview; `discord-markdown` 2.5.0 renders message and embed text. The server validates content and embed character/count limits before saving.

`/response` now substitutes all five placeholders. Requester and channel values come from the interaction; the current server name is fetched through Discord REST and cached briefly, with “this server” used if that lookup is unavailable.

The editor now uses a compact page header, controls, and denser form spacing without changing shared dashboard typography or colors. The preview places one Skyra `DiscordCommand` in the bot `DiscordMessage`'s `reply` slot, which supplies the attached slash-command reference and connector. It does not render a second command row or a duplicate `DiscordReply`. Whitney is loaded from Skyra's CDN and scoped to the preview. Embed footer timestamps are rendered by Skyra's component.

Tailwind Preflight's outer reset was overriding Skyra's shadow-host margins and padding, collapsing the message gutter and putting the connector outside the preview. The preview rolls back the base reset with `revert-layer` for its content and pseudo-elements so Skyra controls native spacing, including embed spacing. The editor also rolls back the unlayered form-font reset so its compact typography utilities apply; otherwise the requested 13px button labels inherited 16px instead.

Browser regression checks measured the actual rendered message gutter (14.4px), command inset (56px), exactly one command reference attached to the bot message, and 13px button labels. A separate unsaved editor instance exercised message text and a populated embed, including description and footer spacing.

Validation for this update: dashboard and server typechecks passed; dashboard production build passed; `git diff --check` passed. Tests were not run.

## Saving correction — 2026-10-19

Response reads and saves reuse the permissions loaded when the session first fetches its server list. They make no additional Discord requests. A GraphQL HTTP regression test against real PostgreSQL creates, reads, and deletes a Response while the mocked Discord API returns 429s and verifies that no Discord requests were made. New permissions are loaded on a fresh sign-in; CSRF and server scoping remain enforced. See issue 02 for the session caching decision and retry handling.

## Response list refinement — 2026-10-19

Saved Responses use TanStack Table with aligned Trigger, Aliases, Reply, and Actions columns. Managers can search triggers, aliases, and message text, sort triggers, and page through ten rows at a time. Edit and Delete use matching 32px icon controls with accessible names and keyboard focus styles; Delete retains confirmation and displays a pending state. The list header and New Response action use the compact editor scale and existing dashboard colors. Empty, loading, no-match, and error states remain available, and narrow screens scroll the table horizontally with Actions pinned at the right.

Validation: dashboard typecheck and production build passed. Chrome checks confirmed search/no-match recovery, ascending/descending sort state, 13px New Response text, matching 32px action controls, and a narrow layout without page overflow. Existing saved content was preserved.

## Response authors — 2026-10-19

The list includes Created by and Last edited by columns. Show the Discord username, with the immutable Discord user ID in the hover title and accessible label. The creator is the earliest recorded creation actor; the last editor is the latest recorded update actor. Creation alone shows “Not edited” in the latter column. Missing creation history shows “Not recorded”; a known author ID without a cached username shows “Unknown user” and retains the ID on hover.

Authorship comes from existing server-scoped Response change history. Persist authenticated profile usernames by Discord user ID, updating the cache when that manager next opens Responses or saves a Response. No Discord requests are added to reads or writes. Migration 0005 creates this profile cache and an index for history lookups; it preserves all existing Responses and history. Legacy authors gain names when their authenticated profile is available, without guessing names or assigning the viewer as creator.

Validation: server and dashboard typechecks and production builds passed. Chrome rendered both columns against the local database and verified the existing Response's creator username and Discord-ID hover title; an unedited Response shows “Not edited.” No tests were added or run for this change.


## Rich recommendation correction — 2026-11-02

Replaced the simplified recommendation form with independent freely authored text/multi-embed replies using the shared Response editor. Dedicated Add/Edit pages support names, aliases, static personal curator attribution, optional Discord user IDs, original Taste Test introduction defaults and per-entry overrides. A separate settings page controls category defaults and directory presentation. Existing details/links are preserved by migration; the legacy production import remains separate. See `.scratch/recommendation-customization/spec.md` and ADR-0009.

Validation: 87 server integration tests and five browser tests passed, including schema upgrade preservation, signed lookups/autocomplete/directory pagination, CSRF/access checks, limits and draft recovery. Workspace build/typecheck passed.
