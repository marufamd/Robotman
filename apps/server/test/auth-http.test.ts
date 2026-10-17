import assert from 'node:assert/strict';
import { generateKeyPairSync } from 'node:crypto';
import { test } from 'node:test';
import { createApplication } from '../src/application.js';
import { createAuth } from '../src/auth/index.js';

test('OAuth, guild GraphQL, and CSRF-protected logout work through the same-origin HTTP routes', async () => {
  const keys = generateKeyPairSync('ed25519');
  const upstream: typeof fetch = async input => {
    const path = new URL(String(input)).pathname;
    if (path.endsWith('/oauth2/token')) return Response.json({ access_token: 'access', refresh_token: 'refresh', expires_in: 3600 });
    if (path.endsWith('/users/@me/guilds')) return Response.json([
      { id: 'guild-one', name: 'Installed', owner: true, permissions: '0', icon: null },
      { id: 'guild-two', name: 'Invite', owner: false, permissions: '32', icon: null },
      { id: 'guild-three', name: 'No permission', owner: false, permissions: '0', icon: null },
    ]);
    if (path.endsWith('/users/@me')) return Response.json({ id: 'user-one', username: 'manager' });
    if (path.endsWith('/guilds/guild-one')) return Response.json({ id: 'guild-one' });
    return Response.json({ code: 50001 }, { status: 403 });
  };
  const app = createApplication({
    publicKey: keys.publicKey.export({ type: 'spki', format: 'der' }).subarray(-32).toString('hex'),
    databaseUrl: process.env.TEST_DATABASE_URL ?? 'postgres://localhost/test',
    auth: createAuth({ clientId: 'app', clientSecret: 'secret', botToken: 'bot', sessionSecret: 'long-test-session-secret-for-HTTP', secureCookies: false, publicOrigin: 'http://dashboard.test', fetch: upstream }),
  });
  await new Promise<void>((resolve, reject) => { app.server.once('error', reject); app.server.listen(0, '127.0.0.1', resolve); });
  const address = app.server.address();
  if (!address || typeof address === 'string') throw new Error('TCP address required');
  const origin = `http://127.0.0.1:${address.port}`;
  try {
    const login = await fetch(`${origin}/api/auth/login`, { redirect: 'manual' });
    assert.equal(login.status, 302);
    const authorize = new URL(login.headers.get('location')!);
    assert.equal(authorize.searchParams.get('redirect_uri'), 'http://dashboard.test/api/auth/callback');
    const stateCookie = login.headers.getSetCookie().map(value => value.split(';')[0]).join('; ');
    const callback = await fetch(`${origin}/api/auth/callback?code=code&state=${authorize.searchParams.get('state')}`, { redirect: 'manual', headers: { cookie: stateCookie } });
    assert.equal(callback.status, 302);
    const cookie = callback.headers.getSetCookie().map(value => value.split(';')[0]).join('; ');
    const query = await fetch(`${origin}/api/graphql`, { method: 'POST', headers: { cookie, 'content-type': 'application/json' }, body: '{"query":"{ authUser { id } authCsrfToken managedGuilds { id installed inviteUrl } }"}' });
    const result = await query.json();
    assert.equal(result.errors, undefined);
    assert.equal(result.data.authUser.id, 'user-one');
    assert.deepEqual(result.data.managedGuilds.map((guild: { id: string; installed: boolean }) => [guild.id, guild.installed]), [['guild-one', true], ['guild-two', false]]);
    assert.match(result.data.managedGuilds[1].inviteUrl, /guild_id=guild-two/);
    const denied = await fetch(`${origin}/api/auth/logout`, { method: 'POST', headers: { cookie } });
    assert.equal(denied.status, 403);
    const logout = await fetch(`${origin}/api/graphql`, { method: 'POST', headers: { cookie, 'content-type': 'application/json', 'x-csrf-token': result.data.authCsrfToken }, body: '{"query":"mutation { authLogout }"}' });
    assert.deepEqual(await logout.json(), { data: { authLogout: true } });
    const session = await fetch(`${origin}/api/auth/session`, { headers: { cookie } });
    assert.equal((await session.json()).user, null);
  } finally { await app.close(); }
});
