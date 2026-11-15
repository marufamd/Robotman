import { mockComicGeeks } from './comicgeeks-fixtures.js';
import assert from 'node:assert/strict';
import { generateKeyPairSync, sign } from 'node:crypto';
import { test } from 'node:test';
import { createApplication } from '../src/application.js';
import { lookupModule } from '../src/commands/lookups/index.js';
import { utilityModule } from '../src/commands/utility/index.js';
import type { CommandModule } from '../src/commands/types.js';

async function serve(fetcher: typeof fetch = async () => Response.json({}), modules: CommandModule[] = [utilityModule]) {
  const transport = mockComicGeeks(fetcher);
  const keys = generateKeyPairSync('ed25519');
  const uploads: Array<{ url: string; body: FormData }> = [];
  const app = createApplication({ publicKey: keys.publicKey.export({ type: 'spki', format: 'der' }).subarray(-32).toString('hex'), databaseUrl: 'postgres://localhost/unused', modules, applicationId: '200', botToken: 'fixture-bot', fetch: async (input, init) => {
    if (init?.body instanceof FormData) { uploads.push({ url: String(input), body: init.body }); return Response.json({ id: 'uploaded' }); }
    return fetcher(input, init);
  } });
  await new Promise<void>(resolve => app.server.listen(0, '127.0.0.1', resolve));
  const address = app.server.address();
  if (!address || typeof address === 'string') throw new Error('Missing address');
  return { close: async () => { await app.close(); transport.restore(); }, uploads, async command(name: string, options: Record<string, string> = {}) {
    const body = JSON.stringify({ type: 2, id: '100', application_id: '200', token: 'token', guild_id: '300', channel_id: '500', member: { user: { id: '400' } }, data: { type: 1, name, options: Object.entries(options).map(([name, value]) => ({ type: 3, name, value })) } });
    const timestamp = String(Math.floor(Date.now() / 1000));
    const res = await fetch(`http://127.0.0.1:${address.port}/interactions`, { method: 'POST', body, headers: { 'x-signature-timestamp': timestamp, 'x-signature-ed25519': sign(null, Buffer.from(timestamp + body), keys.privateKey).toString('hex') } });
    return res.json();
  } };
}

test('Color accepts the original color option and uploads its embed and PNG swatch', async () => {
  const app = await serve();
  try {
    const reply = await app.command('color', { color: '(230, 126, 34)' });
    assert.equal(reply.type, 5);
    for (let i = 0; i < 30 && !app.uploads.length; i++) await new Promise(resolve => setTimeout(resolve, 10));
    assert.equal(app.uploads.length, 1);
    assert.match(app.uploads[0]!.url, /messages\/@original$/);
    const form = app.uploads[0]!.body;
    const payload = JSON.parse(String(form.get('payload_json')));
    assert.equal(payload.embeds[0].description, '• Hex: #e67e22\n• RGB: (230, 126, 34)\n• Integer: 15105570');
    assert.equal(payload.embeds[0].color, 15105570);
    assert.equal(payload.embeds[0].image.url, 'attachment://color.png');
    const file = form.get('files[0]') as File;
    assert.equal(file.name, 'color.png'); assert.equal(file.type, 'image/png');
    const bytes = Buffer.from(await file.arrayBuffer());
    assert.equal(bytes.readUInt32BE(16), 300); assert.equal(bytes.readUInt32BE(20), 300);
  } finally { await app.close(); }
});

test('Math preserves evaluator functions, precision, code blocks and long-result files', async () => {
  const app = await serve();
  try {
    for (const [expression, expected] of [['sqrt(81) + 2^3', '17'], ['f(x) = x*x; f(7)', '49'], ['1/3', '0.3333333333333333'], ['2 times 3', null]]) {
      const result = await app.command('math', { expression: expression! });
      if (expected === null) { assert.equal(result.data.flags, 64); continue; }
      assert.equal(result.data.content, '```\n' + expected + '\n```');
    }
    assert.equal((await app.command('math', { expression: '"a" || "b"' })).data.content, '```\nab\n```');
    const long = await app.command('math', { expression: '[' + Array(600).fill('1').join(',') + ']' });
    assert.equal(long.type, 5);
    for (let i = 0; i < 30 && !app.uploads.length; i++) await new Promise(resolve => setTimeout(resolve, 10));
    assert.equal((app.uploads[0]!.body.get('files[0]') as File).name, 'result.txt');
  } finally { await app.close(); }
});

