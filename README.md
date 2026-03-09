# Robotman <img align=right src="https://i.imgur.com/8RQzfdB.png">

A Discord bot with a REST API and web dashboard, built as a TypeScript monorepo.

## Packages

| Package | Description |
|---|---|
| [@robotman/core](services/bot/README.md) | Discord bot — commands, listeners, game logic |
| [@robotman/api](services/api/README.md) | REST API — OAuth, history, auto-responses |
| [@robotman/dashboard](services/dashboard/README.md) | Next.js web dashboard |
| [@robotman/types](services/types/README.md) | Shared TypeScript types |

## Prerequisites

- [Node.js](https://nodejs.org) 16+
- [Docker](https://docs.docker.com/get-docker/) & Docker Compose
- A Discord application & bot token ([Discord Developer Portal](https://discord.com/developers/applications))

## Quick Start

### 1. Clone and configure

```bash
git clone https://github.com/marufamd/Robotman.git
cd Robotman
cp .env.example .env
```

Edit `.env` with your values. Required fields:

```env
DISCORD_TOKEN=        # your bot token
POSTGRES_USER=        # postgres username
POSTGRES_PASSWORD=    # postgres password
POSTGRES_DB=          # postgres database name
CLIENT_ID=            # Discord OAuth client ID
CLIENT_SECRET=        # Discord OAuth client secret
BOT_OWNER=            # your Discord user ID
```

See [`.env.example`](.env.example) for the full list of optional API keys.

### 2. Run with Docker

```bash
docker compose build
docker compose up -d
```

This starts PostgreSQL, the API, and the bot. See [docs/DOCKER.md](docs/DOCKER.md) for full Docker usage, logs, and development workflows.

### 3. Run locally (without Docker)

Install dependencies from the repo root:

```bash
npm install
```

Build the shared types package first, then each service:

```bash
cd services/types && npm run build
cd ../api   && npm run build && npm start
cd ../bot   && npm run build && npm start
```

The dashboard (Next.js) can be started with:

```bash
cd services/dashboard && npm run dev
```

## Deployment

For a full production deployment guide (Ubuntu, nginx, SSL, systemd), see [docs/DEPLOY.md](docs/DEPLOY.md).

For Docker-specific details (compose workflows, native deps, database management), see [docs/DOCKER.md](docs/DOCKER.md).

## License

[MIT](LICENSE)