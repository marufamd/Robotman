# Letterboxd review pagination

Status: implemented and verified.

The current all-reviews output splits fields at arbitrary character boundaries and can break film links. Replace it with a single Discord message containing one paginated embed.

## Settled

- Only the user who invoked the command can navigate its pages.
- Show up to 10 complete film entries per page; use fewer when needed to fit Discord limits. Keep each entry's title, link and rating intact.
- Freeze the review list at invocation, so changes to the source feed do not shift pages during browsing.

- Buttons work for five minutes. A press by anyone other than the requester is silently acknowledged without changing the message or sending a notification.
- Display a page count; disable Previous/Next at their respective boundaries and omit navigation buttons for a single page.
- If a single title is too long to fit, shorten its displayed text with an ellipsis while keeping its full link and rating intact.

- Keep each fixed snapshot in server memory for five minutes, then remove it. A server restart clears it; no database storage is needed.
- Expired or missing snapshots do not change the visible page or send a message. A component press is silently acknowledged to avoid Discord reporting an interaction failure; buttons need not be automatically disabled after expiry.
- Single-film review output remains as currently implemented.

The user confirmed these requirements before implementation.

Discord component interactions need acknowledgment; its deferred update response can silently acknowledge an unauthorized press without changing the message or showing a loading state. Source: https://docs.discord.com/developers/interactions/receiving-and-responding


## Implementation and verification

All-review output is one embed with complete entries in its description, with pages sized by both the ten-entry cap and Discord limits. An opaque ID refers to an in-memory five-minute snapshot; component requests verify requester, server and channel. Other users and expired/missing snapshots are silently acknowledged. A too-long title is shortened while preserving the link and rating; a link that cannot fit produces an explanation. Single-review rendering is unchanged.

Signed HTTP tests verify first/last button boundaries, a fixed snapshot without refetching, unauthorized presses, expiry, the complete link/rating, and single-page long-title handling. Targeted interaction suite and server typecheck passed.