test('Coin and Eight Ball upload the original image replies; Stats and Ping retain embeds', async () => {
  const app = await serve(async () => Response.json({ url: 'wss://gateway.discord.gg' }));
  try {
    for (const command of ['coin', 'eight-ball']) {
      const reply = await app.command(command, command === 'eight-ball' ? { question: 'Will this work?' } : {});
      assert.equal(reply.type, 5);
    }
    for (let i = 0; i < 30 && app.uploads.length < 2; i++) await new Promise(resolve => setTimeout(resolve, 10));
    for (const upload of app.uploads) assert.equal((upload.body.get('files[0]') as File).type, 'image/png');
    assert.match((app.uploads[0]!.body.get('files[0]') as File).name, /^(heads|tails).png$/);
    const stats = await app.command('stats');
    assert.equal(stats.data.embeds[0].title, 'Statistics');
    assert.deepEqual(stats.data.embeds[0].fields.map((f: any) => f.name), ['Version', 'Dependencies', 'Node.js Version', 'Memory Usage', 'CPU Usage', 'Uptime']);
    const ping = await app.command('ping');
    assert.equal(ping.data.embeds[0].title, '🏓 Pong!');
    assert.match(ping.data.embeds[0].fields[0].name, /Latency/);
  } finally { await app.close(); }
});

test('YouTube preserves the original video link and search mode for native Discord previews', async () => {
  const old = process.env.YOUTUBE_API_KEY; process.env.YOUTUBE_API_KEY = 'fixture-key';
  let requested = '';
  const app = await serve(async input => { requested = String(input); return Response.json({ items: [{ id: { videoId: 'video123' }, snippet: { title: 'Test' } }] }); }, [lookupModule]);
  try {
    const result = await app.command('youtube', { query: 'Batman' });
    assert.equal(result.data.content, 'Showing top result for **Batman**\nhttps://www.youtube.com/watch?v=video123');
    assert.equal(result.data.embeds, undefined);
    assert.equal(new URL(requested).searchParams.get('safeSearch'), 'none');
  } finally { await app.close(); if (old === undefined) delete process.env.YOUTUBE_API_KEY; else process.env.YOUTUBE_API_KEY = old; }
});

test('Movie and Show preserve source metadata and formatted descriptions', async () => {
  const old = process.env.OMDB_API_KEY; process.env.OMDB_API_KEY = 'fixture';
  const app = await serve(async input => String(input).includes('omdbapi') ? Response.json({ Title: 'Example', Year: '2020', Plot: 'Plot.', Country: 'USA', Production: 'Studio', Writer: 'Written by Writer', Ratings: [{ Source: 'IMDb', Value: '8/10' }] }) : Response.json([{ show: { name: 'Example Show', summary: '<p>A <b>bold</b> show.</p>', officialSite: 'https://example.com/', genres: ['Drama'] } }]), [lookupModule]);
  try {
    const movie = (await app.command('movie', { query: 'Example' })).data.embeds[0];
    assert.match(movie.description, /\*\*Country:\*\* USA/);
    assert.match(movie.description, /\*\*Production Companies:\*\* Studio/);
    assert.equal(movie.footer.text, 'Open Movie Database');
    const show = (await app.command('show', { query: 'Example' })).data.embeds[0];
    assert.equal(show.description, 'A **bold** show.');
    assert.equal(show.author.icon_url, 'https://i.imgur.com/ExggnTB.png');
    assert.equal(show.fields.find((f: any) => f.name === 'Website').value, '[Click Here](https://example.com/)');
  } finally { await app.close(); if (old === undefined) delete process.env.OMDB_API_KEY; else process.env.OMDB_API_KEY = old; }
});

