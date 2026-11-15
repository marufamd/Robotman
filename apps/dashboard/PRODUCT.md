# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary users are Discord server owners and moderators with Manage Server or Administrator permission. They use the dashboard to choose a server and manage its Robotman content and settings. Server members use the corresponding Robotman commands in Discord rather than managing content in the dashboard.

## Product Purpose

Robotman gives Discord communities selected utility, response, recommendation, game, lookup, and moderator features. The dashboard lets authorized managers configure those features for each server and maintain the Responses and Recommendation Entries that members use. Success means a manager can configure a server's Robotman features from the web dashboard and members can use them through Discord.

## Positioning

Robotman separates management from everyday use: server owners and moderators manage shared content and server-specific settings in the web dashboard; members use the resulting features through Discord commands. Response and Recommendation content is managed in the dashboard, while the server handles command interactions and reads the data from PostgreSQL.

## Operating Context

- Managers sign in with Discord and choose a server they own or have permission to manage.
- Installed servers can be configured. For a managed server where Robotman is not installed, the dashboard offers an installation action.
- Managers create, edit, and delete Responses and Recommendation Entries, review Response change history, and set the server's Release-list Schedule and TVmaze shows.
- Server members request Responses and Recommendations and use other selected commands in Discord.
- The dashboard is a TanStack Start web app. It sends same-origin API requests through a proxy to the Robotman server, which handles Discord OAuth and interactions and uses PostgreSQL.

## Capabilities and Constraints

- A manager must own a server or have Manage Server or Administrator permission. The server list and permissions are cached for the signed-in session and checked locally when protected changes are saved; a new sign-in refreshes the snapshot.
- Recommendations own independent freely authored text and embeds with the Response editor and live preview. Moderator/Booster collections have static curator attribution and overridable Taste Test introductions. Directory settings control headings, opening text, and color; directory pages list collection names only.
- Response and Recommendation Entry management is dashboard-only. Discord commands provide member-facing lookup and directory access.
- Release-list Schedule and selected TVmaze show IDs are stored per server. Scheduled posting remains disabled until a destination channel is selected.
- Preserve only the commands and features selected in `.scratch/robotman-v7/spec.md`. Do not restore the message leaderboard, owner commands, removed legacy commands, or Discord-side content management.
- In user-facing product copy, call Discord Guilds “servers.” “Guild” is an internal domain and implementation term, not user-facing vocabulary.
- The dashboard uses Discord OAuth and a same-origin API proxy to a PostgreSQL-backed server. The dashboard is intended for Vercel; the server runs separately in Docker.
- Existing environment-based moderator settings are not imported into the new per-server settings.

## Brand Commitments

- The product name is Robotman.
- Use the existing logo at `public/icon.png`.
- Buttons and button-style links using the Robotman yellow/orange gradient use black text and icons, including hover and loading states.
- The agreed v7 branding and styling reference is the existing `robot-next` dashboard.

## Evidence on Hand

- Existing Robotman logo: `apps/dashboard/public/icon.png`.
- The retained feature and command scope is recorded in `.scratch/robotman-v7/spec.md`.
- Dashboard workflows and server access behavior are implemented in `apps/dashboard/src/routes/index.tsx` and the server authentication and GraphQL handlers.

## Product Principles

- Keep management actions available to authorized server managers and member workflows available in Discord.
- Keep configuration and managed content isolated by server.
- Check management permission from the signed-in session when saving changes.
- Preserve the selected v7 scope; retired features stay retired.
- Use “server” in user-facing dashboard language and reserve “Guild” for internal use.

Personal Moderator and Booster recommendations use the curator name as the list name, with one personal list per person per server across those categories. The editor asks for one name and an optional Discord account ID; personal-list display names are distinct across both categories.
