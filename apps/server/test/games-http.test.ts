import assert from 'node:assert/strict';
import { generateKeyPairSync, sign } from 'node:crypto';
import { test } from 'node:test';
import { createApplication } from '../src/application.js';
import { gamesModule } from '../src/commands/games/index.js';

test('signed game moves remain playable after restarting the HTTP application', { skip: !process.env.TEST_DATABASE_URL }, async () => {
  const keys = generateKeyPairSync('ed25519');
  const config = {
    publicKey: keys.publicKey.export({ type: 'spki', format: 'der' }).subarray(-32).toString('hex'),
    databaseUrl: process.env.TEST_DATABASE_URL!, modules: [gamesModule],
  };
  let app = createApplication(config);
  async function listen() {
    await app.initialize();
    await new Promise<void>((resolve, reject) => { app.server.once('error', reject); app.server.listen(0, '127.0.0.1', resolve); });
  }
  async function interaction(data: unknown, type = 2, player = 'one') {
    const address = app.server.address();
    if (!address || typeof address === 'string') throw new Error('TCP address required');
    const body = JSON.stringify({ type, id: '100', application_id: '200', token: 'token', guild_id: 'guild-http', channel_id: 'channel-http', member: { user: { id: player }, permissions: '0' }, data });
    const timestamp = String(Math.floor(Date.now() / 1000));
    const response = await fetch(`http://127.0.0.1:${address.port}/interactions`, { method: 'POST', body, headers: {
      'content-type': 'application/json', 'x-signature-timestamp': timestamp,
      'x-signature-ed25519': sign(null, Buffer.from(timestamp + body), keys.privateKey).toString('hex'),
    } });
    assert.equal(response.status, 200);
    return response.json();
  }
  try {
    await listen();
    const start = await interaction({ type: 1, name: 'tic-tac-toe', options: [{ type: 6, name: 'opponent', value: 'two' }] });
    assert.equal(start.type, 4);
    const firstMove = start.data.components[0].components[0].custom_id;
    const firstPlayer = /<@([^>]+)>'s turn/.exec(start.data.content)![1];
    await app.close();
    app = createApplication(config);
    await listen();
    const moved = await interaction({ custom_id: firstMove, component_type: 2 }, 3, firstPlayer);
    assert.equal(moved.type, 7);
    assert.match(moved.data.content, firstPlayer === 'one' ? /two/ : /one/);
  } finally { await app.close(); }
});


