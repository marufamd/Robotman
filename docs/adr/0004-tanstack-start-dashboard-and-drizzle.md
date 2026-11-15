# Use TanStack Start for the dashboard and Drizzle for PostgreSQL

**Status: accepted**

The ground-up dashboard uses TanStack Start and is deployed to Vercel. It consumes the Docker-hosted server's GraphQL API through the agreed same-origin API routing. The rewrite uses Drizzle to define and query the fresh PostgreSQL schema, with reviewed SQL migration files; existing data is imported according to ADR-0003.

The original design selected TanStack Start, Router, Query, Table, React, and Tailwind, using the `robot-next` dashboard's branding and styles as a reference. The later Next.js proposal was rejected; the original dashboard stack remains agreed.
