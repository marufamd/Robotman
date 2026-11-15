# Use HTTP interactions with a shared GraphQL server

**Status: accepted**

Message Content intent loss means v7 cannot depend on message text events for commands or automatic response scanning. v7 receives Discord interactions over HTTPS in a TypeScript server hosted in Docker, and that same server exposes the GraphQL API backed by PostgreSQL; it does not maintain a Gateway connection or use Redis for response lookups. The dashboard remains on Vercel, and Vercel rewrites its same-origin `/api/*` requests to the Docker server so browser authentication does not depend on cross-site cookies.
