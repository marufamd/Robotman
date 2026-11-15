# Robotman v7

A ground-up TypeScript rewrite using pnpm and Turborepo. The server handles Discord HTTP interactions and GraphQL in one Docker process; the TanStack Start dashboard is a separate application. The selected product scope lives in [.scratch/robotman-v7/spec.md](.scratch/robotman-v7/spec.md).

Tickets 1 through 9 are implemented: signed HTTP interactions, dashboard authentication and guild selection, guild content management and Response history, public Response and Recommendation lookups, the selected commands, persistent games, and per-Guild moderator settings. Production data migration remains in ticket 10.

## Workspace

- `apps/server`: Node HTTP server, discord.js protocol types, GraphQL, Drizzle, and PostgreSQL.
- `apps/dashboard`: TanStack Start, React, and Tailwind with Discord login and a same-origin API proxy.
- `packages/typescript-config`: shared compiler configurations.

## Setup

Install Node.js 22.12 or newer and Docker with Docker Compose. Enable the pnpm version pinned by this repository, then install dependencies and check the workspace:

```sh
corepack enable
corepack prepare pnpm@11.11.0 --activate
pnpm install --frozen-lockfile
pnpm build
pnpm typecheck
```

Create a Discord application and bot. Copy its application public key, client ID, client secret, and bot token into `.env`. Set the Discord OAuth redirect URL to `${DASHBOARD_ORIGIN}/api/auth/callback`. Configure the application to send HTTP interactions to your reachable server's `/interactions` endpoint. The bot installation uses the `bot` and `applications.commands` scopes.

Create the local environment file and replace the example secrets. Use a URL-safe PostgreSQL password or percent-encode reserved characters in `DATABASE_URL`; keep `.env` private and do not commit it.

```sh
cp .env.example .env
```

`.env.example` groups variables by the app that reads them. `DASHBOARD_PORT` sets the dashboard port, `SERVER_PORT` sets the server port, and `ROBOTMAN_API_ORIGIN` points the dashboard's `/api/*` proxy to the server. Keep `DASHBOARD_ORIGIN` set to the dashboard URL, including the configured port, because the server uses it for OAuth callbacks and origin checks. The defaults are `DASHBOARD_PORT=3000`, `SERVER_PORT=3001`, and `DASHBOARD_ORIGIN=http://localhost:3000`.

Set a random `SESSION_SECRET`, the Discord credentials above, and `DISCORD_TEST_GUILD_ID` if you want to register commands in one development guild. Set `DISCORD_PUBLIC_KEY` from the Discord application. `POSTGRES_PORT` and `SERVER_PORT` configure the host ports published by Docker Compose. PostgreSQL defaults to host port `5433` so it can run alongside a local PostgreSQL server on `5432`.

Turborepo builds dependency packages first and caches build outputs in this worktree. Integration tests deliberately bypass caching. Dashboard route generation is included in build outputs so cached builds also support typechecking.

## Run the server

The Compose stack reads `.env`. Set the Discord application's public key and PostgreSQL credentials before starting it. When credentials form a database URL, use URL-safe values or percent-encode reserved characters.

```sh
docker compose up --build -d --wait
```

Compose runs only PostgreSQL and the shared server. The server image uses `turbo prune` and a production pnpm deployment; it runs as a non-root user. Its health check executes the database-backed GraphQL readiness query. Published ports bind to localhost; put your HTTPS reverse proxy in front of the server and configure Discord's interaction endpoint as `https://your-host/interactions`.

For local development, `pnpm dev:local` starts PostgreSQL with Docker Compose and runs the server and dashboard. You can also start the database with `docker compose up postgres -d` and run `pnpm dev` directly. The root `.env` supplies settings for both apps. The dashboard listens on `DASHBOARD_PORT` (default 3000), and the server listens on `SERVER_PORT` (default 3001).

## Authentication and commands

