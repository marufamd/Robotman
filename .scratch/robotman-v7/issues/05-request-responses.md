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
