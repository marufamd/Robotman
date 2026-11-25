# Robotman

Robotman is a Discord bot for comics communities. Members can look up comics, browse reading lists, and retrieve saved replies with slash commands. The bot also looks up movies and TV shows, plays games, and posts weekly comic release lists.

Server managers sign in with Discord to edit saved replies and reading lists, review change history, and configure release-list schedules and the shows tracked by `/shows`.

## Run locally

You’ll need Node.js 22.12+, pnpm 11.11.0, Docker Compose, and a Discord test application.

```sh
pnpm install --frozen-lockfile
cp .env.example .env
```

Fill in the Discord credentials and a random `SESSION_SECRET` in `.env`, then run `pnpm dev:local`. This starts PostgreSQL and both apps. The dashboard is at `http://localhost:3000` and the API is at `http://localhost:3001` by default.

Optional provider keys are `COMICVINE_API_KEY` for character lookup, `OMDB_API_KEY` for movie lookup, `YOUTUBE_API_KEY` for YouTube search, and `PASTEE_KEY` for publishing TV episode comment templates.

Follow the [local testing guide](docs/local-testing.md) to configure Discord sign-in, expose the interactions endpoint over HTTPS, and register slash commands. Run `pnpm test` for integration tests and `pnpm test:docker` to check the Docker image. Both require Docker.

## Architecture

The TypeScript monorepo uses pnpm and Turborepo. `apps/server` handles Discord HTTP interactions and serves a PostgreSQL-backed GraphQL API. `apps/dashboard` is a TanStack Start app hosted on Vercel.

See the [deployment guide](docs/deployment.md) for production setup and legacy data import.
