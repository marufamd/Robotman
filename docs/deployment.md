# Deployment

Robotman v7 runs as two pieces: the **dashboard** on Vercel and the **server** (HTTP interactions, GraphQL, PostgreSQL) in Docker on the Ubuntu server. A shared Caddy proxy, managed in the separate [`server-config`](https://github.com/marufamd/server-config) repository, fronts the server and any future apps on the same machine.

```
Discord ──▶ https://<ROBOTMAN_DOMAIN>/interactions ─┐
Browser ──▶ https://<project>.vercel.app ──/api/*──▶ https://<ROBOTMAN_DOMAIN>/api/*
                                                     │
                                  edge-caddy (80/443) ──▶ robotman-server:3001 ──▶ postgres
```

The browser only ever talks to the Vercel domain. The dashboard's server-side `/api/*` route forwards to the server, so OAuth cookies stay on the Vercel origin.

## One-time server setup

1. **DNS**: point an `A`/`AAAA` record for `ROBOTMAN_DOMAIN` (for example `bot.example.com`) at the Ubuntu server.
2. **Shared proxy**: follow the README of `server-config` (it frees ports 80/443 from nginx, creates `/opt/edge` with the `ROBOTMAN_DOMAIN` variable, and starts Caddy and the `edge` Docker network). Its `sites/robotman.caddy` already proxies `/interactions`, `/graphql` and `/api/*` to `robotman-server:3001`.
3. **Create the Robotman directory**: `sudo mkdir -p /opt/robotman && sudo chown "$USER" /opt/robotman`.
4. **Configure Robotman**: copy `deploy/robotman/env.production.example` to `/opt/robotman/.env` on the server (`chmod 600`) and fill it in. `DASHBOARD_ORIGIN` is the Vercel production URL, with no trailing slash.
5. **GitHub secrets** for `.github/workflows/deploy-server.yaml`: `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_SSH_KEY` (a key authorized on the server), and `DEPLOY_KNOWN_HOSTS` (the output of `ssh-keyscan <host>`). The deploying user must be in the `docker` group. The image is pushed to `ghcr.io/<owner>/robotman-server`.

After this, every push to `main` runs CI; when it passes the workflow builds and pushes the image, copies `compose.yaml` to `/opt/robotman` and waits for the server's health check. The server applies database migrations when it starts.

## Dashboard on Vercel

1. Import the repository in Vercel using the Git integration. Set **Root Directory** to `apps/dashboard`, keep the detected TanStack Start framework preset, and set **Production Branch** to `main`.
2. Environment variables (Production): `ROBOTMAN_API_ORIGIN=https://<ROBOTMAN_DOMAIN>`.
3. Note the production domain (`https://<project>.vercel.app`). Use it as `DASHBOARD_ORIGIN` on the server, and register `https://<project>.vercel.app/api/auth/callback` as an OAuth2 redirect in the Discord Developer Portal.
4. Sign-in only works on that production domain. Preview deployments render, but their random URLs are not registered redirect URIs.

## Discord application

Robotman v7 reuses the existing Discord application and bot token.

1. Set `DISCORD_PUBLIC_KEY`, `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET` and `DISCORD_BOT_TOKEN` in `/opt/robotman/.env`.
2. Register the slash commands (global when `DISCORD_TEST_GUILD_ID` is unset):
   ```sh
   ssh <server> 'cd /opt/robotman && docker compose run --rm server node dist/register-commands.js'
   ```
3. In the Developer Portal set **Interactions Endpoint URL** to `https://<ROBOTMAN_DOMAIN>/interactions`. Discord verifies it with a signed ping.

## Migrating the old Responses and Recommendations

The importer reads a JSON export of the legacy PostgreSQL tables and writes into the deployed database. Only `auto_responses` and `history` are used. Ranks, trivia, users, tasks and courses are ignored.

### 1. Export (on the old server)

```sh
psql "$LEGACY_DATABASE_URL" -At -c "select json_build_object(
  'auto_responses', (select coalesce(json_agg(a), '[]'::json) from auto_responses a),
  'history',        (select coalesce(json_agg(h), '[]'::json) from history h))" > legacy-export.json
```

The export contains your members' Discord IDs and tags. Move it with `scp` and delete it afterwards; do not commit it.

### 2. Rehearse

Run the importer without writing, locally or in the container:

```sh
scp legacy-export.json <server>:/opt/robotman/
ssh <server> 'cd /opt/robotman && docker compose run --rm -v "$PWD/legacy-export.json:/legacy-export.json:ro" server node dist/import-legacy.js --file /legacy-export.json --dry-run'
```

The report lists what would be imported and every record it cannot map, with the reason. Add `--json` for machine-readable output. A dry run needs no database access.

### 3. Cutover

1. Stop the old bot so it no longer writes.
2. Export again (step 1) so the data is final, and run the dry run once more.
3. Import into the empty production database:
   ```sh
   ssh <server> 'cd /opt/robotman && docker compose run --rm -v "$PWD/legacy-export.json:/legacy-export.json:ro" server node dist/import-legacy.js --file /legacy-export.json'
   ```
4. Set the Interactions Endpoint URL, register the commands, and verify with the checks below.

Imported rows get stable IDs derived from their legacy IDs, so re-running the same import is harmless, but it never updates a row that already exists. Treat the cutover run as the only real import. If you need to redo it, empty the Robotman tables first.

### What is mapped

| Legacy | v7 |
| --- | --- |
| `regular` rows | Responses (trigger = name; `wildcard` is ignored, so partial matching is not kept) |
| `character`, `writer` rows | Recommendation Entries; the trailing ` recs` is dropped from names and aliases |
| `moderator`, `booster` rows | Recommendation Entries with the name as the saved curator name (no Discord ID); unique per server, so a repeated curator is reported |
| `embed` / `embed_color` | one embed holding the text, with the color |
| `history` | Response change history (`add`/`edit`/`delete` become created/updated/deleted); history of recommendation rows is skipped and counted |
| authors and editors | Responses with no history get created/updated events from the author/editor columns; Discord tags become display names |
| timestamps | interpreted as UTC |

Imported recommendation entries use introduction mode **none**, so each reply reads exactly as it did before.

## Verification

- `curl -i https://<ROBOTMAN_DOMAIN>/graphql -H 'content-type: application/json' -d '{"query":"{ ready }"}'` returns `{"data":{"ready":true}}`.
- In a test Discord server: `/ping`, `/response`, `/recs lookup`, `/recs taste-test`.
- Sign in at the Vercel URL, pick a server, and open Responses and Recommendations.

## Manual backup

```sh
ssh <server> 'cd /opt/robotman && docker compose exec -T postgres pg_dump -U robotman -Fc robotman' > robotman-$(date +%F).dump
```

Restore into an empty database with `docker compose exec -T postgres pg_restore -U robotman -d robotman --clean --if-exists < robotman-YYYY-MM-DD.dump`. There is no automatic backup or rollback plan.
