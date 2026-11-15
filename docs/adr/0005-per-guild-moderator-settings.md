# Store moderator schedules per Guild

Each Guild owns its weekly Release-list Schedule and selected television series, which managers configure through the dashboard and persist in PostgreSQL. New Guild settings use the Sunday 00:00 UTC schedule and the existing show selection, but no destination channel; scheduled posting stays disabled until a manager chooses one. Older environment settings are not imported. Both scheduled and manual release-list posts use the configured Guild channel, while manual invocations receive an ephemeral confirmation in the invoking channel.
