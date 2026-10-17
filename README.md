# Robotman v7

A ground-up TypeScript rewrite using pnpm and Turborepo. The server handles Discord HTTP interactions and GraphQL in one Docker process; the TanStack Start dashboard is a separate application. The selected product scope lives in [.scratch/robotman-v7/spec.md](.scratch/robotman-v7/spec.md).

Tickets 1 through 9 are implemented: signed HTTP interactions, dashboard authentication and guild selection, guild content management and Response history, public Response and Recommendation lookups, the selected commands, persistent games, and scheduled comic releases. Production data migration remains in ticket 10.

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

For local development, keep `DASHBOARD_ORIGIN=http://localhost:3000`, `ROBOTMAN_API_ORIGIN=http://localhost:3001`, and `NODE_ENV=development`. Set a random `SESSION_SECRET`, the Discord credentials above, and `DISCORD_TEST_GUILD_ID` if you want to register commands in one development guild. Set `DISCORD_PUBLIC_KEY` from the Discord application. The dashboard proxies its `/api/*` requests to the server using `ROBOTMAN_API_ORIGIN`.

Turborepo builds dependency packages first and caches build outputs in this worktree. Integration tests deliberately bypass caching. Dashboard route generation is included in build outputs so cached builds also support typechecking.

## Run the server

The Compose stack reads `.env`. Set the Discord application's public key and PostgreSQL credentials before starting it. When credentials form a database URL, use URL-safe values or percent-encode reserved characters.

```sh
docker compose up --build -d --wait
```

Compose runs only PostgreSQL and the shared server. The server image uses `turbo prune` and a production pnpm deployment; it runs as a non-root user. Its health check executes the database-backed GraphQL readiness query. Published ports bind to localhost; put your HTTPS reverse proxy in front of the server and configure Discord's interaction endpoint as `https://your-host/interactions`.

For development, start PostgreSQL with `docker compose up postgres -d`, then run `pnpm dev`. The root `.env` supplies the server's `DISCORD_PUBLIC_KEY`, `DATABASE_URL`, and `PORT`; the dashboard runs on port 3000. Server port defaults to 3001.

## Authentication and commands

Set `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, `DISCORD_BOT_TOKEN`, `DASHBOARD_ORIGIN`, and a random `SESSION_SECRET`. Register `${DASHBOARD_ORIGIN}/api/auth/callback` as the OAuth redirect URI in Discord. Set `ROBOTMAN_API_ORIGIN` in the dashboard deployment to the backend origin. Production uses HTTPS cookies; local development uses `NODE_ENV=development`.

Dashboard access requires guild ownership, Manage Server, or Administrator permission. Installed guilds can be selected; other managed guilds show an invite action. Sessions are process-local, so restarting the backend signs users out.

After selecting an installed guild, managers can create, edit, and delete Responses and Recommendation Entries in the dashboard, and review Response change history by actor and time. Response triggers and aliases must be unique within the guild, ignoring case. Embeds are entered as a JSON array of Discord embed objects; message text retains `{user}` and `{channel}` placeholders. Recommendation Entries have a name, description, link, and one of the character, writer, moderator, or booster categories. The API rechecks Discord permissions and CSRF protection on every write. Guild members can request exact Responses with `/response <trigger>`, find Recommendations with `/recs lookup <name>`, and browse them with `/recs list [category]`.

Run `pnpm register:commands` to register the selected Discord commands. Set `DISCORD_TEST_GUILD_ID` for development guild registration; otherwise registration is global. This requires Discord credentials and is separate from building the application.

Lookup credentials are `COMICVINE_API_KEY` (character), `OMDB_API_KEY` (movie), `GOOGLE_CSE_API_KEY` plus `GOOGLE_CSE_ENGINE_ID` (google), and `YOUTUBE_API_KEY` (youtube). The other lookup providers use public endpoints. Missing credentials produce a useful command response.

The weekly release publisher activates when `RELEASE_LIST_CHANNEL_ID` and the bot token are configured. It defaults to Sunday at 00:00 UTC for the following Tuesday's releases. The timezone, weekday (Sunday = 0), hour, and minute are configurable in `.env.example`. PostgreSQL run records and Discord nonces protect delivery across instances. `TVMAZE_SHOW_IDS` optionally configures the shows schedule.

Reviewed Drizzle SQL migrations in `apps/server/migrations` run at server startup under a PostgreSQL advisory lock. Game sessions and scheduled runs survive restarts. Existing production data migration belongs to ticket 10.

## HTTP interfaces

- `POST /interactions`: verify Ed25519 signatures over the timestamp plus the original request bytes. A signed Discord ping receives `{"type":1}`. Missing, invalid, or tampered signatures receive `401`; malformed or unsupported interactions receive `400`.
- `POST /graphql`: accepts `query`, optional `variables`, and `operationName`. `{ ready }` checks PostgreSQL. Authentication fields expose the current user, managed guilds, and CSRF token; guild managers use the Responses and Recommendation Entries fields for dashboard CRUD. Writes require the CSRF token.
- Request bodies are limited to one megabyte (`413` when exceeded).

This follows [Discord's HTTP interaction protocol](https://docs.discord.com/developers/interactions/overview), uses [Drizzle's PostgreSQL driver](https://orm.drizzle.team/docs/get-started-postgresql), and follows [TanStack Start's Nitro hosting setup](https://tanstack.com/start/latest/docs/framework/react/guide/hosting).

## Verify

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