Set `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, `DISCORD_BOT_TOKEN`, `DASHBOARD_ORIGIN`, and a random `SESSION_SECRET`. Register `${DASHBOARD_ORIGIN}/api/auth/callback` as the OAuth redirect URI in Discord. Set `ROBOTMAN_API_ORIGIN` in the dashboard deployment to the backend origin. Production uses HTTPS cookies; local development uses `NODE_ENV=development`.

Dashboard access requires server ownership, Manage Server, or Administrator permission. The first server-list fetch after sign-in is cached for the session; dashboard reads and saves use that permission snapshot without requesting it from Discord again. Sign out and back in to refresh changed server access. Installed servers can be selected; other managed servers show an invite action. Sessions and their permission snapshots are stored in PostgreSQL and survive backend restarts and deployments. Sign-in expires seven days after login without renewal through activity; signing out revokes only the current browser session. Keep `SESSION_SECRET` stable across restarts and identical across server instances, since changing it invalidates existing cookies.

A temporary database outage denies protected requests with a retryable error while retaining your sign-in cookie. If sign-in expires during Response editing, use **Sign in again** to preserve the draft in this tab and return after Discord authorization. Drafts are restored only for the same Discord account and server, never saved automatically, and cleared after a successful save or Cancel. Tab storage must be available; drafts are not shared across devices or retained after closing the tab.

After selecting an installed server, managers can create, edit, and delete Responses and Recommendation Entries in the dashboard, and review Change History for both Responses and recommendation lists by person and time, in pages that can be sorted newest or oldest first. Response triggers and aliases must be unique within the server, ignoring case. Responses use a visual embed editor and live Discord preview; text and embeds support `{user}`, `{username}`, `{avatar}`, `{server}`, `{channel}` and `{trigger}` (what the requester typed) variables, listed beside the editors; personal lists add `{curator_name}`. Under **Responses → Response Settings**, managers can set a default introduction shown above Responses; each Response can use it, replace it, or omit it (new Responses use it). Recommendation Entries own independent rich replies with the same text, multi-embed editor, placeholders, and live preview as Responses. Their display names and optional search aliases control discovery in character, writer, moderator, and booster categories. Names are unique within a server/category; a curator can have multiple lists. Moderator and Booster collections have a saved curator name and optional Discord user ID, with no role or membership synchronization. `{curator}` and `{curator_name}` display that saved name as plain text. The API checks cached session permissions and CSRF protection on every write. Server members can request exact Responses with `/response <trigger>`, find Recommendations with `/recs lookup <name>`, and browse them with `/recs list [category]`.

Under **Recommendations → Recommendation Settings**, managers can customize the title, introduction and color of the Taste Test, Characters and Writers lists (plus Taste Test's Mods and Boosters headings) and the default introductions of each category. Moderator and Booster entries start with the original Taste Test wording; Character and Writer entries start without an introduction. Each entry can inherit, replace, or omit its introduction. Save publishes immediately. `/recs taste-test` lists personal-list names under Mods and Boosters (extra messages if it is long), while `/recs characters` and `/recs writers` page ten names at a time with public Previous/Next buttons; none show replies; autocomplete searches names and aliases and uses stable entry IDs. Individual replies are one message with up to ten embeds, with combined introduction/reply validation and no silent truncation after placeholder expansion. All recommendation mentions suppress notifications; curator references are plain names.

Migrations 0008 and 0009 add rich recommendation fields and per-server presentation settings. Existing details and links are preserved in authored embeds, and existing personal entries use their saved collection name as an initial curator label for managers to review; no creator/editor is inferred to be the curator. Legacy description/link API fields remain available for transitional clients; the dashboard uses rich content. The original production export still needs the separately planned import mapping and maintenance-window cutover.

Production deployment (Vercel dashboard, Docker server behind a shared Caddy proxy) and the legacy data import are documented in [Deployment](docs/deployment.md).

Run `pnpm register:commands` to publish the selected Discord commands through Discord's REST API. Set `DISCORD_TEST_GUILD_ID` to publish to a development Guild; otherwise registration is global. This requires Discord credentials and is separate from starting the application. See [Local testing](docs/local-testing.md) for the full workflow, including Cloudflare Quick Tunnel setup, endpoint verification, troubleshooting, and shutdown.

League of Comic Geeks retrieval uses `comicgeeks` for `/locg`, `/pull`, `/pull-user`, and manual/scheduled Release Lists. Robotman handles Discord formatting and delivery; the package handles provider requests and parsing.

Retained commands preserve the original bot's successful output and capabilities, with the explicit v7 exceptions in the [command parity spec](.scratch/command-parity/spec.md). Color again accepts names, RGB triples, decimal integers and explicit hex, returning its embed and PNG swatch. Math uses the original expression language and code-block/file output. Coin and Eight Ball use the original images. Lookup presentation, pull totals, Letterboxd review behavior and Bulbapedia lookup are restored. Games support solo bot opponents and random-word Hangman through persistent HTTP controls. Re-register development commands after upgrading; `/comic` is removed. See the [smoke checklist](docs/local-testing.md#command-parity-smoke-checklist) for expected results.

Lookup credentials are `COMICVINE_API_KEY` (character), `OMDB_API_KEY` (movie), and `YOUTUBE_API_KEY` (youtube). `/shows` uses the server-side `PASTEE_KEY` to publish its comment templates; if the key is unset or Paste.ee fails, it sends a `.txt` file. The other lookup providers use public endpoints. Missing credentials produce a useful command response.

Managers configure moderator commands in the dashboard's Moderator commands panel. Each Guild stores its release-list channel, weekday, time, time zone, and TVmaze show IDs in PostgreSQL. New settings default to Sunday at 00:00 UTC and the current built-in TVmaze show selection; scheduled posting remains disabled until a channel is selected. Existing environment-based release-list and TVmaze settings are not imported. Both scheduled and manual `/release-list` posts go to the configured channel. Manual requests confirm ephemerally in the command channel.

Reviewed Drizzle SQL migrations in `apps/server/migrations` run at server startup under a PostgreSQL advisory lock. Game sessions, dashboard sessions, pending OAuth state, and scheduled runs survive restarts. Migrations 0006 and 0007 add dashboard session storage; startup applies them before accepting requests. The first deployment of durable dashboard sessions requires one final sign-in because existing memory sessions cannot be migrated. Rolling back to the memory implementation loses durable-session behavior. Existing production data migration belongs to ticket 10.

## HTTP interfaces

- `POST /interactions`: verify Ed25519 signatures over the timestamp plus the original request bytes. A signed Discord ping receives `{"type":1}`. Missing, invalid, or tampered signatures receive `401`; malformed or unsupported interactions receive `400`.
- `POST /graphql`: accepts `query`, optional `variables`, and `operationName`. `{ ready }` checks PostgreSQL. Authentication fields expose the current user, managed guilds, and CSRF token; guild managers use the Responses and Recommendation Entries fields for dashboard CRUD. Writes require the CSRF token.
- Request bodies are limited to one megabyte (`413` when exceeded).

This follows [Discord's HTTP interaction protocol](https://docs.discord.com/developers/interactions/overview), uses [Drizzle's PostgreSQL driver](https://orm.drizzle.team/docs/get-started-postgresql), and follows [TanStack Start's Nitro hosting setup](https://tanstack.com/start/latest/docs/framework/react/guide/hosting).

## Verify

For the manual local Discord workflow, including a test Guild, public interaction tunnel, YouTube lookup, and moderator commands, see [Local testing](docs/local-testing.md).

With Docker running:

```sh
pnpm test
pnpm test:docker
```

`pnpm test` starts an isolated PostgreSQL container on a dynamically allocated port, exercises signed HTTP, OAuth, guild content CRUD, command outputs, persistent games, and scheduled delivery, then removes the container. `pnpm test:docker` builds and boots an isolated Compose project, verifies its signed ping and GraphQL readiness endpoints, then removes the project's containers, volume, and application image. Neither command uses your normal database.

To run the server tests against an already provisioned disposable database:

```sh
TEST_DATABASE_URL=postgres://user:password@localhost:5432/test_db pnpm --filter @robotman/server test
```

The original production database is retained for rollback during the agreed migration cutover.

Browser session recovery checks run against mocked API boundaries in a real browser:

```sh
pnpm --filter @robotman/dashboard exec playwright install chromium
pnpm --filter @robotman/dashboard test:e2e
```

To use an installed Chrome instead, set `PLAYWRIGHT_CHANNEL=chrome` for `test:e2e`. These tests verify expiry, draft recovery with fresh CSRF, account isolation, and retry after an outage without real Discord sign-in.
