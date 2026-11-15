# Lookup and moderator output parity

Status: resolved

## Requirements

- Restore original Character, LOCG, Movie and Show metadata, image sizing, branding, source links, fields and Markdown presentation.
- Restore LOCG result count/cover links and field layout; `/comic` stays removed.
- Restore Pull/Pull User original supported date forms, current-Wednesday behavior, publisher coverage/branding, complete lists and user totals/profile presentation. Respect Discord payload limits without silently losing results.
- Restore Letterboxd all-feed mode, matching, ratings, watched dates, spoiler concealment and original presentation.
- Restore Pokemon Bulbapedia article lookup, numeric resolution, disambiguation links and image presentation.
- Restore YouTube original native video-link output and original search behavior.
- Verify Shows/Release List original presentation while retaining server settings, configured destination, ephemeral delivery confirmation and explicit Shows text-file fallback.
- If an original upstream is unavailable, document the specific limitation for review rather than silently substituting another command behavior.

## Acceptance

Compare public Discord command inputs, successful payloads and interaction behavior against the original source and the confirmed [parity spec](../spec.md). Preserve explicitly agreed v7 exceptions. Record any unavoidable upstream limitation.

## Implementation result

Restored lookup metadata/branding, LOCG eight-result layout and real series publisher markup, readable pull dates/full lists/totals, Letterboxd all/review/spoiler behavior, Bulbapedia articles, and YouTube native-link output. Existing moderator HTTP tests retain the explicit v7 delivery/settings exceptions. All provider tests use fixtures; live-provider smoke checks are documented.

Validation: 96 server tests, workspace build/typecheck, isolated Docker build/boot and diff whitespace checks passed.