test('Pokemon resolves a number to its Bulbapedia article with the original image and branding', async () => {
  const requested: string[] = [];
  const app = await serve(async input => { const url = String(input); requested.push(url); return Response.json(url.includes('pokeapi') ? { name: 'pikachu' } : { query: { pages: [{ title: 'Pikachu (Pokémon)', pageimage: '025Pikachu.png', extract: 'Pikachu is an Electric-type Pokémon.\n\nMore detail.', thumbnail: { source: 'https://example.com/pikachu.png' } }] } }); }, [lookupModule]);
  try {
    const embed = (await app.command('pokemon', { query: '#25' })).data.embeds[0];
    assert.equal(embed.title, '#025 - Pikachu (Pokémon)');
    assert.equal(embed.description, 'Pikachu is an Electric-type Pokémon.');
    assert.equal(embed.author.name, 'Bulbapedia');
    assert.equal(embed.author.icon_url, 'https://www.google.com/s2/favicons?domain=bulbapedia.bulbagarden.net&sz=128');
    assert.equal(embed.image.url, 'https://example.com/pikachu.png');
    assert.ok(requested.some(url => url.startsWith('https://bulbapedia.bulbagarden.net/w/api.php')));
  } finally { await app.close(); }
});

test('Character and LOCG preserve original metadata, covers and eight search results', async () => {
  const old = process.env.COMICVINE_API_KEY; process.env.COMICVINE_API_KEY = 'fixture';
  const app = await serve(async input => String(input).includes('comicvine') ? Response.json({ status_code: 1, results: [{ name: 'Batman', deck: 'A hero.', real_name: 'Bruce Wayne', first_appeared_in_issue: { name: 'Detective Comics / Another story' }, publisher: { name: 'DC' }, image: { original_url: 'https://example.com/original.jpg', medium_url: 'https://example.com/small.jpg' } }] }) : Response.json({ list: Array.from({ length: 9 }, (_, i) => `<li><div class="cover"><a href="/comic/${i}/series"><img data-src="https://example.com/medium-${i}.jpg"></a></div><div class="title color-primary">Series ${i}</div><div class="publisher color-offset">DC Comics</div></li>`).join('') }), [lookupModule]);
  try {
    const character = (await app.command('character', { query: 'Batman' })).data.embeds[0];
    assert.equal(character.author.name, 'Comic Vine');
    assert.equal(character.thumbnail.url, 'https://example.com/original.jpg');
    assert.match(character.description, /First Appearance:\*\* 'Detective Comics'/);
    const locg = (await app.command('locg', { query: 'Batman' })).data.embeds[0];
    assert.equal(locg.author.name, 'League of Comic Geeks');
    assert.deepEqual(locg.fields.map((f: any) => f.name), ['Page 1', 'Page 2']);
    assert.match(locg.fields[1].value, /Series 7/); assert.doesNotMatch(JSON.stringify(locg), /Series 8/);
    assert.match(locg.fields[0].value, /DC Comics \| \[Cover\]\(https:\/\/example.com\/large-0.jpg\)/);
  } finally { await app.close(); if (old === undefined) delete process.env.COMICVINE_API_KEY; else process.env.COMICVINE_API_KEY = old; }
});

