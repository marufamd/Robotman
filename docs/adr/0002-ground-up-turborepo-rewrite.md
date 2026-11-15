# Build v7 from the ground up on an orphan branch with Turborepo

**Status: accepted**

Robotman v7 is a ground-up rewrite on an orphan branch with independent Git history. The new TypeScript monorepo uses Turborepo and pnpm with one workspace lockfile. Its deployable applications are `apps/server` for Discord HTTP interactions and GraphQL, and `apps/dashboard` for Vercel; shared libraries and tooling live under `packages/*` as needed. The previous project provides a reference for product behavior, while the rewrite must establish its own source tree rather than carry forward the legacy services and incrementally modify them.

ADR-0001 remains in effect: a Docker-hosted server receives Discord HTTP interactions and exposes a PostgreSQL-backed GraphQL API, while the dashboard runs on Vercel. The authoritative feature and command scope is `.scratch/robotman-v7/spec.md`, recovered from the original command-by-command decisions. Only selected commands remain; owner commands and the message leaderboard system are removed.
