# 06: Build retained utility and fun commands

**What to build:** Members use the selected utility and fun commands through HTTP interactions.

**Blocked by:** 01: Run Discord interactions and the API over HTTP

**Status:** resolved

- [x] Implement color, math, ping, stats, coin, dad-joke, and eight-ball.
- [x] Ping reports HTTP/API latency rather than Gateway latency.
- [x] Commands are server-only and give useful responses for invalid input.
- [x] Do not implement help, time, random animals, leaderboard, set-color, or message-based scoring.


## Answer

Implemented color, safe arithmetic math, HTTP API ping, process stats, coin, dad-joke, and eight-ball. Commands are registered for guild use and dispatched through signed HTTP interactions, with validation and upstream failure feedback.

Validation: all 53 integration tests passed with real disposable PostgreSQL; workspace build and typecheck passed. The fresh Docker deployment passed signed interaction and PostgreSQL readiness checks. Setup and credential requirements are documented in README.
