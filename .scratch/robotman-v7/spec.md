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
- Preserve embeds and placeholders, including user and channel substitutions.
- Remove substring wildcard matching.
- Create, edit, and delete Responses through the dashboard only. Discord-side management menus and modals are excluded.

## Recommendations

- Public `/recs` lookup with one autocomplete field across character, writer, moderator, and booster Recommendation Entries.
- Autocomplete displays category labels to distinguish otherwise identical names.
- `/recs list` provides the Recommendation Directory with an optional category filter.
- Manage Recommendation Entries through the dashboard only.

## Guild access and installation

- Discord OAuth for dashboard sign-in.
- Guild management requires ownership, Manage Server, or Administrator access; recheck permissions on writes.
- Show Managed Guilds where Robotman is installed as usable. Show other Managed Guilds disabled with an invite action.
- Check Bot Installation through Discord REST and cache status briefly in the application server, without Redis.
- Invite with `bot` and `applications.commands` scopes and the permissions required by retained features, including sending messages and embeds.

## Retained commands

| Category | Retained commands and behavior |
|---|---|
| Comics | `character`, `comic`, `locg`, `pull`, `pull-user` |
| Fun | `coin`, `dad-joke`, `eight-ball` |
| Games | `connect-four`, `hangman`, `tic-tac-toe`; redesign input and session handling for HTTP interactions |
| Moderator | `release-list`, `shows`; keep the weekly release-list scheduled post as well as its command |
| Movies and TV | `letterboxd`, `movie`, `show` |
| Pokémon | `pokemon` lookup |
| Search | `google`, `youtube`; repair their API integrations |
| Utility | `color`, `math`, `ping`, `stats`; change Ping to report HTTP/API latency |
| Responses and Recommendations | `/response`, `/recs`, `/recs list` as described above |

## Removed commands and features

- Dictionary: `define`, `synonym`.
- Random animal images: `random`.
- Games: Akinator (`aki`) and `trivia`.
- All owner commands: `deploy`, `eval`, `exec`, `import`, `reboot`, `reload`, `sql`. Command registration and operational administration belong to deployment tooling.
- Book search: `book`.
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
