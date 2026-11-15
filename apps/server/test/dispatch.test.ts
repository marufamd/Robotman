import { mockComicGeeks } from './comicgeeks-fixtures.js';
import assert from 'node:assert/strict';
import { generateKeyPairSync, sign } from 'node:crypto';
import { test } from 'node:test';
import postgres from 'postgres';
import { createApplication } from '../src/application.js';
import { utilityModule } from '../src/commands/utility/index.js';
import { lookupModule } from '../src/commands/lookups/index.js';
import { moderatorModule } from '../src/commands/moderator/index.js';
import type { CommandModule } from '../src/commands/types.js';
import { migrateDatabase } from '../src/database/migrate.js';

async function serve(fetcher?: typeof fetch, modules: CommandModule[] = [utilityModule], initialize = true) {
  const transport = mockComicGeeks(fetcher ?? (async () => { throw new Error('Unexpected comicgeeks request'); }));
  const keys = generateKeyPairSync('ed25519');
  const app = createApplication({
    publicKey: keys.publicKey.export({ type: 'spki', format: 'der' }).subarray(-32).toString('hex'),
    databaseUrl: process.env.TEST_DATABASE_URL ?? 'postgres://localhost/test',
    modules, fetch: fetcher, botToken: 'test-bot', applicationId: '200',
  });
  if (initialize) await app.initialize();
  await new Promise<void>((resolve, reject) => { app.server.once('error', reject); app.server.listen(0, '127.0.0.1', resolve); });
  const address = app.server.address();
  if (!address || typeof address === 'string') throw new Error('TCP address required');
  return {
    close: async () => { await app.close(); transport.restore(); },
    async command(name: string, guild = true, options: unknown[] = []) {
      const body = JSON.stringify({ type: 2, id: '100', application_id: '200', token: 'test-token', guild_id: guild ? '300' : undefined, member: { permissions: '32', user: { id: '400' } }, data: { type: 1, name, options } });
      const timestamp = String(Math.floor(Date.now() / 1000));
      return fetch(`http://127.0.0.1:${address.port}/interactions`, { method: 'POST', body, headers: {
        'content-type': 'application/json', 'x-signature-timestamp': timestamp,
        'x-signature-ed25519': sign(null, Buffer.from(timestamp + body), keys.privateKey).toString('hex'),
      } });
    },
  };
}

test('a signed guild command runs the real utility handler', async () => {
  const app = await serve();
  try {
    const response = await app.command('math', true, [{ type: 3, name: 'expression', value: '2 + 3 * 4' }]);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { type: 4, data: { content: '```\n14\n```' } });
  } finally { await app.close(); }
});

test('signed commands in DMs are rejected before their handler runs', async () => {
  const app = await serve();
  try {
    const response = await app.command('math', false, [{ type: 3, name: 'expression', value: '2 + 3' }]);
    const result = await response.json();
    assert.equal(result.type, 4);
    assert.equal(result.data.flags, 64);
    assert.match(result.data.content, /only available in servers/);
  } finally { await app.close(); }
});

test('slow provider commands acknowledge promptly and complete through the Discord webhook', async () => {
  let finish!: (value: { url: string; body: unknown }) => void;
  const completion = new Promise<{ url: string; body: unknown }>(resolve => { finish = resolve; });
  const app = await serve(async (input, init) => {
    if (String(input) === 'https://icanhazdadjoke.com/') {
      await new Promise(resolve => setTimeout(resolve, 2200));
      return Response.json({ joke: 'A known test joke.' });
    }
    finish({ url: String(input), body: JSON.parse(String(init?.body)) });
    return Response.json({ id: 'message' });
  });
  try {
    const response = await app.command('dad-joke');
    assert.deepEqual(await response.json(), { type: 5 });
    const followup = await Promise.race([completion, new Promise<never>((_, reject) => setTimeout(() => reject(new Error('No follow-up')), 5000).unref())]);
    assert.equal(followup.url, 'https://discord.com/api/v10/webhooks/200/test-token/messages/@original');
    assert.deepEqual(followup.body, { content: 'A known test joke.' });
  } finally { await app.close(); }
});