test('Pull lists accept readable dates, preserve every release and show a user total', async () => {
  const requested: URL[] = [];
  const app = await serve(async input => {
    const url = new URL(String(input)); requested.push(url);
    if (url.pathname.includes('/profile/')) return new Response('<title>Reader&#39;s Comic Book Pull List - League of Comic Geeks</title><div id="comic-list-block" data-user="7"></div><img class="avatar" src="https://example.com/avatar.jpg">');
    return Response.json({ list: Array.from({ length: 40 }, (_, i) => `<li><div class="comic-cover-art"><img data-src="https://example.com/medium-cover.jpg"></div><div class="comic-description col-feed-max"><a href="/comic/${i}/issue">Details</a></div><div class="title color-primary">Issue ${String(i).padStart(2, '0')}</div><span class="price">$4.99</span></li>`).join('') });
  }, [lookupModule]);
  try {
    const pull = (await app.command('pull', { publisher: 'dc', date: 'December 2 2020' })).data.embeds[0];
    assert.equal(pull.title, 'DC Comics Pull List for the Week of 2020-12-01');
    assert.match(pull.description, /Issue 39/);
    const user = (await app.command('pull-user', { user: 'Reader', date: '2020-12-02' })).data.embeds[0];
    assert.equal(user.fields.find((f: any) => f.name === 'Total').value, '$199.60 USD');
    assert.match(user.author.name, /Reader's Pull List/);
    assert.ok(requested.some(url => url.searchParams.get('date') === '2020-12-02'));
  } finally { await app.close(); }
});

test('Letterboxd all mode includes every feed item and review mode conceals spoilers', async () => {
  const xml = '<rss><channel><title>Reader</title><link>https://letterboxd.com/reader/</link>' + Array.from({ length: 12 }, (_, i) => `<item><title>Film ${i} (contains spoilers)</title><link>https://letterboxd.com/reader/film/${i}/</link><letterboxd:filmTitle>Film ${i}</letterboxd:filmTitle><letterboxd:filmYear>2020</letterboxd:filmYear><letterboxd:memberRating>4.5</letterboxd:memberRating><letterboxd:watchedDate>2020-12-02</letterboxd:watchedDate><pubDate>Wed, 02 Dec 2020 12:00:00 GMT</pubDate><description><![CDATA[<p>The twist.</p>]]></description></item>`).join('') + '<item><title>Not a film: my list</title><link>https://letterboxd.com/reader/list/favorites/</link></item></channel></rss>';
  const app = await serve(async () => new Response(xml), [lookupModule]);
  try {
    const all = (await app.command('letterboxd', { username: 'reader', film: 'all' })).data.embeds[0];
    assert.match(all.description, /Film 0/);
    assert.doesNotMatch(all.description, /Film 11/);
    assert.doesNotMatch(JSON.stringify(all), /Not a film/);
    assert.match(all.description, /★★★★½/);
    const review = (await app.command('letterboxd', { username: 'reader', film: 'Film 0' })).data.embeds[0];
    assert.match(review.description, /\|\|The twist\.\|\|/);
    assert.equal(review.footer.text, 'Review by Reader');
    assert.ok(review.fields.some((f: any) => f.name === 'Watched On'));
    assert.equal(review.timestamp, '2020-12-02T12:00:00.000Z');
  } finally { await app.close(); }
});

test('Stats uses the actual bot avatar and Color preserves names, black and explicit hex', async () => {
  const app = await serve(async () => Response.json({ id: '123456789012345678', avatar: 'avatar-hash' }));
  try {
    const stats = await app.command('stats');
    assert.equal(stats.data.embeds[0].thumbnail.url, 'https://cdn.discordapp.com/avatars/123456789012345678/avatar-hash.png');
    for (const [color, hex] of [['dark orange', '#ff8c00'], ['0', '#000000'], ['#abc', '#aabbcc'], ['0xE67E22', '#e67e22'], ['336699', '#05233b'], ['230 126 34', '#e67e22']]) {
      const before = app.uploads.length;
      assert.equal((await app.command('color', { color: color! })).type, 5);
      for (let i = 0; i < 30 && app.uploads.length === before; i++) await new Promise(resolve => setTimeout(resolve, 10));
      const payload = JSON.parse(String(app.uploads.at(-1)!.body.get('payload_json')));
      assert.match(payload.embeds[0].description, new RegExp(hex!));
    }
    assert.equal((await app.command('color', { color: '256 0 0' })).data.flags, 64);
  } finally { await app.close(); }
});

test('LOCG failures use the package transport and return an actionable command reply', async () => {
  let calls = 0;
  const app = await serve(async () => { calls++; throw new Error('Provider unavailable'); }, [lookupModule]);
  try {
    const reply = await app.command('locg', { query: 'Batman' });
    assert.equal(calls, 1);
    assert.match(reply.data.content, /provider is unavailable/);
  } finally { await app.close(); }
});
