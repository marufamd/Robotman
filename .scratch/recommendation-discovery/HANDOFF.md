# Handoff: separate recommendation lists

## Objective and status

The user confirmed the design in `spec.md` and requested a handoff. **Implementation has not started.** Read the spec for the interview history and this file for the actionable summary. This change supersedes the combined-directory portions of the earlier recommendation customization spec and v7 scope, while keeping the other approved requirements.

## Confirmed behavior

- Replace `/recs list` with `/recs taste-test`, `/recs characters`, and `/recs writers`. Keep `/recs lookup` and its existing name/alias autocomplete and stable selection behavior.
- Taste Test presents the original shared introduction, then alphabetically ordered personal-list names under separate **Mods** and **Boosters** headings, like the user's screenshot. Do not paginate this list. If Discord limits are exceeded, send additional embeds or messages automatically; keep the introduction first, preserve headings and every name, and never silently truncate. Both headings appear even when one category has no entries, with “None yet” for an empty category. Entirely empty lists show their introduction and a clear empty message.
- Character and Writer recommendations have separate lists. Show saved collection names in alphabetical order, not old message-trigger syntax. Each page has at most 10 names, fewer when needed for Discord limits; do not split or drop names. Public Previous/Next buttons update one message and show the page number. Members browse an individual entry through `/recs lookup`.
- Give server managers separate dashboard controls for each list's title, introduction and embed color. Taste Test also has editable Mods and Boosters headings. Default titles: Taste Test, Character Recommendations, Writer Recommendations. Default introductions preserve the original intent, adapting Character and Writer instructions to `/recs lookup`. Original shared Taste Test text is in the old source, and is: “Welcome to **Taste Test**, where you can sample our mods' and boosters' personal recommendations and personal taste! Feel free to engage us on a discussion, and please, have fun discovering what we love.”
- This feature has not shipped. Use new list-setting defaults; no special migration or manager review workflow for old directory presentation settings is required. Preserve all existing recommendation entries and authored replies.

## Preserve existing behavior

- List presentation introductions are distinct from category defaults for **individual entry replies**. Preserve the per-category default introductions and per-entry inherit/custom/none modes, effective reply validation and preview. The existing settings object combines these concerns; redesign carefully.
- Preserve four underlying categories, independent rich replies, multiple embeds, aliases, plain saved curator names, optional manually entered Discord ID, one personal list per person per server across Moderator/Booster, and no live membership/role synchronization.
- Keep dashboard authorization, CSRF, draft recovery, and the current intended slash-only public scope. Do not reintroduce message triggers, Discord-side CRUD, removed commands, Gateway or Redis.
- Save publishes immediately. Preserve Discord aggregate limits, safe mentions and complete output.

## Key files

- `apps/server/src/commands/requests/index.ts`: current `/recs lookup`, combined `/recs list`, SQL paging, button routing and reply rendering.
- `apps/server/src/recommendations/model.ts` and `index.ts`: default settings, entry introductions, settings GraphQL API and validation.
- `apps/server/src/database/schema.ts`; migration `apps/server/migrations/0009_recommendation_settings.sql`: settings stored in JSON. Existing saved JSON needs to be handled safely with new defaults, even without preserving old presentation customizations; ensure existing category introductions remain available.
- `apps/dashboard/src/components/recommendation-settings.tsx`, `response-editor.tsx`, `apps/dashboard/src/lib/graphql.ts`: settings form, inherited entry introductions and API types.
- `apps/server/test/guild-content-http.test.ts`, `requests-http.test.ts`, `apps/dashboard/test/recommendation-editor.spec.ts`: existing signed Discord interaction, GraphQL/settings and browser coverage. These public seams were previously approved by the user for recommendation TDD.
- `CONTEXT.md`, `.scratch/robotman-v7/spec.md`, `.scratch/recommendation-customization/spec.md`, `README.md`, `docs/adr/0009-independent-rich-recommendation-replies.md`: update relevant docs and clarify superseded combined-directory decisions.
- Original reference: `/Users/maruf/Code/Robotman/services/bot/src/util/auto-responses.ts` (`handleLists`) and `src/util/constants.ts` (`Recommendations.TEXT`). Old message-trigger instructions and hard-coded character label exceptions need not be copied; use saved names and slash commands.

## Implementation and verification guidance

1. Inspect `AGENTS.md`, `/Users/maruf/.codex/RTK.md`, the v7 spec and relevant ADRs before implementation. Commands must use `rtk` per local instructions. The worktree is heavily dirty with prior user work; do not reset or discard it.
2. Add/update public-boundary tests for the three command definitions and Discord interactions: separate categories, alphabetic order, no cross-category leakage, Taste Test defaults/custom settings, both empty categories, overflow without omissions or pagination, and Character/Writer navigation with 10-name and Discord character limits. Check long names and public button use.
3. Exercise manager settings via GraphQL against isolated PostgreSQL, including preservation of individual-entry introductions, CSRF/permissions and incompatible entry default validation. Update browser settings/editor tests for the new controls and draft recovery.
4. Existing `pnpm test` starts a disposable PostgreSQL container; Docker must be running. Dashboard browser tests use `pnpm --filter @robotman/dashboard exec playwright test`. Run appropriate build/typecheck and inspect results. Do not use production data.
5. Update `docs/local-testing.md` with the new slash commands and smoke checks. Publishing commands to Discord is a separate external action; do not register or deploy without explicit authorization.

## Source of authority

The user confirmed the final consolidated design after five rounds on 2026-11-14. The newer decisions above take precedence over earlier specifications that prescribe a combined `/recs list`, while all unrelated requirements remain in effect.