test('a signed lookup command returns the public provider result through HTTP', async () => {
  const app = await serve(async () => Response.json({ query: { pages: [{ title: 'Pikachu', extract: 'A Pokémon.' }] } }), [lookupModule]);
  try {
    const response = await app.command('pokemon', true, [{ type: 3, name: 'query', value: 'pikachu' }]);
    const result = await response.json();
    assert.equal(result.type, 4);
    assert.match(result.data.embeds[0].title, /pikachu/i);
  } finally { await app.close(); }
});

test('a signed moderator command delivers large lists to the configured channel', { skip: !process.env.TEST_DATABASE_URL }, async () => {
  const database = postgres(process.env.TEST_DATABASE_URL!);
  await migrateDatabase(database);
  await database`INSERT INTO robotman_moderator_settings (guild_id, release_list_channel_id, release_list_day_of_week, release_list_hour, release_list_minute, release_list_time_zone, tvmaze_show_ids)
    VALUES ('300', 'dispatch-release-channel', 0, 0, 0, 'UTC', '[13]'::jsonb)
    ON CONFLICT (guild_id) DO UPDATE SET release_list_channel_id = 'dispatch-release-channel'`;
  const html = '<ul>' + Array.from({ length: 22 }, (_, i) => `<li><div class="comic-cover-art"><img data-src="https://example.com/cover.jpg"></div><a class="title color-primary">Issue ${i + 1}</a><div class="comic-description col-feed-max"><a href="/comic/${i + 1}/issue">details</a>Summary ${i + 1}</div><div class="comic-details">DC Comics</div></li>`).join('') + '</ul>';
  const delivered: unknown[] = [];
  const app = await serve(async (input, init) => {
    if (String(input).includes('leagueofcomicgeeks.com')) return Response.json({ list: html });
    if (init?.method === 'PUT') return new Response(null, { status: 204 });
    delivered.push(JSON.parse(String(init?.body)));
    return Response.json({ id: 'message' });
  }, [moderatorModule], false);
  try {
    const response = await app.command('release-list', true, [{ type: 3, name: 'date', value: '2099-09-08' }]);
    const first = await response.json();
    assert.equal(first.type, 4);
    assert.equal(first.data.flags, 64);
    assert.match(first.data.content, /Release List for 2099-09-08 was sent/);
    assert.equal(delivered.length, 4);
    const messages = delivered as Array<{ content?: string; embeds?: unknown[] }>;
    assert.match(messages[0]?.content ?? '', /Comics Release List for 2099-09-08/);
    assert.equal(messages.reduce((count, data) => count + (data.embeds?.length ?? 0), 0), 22);
    for (const message of messages) assert.ok((message.embeds?.length ?? 0) <= 10);
  } finally {
    await app.close();
    await database`DELETE FROM robotman_moderator_settings WHERE guild_id = '300'`;
    await database.end();
  }
});

