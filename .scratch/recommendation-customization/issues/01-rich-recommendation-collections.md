# 01: Give recommendation collections full Response editing capabilities

Status: resolved

**What to build:** Independent freely authored recommendation replies across Character, Writer, Moderator and Booster, with curator metadata, introduction overrides, alias discovery and a customizable names-only directory.

## Acceptance

- [x] Shared text/multi-embed editor, property preservation, placeholders, validation and live preview on dedicated Add/Edit pages.
- [x] Static personal curator names, optional manually entered Discord IDs, multiple lists per curator and plain-name placeholders without notifications.
- [x] Original Moderator/Booster introductions by default, server/category settings and per-entry inherited/custom/omitted modes.
- [x] Save publishes immediately; aggregate reply limits include the introduction and expanded placeholders without silent truncation.
- [x] Names are unique per server/category; autocomplete searches aliases and selects stable IDs, including long-label disambiguation.
- [x] Directory title/text/color/headings can be configured separately; all collection names remain reachable through pagination.
- [x] Existing entries survive migration without losing details or links; production-source imports remain separate.
- [x] Server authorization/CSRF and editor session recovery remain intact.

## Answer

See [the implementation result](../spec.md) and [ADR-0009](../../../docs/adr/0009-independent-rich-recommendation-replies.md). Verified 87 server tests, five browser tests, workspace build/typecheck and desktop/mobile layout checks.
