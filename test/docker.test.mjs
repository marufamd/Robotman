import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { generateKeyPairSync, randomUUID, sign } from 'node:crypto';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

test('the fresh Docker deployment serves signed Discord pings and PostgreSQL-backed GraphQL', { timeout: 300000 }, async () => {
  const directory = mkdtempSync(join(tmpdir(), 'robotman-v7-compose-'));
  const envFile = join(directory, 'test.env');
  const keys = generateKeyPairSync('ed25519');
  const publicKey = keys.publicKey.export({ type: 'spki', format: 'der' }).subarray(-32).toString('hex');
  writeFileSync(envFile, `DISCORD_PUBLIC_KEY=${publicKey}\nPOSTGRES_USER=robotman\nPOSTGRES_PASSWORD=test-password\nPOSTGRES_DB=robotman_test\nSERVER_PORT=0\nPOSTGRES_PORT=0\n`);
  const args = ['compose', '-p', `robotman-v7-test-${randomUUID().slice(0, 8)}`, '--env-file', envFile, '-f', 'compose.yaml'];
  const compose = (...command) => execFileSync('docker', [...args, ...command], { encoding: 'utf8', timeout: 240000 }).trim();
  let started = false;
  try {
    assert.deepEqual(compose('config', '--services').split('\n').sort(), ['postgres', 'server']);
    started = true;
    compose('up', '--build', '-d', '--wait', '--wait-timeout', '60');
    const port = compose('port', 'server', '3001').split('\n')[0].split(':').at(-1);
    const origin = `http://127.0.0.1:${port}`;
    const body = '{ "type": 1 }';
    const timestamp = String(Math.floor(Date.now() / 1000));
    const response = await fetch(`${origin}/interactions`, { method: 'POST', body, headers: {
      'content-type': 'application/json', 'x-signature-timestamp': timestamp,
      'x-signature-ed25519': sign(null, Buffer.from(timestamp + body), keys.privateKey).toString('hex'),
    } });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { type: 1 });
    const readiness = await fetch(`${origin}/graphql`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{"query":"{ ready }"}' });
    assert.equal(readiness.status, 200);
    assert.deepEqual(await readiness.json(), { data: { ready: true } });
  } finally {
    try { if (started) compose('down', '--volumes', '--rmi', 'local'); }
    finally { rmSync(directory, { recursive: true, force: true }); }
  }
});
