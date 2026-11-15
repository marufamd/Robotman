# Local testing

Use a dedicated Discord test application and test server (Guild). These steps run the server and dashboard locally, use your configured YouTube API key, and exercise the moderator command changes without pointing at production.

## 1. Prepare the environment

Install the Node.js and pnpm versions described in the [README](../README.md), install dependencies with `pnpm install --frozen-lockfile`, and start Docker Desktop. Install `cloudflared` using [Cloudflare's installation instructions](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/). A Quick Tunnel does not require a Cloudflare account.

If `.env` does not exist, copy `.env.example` to `.env` before configuring it. Keep `NODE_ENV=development` for local dashboard sign-in.

Follow the setup section in the [README](../README.md) and fill in `.env`. Set at least:

- `DISCORD_PUBLIC_KEY`, `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, and `DISCORD_BOT_TOKEN` from your test Discord application.
- `DISCORD_TEST_GUILD_ID` to the test Guild where you want commands registered.
- `SESSION_SECRET` to a long random value.
- Optional: `YOUTUBE_API_KEY` to your Google Cloud API key with YouTube Data API v3 enabled, if testing `/youtube`. Other provider keys are described in the README.
- `DASHBOARD_ORIGIN=http://localhost:3000` and `ROBOTMAN_API_ORIGIN=http://localhost:3001` unless using different ports.
- `DATABASE_URL` to a local disposable PostgreSQL database. The default `.env.example` URL matches the Compose PostgreSQL service on host port `5433` (the container still listens on `5432`).

In the Discord Developer Portal, add `http://localhost:3000/api/auth/callback` as an OAuth2 redirect URL. Install the test application in your test Guild with the `bot` and `applications.commands` scopes. The bot needs permission to view and send messages in the channels used for testing.

## 2. Start PostgreSQL and the apps

From the repository root, run the local helper. It starts the Compose PostgreSQL service, then starts the server and dashboard in development mode:

```sh
pnpm dev:local
```

The dashboard defaults to `http://localhost:3000`; the server defaults to `http://localhost:3001`. The bot runs inside this server and receives HTTP interactions; there is no separate bot process to start. The server applies database migrations on startup. Leave this process running while you test.

## 3. Point Discord interactions at your local server

Leave `pnpm dev:local` running in the first terminal. In a second terminal, expose the server with a [Cloudflare Quick Tunnel](https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/):

```sh
cloudflared tunnel --url http://localhost:3001
```

Use your configured `SERVER_PORT` if it differs from 3001. The output includes a temporary address like `https://random-words.trycloudflare.com`. A `Registered tunnel connection` line indicates that cloudflared connected to Cloudflare; it does not yet prove the local server is reachable.

In the [Discord Developer Portal](https://discord.com/developers/applications), select your test application, open **General Information**, and set **Interactions Endpoint URL** to:

```text
https://YOUR-TUNNEL-HOST/interactions
```

Include `/interactions`, then save. Discord sends a signed verification request; successful saving confirms the tunnel reaches the running server and its signature verification succeeds. Use the public key from this same test application in `DISCORD_PUBLIC_KEY`.

Keep the server and tunnel running during testing. When restarting a Quick Tunnel gives you a new URL, update the endpoint in Discord. Command registration does not need repeating just because the tunnel URL changes.

Keep `DASHBOARD_ORIGIN=http://localhost:3000`, `ROBOTMAN_API_ORIGIN=http://localhost:3001`, and the OAuth callback `http://localhost:3000/api/auth/callback` for this setup. Only the backend interactions endpoint needs the public tunnel.

### Connection troubleshooting

- **No default configuration file:** Quick Tunnels can run without `config.yml` or `config.yaml`; this message alone is not a failure.
- **DNS resolver timeout after a registered connection:** this alone does not establish that the tunnel disconnected. Try saving the endpoint in Discord to check the complete path. If verification fails, inspect subsequent tunnel and server logs.
- **502 or connection refused:** confirm the local server is running and the tunnel targets its actual port.
- **Discord cannot verify the endpoint:** check the `/interactions` suffix, running apps, current tunnel URL, and matching `DISCORD_PUBLIC_KEY`. Restart the server after changing `.env`.
- **Opening the endpoint in a browser returns an error:** it accepts signed Discord POST requests, so a browser GET is not a verification check.

## 4. Publish the test Guild commands

Commands are published to Discord through the Discord REST API. Starting the server does not publish them. With `DISCORD_TEST_GUILD_ID` set to your test Guild, run this once after starting the local stack, and again whenever command definitions change:

```sh
pnpm register:commands
```

Registration uses `DISCORD_CLIENT_ID` and `DISCORD_BOT_TOKEN` from `.env` and replaces the registered command set for that test Guild with this version's definitions. Guild commands normally appear quickly. The test Guild should show `/youtube` and not the removed `/google` command.

Always set `DISCORD_TEST_GUILD_ID` for local testing. If it is empty, `pnpm register:commands` publishes commands globally instead; global updates can take longer to appear and may affect the production command list for that Discord application.

Publishing command definitions and delivering command interactions are separate steps. For interactions to reach your local server, configure the test application's **Interactions Endpoint URL** to the HTTPS tunnel address from step 3. Re-publish commands only when their definitions change; keep the server and tunnel running when you invoke them.

## 5. Test the dashboard and commands

1. Run `/ping` in your test server first to confirm command registration and interaction delivery. Then open `http://localhost:3000`, sign in with a Discord account that can manage the test Guild, and select that Guild.
2. In **Moderator commands**, select a release-list channel and configure the Guild's weekday, time, time zone, and TVmaze show IDs. Save the settings and reload the page to confirm they persisted.
3. In the test Guild, run `/youtube` with a known query. A result should link to a YouTube video. If it reports that the lookup is unavailable, check the server output and confirm `YOUTUBE_API_KEY` is present in `.env` and valid for YouTube Data API v3.
4. Run `/shows`. With `PASTEE_KEY` set and Paste.ee available, it should return a “Comment Templates” link without an embed. To check the fallback, temporarily unset `PASTEE_KEY`, restart the server, and run `/shows` again; it should attach a `.txt` file. Restore the key afterward if you use Paste.ee.
5. Run `/release-list` with the release-list channel configured. Confirm that the list is posted in the configured channel and the invocation receives an ephemeral confirmation. Clear the channel setting and try again to confirm the command responds ephemerally with an explanation instead of posting.

To exercise scheduled delivery, set a test Guild schedule a few minutes ahead in its configured time zone, keep the server running through that time, and check the configured channel. Avoid testing schedules in a Guild where an unexpected post would be disruptive.

## Command parity smoke checklist

After changing command definitions, run `pnpm register:commands` with `DISCORD_TEST_GUILD_ID` set. In particular, Color's option is named `color` again, opponents are optional for Connect Four/Tic Tac Toe, and `/comic` has been removed. The server temporarily accepts the earlier `hex` option too, but refreshed registration is required to show the correct Discord UI.

| Command | Try | Expected result |
| --- | --- | --- |
| `/color` | `dark orange`, `#abc`, `0xE67E22`, `336699`, `230 126 34`, `0` | Colored embed with Hex/RGB/Integer and a 300×300 swatch. Bare numbers are decimal; black works. Invalid channels such as `256 0 0` give an ephemeral explanation. |
| `/math` | `sqrt(81)+2^3`, `1/3`, `f(x)=x*x; f(7)` | Original evaluator syntax and full-precision code-block result; long results use `result.txt`. Words like `times` are not normalized. |
| `/coin`, `/eight-ball` | Flip; ask a question | Original PNG image reply. |
| `/dad-joke` | Invoke once | Plain joke text, or a useful provider error. |
| `/ping`, `/stats` | Invoke each | Pong embed with HTTP/API latency; Statistics embed with version, dependencies, Node, memory, CPU, uptime and bot avatar. |
| `/recs taste-test`, `/recs characters`, `/recs writers` | Add Moderator/Booster, Character and Writer entries in the dashboard first; invoke each | Taste Test shows the introduction then alphabetical **Mods** and **Boosters** names ("None yet" when empty, extra messages if long); Characters and Writers show only their own names, ten per page, with public Previous/Next buttons. Customize titles, introductions and colors under Recommendation Settings and re-run. |
| `/character` | `Batman` | Comic Vine branding, full cover, description and original metadata. Requires `COMICVINE_API_KEY`. |
| `/locg` | `Batman` | Up to eight series, Page 1/Page 2 fields, publisher and Cover links. |
| `/pull` | Select DC; try `December 2 2020` and an ISO date | Publisher branding and full release names. DC heading uses Tuesday; requests use the Wednesday release week. |
| `/pull-user` | A real LOCG username and a date | User/profile attribution, full pull list and total USD price. |
| `/letterboxd` | A real username, omitted film/`all`, then `latest` or a film title | Recent reviews in a button-paginated embed (up to ten per page); only the requester can navigate for five minutes. Check links, stars and page boundaries. Individual reviews retain dates and concealed spoilers when present. |
| `/movie`, `/show` | A known title | Original metadata/branding and formatted descriptions. Movie requires `OMDB_API_KEY`. |
| `/pokemon` | `Pikachu`, `#25`, an ambiguous article name | Bulbapedia introduction and full image; numbers resolve through PokéAPI; disambiguation pages include links. |
| `/youtube` | A known video query | Top-result text plus the video URL, allowing Discord's native video preview. Requires `YOUTUBE_API_KEY`. |
| `/connect-four` | Choose Computer, then Human and have another member join | Bot AI or two human players, random first player, persistent controls, win/draw handling. Check nonplayers cannot move and the starter can cancel the join lobby. |
| `/tic-tac-toe` | Choose Computer, then Human and have another member join | Bot AI or two human players, random first player, persistent controls, win/draw handling. Check nonplayers cannot move and the starter can cancel the join lobby. |
| `/hangman` | Start solo, try letters, Guess Word, Cancel in the modal, and Stop | Random hidden dictionary word, seven wrong-letter allowance, gallows embed. Wrong whole-word guesses lose immediately; modal Cancel leaves the game unchanged. |

For Connect Four, confirm the custom red/yellow/blank pieces and numbered column icons render. The bot needs access to the server that owns those emoji and the **Use External Emoji** permission in the test channel. Existing installations may need that permission granted manually. Try Forfeit on your turn and leave a turn idle for one minute: Robotman makes the missed move automatically. Tic Tac Toe forfeits an idle turn after 20 seconds; Hangman times out after one minute. Restart the server during a game to check saved turns/deadlines still work. Gameplay uses HTTP buttons/modals; no chat-message listener is needed.

LOCG retrieval uses `comicgeeks` for search, releases, profiles and pull lists, including manual/scheduled Release Lists. Automated LOCG tests run its real parser against HTTP fixtures through the package’s Impit transport. Other provider tests also use fixed public-boundary fixtures. This manual pass checks current provider availability, credentials, Discord rendering, native previews, and bot permissions. Do not interpret a fixture-backed test pass as a live provider check.

## Stop local development

Press **Ctrl+C** in the apps terminal and the tunnel terminal. PostgreSQL stays running until you stop it:

```sh
docker compose stop postgres
```

This retains the local database volume. For the next session, run `pnpm dev:local` again. If PostgreSQL is already running, `pnpm dev` starts just the apps. Avoid running the Compose `server` service alongside the development server on the same port.

## Automated checks

The integration suite uses an isolated PostgreSQL container and does not use the database configured in `.env`:

```sh
pnpm test
```

The Docker integration check builds and starts an isolated Compose project:

```sh
pnpm test:docker
```