test('solo games start immediately with bot moves and Hangman offers word guesses and Stop', { skip: !process.env.TEST_DATABASE_URL }, async () => {
  const keys = generateKeyPairSync('ed25519');
  const app = createApplication({ publicKey: keys.publicKey.export({ type: 'spki', format: 'der' }).subarray(-32).toString('hex'), databaseUrl: process.env.TEST_DATABASE_URL!, modules: [gamesModule], applicationId: '200', botToken: 'fixture-token', fetch: async () => Response.json({ username: 'Robotman Dev' }) });
  await app.initialize();
  await new Promise<void>(resolve => app.server.listen(0, '127.0.0.1', resolve));
  const address = app.server.address(); if (!address || typeof address === 'string') throw new Error('Address');
  async function send(data: unknown, type = 2, player = 'solo') {
    const body = JSON.stringify({ type, id: '100', application_id: '200', token: 'token', guild_id: 'solo-guild', channel_id: 'solo-channel', member: { user: { id: player } }, data });
    const timestamp = String(Math.floor(Date.now() / 1000));
    return (await fetch(`http://127.0.0.1:${address.port}/interactions`, { method: 'POST', body, headers: { 'x-signature-timestamp': timestamp, 'x-signature-ed25519': sign(null, Buffer.from(timestamp + body), keys.privateKey).toString('hex') } })).json();
  }
  try {
    for (const name of ['connect-four', 'tic-tac-toe']) {
      let start = await send({ type: 1, name });
      assert.equal(start.type, 4);
      {
        const choices = start.data.components[0].components;
        assert.deepEqual(choices.map((item: any) => item.label), ['Human', 'Computer']);
        const denied = await send({ custom_id: choices[1].custom_id, component_type: 2 }, 3, 'outsider');
        assert.equal(denied.data.flags, 64);
        start = await send({ custom_id: choices[1].custom_id, component_type: 2 }, 3);
        assert.equal(start.type, 7);
        if (name === 'connect-four') assert.equal(start.data.embeds[0].fields[0].value, '<:Timer:654794151841366058>');
      }
      assert.ok(start.data.components?.length);
      if (name === 'connect-four') assert.match(start.data.content, /Robotman Dev/);
      const controls = start.data.components.flatMap((row: any) => row.components);
      const move = controls.find((item: any) => !item.disabled && /:(drop|mark):/.test(item.custom_id));
      const played = await send({ custom_id: move.custom_id, component_type: 2 }, 3);
      assert.equal(played.type, 7);
      assert.match(played.data.content, /solo/);
      if (name === 'connect-four') { assert.equal(played.data.embeds[0].color, 813765); assert.ok(controls.some((item: any) => item.label === 'Forfeit')); }
    }
    for (const game of ['connect-four', 'tic-tac-toe']) {
    const choice = await send({ type: 1, name: game });
    const human = choice.data.components[0].components[0].custom_id;
    const lobby = await send({ custom_id: human, component_type: 2 }, 3);
    assert.deepEqual(lobby.data.components[0].components.map((item: any) => item.label), ['Join', 'Cancel']);
    const join = lobby.data.components[0].components[0].custom_id;
    const rejected = await send({ custom_id: join, component_type: 2 }, 3);
    assert.equal(rejected.data.flags, 64);
    const joined = await send({ custom_id: join, component_type: 2 }, 3, 'other-player');
    assert.equal(joined.type, 7);
    assert.match(joined.data.content, /solo/); assert.match(joined.data.content, /other-player/);
    const boardControl = joined.data.components[0].components[0].custom_id;
    const spectator = await send({ custom_id: boardControl, component_type: 2 }, 3, 'spectator');
    assert.equal(spectator.data.flags, 64);
    const cancellable = await send({ type: 1, name: game });
    const cancelLobby = await send({ custom_id: cancellable.data.components[0].components[0].custom_id, component_type: 2 }, 3);
    const cancelled = await send({ custom_id: cancelLobby.data.components[0].components[1].custom_id, component_type: 2 }, 3);
    assert.equal(cancelled.data.content, 'The game has been cancelled.');
    assert.deepEqual(cancelled.data.components, []);
    }
    const hangman = await send({ type: 1, name: 'hangman' });
    assert.equal(hangman.type, 4);
    assert.equal(hangman.data.embeds[0].title, 'Hangman');
    const buttons = hangman.data.components[0].components;
    assert.ok(buttons.some((item: any) => item.label === 'Guess Word'));
    const guessWord = buttons.find((item: any) => item.label === 'Guess Word');
    const denied = await send({ custom_id: guessWord.custom_id, component_type: 2 }, 3, 'outsider');
    assert.equal(denied.data.flags, 64);
    const opened = await send({ custom_id: guessWord.custom_id, component_type: 2 }, 3);
    assert.equal(opened.type, 9);
    const failed = await send({ custom_id: opened.data.custom_id, components: [{ type: 1, components: [{ type: 4, custom_id: 'word', value: 'thiscannotbeaword' }] }] }, 5);
    assert.equal(failed.type, 7); assert.equal(failed.data.embeds[0].title, 'You lost!');
    assert.ok(failed.data.components[0].components.every((item: any) => item.disabled));
  } finally { await app.close(); }
});

