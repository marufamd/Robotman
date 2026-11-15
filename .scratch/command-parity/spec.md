# Retained command parity

Status: implemented and verified.

## Reported problems

- `/color` does not work in manual Discord testing; compare with original behavior before diagnosing a cause.
- `/math` computes results but should preserve original functionality and output, including its embed presentation.
- The user requests equivalent review for all other retained commands.

## Research and decisions pending

Compare original source in `/Users/maruf/Code/Robotman` against the v7 retained command scope. Establish the parity baseline for inputs, calculations, embeds, images, links, interactive behavior and failure cases. Previously agreed v7 command removals and explicit behavior changes remain the baseline unless the user changes them. The user subsequently confirmed the requirements and requested TDD implementation.

## Settled decisions — round 1

- Original retained-command behavior is the baseline for supported inputs, computations, result formatting, embed fields/colors, images, links, and interactions. Document necessary departures for review.
- Explicit v7 decisions take precedence, including HTTP latency for Ping, server-configured moderator commands, the richer independent Recommendations/Responses, and removed command scope.
- Preserve successful output closely; allow clearer explanations for invalid inputs or unavailable providers. Do not narrow supported inputs merely to simplify the rewrite.

Source comparison is underway for utilities and the other retained command groups. Implementation awaits completion and confirmation of this interview.

## Settled decisions — round 2

- Math preserves the original slash command's code-block result and `result.txt` fallback for long output; no result embed.
- Math accepts expression syntax supported by the original evaluator. Do not add the old message-command normalization of words such as times/divided by or Unicode pi.

## Source findings — utilities

- Original Color accepts hexadecimal, 0x hexadecimal, integer, RGB and predefined named colors and returns a color-accented embed with Hex/RGB/Integer plus a generated 300x300 color.png swatch. V7 currently restricts input to hexadecimal and returns text.
- Original Math uses expr-eval, returning a code block or result.txt when the answer exceeds 1015 characters. V7 uses a narrower arithmetic parser and plain Result text.

## Source findings — wider parity audit

- Coin and Eight Ball lost bundled image replies; Eight Ball also lost two answer choices. Stats lost its Statistics embed and most runtime fields. Ping can retain its original embed presentation with honest HTTP metrics.
- Lookup gaps include missing original metadata/branding, reduced result counts, Letterboxd all/review/spoiler behavior, pull-list dates/totals, Pokemon Bulbapedia article results, and YouTube native video-link presentation.
- Games lost solo bot opponents for Connect Four/Tic Tac Toe and original Hangman random-word/whole-word/stop gameplay. HTTP transport does not require those gameplay reductions. Restore within the agreed HTTP/persistent-session design.
- Original Comic uses ComiXology issue/trade details while v7 uses a LOCG search list. Provider availability must be researched before choosing a replacement.
- Color legacy parsing ambiguities: three hex digits are padded rather than expanded; numeric six-digit input is read as hexadecimal; zero/DEFAULT is incorrectly rejected by the slash handler. Decide whether to preserve these quirks or correct them explicitly.

## Settled decisions — round 3

- Correct legacy Color parsing quirks: `#abc` expands to `#AABBCC`; bare numeric input means decimal; `#` or `0x` identifies hexadecimal; black/zero is valid. Preserve named colors, RGB input and original embed/swatch output. This is an explicit exception to exact legacy parsing parity.

## Comic provider findings

Research confirmed that the original comixology.com host redirects to Amazon; the legacy scraper depends on obsolete ComiXology URLs and markup. It cannot be reused as-is. Existing LOCG search provides list-level data; direct detail requests returned 403 during research, so credits/page-count/release-date parity is not established. Provider replacement and missing-field handling remain to be decided before final confirmation.

## Settled decisions — round 4

- Remove `/comic` entirely. Do not replace its retired provider. `/locg` remains in scope. This supersedes the earlier provider-replacement question and original retained-command list. Removed the command definition/dispatch and updated registry/lookup regression coverage; Discord registration must be rerun to apply the removal remotely. The broader parity interview remains open for final consolidated confirmation.

## Final confirmation

