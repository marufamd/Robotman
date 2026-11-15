# Recommendation customization

Status: implemented and verified.

## Agreed direction

Recommendation replies must have at least the content capabilities of Responses: authored message text, multiple embeds, all five existing placeholders, Discord-limit validation, and a live preview. The current name/description/link model is insufficient. Recommendation discovery and invocation differ from Response triggers; that difference must not restrict reply content.

Server managers need control and customization at least as capable as the original Robotman. Inspect original behavior for character, writer, moderator, and booster recommendations before settling type-specific requirements. Existing v7 scope keeps management in the dashboard, public lookup through `/recs`, and the Recommendation Directory through `/recs list`; removed Discord-side CRUD and unrelated legacy features remain excluded.

## Settled decisions — round 1

- Recommendations own independent replies; editing a recommendation does not change any Response. Share editing capabilities rather than linking content changes.
- Moderator and Booster entries are static personal lists of books recommended by their curator. Changing the curator's roles or their leaving the server does not change the saved entry.
- Retain original Moderator and Booster introductions as the default wording, with moderator-controlled overrides.

## Settled decisions — round 2

- Moderator and Booster entries require a saved curator name and optionally associate the curator with a Discord account by manually entering its user ID. Curator identity is independent of creator/editor attribution. Do not require current server membership or a matching role, or synchronize saved names automatically.
- Replies are freely authored message text and embeds. Do not introduce structured book records or generated reading orders. Share the Response editor's multiple-embed controls, placeholders, validation, property preservation and live preview capabilities.
- Each server's Moderator and Booster categories start with the exact original introductions. Managers may edit category defaults. Each entry can inherit its category default, use custom introduction text, or omit the introduction. Character and Writer categories default to no introduction. Preview the introduction and authored reply together.
- Character entries may describe characters, teams, reading arcs, and themes. Writer entries are freely curated reading lists associated with named writers. Preserve the existing four categories; do not add automatic book lookups.

## Settled decisions — round 3

- Entries have readable display names and optional search aliases. Autocomplete searches both, shows display name plus category, and selects the specific entry. Display names need not include `recs`.
- A curator may have multiple entries and may have entries in both Moderator and Booster. Entry names are unique within a server/category; the same name is permitted across categories.
- Superseded by `.scratch/recommendation-discovery/spec.md` (separate `/recs taste-test`, `/recs characters`, `/recs writers`): the combined directory shows collection names only, grouped by category, with pagination and the optional category filter. Do not add summaries, extract reply excerpts, or display full replies in the directory.
- Moderator and Booster introductions and replies support `{curator_name}` for the saved curator name and `{curator}` as a second curator reference. Round 4 supersedes the proposed mention behavior: both render the saved curator name as plain text, irrespective of the optional Discord user ID. The five existing placeholders retain their requester/invocation meanings.

## Settled decisions — round 4

- Server managers can customize the directory title, opening text, category headings, and embed color. Defaults describe slash-command lookup; individual-entry introductions are configured separately. Collections are ordered alphabetically.
- Saving publishes edits immediately. Use dedicated Add/Edit pages with Response-equivalent validation and preview, without a separate draft/publish workflow.
- An individual lookup sends one Discord message containing authored message text and multiple embeds, matching Responses. Validate the effective introduction and reply together; explain overflow instead of splitting messages or silently truncating content.
- Display the curator as plain saved-name text, without a Discord mention or notification. The optional Discord user ID is association metadata, not an instruction to mention, notify, synchronize, or check a member's role.

## Type requirements

| Type | Collection subject | Curator fields | Default introduction |
| --- | --- | --- | --- |
| Character | Character, team, reading arc, or theme | Not required | None |
| Writer | Named writer's freely curated reading list | Not required; writer identity is represented by the collection name/content | None |
| Moderator | A person's static personal book recommendations | Saved curator name required; manually supplied Discord user ID optional | Original Moderator Taste Test wording |
| Booster | A person's static personal book recommendations | Saved curator name required; manually supplied Discord user ID optional | Original Booster Taste Test wording |