test('turn timeouts survive restart and automatically advance Connect Four', { skip: !process.env.TEST_DATABASE_URL }, async () => {
  const keys = generateKeyPairSync('ed25519'); let time = new Date('2099-01-01T00:00:00Z');
  const delivered: any[] = [];
  const config = { publicKey: keys.publicKey.export({ type: 'spki', format: 'der' }).subarray(-32).toString('hex'), databaseUrl: process.env.TEST_DATABASE_URL!, modules: [gamesModule], applicationId: '200', now: () => time, fetch: async (_input: any, init: any) => { if (String(_input).includes('timeout-token')) delivered.push(JSON.parse(String(init?.body))); return Response.json({ id: 'msg' }); } };
  let app = createApplication(config);
  async function listen() { await app.initialize(); await new Promise<void>(resolve => app.server.listen(0, '127.0.0.1', resolve)); }
  try {
    await listen(); const address = app.server.address(); if (!address || typeof address === 'string') throw new Error('Address');
    const body = JSON.stringify({ type: 2, id: '100', application_id: '200', token: 'timeout-token', guild_id: 'timeout-guild', channel_id: 'timeout-channel', member: { user: { id: 'player' } }, data: { type: 1, name: 'connect-four', options: [{ type: 6, name: 'opponent', value: 'other' }] } });
    const timestamp = String(Math.floor(Date.now() / 1000));
    const first = await (await fetch(`http://127.0.0.1:${address.port}/interactions`, { method: 'POST', body, headers: { 'x-signature-timestamp': timestamp, 'x-signature-ed25519': sign(null, Buffer.from(timestamp + body), keys.privateKey).toString('hex') } })).json();
    assert.equal(first.type, 4);
    await app.close(); time = new Date('2099-01-01T00:01:01Z'); app = createApplication(config); await listen();
    for (let i = 0; i < 40 && !delivered.length; i++) await new Promise(resolve => setTimeout(resolve, 50));
    assert.equal(delivered.length, 1);
    assert.match(delivered[0].content, /failed to make a move/);
    assert.match(delivered[0].embeds[0].description, /<:(red|yellow):/);
  } finally { await app.close(); }
});

test('Connect Four choice and join lobbies expire after their original time limits', { skip: !process.env.TEST_DATABASE_URL }, async () => {
  const keys = generateKeyPairSync('ed25519'); let clock = new Date('2100-02-01T00:00:00Z');
  const updates: Array<{ url: string; body: any }> = [];
  const app = createApplication({ publicKey: keys.publicKey.export({ type: 'spki', format: 'der' }).subarray(-32).toString('hex'), databaseUrl: process.env.TEST_DATABASE_URL!, modules: [gamesModule], now: () => clock, fetch: async (input, init) => { if (String(input).includes('lobby-token')) updates.push({ url: String(input), body: JSON.parse(String(init?.body)) }); return Response.json({}); } });
  await app.initialize(); await new Promise<void>(resolve => app.server.listen(0, '127.0.0.1', resolve));
  const address = app.server.address(); if (!address || typeof address === 'string') throw new Error('Address');
  async function send(type: number, data: unknown) {
    const body = JSON.stringify({ type, id: '100', application_id: '200', token: 'lobby-token', guild_id: 'lobby-expiry-guild', channel_id: 'lobby-expiry-channel', member: { user: { id: 'lobby-owner', username: 'Owner' } }, data });
    const timestamp = String(Math.floor(Date.now() / 1000));
    return (await fetch(`http://127.0.0.1:${address.port}/interactions`, { method: 'POST', body, headers: { 'x-signature-timestamp': timestamp, 'x-signature-ed25519': sign(null, Buffer.from(timestamp + body), keys.privateKey).toString('hex') } })).json();
  }
  try {
    const choice = await send(2, { type: 1, name: 'connect-four' }); assert.equal(choice.type, 4);
    clock = new Date('2100-02-01T00:00:11Z');
    for (let i = 0; i < 40 && updates.length < 1; i++) await new Promise(resolve => setTimeout(resolve, 50));
    assert.match(updates[0]!.body.content, /took too long/); assert.deepEqual(updates[0]!.body.components, []);
    const next = await send(2, { type: 1, name: 'connect-four' });
    const human = next.data.components[0].components[0].custom_id;
    const lobby = await send(3, { custom_id: human, component_type: 2 }); assert.equal(lobby.type, 7);
    clock = new Date('2100-02-01T00:05:12Z');
    for (let i = 0; i < 40 && updates.length < 2; i++) await new Promise(resolve => setTimeout(resolve, 50));
    assert.match(updates[1]!.body.content, /No one has joined/); assert.deepEqual(updates[1]!.body.components, []);
  } finally { await app.close(); }
});
