# Robotman v7: agreed rewrite scope

This is the authoritative scope recovered from the earlier command-by-command design conversation and updated with the subsequent Turborepo, pnpm, Drizzle, and migration decisions. Retain only the explicitly selected features below; the legacy command catalog is not the scope by default.

## Architecture

- Ground-up TypeScript rewrite on the orphan `v7` branch in the `robot-v7` worktree.
- pnpm and Turborepo, with `apps/server`, `apps/dashboard`, and shared `packages/*` as needed.
- One Docker-hosted server on the private host receives Discord HTTPS interactions and serves the GraphQL API backed by PostgreSQL. Use discord.js without starting a Gateway client.
- TanStack Start, Router, Query, Table, React, and Tailwind for the dashboard, with the `robot-next` branding and styles as a design reference. The dashboard is hosted on Vercel.
- Dashboard and server use different domains. Vercel proxies same-origin `/api/*` requests, including GraphQL and OAuth, to the Docker server.
- No Redis, separate bot process, passive message listeners, or automatic news crossposting.
- All Discord commands are server-only, including standalone utilities.

## Responses

- Public `/response <trigger>` lookups replace message-triggered auto-responses.
- Triggers and aliases match exactly and case insensitively.
- Preserve embeds and support `{user}`, `{username}`, `{avatar}`, `{server}`, and `{channel}` placeholders in message text and textual embed properties.
- Remove substring wildcard matching.
- Create, edit, and delete Responses through the dashboard only. Discord-side management menus and modals are excluded.
- Display saved Responses in a compact TanStack Table with Trigger, Aliases, Reply, Created by, Last edited by, and Actions columns, search, trigger sorting, pagination, and matching icon buttons for Edit and Delete. Show authors' Discord usernames with their stable user IDs on hover. Cache usernames from authenticated Discord profiles without extra Discord lookups; preserve recorded author IDs when a historical username is unavailable.
- Provide dedicated Add/Edit pages with separate optional message and embed sections. The visual embed builder supports up to 10 standard Discord embeds, add/remove/reorder controls, inline Discord-limit validation, and preservation of imported embed properties it does not expose.
- Show a live preview using `@skyra/discord-components-react` for the trigger and Robotman response beside the editor on wide screens and below it on narrow screens. Render Markdown and placeholders using the signed-in manager and selected server, with `#general` as the example channel.

## Recommendations

- Public `/recs` lookup with one autocomplete field across character, writer, moderator, and booster Recommendation Entries.
- Autocomplete displays category labels to distinguish otherwise identical names.
- `/recs taste-test`, `/recs characters` and `/recs writers` provide separate Recommendation Lists (see `.scratch/recommendation-discovery/spec.md`); they replace the combined `/recs list` directory.
- Manage Recommendation Entries through the dashboard only. Each entry owns an independent rich reply with Response-equivalent text, multi-embed editing, placeholders, validation and preview; names and optional aliases control discovery rather than limiting reply content.
- Moderator and Booster entries are static personal book lists, limited to one per person per server across both categories. The curator name is the list name, unique across those categories; an optional manually entered Discord user ID also identifies duplicate personal lists. Role changes or leaving the server do not change them. Curator placeholders display plain names without mentions.
- Retain the exact original Moderator/Booster introductions by default; allow server/category defaults and per-entry inherited, custom or omitted introductions. Character and Writer entries default to no introduction; Character includes teams, arcs and themes.
- Recommendation Lists show collection names only, alphabetically ordered. Taste Test (Mods and Boosters headings) is unpaginated and overflows into extra messages; Character and Writer lists page ten names at a time. Each list has a configurable title, introduction and color. Save publishes immediately; each lookup returns one message with multiple embeds without silently truncating content. Full requirements are in `.scratch/recommendation-customization/spec.md`.

## Moderator commands and guild settings

