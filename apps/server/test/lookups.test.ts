import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Sql } from 'postgres';
import type { APIApplicationCommandInteraction } from 'discord.js';
import type { CommandContext, CommandInteraction } from '../src/commands/types.js';
import { lookupModule } from '../src/commands/lookups/index.js';

function interaction(name: string, options: Array<{ name: string; value: string | number }> = []): CommandInteraction {
  return {
    type: 2,
    data: {
      type: 1,
      name,
      options: options.map((option) => ({ ...option, type: typeof option.value === 'number' ? 4 : 3 })),
    },
  } as unknown as APIApplicationCommandInteraction;
}

function context(fetchImpl: typeof fetch = globalThis.fetch): CommandContext {
  return { sql: {} as Sql, fetch: fetchImpl, startedAt: Date.now() };
}

async function result(name: string, options: Array<{ name: string; value: string | number }> = [], ctx = context()) {
  return lookupModule.handle(interaction(name, options), ctx);
}

function content(response: Awaited<ReturnType<typeof result>>): string {
  assert.equal(response.type, 4);
  return response.type === 4 && 'content' in response.data ? response.data.content ?? '' : '';
}

function embed(response: Awaited<ReturnType<typeof result>>): Record<string, unknown> {
  assert.equal(response.type, 4);
  if (response.type !== 4 || !('embeds' in response.data)) throw new Error('Expected an embed response');
  const value = response.data.embeds?.[0];
  if (!value) throw new Error('Expected one embed');
  return value as Record<string, unknown>;
}

