import assert from 'node:assert/strict';
import { generateKeyPairSync, sign } from 'node:crypto';
import { after, before, test } from 'node:test';
import { createApplication } from '../src/application.js';

const keys = generateKeyPairSync('ed25519');
const publicKey = keys.publicKey.export({ type: 'spki', format: 'der' }).subarray(-32).toString('hex');
let application: ReturnType<typeof createApplication>;
let origin: string;

before(async () => {
  application = createApplication({ publicKey, databaseUrl: process.env.TEST_DATABASE_URL ?? 'postgres://localhost/robotman_test' });
  await new Promise<void>((resolve, reject) => {
    application.server.once('error', reject);
    application.server.listen(0, '127.0.0.1', resolve);
  });
  const address = application.server.address();
  if (!address || typeof address === 'string') throw new Error('Expected a TCP listener');
  origin = `http://127.0.0.1:${address.port}`;
});

after(async () => { if (application) await application.close(); });

function headers(body: string) {
  const timestamp = String(Math.floor(Date.now() / 1000));
  return {
    'content-type': 'application/json',
    'x-signature-timestamp': timestamp,
    'x-signature-ed25519': sign(null, Buffer.from(timestamp + body), keys.privateKey).toString('hex'),
  };
}

test('Discord receives its acknowledgement for a correctly signed ping', async () => {
  const body = '{ "type": 1 }';
  const response = await fetch(`${origin}/interactions`, { method: 'POST', headers: headers(body), body });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { type: 1 });
});

test('unsigned, invalidly signed, and tampered interactions are rejected', async () => {
  for (const requestHeaders of [{}, { ...headers('{"type":1}'), 'x-signature-ed25519': '00'.repeat(64) }, headers('{"type":2}')]) {
    const response = await fetch(`${origin}/interactions`, { method: 'POST', headers: requestHeaders, body: '{"type":1}' });
    assert.equal(response.status, 401);
  }
});

test('a signed unsupported interaction is not acknowledged as a ping', async () => {
  const body = '{"type":2}';
  const response = await fetch(`${origin}/interactions`, { method: 'POST', headers: headers(body), body });
  assert.equal(response.status, 400);
});

test('GraphQL confirms readiness through real PostgreSQL', async () => {
  const response = await fetch(`${origin}/graphql`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: '{"query":"{ ready }"}',
  });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { data: { ready: true } });
});

test('an unavailable database cannot claim readiness or expose connection details', async () => {
  const unavailable = createApplication({ publicKey, databaseUrl: 'postgres://robotman:test-password@127.0.0.1:1/robotman_test' });
  await new Promise<void>((resolve, reject) => {
    unavailable.server.once('error', reject);
    unavailable.server.listen(0, '127.0.0.1', resolve);
  });
  try {
    const address = unavailable.server.address();
    if (!address || typeof address === 'string') throw new Error('Expected a TCP listener');
    const response = await fetch(`http://127.0.0.1:${address.port}/graphql`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: '{"query":"{ ready }"}',
    });
    const result = await response.json();
    assert.equal(result.data, null);
    assert.equal(result.errors[0].message, 'Database unavailable');
  } finally { await unavailable.close(); }
});

test('oversized HTTP bodies are rejected before execution', async () => {
  const response = await fetch(`${origin}/graphql`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ query: '{ ready }', padding: 'x'.repeat(1024 * 1024) }),
  });
  assert.equal(response.status, 413);
});

test('malformed signed JSON is rejected', async () => {
  const body = '{';
  const response = await fetch(`${origin}/interactions`, { method: 'POST', headers: headers(body), body });
  assert.equal(response.status, 400);
});

test('GraphQL supports named operations and validates fields', async () => {
  const response = await fetch(`${origin}/graphql`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ query: 'query Selected($show: Boolean!) { ready @include(if: $show) } query Other { ready }', operationName: 'Selected', variables: { show: false } }),
  });
  assert.deepEqual(await response.json(), { data: {} });
  const invalid = await fetch(`${origin}/graphql`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: '{"query":"{ absent }"}',
  });
  const result = await invalid.json();
  assert.equal(result.data, undefined);
  assert.match(result.errors[0].message, /Cannot query field/);
});
