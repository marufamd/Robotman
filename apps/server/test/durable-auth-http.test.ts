import assert from 'node:assert/strict';
import { generateKeyPairSync, randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { createServer, connect, type Socket } from 'node:net';
import { createApplication } from '../src/application.js';
import { createAuth } from '../src/auth/index.js';

const databaseUrl = process.env.TEST_DATABASE_URL!;
const publicKey = generateKeyPairSync('ed25519').publicKey.export({ type: 'spki', format: 'der' }).subarray(-32).toString('hex');
const cookies = (response: Response) => response.headers.getSetCookie().map(value => value.split(';')[0]).join('; ');

async function harness() {
  let now = Date.now();
  let offline = false;
  let permissionCalls = 0;
  let allowed = true;
  const guild = randomUUID();
  const apps: ReturnType<typeof createApplication>[] = [];
  const start = async (sessionDatabaseUrl = databaseUrl) => {
    const auth = createAuth({ databaseUrl: sessionDatabaseUrl, clientId: 'app', clientSecret: 'secret', botToken: 'bot', sessionSecret: 'durable-test-secret', secureCookies: false, now: () => now,
      fetch: async (input, init) => {
        const path = new URL(String(input)).pathname;
        if (offline) throw new Error('Discord unavailable');
        if (path.endsWith('/oauth2/token')) return Response.json({ access_token: 'access', refresh_token: 'refresh', expires_in: 3600 });
        if (path.endsWith('/users/@me')) return Response.json({ id: 'durable-manager', username: 'manager' });
        if (path.endsWith('/users/@me/guilds')) {
          if (new Headers(init?.headers).get('authorization')?.startsWith('Bot')) return Response.json([{ id: guild }]);
          permissionCalls++;
          await new Promise(resolve => setTimeout(resolve, 50));
          return Response.json([{ id: guild, name: 'Test server', icon: null, owner: allowed, permissions: '0' }]);
        }
        throw new Error('Unexpected Discord request');
      },
    });
    const app = createApplication({ publicKey, databaseUrl, auth });
    apps.push(app);
    await app.initialize();
    await new Promise<void>(resolve => app.server.listen(0, '127.0.0.1', resolve));
    const address = app.server.address() as { port: number };
    const origin = `http://127.0.0.1:${address.port}`;
    const query = async (cookie: string, query: string, variables?: unknown, csrf?: string) => {
      const response = await fetch(`${origin}/api/graphql`, { method: 'POST', headers: { cookie, 'content-type': 'application/json', ...(csrf ? { 'x-csrf-token': csrf } : {}) }, body: JSON.stringify({ query, variables }) });
      return response.json() as Promise<any>;
    };
    const begin = () => fetch(`${origin}/api/auth/login`, { redirect: 'manual' });
    const callback = (login: Response) => fetch(`${origin}/api/auth/callback?code=code&state=${new URL(login.headers.get('location')!).searchParams.get('state')}`, { redirect: 'manual', headers: { cookie: cookies(login) } });
    const login = async () => { const response = await callback(await begin()); assert.equal(response.status, 302); return cookies(response); };
    return { app, origin, query, begin, callback, login };
  };
  return { start, guild, revoke() { allowed = false; }, offline() { offline = true; }, advance(ms: number) { now += ms; }, get permissionCalls() { return permissionCalls; }, async close() { for (const app of apps) if (app.server.listening) await app.close(); } };
}

test('a signed-in manager can read and save Responses after restart without fetching Discord permissions', async () => {
  const h = await harness();
  try {
    const first = await h.start();
    const cookie = await first.login();
    const initial = await first.query(cookie, '{ authUser { id } authCsrfToken managedGuilds { id } }');
    assert.equal(initial.errors, undefined);
    await first.app.close();
    h.offline();
    const second = await h.start();
    const identity = await second.query(cookie, '{ authUser { id } authCsrfToken }');
    assert.equal(identity.data.authUser?.id, 'durable-manager');
    assert.equal(identity.data.authCsrfToken, initial.data.authCsrfToken);
    const saved = await second.query(cookie, 'mutation($guild: ID!, $input: ResponseInput!) { createResponse(guildId: $guild, input: $input) { id content } }', { guild: h.guild, input: { trigger: 'hello', aliases: [], content: 'Still signed in', embedsJson: '[]' } }, identity.data.authCsrfToken);
    assert.equal(saved.errors, undefined);
    const read = await second.query(cookie, 'query($guild: ID!) { responses(guildId: $guild) { content } }', { guild: h.guild });
    assert.deepEqual(read.data.responses.map((r: any) => r.content), ['Still signed in']);
    assert.equal(h.permissionCalls, 1);
  } finally { await h.close(); }
});

test('Discord sign-in survives restart during authorization and its state can only be used once', async () => {
  const h = await harness();
  try {
    const first = await h.start();
    const pending = await first.begin();
    await first.app.close();
    const second = await h.start();
    assert.equal((await second.callback(pending)).status, 302);
    assert.equal((await second.callback(pending)).status, 400);
    const expired = await second.begin();
    h.advance(600_000);
    assert.equal((await second.callback(expired)).status, 400);
  } finally { await h.close(); }
});

test('concurrent server instances capture one Management Permission Snapshot for the session', async () => {
  const h = await harness();
  try {
    const first = await h.start();
    const second = await h.start();
    const cookie = await first.login();
    const results = await Promise.all([first, second, first, second].map(app => app.query(cookie, '{ managedGuilds { id } }')));
    for (const result of results) {
      assert.equal(result.errors, undefined);
      assert.deepEqual(result.data.managedGuilds, [{ id: h.guild }]);
    }
    assert.equal(h.permissionCalls, 1);
  } finally { await h.close(); }
});

test('a database outage is retryable without clearing the cookie and the session recovers', async () => {
  const target = new URL(databaseUrl);
  const upstreamPort = Number(target.port);
  let offline = false;
  const sockets = new Set<Socket>();
  const proxy = createServer(socket => {
    if (offline) { sockets.add(socket); socket.on('error', () => {}); socket.on('close', () => sockets.delete(socket)); return; }
    const upstream = connect(upstreamPort, target.hostname);
    sockets.add(socket); sockets.add(upstream);
    socket.on('error', () => upstream.destroy());
    upstream.on('error', () => socket.destroy());
    socket.on('close', () => { sockets.delete(socket); upstream.destroy(); });
    upstream.on('close', () => { sockets.delete(upstream); socket.destroy(); });
    socket.on('data', () => { if (offline) socket.destroy(); });
    socket.pipe(upstream).pipe(socket);
  });
  await new Promise<void>(resolve => proxy.listen(0, '127.0.0.1', resolve));
  target.port = String((proxy.address() as { port: number }).port);
  const h = await harness();
  try {
    const app = await h.start(target.toString());
    const cookie = await app.login();
    assert.equal((await app.query(cookie, '{ authUser { id } }')).data.authUser.id, 'durable-manager');
    offline = true;
    const failed = await app.query(cookie, '{ authUser { id } }');
    assert.equal(failed.errors[0].extensions.code, 'SERVICE_UNAVAILABLE');
    offline = false;
    const recovered = await app.query(cookie, '{ authUser { id } }');
    assert.equal(recovered.errors, undefined);
    assert.equal(recovered.data.authUser.id, 'durable-manager');
    offline = true;
    const failedHttp = await fetch(`${app.origin}/api/auth/session`, { headers: { cookie } });
    assert.equal(failedHttp.status, 503);
    assert.deepEqual(failedHttp.headers.getSetCookie(), []);
    assert.equal((await failedHttp.json()).code, 'SERVICE_UNAVAILABLE');
    offline = false;
  } finally {
    await h.close();
    for (const socket of sockets) socket.destroy();
    await new Promise<void>(resolve => proxy.close(() => resolve()));
  }
});

test('sessions expire seven days from sign-in even after activity, and logout only revokes the current browser across instances', async () => {
  const h = await harness();
  try {
    const first = await h.start();
    const second = await h.start();
    const one = await first.login();
    const two = await first.login();
    const identity = await second.query(one, '{ authCsrfToken }');
    const denied = await second.query(one, 'mutation { authLogout }');
    assert.match(denied.errors[0].message, /CSRF/);
    const loggedOut = await second.query(one, 'mutation { authLogout }', undefined, identity.data.authCsrfToken);
    assert.equal(loggedOut.errors, undefined);
    assert.equal((await first.query(one, '{ authUser { id } }')).data.authUser, null);
    h.advance(6 * 86400_000);
    assert.equal((await second.query(two, '{ authUser { id } }')).data.authUser.id, 'durable-manager');
    h.advance(86400_000);
    assert.equal((await second.query(two, '{ authUser { id } }')).data.authUser, null);
    const expiredRead = await second.query(two, 'query($guild: ID!) { responses(guildId: $guild) { id } }', { guild: h.guild });
    assert.equal(expiredRead.errors[0].extensions.code, 'UNAUTHENTICATED');
  } finally { await h.close(); }
});

test('logout prevents later protected mutations in the same GraphQL request', async () => {
  const h = await harness();
  try {
    const app = await h.start();
    const cookie = await app.login();
    const identity = await app.query(cookie, '{ authCsrfToken managedGuilds { id } }');
    const result = await app.query(cookie, 'mutation($guild: ID!, $input: ResponseInput!) { authLogout createResponse(guildId: $guild, input: $input) { id } }', { guild: h.guild, input: { trigger: 'after-logout', aliases: [], content: 'Must not save', embedsJson: '[]' } }, identity.data.authCsrfToken);
    assert.equal(result.errors?.[0]?.extensions.code, 'UNAUTHENTICATED');
  } finally { await h.close(); }
});

test('an empty Management Permission Snapshot also survives restart without a new Discord fetch', async () => {
  const h = await harness();
  try {
    h.revoke();
    const first = await h.start();
    const cookie = await first.login();
    assert.deepEqual((await first.query(cookie, '{ managedGuilds { id } }')).data.managedGuilds, []);
    await first.app.close();
    h.offline();
    const second = await h.start();
    const result = await second.query(cookie, '{ managedGuilds { id } }');
    assert.equal(result.errors, undefined);
    assert.deepEqual(result.data.managedGuilds, []);
    assert.equal(h.permissionCalls, 1);
  } finally { await h.close(); }
});