test('a signed shows command sends the public .txt fallback through the Discord webhook', { skip: !process.env.TEST_DATABASE_URL }, async () => {
  const database = postgres(process.env.TEST_DATABASE_URL!);
  const previousKey = process.env.PASTEE_KEY;
  delete process.env.PASTEE_KEY;
  await migrateDatabase(database);
  await database`INSERT INTO robotman_moderator_settings (guild_id, release_list_channel_id, release_list_day_of_week, release_list_hour, release_list_minute, release_list_time_zone, tvmaze_show_ids)
    VALUES ('300', NULL, 0, 0, 0, 'UTC', '[13]'::jsonb)
    ON CONFLICT (guild_id) DO UPDATE SET tvmaze_show_ids = '[13]'::jsonb`;
  let finish!: (value: { body: FormData }) => void;
  const upload = new Promise<{ body: FormData }>(resolve => { finish = resolve; });
  const app = await serve(async (input, init) => {
    if (String(input).startsWith('https://api.tvmaze.com/')) return Response.json([{ name: 'Pilot', season: 1, number: 1, airdate: new URL(String(input)).searchParams.get('date'), airtime: '20:00', summary: '<p>A test episode.</p>', show: { id: 13, name: 'DC Show', network: { name: 'Network' } } }]);
    if (String(input).includes('/webhooks/200/test-token')) {
      finish({ body: init?.body as FormData });
      return Response.json({ id: 'upload-message' });
    }
    return Response.json({}, { status: 404 });
  }, [moderatorModule], false);
  try {
    const response = await app.command('shows', true, [{ type: 3, name: 'date', value: '2099-09-08' }]);
    const initial = await response.json();
    assert.equal(initial.type, 4);
    assert.equal(initial.data.embeds?.length ?? 0, 0);
    const sent = await Promise.race([upload, new Promise<never>((_, reject) => setTimeout(() => reject(new Error('No text file follow-up')), 5000).unref())]);
    const payload = JSON.parse(String(sent.body.get('payload_json')));
    const file = sent.body.get('files[0]') as File;
    assert.match(payload.content, /attached as a text file/);
    assert.equal(file.name, 'episode-comment-templates-2099-09-07.txt');
    assert.match(await file.text(), /DC Show/);
    assert.match(await file.text(), /A test episode/);
  } finally {
    await app.close();
    await database`DELETE FROM robotman_moderator_settings WHERE guild_id = '300'`;
    await database.end();
    if (previousKey !== undefined) process.env.PASTEE_KEY = previousKey;
  }
});

test('a deferred manual Release List stays ephemeral and posts to the configured Guild channel', { skip: !process.env.TEST_DATABASE_URL }, async () => {
  const database = postgres(process.env.TEST_DATABASE_URL!);
  await migrateDatabase(database);
  await database`INSERT INTO robotman_moderator_settings (guild_id, release_list_channel_id, release_list_day_of_week, release_list_hour, release_list_minute, release_list_time_zone, tvmaze_show_ids)
    VALUES ('300', 'target-release-channel', 0, 0, 0, 'UTC', '[13]'::jsonb)
    ON CONFLICT (guild_id) DO UPDATE SET release_list_channel_id = 'target-release-channel'`;
  let finish!: (body: Record<string, unknown>) => void;
  const edited = new Promise<Record<string, unknown>>(resolve => { finish = resolve; });
  const html = '<ul><li><div class="comic-cover-art"><img data-src="https://example.com/cover.jpg"></div><div class="title color-primary">Action Comics #1</div><div class="comic-description col-feed-max"><a href="/comic/action">Details</a>Test issue</div><div class="comic-details">DC Comics</div></li></ul>';
  const app = await serve(async (input, init) => {
    if (String(input).includes('leagueofcomicgeeks.com')) {
      await new Promise(resolve => setTimeout(resolve, 2200));
      return Response.json({ list: html });
    }
    if (String(input).includes('/channels/target-release-channel/messages')) return Response.json({ id: 'release-header' });
    if (String(input).includes('/webhooks/200/test-token/messages/@original')) {
      finish(JSON.parse(String(init?.body)) as Record<string, unknown>);
      return Response.json({ id: 'original' });
    }
    return new Response(null, { status: 204 });
  }, [moderatorModule], false);
  try {
    const response = await app.command('release-list', true, [{ type: 3, name: 'date', value: '2099-09-08' }]);
    assert.deepEqual(await response.json(), { type: 5, data: { flags: 64 } });
    const result = await Promise.race([edited, new Promise<never>((_, reject) => setTimeout(() => reject(new Error('No ephemeral completion')), 5000).unref())]);
    assert.equal(result.flags, 64);
    assert.match(String(result.content), /Release List for 2099-09-08 was sent/);
  } finally {
    await app.close();
    await database`DELETE FROM robotman_moderator_settings WHERE guild_id = '300'`;
    await database.end();
  }
});
