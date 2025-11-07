## Docker Compose guide — Robotman

This file explains how to build, run, develop, and troubleshoot the services in this repository using the provided `docker-compose.yml` (root).

## Summary
- The repo uses per-service Dockerfiles: `services/api/Dockerfile` and `services/bot/Dockerfile`.
- `docker-compose.yml` (root) builds the two services independently and uses the repo root as the build context so the shared package `services/types` resolves during builds.
- Services are launched directly with `node dist/index.js` (no PM2).

## Prerequisites
- Docker (Docker Desktop on macOS recommended)
- Docker Compose (newer Docker supports `docker compose` CLI)

Verify installation:
```bash
docker --version
docker compose version
```

## How the compose setup works
- `docker-compose.yml` builds each service using a build context of `.` and a service-specific Dockerfile under `services/`.
- Each service build copies the monorepo workspace so local packages like `@robotman/types` can be resolved at build time.
- The images run the compiled JS from `dist/`.

## Typical workflow — build & start
From the repository root:

1) Build all images:
```bash
docker compose build
```

2) Start all services (foreground):
```bash
docker compose up
```

3) Start in detached mode:
```bash
docker compose up -d
```

4) Stop and remove containers (keeps images):
```bash
docker compose down
```

5) Rebuild a single service after code changes:
```bash
docker compose build api
docker compose up -d api
```

6) Build & run a single service locally:
```bash
docker build -t robotman-api -f services/api/Dockerfile .
docker run --env-file .env -p 3000:3000 robotman-api
```

## Logs & status
- Follow all logs:
```bash
docker compose logs -f
```
- Follow one service:
```bash
docker compose logs -f api
docker compose logs -f bot
```
- Show running containers:
```bash
docker compose ps
```

## Environment variables (`.env`)
- `docker-compose.yml` references an `env_file: .env`. Create a `.env` at the repo root (do not commit secrets).
- A complete `.env.example` file is provided at the repository root. Copy it and fill with real values:
```bash
cp .env.example .env
# Edit .env with your actual values
```

### Required variables
- `DISCORD_TOKEN` — your Discord bot token
- `POSTGRES_URL` — postgres connection string (automatically set in compose: `postgres://robotman:robotman@postgres:5432/robotman`)
- `PORT` — API service port (default: 3000)
- `CLIENT_ID` / `CLIENT_SECRET` — Discord OAuth credentials for the API
- `BOT_PREFIX` — command prefix for the bot (default: `!`)
- `BOT_OWNER` — your Discord user ID (for owner-only commands)

### Optional variables
Many features require third-party API keys (Google Search, OMDB, ComicVine, etc.). See `.env.example` for the full list.

**Note**: The compose setup automatically injects `POSTGRES_URL` for `api` and `bot` services pointing to the postgres container. If you need a different database, override it in your `.env` file.

## Working with `@robotman/types`
- `services/types` is a local workspace used by multiple services. Because the build context is the repo root, changes to `services/types` require rebuilding the consuming service image.

Rebuild after editing types:
```bash
docker compose build api
docker compose up -d api
```

## Development workflows
Two recommended approaches:

A) Local, fast iteration (recommended):
- Run the service(s) locally on your machine (outside Docker) using local Node and `tsc -w` or your IDE.
- This is fastest for iterative TypeScript changes.

B) In-container development (parity with production):
- Use a `docker-compose.override.yml` to mount local source into the container and run a watcher (`nodemon`, `ts-node-dev`, or `tsc -w`).
- Example override (high-level):
```yaml
services:
  api:
    volumes:
      - ./services/api:/usr/src/app
    command: sh -c "cd /usr/src/app && npm ci && npm run build && nodemon --watch 'src' --exec 'npm run build && node dist/index.js'"

  bot:
    volumes:
      - ./services/bot:/usr/src/app
    command: sh -c "cd /usr/src/app && npm ci && npm run build && nodemon --watch 'src' --exec 'npm run build && node dist/index.js'"
```

Note: you may need to install `nodemon` or `ts-node-dev` in your dev image or as a dependency.

## Native dependency warnings (canvas / skia-canvas)
- `services/bot` uses native packages (e.g., `skia-canvas`, `canvas-constructor`) which often require system libraries (cairo, pango, freetype, libpng, libjpeg).
- If builds fail with missing headers or `node-gyp` errors, update `services/bot/Dockerfile` to install the required apt packages before `npm ci`. Example:
```dockerfile
RUN apt-get update && apt-get install -y --no-install-recommends \
  build-essential python3 pkg-config libcairo2-dev libpango1.0-dev libjpeg-dev libpng-dev libfreetype6-dev \
  && rm -rf /var/lib/apt/lists/*
```

