# 09: Build moderator commands and the weekly release schedule

**What to build:** Authorized moderators use `/release-list` and `/shows`, per-Guild dashboard settings control release-list posting and TVmaze shows, and Robotman posts the weekly comic release list on each configured schedule.

**Blocked by:** 01: Run Discord interactions and the API over HTTP

**Status:** resolved

- [x] Keep both commands server-only and require the existing moderator access check.
- [x] `/shows` publishes the legacy Markdown Episode Comment Templates to Paste.ee with server-side `PASTEE_KEY`, returning the “Comment Templates” link without embeds.
- [x] If the Paste.ee key is missing or the service fails, `/shows` sends a public `.txt` attachment with the week title and templates; if there are no episodes, it returns a plain message.
- [x] Store each Guild's release-list channel, weekly weekday/time/time zone, and TVmaze show IDs in PostgreSQL; authorized managers configure them through the dashboard.
- [x] Do not import old environment settings. Start with Sunday at 00:00 UTC and the current built-in show selection, with no channel selected so automatic posting is disabled.
- [x] Scheduled and manual `/release-list` posts use the configured Guild channel, the current heading/embed/pinned-heading delivery, and the Guild time zone for the default release date.
- [x] Manual `/release-list` returns an ephemeral confirmation in the invoking channel after successful delivery; an unset channel or delivery failure returns an ephemeral explanation.
- [x] Keep duplicate suppression across server instances for per-Guild scheduled posts.
- [x] Owner Discord commands and automatic news crossposting remain excluded; registration and administration use deployment tooling.

## Answer

Implemented the per-Guild Moderator commands dashboard section and persisted schedule/show settings. `/release-list` sends the existing heading, paginated embeds, and pinned heading to the configured Guild channel; manual requests confirm ephemerally and default their release date using that Guild's time zone. The scheduler checks configured Guild schedules and uses per-Guild release-date run records and Discord nonces to prevent duplicate posts across server instances. `/shows` publishes comment templates through Paste.ee with a public `.txt` fallback and no embeds.

Validation: all 70 server integration tests passed against PostgreSQL; server and dashboard typechecks passed. Setup and credential requirements are documented in README.

## Comments

Reopened on 2026-10-18 after the user confirmed the Paste.ee link behavior and per-Guild dashboard settings. Resolved after implementing and validating the acceptance criteria above.
