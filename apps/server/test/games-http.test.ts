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
    await app.close();
    app = createApplication(config);
    await listen();
    const moved = await interaction({ custom_id: firstMove, component_type: 2 }, 3);
    assert.equal(moved.type, 7);
    assert.match(moved.data.content, /two/);
  } finally { await app.close(); }
});
