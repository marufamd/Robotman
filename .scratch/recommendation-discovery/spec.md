# Recommendation discovery

Status: requirements confirmed; implementation pending.

## Settled — round 1

- Replace the combined `/recs list` directory with `/recs taste-test`, `/recs characters`, and `/recs writers`. Keep `/recs lookup` for individual entries.
- Taste Test defaults to the original shared introduction and separate Mods and Boosters headings listing saved names, matching the screenshot. Managers can customize its introduction and headings.
- Existing per-entry replies, rich editing and personal-list rules continue unless revised in this interview.

## Original source findings

The old Taste Test grouped names alphabetically under Mods and Boosters. Character listings displayed a bold readable label followed by the old trigger in brackets, with some hard-coded display exceptions. Writer names appeared in columns. Each had its own introduction. Old message-trigger instructions are obsolete under slash-command lookup.

Subsequent rounds below settle the presentation, settings, empty lists and pagination.

## Settled — round 2

- Character and Writer lists each show their saved collection names alphabetically, with introductions explaining `/recs lookup`; omit obsolete message-trigger syntax.
- Managers configure the introduction and embed color independently for Taste Test, Characters and Writers. Default wording retains the original intent, adapted to slash commands.
- Members choose individual entries with existing `/recs lookup` autocomplete, including search by name and alias.

## Settled — round 3

- Character and Writer lists use public Previous/Next buttons on one message, approximately 10 names per page, keeping names intact. Taste Test has no pagination.
- Taste Test displays both Mods and Boosters headings, with “None yet” for an empty category. Entirely empty lists show their introduction and a clear empty message.
- Replace the existing combined directory controls with settings for the three focused lists. Use the new defaults; the feature has not shipped, so no special settings migration/review workflow is needed. Preserve recommendation entries and replies.

## Settled — round 4

- Taste Test does not paginate.
- Managers can customize each of the three list titles, introductions and embed colors. Default titles: Taste Test, Character Recommendations, Writer Recommendations. Taste Test category headings remain separately customizable.
- Use new default list settings without a special settings migration or review workflow, since the feature has not shipped.

## Settled — round 5

- Taste Test has no pagination buttons. If the combined names exceed Discord limits, automatically send additional embeds or messages, preserving the introduction first, headings and every name.
- Character and Writer pages contain at most 10 names, fewer where Discord limits require. Names are never split or silently omitted.

The user confirmed the consolidated design. Implementation is pending; see [handoff](HANDOFF.md).
