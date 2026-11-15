# 05: Request Responses and browse Recommendations through Discord

**What to build:** Guild members use public Response and Recommendation lookups, including the Recommendation Directory.

**Blocked by:** 01: Run Discord interactions and the API over HTTP; 03: Manage Responses and Recommendation Entries from the dashboard

**Status:** resolved

- [x] Response lookup matches the complete trigger or alias exactly and case insensitively, rendering saved embeds and placeholders.
- [x] Recommendation lookup autocompletes across all four categories, with category labels to distinguish duplicate names.
- [x] The Recommendations list command shows the Recommendation Directory with an optional category filter.
- [x] Lookup replies are public and guild-scoped; commands are unavailable in DMs and do not depend on message-content events.

Implementation uses `/response <trigger>`, `/recs lookup <name>` with category-labeled autocomplete, and `/recs list [category]`. All lookups run from signed Discord interactions and query PostgreSQL by guild. Placeholder replacement covers content and nested embed strings, including user and channel references.

## Comments

Verified with signed HTTP interactions against a disposable PostgreSQL database, including aliases, case-insensitive exact matching, embeds and nested placeholders, autocomplete across duplicate names, category-filtered directory output, guild isolation, and DM rejection.

### Delivery diagnosis — 2026-11-02

A live `/response test` invocation logged `Discord follow-up failed (404)`. The existing log discarded Discord's JSON error code and message, so that status alone does not distinguish an unknown webhook from an unknown original message.

A read-only replay of the newest saved Response (five characters, no embeds) reproduced an unnecessary server-name REST lookup timing out after 2,001 ms; total handler time was 2,004 ms, forcing deferred delivery. Resolve the server name only when message text or embed data includes `{server}`. The same replay after this correction completed in 2 ms with zero Discord lookups.

Follow-up failure logs now include the operation, HTTP status, Discord error code/message, and deferred acknowledgement/completion timings. Webhook URLs, interaction tokens, bot tokens, and message payloads are not logged. Server typecheck and build passed. The user retried `/response test` in Discord and confirmed delivery works after removing the unnecessary lookup. The original 404's specific Discord error code was not captured, so its exact webhook failure mechanism remains unconfirmed.
