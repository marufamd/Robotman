import assert from 'node:assert/strict';
import { generateKeyPairSync, randomUUID } from 'node:crypto';
import { after, before, test } from 'node:test';
import { createApplication } from '../src/application.js';
import { createAuth } from '../src/auth/index.js';

const keys = generateKeyPairSync('ed25519');
const guildId = `content-test-${randomUUID()}`;
let canManage = true;
let application: ReturnType<typeof createApplication>;
let origin: string;
let cookie = '';
let csrfToken = '';

before(async () => {
  const upstream: typeof fetch = async (input, init) => {
    const url = new URL(String(input));
    if (url.pathname.endsWith('/oauth2/token')) return Response.json({ access_token: 'access', refresh_token: 'refresh', expires_in: 3600 });
    if (url.pathname.endsWith('/users/@me')) return Response.json({ id: 'content-manager', username: 'manager' });
    if (url.pathname.endsWith('/users/@me/guilds')) return Response.json([{ id: guildId, name: 'Content Guild', icon: null, owner: false, permissions: canManage ? '32' : '0' }]);
    if (url.pathname.endsWith(`/guilds/${guildId}`) && init?.headers) return Response.json({ id: guildId });
    return Response.json({}, { status: 404 });
  };
  application = createApplication({
    publicKey: keys.publicKey.export({ type: 'spki', format: 'der' }).subarray(-32).toString('hex'),
    databaseUrl: process.env.TEST_DATABASE_URL ?? 'postgres://localhost/robotman_test',
    auth: createAuth({ clientId: 'app', clientSecret: 'secret', botToken: 'bot', sessionSecret: 'test-secret-that-is-long-enough-for-session-signing', secureCookies: false, publicOrigin: 'http://dashboard.test', fetch: upstream }),
  });
  await application.initialize();
  await new Promise<void>((resolve, reject) => {
    application.server.once('error', reject);
    application.server.listen(0, '127.0.0.1', resolve);
  });
  const address = application.server.address();
  if (!address || typeof address === 'string') throw new Error('Expected a TCP listener');
  origin = `http://127.0.0.1:${address.port}`;

  const login = await fetch(`${origin}/api/auth/login`, { redirect: 'manual' });
  const stateCookie = login.headers.getSetCookie().map(value => value.split(';')[0]).join('; ');
  const state = new URL(login.headers.get('location')!).searchParams.get('state');
  const callback = await fetch(`${origin}/api/auth/callback?code=code&state=${state}`, { redirect: 'manual', headers: { cookie: stateCookie } });
  cookie = callback.headers.getSetCookie().map(value => value.split(';')[0]).join('; ');
  const session = await graphql('{ authCsrfToken }');
  csrfToken = session.data.authCsrfToken;
});

after(async () => { if (application) await application.close(); });

async function graphql(query: string, variables?: Record<string, unknown>, includeCsrf = true) {
  const response = await fetch(`${origin}/api/graphql`, {
    method: 'POST',
    headers: { cookie, 'content-type': 'application/json', ...(includeCsrf && csrfToken ? { 'x-csrf-token': csrfToken } : {}) },
    body: JSON.stringify({ query, variables }),
  });
  assert.equal(response.status, 200);
  return response.json() as Promise<any>;
}

