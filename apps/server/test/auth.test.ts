import assert from 'node:assert/strict';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { test, before } from 'node:test';
import postgres from 'postgres';
import { migrateDatabase } from '../src/database/migrate.js';
const databaseUrl = process.env.TEST_DATABASE_URL ?? 'postgres://localhost/robotman_test';
before(async () => { const db = postgres(databaseUrl); try { await migrateDatabase(db); } finally { await db.end(); } });
import { buildSchema, graphql } from 'graphql';
import { createAuth } from '../src/auth/index.js';

function makeHarness() {
  const guildFetchCalls = new Map<string, number>();
  const auth = createAuth({
    databaseUrl,
    clientId: 'app-123', clientSecret: 'secret', botToken: 'bot-token', sessionSecret: 'test-session-secret',
    publicOrigin: 'https://robotman.test', secureCookies: false, installationCacheMs: 60_000,
    fetch: async (input, init) => {
      const url = String(input);
      if (url.endsWith('/oauth2/token')) return Response.json({ access_token: 'oauth-token', expires_in: 3600 });
      if (url.endsWith('/users/@me') && (init?.headers as Record<string, string>)?.authorization === 'Bearer oauth-token') {
        return Response.json({ id: 'user-7', username: 'tester', global_name: 'Test User', avatar: null });
      }
      if (new URL(url).pathname.endsWith('/users/@me/guilds')) {
        const bot = new Headers(init?.headers).get('authorization') === 'Bot bot-token';
        const key = bot ? 'bot-list' : 'user-list';
        guildFetchCalls.set(key, (guildFetchCalls.get(key) ?? 0) + 1);
        if (bot) return Response.json([{ id: 'owner' }, { id: 'admin' }]);
        return Response.json([
        { id: 'owner', name: 'Owner guild', icon: null, owner: true, permissions: '0' },
        { id: 'manage', name: 'Manager guild', icon: null, owner: false, permissions: '32' },
        { id: 'admin', name: 'Admin guild', icon: null, owner: false, permissions: '8' },
        { id: 'member', name: 'Member guild', icon: null, owner: false, permissions: '1' },
        ]);
      }
      const guild = /\/guilds\/([^/?]+)/.exec(url)?.[1];
      if (guild) {
        guildFetchCalls.set(guild, (guildFetchCalls.get(guild) ?? 0) + 1);
        if (guild === 'owner' || guild === 'admin') return Response.json({ id: guild });
        if (guild === 'manage') return new Response('', { status: 403 });
        return new Response('', { status: 404 });
      }
      return new Response('', { status: 404 });
    },
  });
  return { auth, guildFetchCalls };
}

function cookieFrom(response: HttpResult, name: string): string {
  const header = response.headers['set-cookie'] as string[];
  const match = header.map(value => new RegExp(`${name}=([^;,]+)`).exec(value)).find(Boolean);
  if (!match) throw new Error(`Missing ${name} cookie`);
  return `${name}=${match[1]}`;
}

interface HttpResult { status: number; headers: Record<string, string | string[]>; body: string; }
async function request(auth: ReturnType<typeof createAuth>, url: string, options: { method?: string; cookie?: string; headers?: Record<string, string> } = {}): Promise<HttpResult> {
  const result: HttpResult = { status: 200, headers: {}, body: '' };
  const req = { method: options.method ?? 'GET', url, headers: { ...(options.headers ?? {}), ...(options.cookie ? { cookie: options.cookie } : {}) } } as unknown as IncomingMessage;
  const res = {
    setHeader(name: string, value: string | string[]) { result.headers[name.toLowerCase()] = value; return this; },
    writeHead(status: number, headers?: Record<string, string>) { result.status = status; if (headers) for (const [name, value] of Object.entries(headers)) result.headers[name.toLowerCase()] = value; return this; },
    end(body?: string) { result.body = body ?? ''; return this; },
  } as unknown as ServerResponse;
  assert.equal(await auth.handleHttp(req, res), true);
  return result;
}
const json = <T>(response: HttpResult) => JSON.parse(response.body) as T;

test('OAuth login sets short lived state cookie and requests identity and guild scopes', async () => {
  const { auth } = makeHarness();
  try {
    const response = await request(auth, '/auth/login');
    assert.equal(response.status, 302);
    const location = new URL(response.headers.location as string);
    assert.equal(location.origin, 'https://discord.com');
    assert.equal(location.searchParams.get('scope'), 'identify guilds');
    assert.equal(location.searchParams.get('redirect_uri'), 'https://robotman.test/api/auth/callback');
    assert.equal(cookieFrom(response, 'robotman_oauth_state').startsWith('robotman_oauth_state='), true);
    assert.equal(location.searchParams.get('state')?.length, 32);
  } finally { await auth.close?.(); }
});

test('OAuth callback rejects invalid state without creating a session', async () => {
  const { auth } = makeHarness();
  try {
    const login = await request(auth, '/auth/login');
    const stateCookie = cookieFrom(login, 'robotman_oauth_state');
    const response = await request(auth, '/auth/callback?code=code&state=wrong', { cookie: stateCookie });
    assert.equal(response.status, 400);
    assert.match(json<{ error: string }>(response).error, /state/i);
  } finally { await auth.close?.(); }
});

