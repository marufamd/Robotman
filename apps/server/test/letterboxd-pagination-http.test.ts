import assert from 'node:assert/strict';
import { generateKeyPairSync, sign } from 'node:crypto';
import { test } from 'node:test';
import { createApplication } from '../src/application.js';
import { lookupModule } from '../src/commands/lookups/index.js';

test('Letterboxd pages remain fixed, whole, requester-only and expire after five minutes', async () => {
  let now = 0; let fetches = 0;
  const items = Array.from({ length: 12 }, (_, i) => `<item><title>Film ${i}</title><link>https://letterboxd.com/reader/film/${i}/</link><letterboxd:filmTitle>Film ${i}</letterboxd:filmTitle><letterboxd:filmYear>2020</letterboxd:filmYear><letterboxd:memberRating>4.5</letterboxd:memberRating></item>`).join('');
  const keys = generateKeyPairSync('ed25519');
  const app = createApplication({ publicKey: keys.publicKey.export({ type: 'spki', format: 'der' }).subarray(-32).toString('hex'), databaseUrl: 'postgres://localhost/unused', modules: [lookupModule], now: () => new Date(now), fetch: async () => { fetches++; return new Response(`<rss><channel><title>Reader</title>${items}</channel></rss>`); } });
  await new Promise<void>(resolve => app.server.listen(0, '127.0.0.1', resolve));
  const address = app.server.address(); if (!address || typeof address === 'string') throw new Error('Missing address');
  async function send(type: number, data: unknown, user = 'owner') {
    const body = JSON.stringify({ type, id: '100', application_id: '200', token: 'token', guild_id: '300', channel_id: '500', member: { user: { id: user } }, data });
    const timestamp = String(Math.floor(Date.now() / 1000));
    return (await fetch(`http://127.0.0.1:${address.port}/interactions`, { method: 'POST', body, headers: { 'x-signature-timestamp': timestamp, 'x-signature-ed25519': sign(null, Buffer.from(timestamp + body), keys.privateKey).toString('hex') } })).json();
  }
  try {
    const first = await send(2, { type: 1, name: 'letterboxd', options: [{ type: 3, name: 'username', value: 'reader' }] });
    assert.equal(first.type, 4); assert.equal(first.data.embeds[0].footer.text, 'Page 1 of 2');
    assert.equal(first.data.embeds[0].description.split('\n').length, 10);
    assert.equal(first.data.components[0].components[0].disabled, true);
    const next = first.data.components[0].components[1].custom_id;
    assert.deepEqual(await send(3, { custom_id: next, component_type: 2 }, 'other'), { type: 6 });
    const second = await send(3, { custom_id: next, component_type: 2 });
    assert.equal(second.type, 7); assert.equal(second.data.embeds[0].footer.text, 'Page 2 of 2');
    assert.match(second.data.embeds[0].description, /\[Film 11 \(2020\)\]\(https:\/\/letterboxd.com\/reader\/film\/11\/\) ★★★★½/);
    assert.equal(second.data.components[0].components[1].disabled, true); assert.equal(fetches, 1);
    now = 300_000;
    assert.deepEqual(await send(3, { custom_id: next, component_type: 2 }), { type: 6 });
  } finally { await app.close(); }
});


test('a single oversized title is shortened while its link and rating remain intact', async () => {
  const keys = generateKeyPairSync('ed25519');
  const title = 'Long title '.repeat(500);
  const url = 'https://letterboxd.com/reader/film/long-film/';
  const app = createApplication({ publicKey: keys.publicKey.export({ type: 'spki', format: 'der' }).subarray(-32).toString('hex'), databaseUrl: 'postgres://localhost/unused', modules: [lookupModule], fetch: async () => new Response(`<rss><channel><title>Reader</title><item><title>${title}</title><link>${url}</link><letterboxd:filmTitle>${title}</letterboxd:filmTitle><letterboxd:memberRating>4</letterboxd:memberRating></item></channel></rss>`) });
  await new Promise<void>(resolve => app.server.listen(0, '127.0.0.1', resolve));
  const address = app.server.address(); if (!address || typeof address === 'string') throw new Error('Missing address');
  try {
    const body = JSON.stringify({ type: 2, id: '101', application_id: '200', token: 'token', guild_id: '300', channel_id: '500', member: { user: { id: 'owner' } }, data: { type: 1, name: 'letterboxd', options: [{ type: 3, name: 'username', value: 'reader' }] } });
    const timestamp = String(Math.floor(Date.now() / 1000));
    const res = await fetch(`http://127.0.0.1:${address.port}/interactions`, { method: 'POST', body, headers: { 'x-signature-timestamp': timestamp, 'x-signature-ed25519': sign(null, Buffer.from(timestamp + body), keys.privateKey).toString('hex') } });
    const payload = await res.json();
    assert.equal(payload.data.components.length, 0);
    assert.equal(payload.data.embeds[0].footer.text, 'Page 1 of 1');
    assert.ok(payload.data.embeds[0].description.length <= 4000);
    assert.ok(payload.data.embeds[0].description.endsWith(`…](${url}) ★★★★`));
  } finally { await app.close(); }
});