test('a Managed Guild manager creates and retrieves a Response with aliases, embeds, and placeholders', async () => {
  const embeds = [{ title: 'Welcome', description: 'Hello {user} in {channel}', color: 16753920 }];
  const created = await graphql(
    'mutation Create($guild: ID!, $input: ResponseInput!) { createResponse(guildId: $guild, input: $input) { id guildId trigger aliases content embedsJson } }',
    { guild: guildId, input: { trigger: 'welcome', aliases: ['hi'], content: 'Welcome {user} to {channel}', embedsJson: JSON.stringify(embeds) } },
  );
  assert.equal(created.errors, undefined);
  assert.deepEqual({ ...created.data.createResponse, embedsJson: undefined }, {
    id: created.data.createResponse.id,
    guildId,
    trigger: 'welcome',
    aliases: ['hi'],
    content: 'Welcome {user} to {channel}',
    embedsJson: undefined,
  });
  assert.deepEqual(JSON.parse(created.data.createResponse.embedsJson), embeds);

  const createdHistory = await graphql('query History($guild: ID!) { responseChangeHistory(guildId: $guild) { action actorId guildId responseId occurredAt trigger } }', { guild: guildId });
  assert.equal(createdHistory.errors, undefined);
  assert.equal(createdHistory.data.responseChangeHistory.length, 1);
  assert.deepEqual({ ...createdHistory.data.responseChangeHistory[0], occurredAt: undefined }, {
    action: 'CREATED', actorId: 'content-manager', guildId, responseId: created.data.createResponse.id, occurredAt: undefined, trigger: 'welcome',
  });
  assert.ok(Number.isFinite(Date.parse(createdHistory.data.responseChangeHistory[0].occurredAt)));

  const listed = await graphql('query Responses($guild: ID!) { responses(guildId: $guild) { id trigger aliases content embedsJson } }', { guild: guildId });
  assert.equal(listed.errors, undefined);
  assert.deepEqual(listed.data.responses.map((response: any) => ({ ...response, embedsJson: undefined })), [{ id: created.data.createResponse.id, trigger: 'welcome', aliases: ['hi'], content: 'Welcome {user} to {channel}', embedsJson: undefined }]);
  assert.deepEqual(JSON.parse(listed.data.responses[0].embedsJson), embeds);

  const duplicate = await graphql(
    'mutation Create($guild: ID!, $input: ResponseInput!) { createResponse(guildId: $guild, input: $input) { id } }',
    { guild: guildId, input: { trigger: 'HI', aliases: ['welcome'], content: 'Ambiguous', embedsJson: '[]' } },
  );
  assert.ok(duplicate.errors?.some((error: { message: string }) => /trigger or alias is already in use/i.test(error.message)));

  const otherGuild = await graphql('query Responses($guild: ID!) { responses(guildId: $guild) { id } }', { guild: 'not-managed' });
  assert.ok(otherGuild.errors?.some((error: { message: string }) => /Managed Guild access required/.test(error.message)));
  const deniedHistory = await graphql('query History($guild: ID!) { responseChangeHistory(guildId: $guild) { responseId } }', { guild: 'not-managed' });
  assert.ok(deniedHistory.errors?.some((error: { message: string }) => /Managed Guild access required/.test(error.message)));

  const updated = await graphql(
    'mutation Update($guild: ID!, $id: ID!, $input: ResponseInput!) { updateResponse(guildId: $guild, id: $id, input: $input) { trigger aliases content } }',
    { guild: guildId, id: created.data.createResponse.id, input: { trigger: 'hello', aliases: ['greetings'], content: 'Hi {user}!', embedsJson: '[]' } },
  );
  assert.equal(updated.errors, undefined);
  assert.deepEqual(updated.data.updateResponse, { trigger: 'hello', aliases: ['greetings'], content: 'Hi {user}!' });
  const updatedHistory = await graphql('query History($guild: ID!) { responseChangeHistory(guildId: $guild) { action actorId responseId trigger } }', { guild: guildId });
  assert.deepEqual(updatedHistory.data.responseChangeHistory.map((row: any) => [row.action, row.actorId, row.responseId, row.trigger]), [
    ['UPDATED', 'content-manager', created.data.createResponse.id, 'hello'],
    ['CREATED', 'content-manager', created.data.createResponse.id, 'welcome'],
  ]);

  canManage = false;
  const permissionRevoked = await graphql(
    'mutation Update($guild: ID!, $id: ID!, $input: ResponseInput!) { updateResponse(guildId: $guild, id: $id, input: $input) { id } }',
    { guild: guildId, id: created.data.createResponse.id, input: { trigger: 'denied', aliases: [], content: 'No', embedsJson: '[]' } },
  );
  assert.ok(permissionRevoked.errors?.some((error: { message: string }) => /Managed Guild access required/.test(error.message)));
  canManage = true;

  const missingCsrf = await graphql('mutation Delete($guild: ID!, $id: ID!) { deleteResponse(guildId: $guild, id: $id) }', { guild: guildId, id: created.data.createResponse.id }, false);
  assert.ok(missingCsrf.errors?.some((error: { message: string }) => /CSRF validation failed/.test(error.message)));
  const deleted = await graphql('mutation Delete($guild: ID!, $id: ID!) { deleteResponse(guildId: $guild, id: $id) }', { guild: guildId, id: created.data.createResponse.id });
  assert.equal(deleted.data.deleteResponse, true);
  const deletedHistory = await graphql('query History($guild: ID!) { responseChangeHistory(guildId: $guild) { action responseId trigger } }', { guild: guildId });
  assert.deepEqual(deletedHistory.data.responseChangeHistory.map((row: any) => [row.action, row.responseId, row.trigger]), [
    ['DELETED', created.data.createResponse.id, 'hello'],
    ['UPDATED', created.data.createResponse.id, 'hello'],
    ['CREATED', created.data.createResponse.id, 'welcome'],
  ]);
  const empty = await graphql('query Responses($guild: ID!) { responses(guildId: $guild) { id } }', { guild: guildId });
  assert.deepEqual(empty.data.responses, []);
});