test('OAuth callback exchanges code and creates signed session and CSRF cookies', async () => {
  const { auth } = makeHarness();
  try {
    const login = await request(auth, '/auth/login');
    const loginUrl = new URL(login.headers.location as string);
    const stateCookie = cookieFrom(login, 'robotman_oauth_state');
    const response = await request(auth, `/auth/callback?code=one-time-code&state=${loginUrl.searchParams.get('state')}`, { cookie: stateCookie });
    assert.equal(response.status, 302);
    assert.equal(response.headers.location, '/');
    assert.ok(cookieFrom(response, 'robotman_session').includes('.'));
    assert.ok(cookieFrom(response, 'robotman_csrf').length > 20);
    assert.match((response.headers['set-cookie'] as string[]).join(';'), /HttpOnly/);
  } finally { await auth.close?.(); }
});

test('guild list filters access, checks installation via Discord REST, and supplies scoped invite link', async () => {
  const { auth, guildFetchCalls } = makeHarness();
  try {
    const login = await request(auth, '/auth/login');
    const loginUrl = new URL(login.headers.location as string);
    const callback = await request(auth, `/auth/callback?code=x&state=${loginUrl.searchParams.get('state')}`, { cookie: cookieFrom(login, 'robotman_oauth_state') });
    const sessionCookie = cookieFrom(callback, 'robotman_session');
    const response = await request(auth, '/auth/guilds', { cookie: sessionCookie });
    assert.equal(response.status, 200);
    const guilds = json<{ guilds: Array<{ id: string; installed: boolean; inviteUrl: string }> }>(response).guilds;
    assert.deepEqual(guilds.map(guild => guild.id), ['owner', 'manage', 'admin']);
    assert.equal(guilds[0].installed, true);
    assert.equal(guilds[1].installed, false);
    const invite = new URL(guilds[1].inviteUrl);
    assert.ok((BigInt(invite.searchParams.get('permissions')!) & 262144n) !== 0n, 'invite permits external game emojis');
    assert.equal(invite.searchParams.get('scope'), 'bot applications.commands');
    assert.equal(invite.searchParams.get('permissions'), '346112');
    assert.equal(invite.searchParams.get('guild_id'), 'manage');
    assert.equal(guildFetchCalls.get('bot-list'), 1);
    const cached = await request(auth, '/auth/guilds', { cookie: sessionCookie });
    assert.equal(cached.status, 200);
    assert.equal(guildFetchCalls.get('bot-list'), 1);
    assert.equal(guildFetchCalls.get('user-list'), 1);
  } finally { await auth.close?.(); }
});

test('GraphQL auth resolvers read request and response context passed by the HTTP application', async () => {
  const { auth } = makeHarness();
  try {
    const login = await request(auth, '/auth/login');
    const loginUrl = new URL(login.headers.location as string);
    const callback = await request(auth, `/auth/callback?code=x&state=${loginUrl.searchParams.get('state')}`, { cookie: cookieFrom(login, 'robotman_oauth_state') });
    const sessionCookie = cookieFrom(callback, 'robotman_session');
    const session = await request(auth, '/auth/session', { cookie: sessionCookie });
    const context = { request: { headers: { cookie: sessionCookie } } as unknown as IncomingMessage };
    const schema = buildSchema(`type Query { ready: Boolean! } type Mutation { _foundation: Boolean } ${auth.schemaFields}`);
    const result = await graphql({ schema, source: '{ authUser { id username displayName } authCsrfToken }', rootValue: auth.resolvers, contextValue: context });
    assert.deepEqual(result.errors, undefined);
    assert.equal((result.data?.authUser as { id: string }).id, 'user-7');
    assert.equal(result.data?.authCsrfToken, json<{ csrfToken: string }>(session).csrfToken);
  } finally { await auth.close?.(); }
});

test('logout requires a matching CSRF header and expires both cookies', async () => {
  const { auth } = makeHarness();
  try {
    const login = await request(auth, '/auth/login');
    const loginUrl = new URL(login.headers.location as string);
    const callback = await request(auth, `/auth/callback?code=x&state=${loginUrl.searchParams.get('state')}`, { cookie: cookieFrom(login, 'robotman_oauth_state') });
    const sessionCookie = cookieFrom(callback, 'robotman_session');
    const csrfCookie = cookieFrom(callback, 'robotman_csrf');
    const csrfToken = decodeURIComponent(csrfCookie.split('=')[1]);
    const denied = await request(auth, '/auth/logout', { method: 'POST', cookie: sessionCookie });
    assert.equal(denied.status, 403);
    const response = await request(auth, '/auth/logout', { method: 'POST', cookie: `${sessionCookie}; ${csrfCookie}`, headers: { 'x-csrf-token': csrfToken } });
    assert.equal(response.status, 200);
    assert.match((response.headers['set-cookie'] as string[]).join(';'), /Max-Age=0/);
    const session = await request(auth, '/auth/session', { cookie: sessionCookie });
    assert.equal(json<{ user: unknown }>(session).user, null);
  } finally { await auth.close?.(); }
});

test('OAuth endpoints fail clearly when required secrets are absent without failing auth construction', async () => {
  const auth = createAuth({ secureCookies: false });
  const response = await request(auth, '/auth/login');
  assert.equal(response.status, 503);
  assert.match(json<{ error: string }>(response).error, /not configured/i);
  await auth.close?.();
});
