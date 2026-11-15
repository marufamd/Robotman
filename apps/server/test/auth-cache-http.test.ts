import assert from 'node:assert/strict';
import { generateKeyPairSync } from 'node:crypto';
import { test } from 'node:test';
import { createApplication } from '../src/application.js';
import { createAuth } from '../src/auth/index.js';

async function harness() {
  let now = Date.now();
  let guildStatus = 200;
  let botStatus = 200;
  let allowed = true;
  const calls = { userGuilds: 0, botGuilds: 0, individualGuilds: 0 };
  const keys = generateKeyPairSync('ed25519');
  const auth = createAuth({
    clientId: 'app', clientSecret: 'secret', botToken: 'bot', sessionSecret: 'session-cache-test-secret',
    publicOrigin: 'http://dashboard.test', secureCookies: false, now: () => now,
    fetch: async (input, init) => {
      const url = new URL(String(input));
      if (url.pathname.endsWith('/oauth2/token')) return Response.json({ access_token: 'access', refresh_token: 'refresh', expires_in: 3600 });
      if (url.pathname.endsWith('/users/@me')) return Response.json({ id: 'manager', username: 'manager' });
      if (url.pathname.endsWith('/users/@me/guilds')) {
        const bot = new Headers(init?.headers).get('authorization') === 'Bot bot';
        if (bot) calls.botGuilds += 1; else calls.userGuilds += 1;
        const status = bot ? botStatus : guildStatus;
        if (status === 429) return Response.json({ retry_after: 30, global: false }, { status, headers: { 'retry-after': '30' } });
        if (status !== 200) return Response.json({}, { status });
        if (bot) return Response.json([{ id: 'installed' }]);
        return Response.json([
          { id: 'installed', name: 'Installed', icon: null, owner: false, permissions: allowed ? '32' : '0' },
          { id: 'invite', name: 'Invite', icon: null, owner: false, permissions: allowed ? '8' : '0' },
        ]);
      }
      calls.individualGuilds += 1;
      return url.pathname.endsWith('/guilds/installed') ? Response.json({ id: 'installed' }) : Response.json({}, { status: 403 });
    },
  });
  const app = createApplication({
    publicKey: keys.publicKey.export({ type: 'spki', format: 'der' }).subarray(-32).toString('hex'),
    databaseUrl: process.env.TEST_DATABASE_URL ?? 'postgres://localhost/robotman_test', auth,
  });
  await app.initialize();
  await new Promise<void>(resolve => app.server.listen(0, '127.0.0.1', resolve));
  const address = app.server.address();
  if (!address || typeof address === 'string') throw new Error('TCP listener required');
  const origin = `http://127.0.0.1:${address.port}`;
  const login = async () => {
    const started = await fetch(`${origin}/api/auth/login`, { redirect: 'manual' });
    const state = new URL(started.headers.get('location')!).searchParams.get('state');
    const callback = await fetch(`${origin}/api/auth/callback?code=test&state=${state}`, {
      redirect: 'manual', headers: { cookie: started.headers.getSetCookie().map(value => value.split(';')[0]).join('; ') },
    });
    assert.equal(callback.status, 302);
    return callback.headers.getSetCookie().map(value => value.split(';')[0]).join('; ');
  };
  const query = async (cookie: string, query = '{ managedGuilds { id installed } }') => {
    const result = await fetch(`${origin}/api/graphql`, {
      method: 'POST', headers: { cookie, 'content-type': 'application/json' }, body: JSON.stringify({ query }),
    });
    return result.json() as Promise<any>;
  };
  return {
    app, calls, login, query,
    advance(ms: number) { now += ms; },
    limitUser() { guildStatus = 429; },
    limitBot() { botStatus = 429; },
    recover() { guildStatus = 200; botStatus = 200; },
    revoke() { allowed = false; },
  };
}

test('simultaneous dashboard loads share one permission snapshot and one bot installation list', async () => {
  const h = await harness();
  try {
    const cookie = await h.login();
    const results = await Promise.all(Array.from({ length: 5 }, () => h.query(cookie)));
    for (const result of results) {
      assert.equal(result.errors, undefined);
      assert.deepEqual(result.data.managedGuilds, [{ id: 'installed', installed: true }, { id: 'invite', installed: false }]);
    }
    assert.deepEqual(h.calls, { userGuilds: 1, botGuilds: 1, individualGuilds: 0 });
    h.advance(2 * 60 * 60 * 1000);
    h.limitUser();
    const cached = await h.query(cookie);
    assert.equal(cached.errors, undefined);
    assert.equal(h.calls.userGuilds, 1, 'permission snapshot lasts for the session, including after OAuth token expiry');
  } finally { await h.app.close(); }
});

test('a new sign-in refreshes the session permission snapshot', async () => {
  const h = await harness();
  try {
    const first = await h.login();
    assert.equal((await h.query(first)).data.managedGuilds.length, 2);
    h.revoke();
    assert.equal((await h.query(first)).data.managedGuilds.length, 2);
    const second = await h.login();
    assert.deepEqual((await h.query(second)).data.managedGuilds, []);
    assert.equal(h.calls.userGuilds, 2);
  } finally { await h.app.close(); }
});

test('initial Discord rate limits honor the retry delay without hammering the route', async () => {
  const h = await harness();
  try {
    const cookie = await h.login();
    h.limitUser();
    const limited = await h.query(cookie);
    assert.match(limited.errors[0].message, /429.*30 seconds/);
    const again = await h.query(cookie);
    assert.match(again.errors[0].message, /429/);
    assert.equal(h.calls.userGuilds, 1);
    const identity = await h.query(cookie, '{ authUser { id } authCsrfToken }');
    assert.equal(identity.data.authUser.id, 'manager');
    h.advance(30_001);
    h.recover();
    assert.equal((await h.query(cookie)).errors, undefined);
    assert.equal(h.calls.userGuilds, 2);
  } finally { await h.app.close(); }
});

test('a bot installation rate limit is shared across concurrent dashboard requests', async () => {
  const h = await harness();
  try {
    const cookie = await h.login();
    h.limitBot();
    const results = await Promise.all(Array.from({ length: 5 }, () => h.query(cookie)));
    assert.ok(results.every(result => result.errors?.[0].message.includes('429')));
    assert.equal(h.calls.botGuilds, 1);
    assert.equal(h.calls.userGuilds, 1);
    await h.query(cookie);
    assert.equal(h.calls.botGuilds, 1);
    h.advance(30_001);
    h.recover();
    assert.equal((await h.query(cookie)).errors, undefined);
  } finally { await h.app.close(); }
});