If an error mentions `skia` specifically, consult the module's docs for additional build requirements.

## Image size & caching tips
- Keep package install steps before adding source to allow Docker layer caching.
- For large monorepos, consider using a package manager with a shared cache (like `pnpm`) or per-service installs to reduce rebuild times.
- To force a clean build:
```bash
docker compose build --no-cache
```

## Troubleshooting
- If a service fails on start, inspect logs:
```bash
docker compose logs -f api
docker compose logs -f bot
```
- If `services/types` changes aren't reflected, rebuild the consuming service image.
- If the container can't connect to a DB or external API, verify `.env` values and network accessibility.
- Permission errors with mounted volumes in dev mode can often be solved by adjusting `user:` in `docker-compose.override.yml` or running the dev container as root (only for local dev).

## Optional improvements
- Add `healthcheck` entries to `docker-compose.yml` for automatic container health monitoring.
- Add `docker-compose.override.yml` for dev mounts and watchers.
- Add a `DOCKER.md` (this file) and a `.env.example` at repo root (do not commit secrets).

## PostgreSQL database service
The `docker-compose.yml` includes a `postgres:12-alpine` service for local development.

### Connection details
- **Host**: `postgres` (within Docker network) or `localhost` (from host machine)
- **Port**: `5432`
- **Database**: `robotman`
- **User**: `robotman`
- **Password**: `robotman` (default, see security notes below)
- **Connection string**: `postgres://robotman:robotman@postgres:5432/robotman`

### Managing the database
```bash
# Connect to postgres with psql from host
docker compose exec postgres psql -U robotman -d robotman

# View postgres logs
docker compose logs -f postgres

# Backup database
docker compose exec postgres pg_dump -U robotman robotman > backup.sql

# Restore database
docker compose exec -T postgres psql -U robotman robotman < backup.sql

# Remove database data (WARNING: deletes all data)
docker compose down -v
```

### Database initialization
The bot and API services automatically create the required tables on first run:
- `auto_responses` — stores bot auto-response rules
- `history` — action history/audit log
- `ranks` — user scoring/ranking data

### Securing postgres credentials
⚠️ **Important for production**:

1. **Change default credentials**: The default `robotman/robotman` credentials are for local development only. For production:
```yaml
# docker-compose.yml (or use environment variables)
postgres:
  environment:
    POSTGRES_USER: ${POSTGRES_USER:-robotman}
    POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-robotman}
    POSTGRES_DB: ${POSTGRES_DB:-robotman}
```

2. **Use secrets management**:
   - GitHub Actions: Use repository secrets
   - Kubernetes: Use Kubernetes Secrets
   - AWS: Use AWS Secrets Manager
   - Azure: Use Azure Key Vault
   - Docker Swarm: Use Docker secrets

3. **Never expose postgres to the internet**: The compose file exposes port `5432` to the host for local dev. In production, remove the `ports:` section or restrict access with firewall rules.

4. **Use strong passwords**: Generate random passwords:
```bash
# Example: generate a secure password
openssl rand -base64 32
```

5. **Rotate credentials regularly**: Update passwords periodically and update your services' `POSTGRES_URL` accordingly.

6. **Use SSL/TLS for connections**: For production databases, enable SSL and update connection strings:
```
postgres://user:pass@host:5432/db?sslmode=require
```

## Quick command cheatsheet
```bash
# Build images
docker compose build

# Start services (foreground)
docker compose up

# Start services (detached)
docker compose up -d

# Rebuild a single service and bring it up
docker compose build api && docker compose up -d api

# Tail logs
docker compose logs -f api
docker compose logs -f bot
docker compose logs -f postgres

# Connect to postgres
docker compose exec postgres psql -U robotman -d robotman

# Stop & remove (keeps volumes/data)
docker compose down

# Stop & remove including database data
docker compose down -v
```

## Security & deployment notes
- **Do not commit `.env` with secrets**. Use `.env.example` as a template and add `.env` to `.gitignore`.
- **Use secret management** for production: GitHub Secrets, Kubernetes Secrets, AWS Secrets Manager, Azure Key Vault, etc.
- **Change default postgres credentials** before deploying to production.
- **Do not expose postgres port 5432** to the internet in production.
- For production, prefer deploying each service as an independent image to Kubernetes / Cloud Run / ECS rather than Docker Compose.
- Use environment-specific configuration (`.env.production`, `.env.staging`) and inject secrets at runtime.

---

If you want I can also:
- add a `.env.example` file generated from the variables observed in the code, or
- add `docker-compose.override.yml` templates for development with hot reload, or
- add `healthcheck` entries to `docker-compose.yml`.

Pick one and I will implement it next.