- `/shows` uses the Guild's selected television series to retrieve a week's episodes and formats the legacy Markdown Episode Comment Templates.
- Publish those templates with Paste.ee using the server-side `PASTEE_KEY` and return the “Comment Templates” link. Do not return Discord embeds from `/shows`.
- If `PASTEE_KEY` is missing or Paste.ee fails, send the titled templates as a public `.txt` attachment. If there are no episodes, return a plain no-episodes message.
- TVmaze requests do not require an API key.
- Each Guild's dashboard settings store its weekly Release-list Schedule (destination channel, weekday, time, and time zone) and selected TVmaze show IDs. Do not import existing environment-based settings.
- New Guild settings use Sunday at 00:00 UTC and the current built-in TVmaze show selection. Leave the channel unset so automatic posting stays disabled until a manager selects one.
- Both scheduled and manual `/release-list` posts go to the configured Guild channel. Reuse the existing heading, embeds, and pinned heading; manual invocation returns an ephemeral success confirmation in the invocation channel.
- The default date for manual `/release-list` uses that Guild's time zone. If its channel is unset or delivery fails, return an ephemeral explanation.

## Guild access and installation

- Discord OAuth for dashboard sign-in.
- Persist dashboard sessions and their Management Permission Snapshots in PostgreSQL so both survive server restarts and deployments. The browser holds a signed opaque session identifier. Sessions expire seven days after sign-in without activity-based renewal; browser sessions are independent and logout revokes only the current session. Database failures deny protected requests with a retryable error without clearing the cookie or existing dashboard identity. See ADR-0008.
- Pending OAuth state survives restarts with a ten-minute, single-use lifetime. If sign-in expires while editing a Response, preserve the draft in the current tab for the same user and server through reauthentication, requiring an explicit save retry.
- Guild management requires ownership, Manage Server, or Administrator access. Cache the first Discord server-list response for the signed-in session and authorize reads/writes from that snapshot; do not refetch permissions on page loads or saves. A new sign-in refreshes the snapshot.
- Show Managed Guilds where Robotman is installed as usable. Show other Managed Guilds disabled with an invite action.
- Check Bot Installation using one shared, briefly cached Discord REST bot-server list, without Redis or a request for every managed server. Coalesce concurrent requests and honor Discord retry delays.
- Invite with `bot` and `applications.commands` scopes and the permissions required by retained features, including sending messages and embeds.

## Retained commands

| Category | Retained commands and behavior |
|---|---|
| Comics | `character`, `locg`, `pull`, `pull-user` |
| Fun | `coin`, `dad-joke`, `eight-ball` |
| Games | `connect-four`, `hangman`, `tic-tac-toe`; redesign input and session handling for HTTP interactions |
| Moderator | `release-list`, `shows`; use per-Guild dashboard settings and behavior described above |
| Movies and TV | `letterboxd`, `movie`, `show` |
| Pokémon | `pokemon` lookup |
| Search | `youtube`; retain its API integration |
| Utility | `color`, `math`, `ping`, `stats`; change Ping to report HTTP/API latency |
| Responses and Recommendations | `/response`, `/recs lookup`, `/recs taste-test`, `/recs characters`, `/recs writers` as described above |

## Removed commands and features

- Dictionary: `define`, `synonym`.
- Random animal images: `random`.
- Games: Akinator (`aki`) and `trivia`.
- All owner commands: `deploy`, `eval`, `exec`, `import`, `reboot`, `reload`, `sql`. Command registration and operational administration belong to deployment tooling.
- Book search: `book`.
- Comic detail lookup: `comic` (removed during the command-parity review; `/locg` remains).
- Utility: `help`, `leaderboard`, `set-color`, `time`.
- Pokémon fusion: `fuse`.
- Wiki: `wiki`, `wikia`.
- Message-based scoring, the leaderboard system, and automatic news crossposting.
- Discord-side Response or Recommendation CRUD, wildcard matching, Redis, and Gateway message processing.

## Existing data and cutover

- Design a fresh PostgreSQL schema using Drizzle, with reviewed SQL migrations.
- Import existing Responses, Recommendation Entries, and change history. Report unmappable records for review.
- Retired leaderboard/rank data and trivia-specific data are not part of the v7 application or its import.
- Inspect the actual deployed export before finalizing mappings, including columns and historical timestamp interpretation.
- Use a maintenance window: stop writes, import and verify, then switch to v7. Retain the original database for rollback.

## Source of decisions

Recovered from the original design session of October 10, 2026, including the user's command dispositions, later clarifications, and approval of the final design. The later pnpm/Turborepo layout, Drizzle, and maintenance-window choices extend that design; they do not reintroduce removed features.
