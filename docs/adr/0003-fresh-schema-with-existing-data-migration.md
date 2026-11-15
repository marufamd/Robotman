# Design a fresh schema and migrate existing data

**Status: accepted**

The ground-up rewrite uses a newly designed PostgreSQL schema and migrates existing data for retained features into it. This preserves Guild-associated Responses, Recommendation Entries, and change history. The message leaderboard and rank system are retired, so its scores are not imported into v7. Cutover uses a maintenance window: stop writes, import and verify the data, then switch to v7 while retaining the original database for rollback. Starting with an empty production database does not meet the agreed scope.

The deployed database export must be inspected before finalizing mappings, including actual columns and the interpretation of timestamps without a time zone. Report unmappable records for review. Trivia and its external data source are outside the retained scope.
