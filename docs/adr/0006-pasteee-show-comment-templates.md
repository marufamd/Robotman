# Preserve Paste.ee links for Shows comment templates

The `/shows` command preserves its legacy behavior by publishing its weekly Episode Comment Templates through Paste.ee using the server-side `PASTEE_KEY`, then returning the “Comment Templates” link without Discord embeds. If the key is missing or Paste.ee fails, the command sends the same titled Markdown templates as a public `.txt` attachment; a week with no episodes returns a plain no-episodes message. TVmaze schedule requests remain unauthenticated.