test('a Managed Guild manager creates and retrieves Recommendation Entries in all four categories', async () => {
  const categories = ['CHARACTER', 'WRITER', 'MODERATOR', 'BOOSTER'];
  const created = await Promise.all(categories.map(category => graphql(
    'mutation Create($guild: ID!, $input: RecommendationInput!) { createRecommendation(guildId: $guild, input: $input) { id guildId category name description url } }',
    { guild: guildId, input: { category, name: 'Shared name', description: `Pick ${category.toLowerCase()}`, url: 'https://example.com/recommendation' } },
  )));
  for (const result of created) assert.equal(result.errors, undefined);
  assert.deepEqual(created.map(result => result.data.createRecommendation.category), categories);

  const listed = await graphql('query Recommendations($guild: ID!) { recommendationEntries(guildId: $guild) { id category name description url } }', { guild: guildId });
  assert.equal(listed.errors, undefined);
  assert.deepEqual(listed.data.recommendationEntries.map((entry: any) => entry.category).sort(), [...categories].sort());
  assert.ok(listed.data.recommendationEntries.every((entry: any) => entry.name === 'Shared name'));

});

test('a Managed Guild manager updates a Recommendation Entry and can read the changed values', async () => {
  const name = `Writer ${randomUUID()}`;
  const created = await graphql(
    'mutation Create($guild: ID!, $input: RecommendationInput!) { createRecommendation(guildId: $guild, input: $input) { id } }',
    { guild: guildId, input: { category: 'WRITER', name, description: 'Before edit', url: '' } },
  );
  const updated = await graphql(
    'mutation Update($guild: ID!, $id: ID!, $input: RecommendationInput!) { updateRecommendation(guildId: $guild, id: $id, input: $input) { id category name description url } }',
    { guild: guildId, id: created.data.createRecommendation.id, input: { category: 'WRITER', name: `${name} revised`, description: 'After edit', url: 'https://example.com' } },
  );
  assert.equal(updated.errors, undefined);
  assert.deepEqual(updated.data.updateRecommendation, { id: created.data.createRecommendation.id, category: 'WRITER', name: `${name} revised`, description: 'After edit', url: 'https://example.com' });
});

test('a Managed Guild manager deletes a Recommendation Entry from that guild', async () => {
  const name = `Delete ${randomUUID()}`;
  const created = await graphql(
    'mutation Create($guild: ID!, $input: RecommendationInput!) { createRecommendation(guildId: $guild, input: $input) { id } }',
    { guild: guildId, input: { category: 'BOOSTER', name, description: '', url: '' } },
  );
  const id = created.data.createRecommendation.id;
  const deleted = await graphql('mutation Delete($guild: ID!, $id: ID!) { deleteRecommendation(guildId: $guild, id: $id) }', { guild: guildId, id });
  assert.equal(deleted.errors, undefined);
  assert.equal(deleted.data.deleteRecommendation, true);
  const listed = await graphql('query Recommendations($guild: ID!) { recommendationEntries(guildId: $guild) { id } }', { guild: guildId });
  assert.equal(listed.data.recommendationEntries.some((entry: { id: string }) => entry.id === id), false);
});