All four types own independent rich replies, support display names and search aliases, and use the same editor capabilities. A curator can have multiple lists in either or both personal-list categories. Directory heading customization does not change the four underlying category identities.

## Acceptance scenarios

- A manager creates a Character collection for a team or reading arc using text and multiple embeds; selecting its display name or finding it through an alias returns the configured reply.
- A Writer entry has a freely authored reading order, commentary, links and images, rather than structured book fields.
- A Moderator curator has separate Marvel and DC lists and a Booster entry. Changing their Discord roles, saved association, or server membership does not delete, hide or rewrite these lists.
- Moderator and Booster entries inherit the exact original default introduction unless a manager changes the category default or chooses a custom or omitted introduction for that entry. The preview shows the resulting introduction and complete reply.
- `{user}`, `{username}` and `{avatar}` refer to the requester; `{server}` and `{channel}` refer to the invocation. The curator placeholders render the saved curator name without mentions.
- Autocomplete searches display names and aliases and distinguishes same-name entries across categories. Selection identifies a specific entry rather than arbitrarily choosing the first name match.
- `/recs list`, with or without a category filter, paginates the alphabetically ordered collection names. It never displays book contents, summaries or extracted reply excerpts, and does not silently omit entries beyond a fixed total limit.
- Directory presentation changes remain separate from individual-entry introduction settings.
- Saving makes the entry public immediately. Invalid effective payloads are rejected with an explanation; runtime placeholder expansion must not silently truncate books or commentary.

## Original behavior verified from source

All four types were AutoResponse records sharing content, aliases, five requester/invocation placeholders, and the same dashboard editor. The old editor supported plain content or one description-only embed with a color. Character and Writer lookups returned the authored content; Moderator and Booster lookups prepended the introductions below. The old schema had no curator ID or structured book records: creator/editor metadata did not designate a curator.

Character entries also covered teams, reading arcs, and thematic collections, including Bat Family and Vertigo/Black Label. Writer entries were named for writers. The directory stripped the ` recs` suffix, used some hard-coded Character display-label exceptions, grouped Moderator/Booster entries under Mods/Boosters, and had no pagination. V7 does not restore old message triggers, wildcard matching, or hard-coded channel restrictions by implication.

Original Moderator introduction:

> Welcome to **Taste Test**, where you can sample our mods' personal recommendations and personal taste! Feel free to engage us on a discussion, and please, have fun discovering what we love.

Original Booster introduction:

> Welcome to a special **Taste Test**, where you can sample our **Boosters'** personal recommendations and personal taste! Feel free to engage us on a discussion, and please, have fun discovering what we love.

## Implementation constraints and migration

Retain dashboard-only management, existing server permissions and CSRF protection. Reuse Response editing/rendering capabilities while keeping recommendation content independent. Preserve existing Response behavior outside explicitly shared improvements. Retain the session-expiry draft-recovery behavior when sharing editor flows.

Preserve existing recommendation data when replacing the current simple schema. Current name/description/link content must have a content-preserving mapping into authored text/embeds; do not discard its link. Original imports must retain authored content, aliases and available embed/color data. Original creator/editor metadata must never be treated as curator identity. Inspect the actual deployed export before finalizing mappings and report unmappable names or missing curator information for review, following ADR-0003. Production data cutover remains the existing migration effort rather than an implicit deployment in this requirements session.

Implementation should validate the aggregate effective reply, including inherited/custom introductions and placeholder expansion, and preserve unexposed embed properties. A category-default change must not silently make saved entries invalid; identify affected entries and require correction before publishing an incompatible change.

No structured book database, automatic recommendations, live role/membership synchronization, Discord-side content CRUD, message triggers, wildcard matching, custom underlying categories, or new commands are included.

## Implementation result — 2026-11-02

The user confirmed the requirements by requesting TDD implementation, and explicitly approved GraphQL/HTTP with PostgreSQL, Discord interactions, and browser flows as the public test seams.

