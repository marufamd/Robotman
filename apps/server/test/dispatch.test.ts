import assert from 'node:assert/strict';
import { generateKeyPairSync, sign } from 'node:crypto';
import { test } from 'node:test';
import { createApplication } from '../src/application.js';
import { utilityModule } from '../src/commands/utility/index.js';
import { lookupModule } from '../src/commands/lookups/index.js';
import { moderatorModule } from '../src/commands/moderator/index.js';
import type { CommandModule } from '../src/commands/types.js';

async function serve(fetcher?: typeof fetch, modules: CommandModule[] = [utilityModule], initialize = true) {
  const keys = generateKeyPairSync('ed25519');
  const app = createApplication({
    publicKey: keys.publicKey.export({ type: 'spki', format: 'der' }).subarray(-32).toString('hex'),
    databaseUrl: process.env.TEST_DATABASE_URL ?? 'postgres://localhost/test',
    modules, fetch: fetcher,
  });
  if (initialize) await app.initialize();
  await new Promise<void>((resolve, reject) => { app.server.once('error', reject); app.server.listen(0, '127.0.0.1', resolve); });
  const address = app.server.address();
  if (!address || typeof address === 'string') throw new Error('TCP address required');
  return {
    close: app.close,
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
    assert.deepEqual(await response.json(), { type: 4, data: { content: 'Result: 14' } });
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
  const app = await serve(async () => Response.json({ name: 'pikachu', id: 25, height: 4, weight: 60, types: [{ type: { name: 'electric' } }], abilities: [], stats: [], sprites: {} }), [lookupModule]);
  try {
    const response = await app.command('pokemon', true, [{ type: 3, name: 'query', value: 'pikachu' }]);
    const result = await response.json();
    assert.equal(result.type, 4);
    assert.match(result.data.embeds[0].title, /pikachu/i);
  } finally { await app.close(); }
});

test('a signed moderator command delivers large lists through acknowledged webhook follow-ups', async () => {
  const html = '<ul>' + Array.from({ length: 22 }, (_, i) => `<li><a class="title color-primary">Issue ${i + 1}</a><div class="comic-description col-feed-max"><a href="/comic/${i + 1}/issue">details</a>Summary ${i + 1}</div><div class="comic-details">DC Comics</div></li>`).join('') + '</ul>';
  const delivered: unknown[] = [];
  let finish!: () => void;
  const done = new Promise<void>(resolve => { finish = resolve; });
  const app = await serve(async (input, init) => {
    if (String(input).includes('leagueofcomicgeeks.com')) return Response.json({ list: html });
    delivered.push(JSON.parse(String(init?.body)));
    if (delivered.length === 2) finish();
    return Response.json({ id: 'message' });
  }, [moderatorModule], false);
  try {
    const response = await app.command('release-list', true, [{ type: 3, name: 'date', value: '2099-09-08' }]);
    const first = await response.json();
    assert.equal(first.type, 4);
    await Promise.race([done, new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Missing paged follow-ups')), 5000).unref())]);
    const messages = [first.data, ...delivered] as Array<{ embeds?: unknown[] }>;
    assert.equal(messages.reduce((count, data) => count + (data.embeds?.length ?? 0), 0), 22);
    for (const message of messages) assert.ok((message.embeds?.length ?? 0) <= 10);
  } finally { await app.close(); }
});
