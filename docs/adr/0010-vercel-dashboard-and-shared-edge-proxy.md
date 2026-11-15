# Vercel dashboard, Dockerized server behind a shared edge proxy

**Status: accepted**

The dashboard deploys to Vercel from Git and uses its Vercel domain. The server and PostgreSQL run in Docker on the existing Ubuntu server. A single Caddy container owns ports 80/443 for every app on that machine; apps join a shared Docker network and contribute a site file, so a new app needs no change to the proxy beyond one file and one variable. The proxy configuration lives in its own `server-config` repository, not in this one. Nginx is retired in favor of Caddy to avoid two proxies fighting for the same ports.

Pushes to `main` run CI and then deploy automatically: build and push an image to GHCR, then update the box over SSH. Migrations run at server startup. There is no approval gate, automated backup, or rollback process; manual `pg_dump` is documented instead.

Existing Responses and Recommendations are imported once from a JSON export of the legacy tables into an empty production database during a maintenance window. The same Discord application and token are reused, so cutover is stopping the old bot and pointing the Interactions Endpoint URL at v7.
