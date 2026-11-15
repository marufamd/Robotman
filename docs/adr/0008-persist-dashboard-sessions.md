# Persist dashboard sessions and management permission snapshots

Store dashboard sessions and their Management Permission Snapshots in the existing PostgreSQL database, with a signed opaque session identifier in the browser cookie. Process-local sessions lose sign-ins on restart; self-contained cookies cannot comfortably carry potentially large permission snapshots, and browser-editable permission data cannot authorize server requests. Persistence preserves both sign-in and its original permission snapshot across restarts and deployments without introducing Redis or additional Discord permission checks.

Sessions expire seven days after sign-in without renewal on activity. Each browser session is independent, and logout revokes only that session. Database failures deny protected requests with a retryable service error while retaining the cookie and existing dashboard identity; they must not be treated as an expired session.

Persist pending OAuth state with its existing ten-minute lifetime and single-use semantics so a restart during Discord authorization does not interrupt sign-in. If a session expires while editing a Response, preserve the draft in the current tab and prompt for sign-in; saving requires an explicit retry after reauthentication. The first deployment may require one final sign-in because existing process-local sessions are not migrated.
