# 08: Build Connect Four, Hangman, and Tic Tac Toe

**What to build:** Members start and play the three selected games using HTTP interactions.

**Blocked by:** 01: Run Discord interactions and the API over HTTP

**Status:** resolved

- [x] Implement connect-four, hangman, and tic-tac-toe only; Akinator and Trivia are excluded.
- [x] Inputs and game actions work without ordinary chat messages or Gateway collectors.
- [x] Session state is available between independent interaction requests; participant access and expired actions are handled.
- [x] Games provide clear completion and timeout feedback.

## Answer

Integrated Connect Four, Hangman, and Tic Tac Toe into the signed HTTP runtime. Buttons and modals drive play; participant, guild, channel, stale action, and expiration checks protect sessions. PostgreSQL transactions persist sessions using reviewed Drizzle migrations. Public interaction tests cover all games, and a signed HTTP test resumes a game across an application restart. Connect Four splits its seven controls into valid Discord action rows.

Validation: all 53 integration tests passed with real disposable PostgreSQL; workspace build and typecheck passed. The fresh Docker deployment passed signed interaction and PostgreSQL readiness checks. Setup and credential requirements are documented in README.