Implemented independent rich entries and settings through `apps/server/src/recommendations`, shared reply validation, and the shared dashboard editor. Recommendations now have dedicated list, Add/Edit, and settings routes. Existing Response draft recovery also preserves recommendation metadata and embeds through reauthentication. Curator attribution remains plain saved-name text; optional IDs do not trigger member lookups or role checks.

Migration 0008 adds rich entry fields and preserves existing details and links in embeds. Existing personal entries use their collection name as an initial curator label for manager review; migration does not infer curator identity from a creator/editor. Migration 0009 adds per-server directory and introduction settings. The production export/import remains the separate agreed cutover effort.

TDD observed failures before fixes for missing rich fields, settings/default introductions, alias-based rich lookup, directory presentation, editor/settings workflows, explicit selection IDs shadowed by aliases, category labels disappearing from long autocomplete names, and preview page overflow. Tests exercise public interfaces rather than private helpers. Raw name/alias lookup rejects ambiguous matches; autocomplete uses stable entry IDs, retaining category labels even when display labels need shortening.

Validation: 87 server integration tests passed on fresh isolated PostgreSQL, including migration from the pre-feature schema, names-only paging through 105 entries, settings validation, permissions/CSRF, metadata, curator placeholders, and runtime expansion limits. Five Chromium browser tests passed, including recommendation authoring/settings, metadata and embed recovery after reauthentication without automatic saving, and existing Response recovery behavior. Workspace build and typecheck passed; `git diff --check` passed. Reviewed desktop and 390px mobile editor renders and the settings page. The design detector reported only the existing Inter font choice, which was retained to match the dashboard.

Public command scope is unchanged. Collection pages use navigation buttons; no Discord-side content management was introduced.

## References

- `.scratch/robotman-v7/spec.md`
- `CONTEXT.md`
- `/Users/maruf/Code/Robotman/services/types/src/responses.ts`
- `/Users/maruf/Code/Robotman/services/dashboard/src/components/modals/AutoResponseModal.tsx`
- `/Users/maruf/Code/Robotman/services/bot/src/util/auto-responses.ts`
- `/Users/maruf/Code/Robotman/services/bot/src/util/constants.ts` (Recommendations constants and auto_responses schema)

## Revised personal-list model — 2026-11-03

Implemented requirements. These decisions supersede the earlier allowance for multiple personal lists and separate collection names for Moderator/Booster entries.

- A person has at most one personal recommendation list per server, across Moderator and Booster combined. The list belongs to either category. Different servers remain independent.
- Personal lists use the saved curator name as their display and directory/search name. Remove the separate collection-name input for Moderator and Booster. Character and Writer entries retain their own collection names.
- Discord account association remains optional. Enforce personal-list uniqueness by Discord user ID when supplied, and by saved curator name otherwise. Name comparison ignores case. Without an associated account, differently named records cannot reliably be recognized as the same person.
- Existing role/membership independence, rich replies, introductions, aliases and plain-text curator rendering remain applicable.
- The feature has not shipped, so no existing-user conflict-resolution workflow is required.
- Personal-list display names must be unique, ignoring case, across Moderator and Booster within a server, including when different Discord IDs are supplied. Managers distinguish names where needed, such as Alex R and Alex T.
- The user confirmed this design and requested TDD implementation.

### Implementation verification — 2026-11-05

Implemented the confirmed revision with TDD at the previously approved GraphQL/HTTP and browser seams. Observed failures for duplicate personal lists, a separate saved collection name, and the redundant editor field before implementation. Server saves use the curator name as the personal list name and reject duplicate names or associated Discord IDs across Moderator/Booster under the existing server transaction lock. Updates exclude their own record, allowing category/name edits. The editor uses one curator-name field for personal lists, including preview, explicit saves and recovered drafts. Character/Writer naming remains independent. No new storage fields or data migration are required.

Validation: 88 server integration tests passed against disposable PostgreSQL; all 5 browser tests passed, including personal-list authoring and reauthentication recovery. Workspace typecheck/build and diff whitespace checks passed.