The user confirmed the consolidated requirements: restore original retained-command inputs, successful output, images, lookup detail and gameplay; preserve explicit v7 changes; keep Math code-block/file output without message-input normalization; apply corrected Color parsing; remove Comic. Clearer errors are permitted. The original source is the behavior reference, with these decisions taking precedence.

## Implementation tickets

- [01 — Utility parity](issues/01-utility-parity.md)
- [02 — Lookup parity](issues/02-lookup-parity.md)
- [03 — Game parity](issues/03-game-parity.md)

Moderator commands retain the agreed server-configured behavior and Shows file fallback; verify their successful presentation against the original as part of lookup/output parity. No removed command, prefix listener, Gateway connection or Discord-side content CRUD is restored.

## Implementation — 2026-11-14

Implemented vertical red/green slices through signed HTTP interactions, with disposable PostgreSQL for games. Observed failures before restoring Color option/input/embed/PNG behavior; Math evaluator/code blocks/files and user functions; Coin/Eight Ball images and Stats/Ping embeds; YouTube native-link output; Movie/Show metadata; Bulbapedia Pokemon; Character/LOCG presentation including actual series publisher markup; complete pull lists/readable dates/totals; Letterboxd all/review/spoiler behavior; solo games and random-word Hangman; persistent Connect Four timeouts.

Bundled the original color/publisher dictionaries, Hangman words, and Coin/Eight Ball image assets in the server runtime package. Added multipart webhook encoding so binary files are sent through Discord rather than JSON-serialized. Math evaluates in a bounded worker so the original functions and expression precision do not block HTTP handling.

Game transport adapts old message inputs to modals. The modal's built-in Cancel provides Cancel Guess without consuming a guess. Bot play uses minimax (complete Tic Tac Toe search and bounded Connect Four search); first player is randomized and receives the first piece/symbol. Per-turn deadlines are persisted and processed after restarts: Connect Four automatically plays after one minute, Tic Tac Toe forfeits after 20 seconds, and Hangman ends after one minute. Timeout updates use the bot-authenticated channel message when available, so interaction-token expiry does not end an otherwise active match. Existing permission, revision and server/channel checks are retained.

The agreed architecture exceptions remain: no Gateway, prefix aliases, removed commands or Discord-side content management; Ping reports HTTP latency; moderator delivery/settings and rich recommendation behavior retain their approved v7 design. Clearer invalid-input/provider errors are permitted. No live Discord command registration or production deployment was performed.

Live provider availability and visual Discord rendering still require the documented smoke pass. Automated provider tests use fixed HTTP fixtures. Upstream 403/outage responses return an explanation; they are not represented as verified live success.

### Verification result

96 server tests passed against fresh isolated PostgreSQL, including signed HTTP parity tests and restart-safe automatic Connect Four moves. Targeted signed HTTP tests also cover actual LOCG series markup, Letterboxd diary-only filtering and title/description spoiler markers. Workspace build/typecheck passed. The isolated Docker build/boot test passed with the new dependencies and assets packaged. Whitespace checks passed. No dashboard behavior changed in this implementation, so no new browser tests were added.

Use `pnpm register:commands` with `DISCORD_TEST_GUILD_ID` configured before the [manual smoke checklist](../../docs/local-testing.md#command-parity-smoke-checklist). Live credentials, provider availability and Discord rendering remain manual checks rather than claims made from fixture-backed tests.

## Provider reuse — comicgeeks

The user requested reuse of the original provider package after reviewing the duplicated LOCG retrieval. Adopted published `comicgeeks` 1.2.0 for series search, publisher releases, user profiles and user pull lists. Manual and scheduled Release Lists also use `fetchReleases` with the existing DC/Milestone filters. Robotman retains date selection, permissions, formatting, Discord paging and delivery. Removed handwritten LOCG HTML parsers and URL construction from production code.

Tests intercept the external package's public Impit HTTP transport rather than mocking its result methods. This exercises the actual package parsers and sorting with HTML fixtures, while keeping signed Discord interaction requests as the public command seam. Existing fixtures were completed with the image/profile markup expected by the original package. No live providers or Discord writes are used by automated tests.

Provider reuse verification: all 97 server tests passed, targeted signed HTTP checks passed after fixture cleanup, workspace build/typecheck passed, and the isolated production Docker build/boot passed with the native Impit transport. Diff whitespace checks passed.