async function withEnv(values: Record<string, string>, action: () => Promise<void>): Promise<void> {
  const prior = new Map<string, string | undefined>();
  for (const [key, value] of Object.entries(values)) {
    prior.set(key, process.env[key]);
    process.env[key] = value;
  }
  try { await action(); }
  finally {
    for (const [key, value] of prior) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

test('lookup module only registers the selected lookup commands', () => {
  assert.deepEqual(lookupModule.commands.map((command) => command.name), [
    'character', 'comic', 'locg', 'pull', 'pull-user', 'letterboxd', 'movie', 'show', 'pokemon', 'google', 'youtube',
  ]);
  assert.equal(lookupModule.matches(interaction('wiki')), false);
  assert.equal(lookupModule.matches(interaction('pokemon')), true);
});

test('character uses Comic Vine’s character list endpoint and formats a useful result', async () => {
  await withEnv({ COMICVINE_API_KEY: 'fixture-key' }, async () => {
    let requestUrl = '';
    const fetchStub: typeof fetch = async (input) => {
      requestUrl = String(input);
      return Response.json({
        status_code: 1,
        results: [{
          name: 'Spider-Man', site_detail_url: 'https://comicvine.gamespot.com/spider-man/4005-1443/',
          deck: 'Peter Parker protects New York.', real_name: 'Peter Parker', aliases: 'Spidey\r\nFriendly Neighborhood Spider-Man',
          publisher: { name: 'Marvel Comics' }, first_appeared_in_issue: { name: 'Amazing Fantasy #15' },
          origin: { name: 'Radioactive Spider' }, image: { medium_url: 'https://comicvine.gamespot.com/a/uploads/scale_medium/1/1443/1-spider.jpg' },
        }],
      });
    };
    const answer = await result('character', [{ name: 'query', value: 'Spider-Man' }], context(fetchStub));
    assert.match(requestUrl, /^https:\/\/comicvine\.gamespot\.com\/api\/characters\//);
    assert.equal(new URL(requestUrl).searchParams.get('filter'), 'name:Spider-Man');
    assert.equal(embed(answer).title, 'Spider-Man');
    assert.equal((embed(answer).fields as Array<{ name: string }>)[0]?.name, 'Real name');
  });
});

test('Comic Vine configuration and no-result cases are explained', async () => {
  await withEnv({ COMICVINE_API_KEY: '' }, async () => {
    assert.match(content(await result('character', [{ name: 'query', value: 'Nobody' }], context(async () => Response.json({})))), /lookup is not available right now/i);
  });
  await withEnv({ COMICVINE_API_KEY: 'fixture-key' }, async () => {
    assert.match(content(await result('character', [{ name: 'query', value: 'Nobody' }], context(async () => Response.json({ status_code: 1, results: [] })))), /No Comic Vine character results/);
  });
});

test('comic and locg search the public League of Comic Geeks search endpoint', async () => {
  let requests = 0;
  const fetchStub: typeof fetch = async (input) => {
    const url = new URL(String(input));
    assert.equal(url.origin, 'https://leagueofcomicgeeks.com');
    assert.equal(url.pathname, '/comic/get_comics');
    assert.equal(url.searchParams.get('list'), 'search');
    assert.equal(url.searchParams.get('title'), 'Batman');
    requests += 1;
    return Response.json({ list: `<li><div class="cover"><a href="/comic/123/batman-1"><img data-src="https://s3.amazonaws.com/comicgeeks/comics/covers/medium-123.jpg"></a></div><div class="comic-details">DC Comics · 2024</div><div class="title color-primary">Batman #1</div><div class="comic-description col-feed-max">A new series begins.</div><span class="price">$4.99</span></li>` });
  };
  const comicResult = await result('comic', [{ name: 'query', value: 'Batman' }], context(fetchStub));
  const seriesResult = await result('locg', [{ name: 'query', value: 'Batman' }], context(fetchStub));
  assert.equal(requests, 2);
  assert.match(String(embed(comicResult).description), /Batman #1/);
  assert.match(String(embed(seriesResult).description), /A new series begins/);
});

test('publisher pull list sends a Wednesday week and real League of Comic Geeks publisher id', async () => {
  let requested: URL | undefined;
  const fetchStub: typeof fetch = async (input) => {
    requested = new URL(String(input));
    return Response.json({ list: '<li><div class="title color-primary">Daredevil #1</div></li>' });
  };
  const answer = await result('pull', [
    { name: 'publisher', value: 'valiant' }, { name: 'date', value: '2026-10-12' },
  ], context(fetchStub));
  assert.equal(requested?.pathname, '/comic/get_comics');
  assert.equal(requested?.searchParams.get('publisher[]'), '34');
  assert.equal(requested?.searchParams.get('date'), '2026-10-14');
  assert.match(String(embed(answer).description), /Daredevil #1/);
  assert.match(content(await result('pull', [{ name: 'date', value: 'not-a-date' }], context(fetchStub))), /valid YYYY-MM-DD/);
});

test('pull-user resolves a public profile then reads the user’s pull list', async () => {
  const paths: string[] = [];
  const fetchStub: typeof fetch = async (input) => {
    const url = new URL(String(input));
    paths.push(url.pathname);
    if (url.pathname === '/profile/example/pull-list') {
      return new Response('<html><title>Example User - League of Comic Geeks</title><div id="comic-list-block" data-user="12345"></div></html>', { status: 200 });
    }
    return Response.json({ list: '<li><div class="title color-primary">Amazing Spider-Man #1</div><span class="price">$4.99</span></li>' });
  };
  const answer = await result('pull-user', [{ name: 'user', value: 'Example' }, { name: 'date', value: '2026-10-14' }], context(fetchStub));
  assert.deepEqual(paths, ['/profile/example/pull-list', '/comic/get_comics']);
  assert.match(String(embed(answer).description), /Amazing Spider-Man/);
});

test('Letterboxd parses recent RSS diary entries and finds a requested film', async () => {
  const feed = `<?xml version="1.0"?><rss><channel><title>Letterboxd - Alice</title><link>https://letterboxd.com/alice/</link><item><title>Arrival, 2016 - ★★★★</title><link>https://letterboxd.com/alice/film/arrival/</link><guid>https://letterboxd.com/alice/film/arrival/</guid><description><![CDATA[<p><img src="https://a.ltrbxd.com/resized/film.jpg"></p><p>A thoughtful first contact story.</p>]]></description><letterboxd:filmTitle>Arrival</letterboxd:filmTitle><letterboxd:filmYear>2016</letterboxd:filmYear><letterboxd:memberRating>4</letterboxd:memberRating></item></channel></rss>`;
  const fetchStub: typeof fetch = async (input) => {
    assert.equal(String(input), 'https://letterboxd.com/alice/rss/');
    return new Response(feed, { status: 200 });
  };
  const answer = await result('letterboxd', [{ name: 'username', value: 'alice' }, { name: 'film', value: 'Arrival' }], context(fetchStub));
  assert.equal(embed(answer).title, 'Arrival (2016)');
  assert.equal(embed(answer).url, 'https://letterboxd.com/alice/film/arrival/');
  assert.equal((embed(answer).fields as Array<{ value: string }>)[0]?.value, '4 / 5');
  const opaqueGuid = feed.replace('<guid>https://letterboxd.com/alice/film/arrival/</guid>', '<guid isPermaLink="false">letterboxd-watch-12345</guid>');
  const opaqueAnswer = await result('letterboxd', [{ name: 'username', value: 'alice' }, { name: 'film', value: 'Arrival' }], context(async () => new Response(opaqueGuid)));
  assert.equal(embed(opaqueAnswer).url, 'https://letterboxd.com/alice/film/arrival/');
});

test('movie uses OMDb’s title search and reports missing credentials', async () => {
  await withEnv({ OMDB_API_KEY: 'fixture-omdb' }, async () => {
    let requested: URL | undefined;
    const fetchStub: typeof fetch = async (input) => {
      requested = new URL(String(input));
      return Response.json({ Response: 'True', Title: 'Arrival', Year: '2016', Plot: 'A linguist studies an alien arrival.', imdbID: 'tt2543164', Genre: 'Drama, Sci-Fi', Ratings: [] });
    };
    const answer = await result('movie', [{ name: 'query', value: 'Arrival' }], context(fetchStub));
    assert.equal(requested?.origin, 'https://www.omdbapi.com');
    assert.equal(requested?.searchParams.get('t'), 'Arrival');
    assert.equal(embed(answer).title, 'Arrival (2016)');
  });
  await withEnv({ OMDB_API_KEY: '' }, async () => assert.match(content(await result('movie', [{ name: 'query', value: 'Arrival' }])), /lookup is not available right now/i));
});

test('show uses TVmaze search and handles no results', async () => {
  let requested = '';
  const fetchStub: typeof fetch = async (input) => {
    requested = String(input);
    return Response.json([{ score: 1, show: { name: 'The Office', url: 'https://www.tvmaze.com/shows/526/the-office', language: 'English', premiered: '2005-03-24', status: 'Ended', genres: ['Comedy'], network: { name: 'NBC' }, summary: '<p>A workplace comedy.</p>' } }]);
  };
  const answer = await result('show', [{ name: 'query', value: 'The Office' }], context(fetchStub));
  assert.match(requested, /^https:\/\/api\.tvmaze\.com\/search\/shows\?/);
  assert.equal(embed(answer).title, 'The Office');
  assert.match(String(embed(answer).description), /A workplace comedy/);
  assert.match(content(await result('show', [{ name: 'query', value: 'Unknown' }], context(async () => Response.json([])))), /No TVmaze show results/);
});

test('PokéAPI lookup formats a Pokémon and responds to 404 as no result', async () => {
  const fetchStub: typeof fetch = async (input) => {
    const url = String(input);
    if (url.endsWith('/pokemon/pikachu')) return Response.json({
      id: 25, name: 'pikachu', height: 4, weight: 60,
      species: { url: 'https://pokeapi.co/api/v2/pokemon-species/25/' },
      types: [{ type: { name: 'electric' } }], abilities: [{ ability: { name: 'static' } }],
      stats: [{ base_stat: 35, stat: { name: 'hp' } }], sprites: { front_default: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png' },
    });
    return Response.json({ flavor_text_entries: [{ language: { name: 'en' }, flavor_text: 'It stores electricity in its cheeks.' }], genera: [{ language: { name: 'en' }, genus: 'Mouse Pokémon' }] });
  };
  const answer = await result('pokemon', [{ name: 'query', value: 'pikachu' }], context(fetchStub));
  assert.equal(embed(answer).title, '#0025 · pikachu');
  assert.match(String(embed(answer).description), /stores electricity/);
  assert.match(content(await result('pokemon', [{ name: 'query', value: 'Missingno' }], context(async () => new Response('', { status: 404 })))), /No Pokémon found/);
});

test('Google uses documented Custom Search parameters and returns multiple web results', async () => {
  await withEnv({ GOOGLE_CSE_API_KEY: 'fixture-google', GOOGLE_CSE_ENGINE_ID: 'fixture-cx' }, async () => {
    let requested: URL | undefined;
    const fetchStub: typeof fetch = async (input) => {
      requested = new URL(String(input));
      return Response.json({
        searchInformation: { formattedTotalResults: '100,000' },
        items: [
          { title: 'Example one', link: 'https://example.com/one', snippet: 'First result.' },
          { title: 'Example two', link: 'https://example.com/two', snippet: 'Second result.' },
        ],
      });
    };
    const answer = await result('google', [{ name: 'query', value: 'robot comics' }, { name: 'amount', value: 2 }], context(fetchStub));
    assert.equal(requested?.origin, 'https://www.googleapis.com');
    assert.equal(requested?.pathname, '/customsearch/v1');
    assert.equal(requested?.searchParams.get('cx'), 'fixture-cx');
    assert.equal(requested?.searchParams.get('q'), 'robot comics');
    assert.equal(requested?.searchParams.get('num'), '2');
    assert.equal(requested?.searchParams.get('safe'), 'active');
    assert.match(String(embed(answer).description), /Example one/);
    assert.match(String(embed(answer).description), /Example two/);
  });
});

test('YouTube uses the official Data API search.list endpoint and validates missing credentials', async () => {
  await withEnv({ YOUTUBE_API_KEY: 'fixture-youtube' }, async () => {
    let requested: URL | undefined;
    const fetchStub: typeof fetch = async (input) => {
      requested = new URL(String(input));
      return Response.json({ items: [{ id: { videoId: 'abc123' }, snippet: { title: 'Comic book review', description: 'A review.', channelTitle: 'Reviewer', channelId: 'UC123', thumbnails: { high: { url: 'https://i.ytimg.com/vi/abc123/hqdefault.jpg' } } } }] });
    };
    const answer = await result('youtube', [{ name: 'query', value: 'comic book review' }], context(fetchStub));
    assert.equal(requested?.origin, 'https://www.googleapis.com');
    assert.equal(requested?.pathname, '/youtube/v3/search');
    assert.equal(requested?.searchParams.get('part'), 'snippet');
    assert.equal(requested?.searchParams.get('type'), 'video');
    assert.equal(requested?.searchParams.get('q'), 'comic book review');
    assert.equal(embed(answer).url, 'https://www.youtube.com/watch?v=abc123');
  });
  await withEnv({ YOUTUBE_API_KEY: '' }, async () => assert.match(content(await result('youtube', [{ name: 'query', value: 'video' }])), /lookup is not available right now/i));
});

test('upstream failures return safe actionable feedback', async () => {
  await withEnv({ YOUTUBE_API_KEY: 'fixture-youtube' }, async () => {
    const failed: typeof fetch = async () => new Response('', { status: 503 });
    assert.match(content(await result('youtube', [{ name: 'query', value: 'video' }], context(failed))), /provider is unavailable/i);
  });
});
