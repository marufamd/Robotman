import assert from 'node:assert/strict';
import { generateKeyPairSync, randomUUID, sign } from 'node:crypto';
import { test } from 'node:test';
import postgres from 'postgres';
import { createApplication } from '../src/application.js';
import { requestModule } from '../src/commands/requests/index.js';

test('signed /response looks up a complete trigger or alias case-insensitively and renders stored embeds publicly', { skip: !process.env.TEST_DATABASE_URL }, async () => {
  const keys = generateKeyPairSync('ed25519');
  const guildId = `request-${randomUUID()}`;
  const responseId = randomUUID();
  const app = createApplication({
    publicKey: keys.publicKey.export({ type: 'spki', format: 'der' }).subarray(-32).toString('hex'),
    databaseUrl: process.env.TEST_DATABASE_URL!, modules: [requestModule],
  });
  await app.initialize();
  await new Promise<void>((resolve, reject) => { app.server.once('error', reject); app.server.listen(0, '127.0.0.1', resolve); });
  const address = app.server.address();
  if (!address || typeof address === 'string') throw new Error('TCP address required');
  const database = postgres(process.env.TEST_DATABASE_URL!);
  try {
    await database`insert into robotman_responses (response_id, guild_id, trigger, aliases, content, embeds) values (${responseId}, ${guildId}, ${'Long Trigger'}, ${database.json(['Hello There'])}, ${'Welcome {user} in {channel}'}, ${database.json([{ title: 'Hi {user}', description: 'From {channel}', author: { name: 'For {user}' }, footer: { text: 'In {channel}' }, fields: [{ name: '{user}', value: '{channel}' }] }])})`;
    async function send(payload: Record<string, unknown>) {
      const body = JSON.stringify({ id: '100', application_id: '200', token: 'token', guild_id: guildId, channel_id: 'channel-7', member: { user: { id: 'user-8' }, permissions: '0' }, ...payload });
      const timestamp = String(Math.floor(Date.now() / 1000));
      return fetch(`http://127.0.0.1:${address.port}/interactions`, { method: 'POST', body, headers: {
        'content-type': 'application/json', 'x-signature-timestamp': timestamp,
        'x-signature-ed25519': sign(null, Buffer.from(timestamp + body), keys.privateKey).toString('hex'),
      } });
    }
    const result = await send({ type: 2, data: { type: 1, name: 'response', options: [{ type: 3, name: 'trigger', value: 'hELLo tHERE' }] } });
    assert.equal(result.status, 200);
    assert.deepEqual(await result.json(), { type: 4, data: {
      content: 'Welcome <@user-8> in <#channel-7>',
      embeds: [{ title: 'Hi <@user-8>', description: 'From <#channel-7>', author: { name: 'For <@user-8>' }, footer: { text: 'In <#channel-7>' }, fields: [{ name: '<@user-8>', value: '<#channel-7>' }] }],
    } });

    const partial = await send({ type: 2, data: { type: 1, name: 'response', options: [{ type: 3, name: 'trigger', value: 'Long' }] } });
    const missing = (await partial.json()).data;
    assert.match(missing.content, /No Response found/);
    assert.equal(missing.flags, 64);
    const otherGuild = await send({ type: 2, guild_id: 'different-guild', data: { type: 1, name: 'response', options: [{ type: 3, name: 'trigger', value: 'Long Trigger' }] } });
    assert.match((await otherGuild.json()).data.content, /No Response found/);

    await database`insert into robotman_recommendation_entries (recommendation_id, guild_id, category, name, description, url) values
      (${randomUUID()}, ${guildId}, 'character', 'Shared name', 'A character pick.', 'https://example.com/character'),
      (${randomUUID()}, ${guildId}, 'writer', 'Shared name', 'A writer pick.', 'https://example.com/writer'),
      (${randomUUID()}, ${guildId}, 'moderator', 'Shared name', 'A moderator pick.', 'https://example.com/moderator'),
      (${randomUUID()}, ${guildId}, 'booster', 'Shared name', 'A booster choice.', 'https://example.com/booster-choice'),
      (${randomUUID()}, ${guildId}, 'booster', 'Another pick', 'A booster pick.', 'https://example.com/booster')`;
    const completion = await send({ type: 4, data: { type: 1, name: 'recs', options: [{ type: 1, name: 'lookup', options: [{ type: 3, name: 'name', value: 'Shared', focused: true }] }] } });
    const choices = (await completion.json()).data.choices;
    assert.deepEqual(choices.map((choice: { name: string }) => choice.name), ['Shared name · Booster', 'Shared name · Character', 'Shared name · Moderator', 'Shared name · Writer']);
    assert.equal(new Set(choices.map((choice: { value: string }) => choice.value)).size, 4);

    const writer = choices.find((choice: { name: string }) => choice.name.endsWith('Writer'));
    const selected = await send({ type: 2, data: { type: 1, name: 'recs', options: [{ type: 1, name: 'lookup', options: [{ type: 3, name: 'name', value: writer.value }] }] } });
    assert.deepEqual((await selected.json()).data.embeds[0], { title: 'Shared name · Writer', url: 'https://example.com/writer', description: 'A writer pick.' });

    const tasteTest = (await (await send({ type: 2, data: { type: 1, name: 'recs', options: [{ type: 1, name: 'taste-test' }] } })).json()).data.embeds[0];
    assert.equal(tasteTest.title, 'Taste Test');
    assert.deepEqual(tasteTest.fields, [{ name: 'Mods', value: 'Shared name' }, { name: 'Boosters', value: 'Another pick\nShared name' }]);
    assert.doesNotMatch(JSON.stringify(tasteTest), /A booster pick|https:\/\/example/);
    const characters = (await (await send({ type: 2, data: { type: 1, name: 'recs', options: [{ type: 1, name: 'characters' }] } })).json()).data.embeds[0];
    assert.match(characters.description, /Shared Name/);
    assert.doesNotMatch(characters.description, /Another pick/);
    const writers = (await (await send({ type: 2, data: { type: 1, name: 'recs', options: [{ type: 1, name: 'writers' }] } })).json()).data.embeds[0];
    assert.equal(writers.title, 'Writer Recommendations');

    const dmBody = JSON.stringify({ type: 2, id: '101', application_id: '200', token: 'token', channel_id: 'channel-7', data: { type: 1, name: 'response', options: [{ type: 3, name: 'trigger', value: 'Long Trigger' }] } });
    const timestamp = String(Math.floor(Date.now() / 1000));
    const dm = await fetch(`http://127.0.0.1:${address.port}/interactions`, { method: 'POST', body: dmBody, headers: {
      'content-type': 'application/json', 'x-signature-timestamp': timestamp,
      'x-signature-ed25519': sign(null, Buffer.from(timestamp + dmBody), keys.privateKey).toString('hex'),
    } });
    const dmReply = await dm.json();
    assert.equal(dmReply.data.flags, 64);
    assert.match(dmReply.data.content, /only available in servers/);
  } finally { await database.end(); await app.close(); }
});
