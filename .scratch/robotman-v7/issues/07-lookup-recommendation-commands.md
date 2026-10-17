# 07: Build retained lookup commands and repair search integrations

**What to build:** Members use the selected Comics, Movies and TV, Pokémon, Google, and YouTube lookups through HTTP interactions.

**Blocked by:** 01: Run Discord interactions and the API over HTTP

**Status:** resolved

- [x] Implement character, comic, locg, pull, pull-user, letterboxd, movie, show, and pokemon.
- [x] Implement google and youtube with repaired and verified API integrations.
- [x] Commands are server-only and provide useful no-result and upstream-failure feedback.
- [x] Do not implement dictionary, book search, wiki, wikia, or Pokémon fusion.

## Provider configuration

The server requires these credentials for the corresponding commands:

- `COMICVINE_API_KEY`: `character`
- `OMDB_API_KEY`: `movie`
- `GOOGLE_CSE_API_KEY` and `GOOGLE_CSE_ENGINE_ID`: `google`
- `YOUTUBE_API_KEY`: `youtube`

`comic`, `locg`, `pull`, and `pull-user` use the public League of Comic Geeks web endpoint. `letterboxd` reads the public RSS feed. `show` uses TVmaze and `pokemon` uses PokéAPI; these providers do not require credentials.

## Provider API references

- Google Custom Search `cse.list`: <https://developers.google.com/custom-search/v1/reference/rest/v1/cse/list>
- YouTube Data API `search.list`: <https://developers.google.com/youtube/v3/docs/search/list>
- PokéAPI v2: <https://pokeapi.co/docs/v2>
- TVmaze search: <https://www.tvmaze.com/api#show-search>
- OMDb API: <https://www.omdbapi.com/>
- Comic Vine API: <https://comicvine.gamespot.com/api/documentation>


## Answer

Implemented all eleven retained lookup commands and their runtime registration. Google uses Custom Search and YouTube uses the Data API; endpoint requests, results, missing credentials, and upstream failures are covered by fixtures. Public LOCG, TVmaze, PokéAPI, and Letterboxd calls returned usable live results. Credentialed providers require operator keys and were not verified against live accounts. Letterboxd opaque RSS identifiers are handled without generating invalid links.

Validation: all 53 integration tests passed with real disposable PostgreSQL; workspace build and typecheck passed. The fresh Docker deployment passed signed interaction and PostgreSQL readiness checks. Setup and credential requirements are documented in README.
