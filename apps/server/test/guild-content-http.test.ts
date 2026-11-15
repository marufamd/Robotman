import { requestModule } from '../src/commands/requests/index.js';
import assert from 'node:assert/strict';
import { generateKeyPairSync, randomUUID, sign } from 'node:crypto';
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
let discordCalls = 0;
let discordUnavailable = false;
const listGuilds = ['history', 'history-paged', 'taste', 'taste-empty', 'taste-long', 'paged', 'paged-long', 'settings', 'legacy'].map(name => `${name}-${guildId}`);
const webhookPosts: Array<{ token: string; body: any }> = [];

before(async () => {
  const upstream: typeof fetch = async (input, init) => {
    discordCalls += 1;
    if (discordUnavailable) return Response.json({ retry_after: 30 }, { status: 429 });
    const url = new URL(String(input));
    if (url.pathname.endsWith('/oauth2/token')) return Response.json({ access_token: 'access', refresh_token: 'refresh', expires_in: 3600 });
    if (url.pathname.endsWith('/users/@me')) return Response.json({ id: 'content-manager', username: 'manager' });
    if (url.pathname.endsWith('/users/@me/guilds')) return Response.json([
      { id: guildId, name: 'Content Guild', icon: null, owner: false, permissions: canManage ? '32' : '0' },
      { id: `other-${guildId}`, name: 'Other Guild', icon: null, owner: false, permissions: canManage ? '32' : '0' },
      ...listGuilds.map(id => ({ id, name: id, icon: null, owner: false, permissions: canManage ? '32' : '0' })),
    ]);
    if (url.pathname.endsWith(`/guilds/${guildId}`) && init?.headers) return Response.json({ id: guildId });
    return Response.json({}, { status: 404 });
  };
  application = createApplication({
    publicKey: keys.publicKey.export({ type: 'spki', format: 'der' }).subarray(-32).toString('hex'),
    modules: [requestModule],
    fetch: async (input, init) => {
      const url = new URL(String(input));
      if (url.hostname === 'discord.com' && url.pathname.startsWith('/api/v10/webhooks/')) { webhookPosts.push({ token: url.pathname.split('/')[5]!, body: JSON.parse(String(init?.body)) }); return Response.json({}); }
      return Response.json({}, { status: 404 });
    },
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

  await signIn();
});

async function signIn() {
  const login = await fetch(`${origin}/api/auth/login`, { redirect: 'manual' });
  const stateCookie = login.headers.getSetCookie().map(value => value.split(';')[0]).join('; ');
  const state = new URL(login.headers.get('location')!).searchParams.get('state');
  const callback = await fetch(`${origin}/api/auth/callback?code=code&state=${state}`, { redirect: 'manual', headers: { cookie: stateCookie } });
  cookie = callback.headers.getSetCookie().map(value => value.split(';')[0]).join('; ');
  const session = await graphql('{ authCsrfToken managedGuilds { id } }');
  assert.equal(session.errors, undefined);
  csrfToken = session.data.authCsrfToken;
}

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
  await signIn();
  const permissionRevoked = await graphql(
    'mutation Update($guild: ID!, $id: ID!, $input: ResponseInput!) { updateResponse(guildId: $guild, id: $id, input: $input) { id } }',
    { guild: guildId, id: created.data.createResponse.id, input: { trigger: 'denied', aliases: [], content: 'No', embedsJson: '[]' } },
  );
  assert.ok(permissionRevoked.errors?.some((error: { message: string }) => /Managed Guild access required/.test(error.message)));
  canManage = true;
  await signIn();

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

test('saving and reading a Response use the sign-in snapshot without requesting Discord again', async () => {
  const initialCalls = discordCalls;
  discordUnavailable = true;
  try {
    const created = await graphql(
      'mutation Create($guild: ID!, $input: ResponseInput!) { createResponse(guildId: $guild, input: $input) { id trigger } }',
      { guild: guildId, input: { trigger: `cached-${randomUUID()}`, aliases: [], content: 'Saved while Discord is unavailable', embedsJson: '[]' } },
    );
    assert.equal(created.errors, undefined);
    const id = created.data.createResponse.id;
    const listed = await graphql('query Responses($guild: ID!) { responses(guildId: $guild) { id content } }', { guild: guildId });
    assert.equal(listed.errors, undefined);
    assert.ok(listed.data.responses.some((row: { id: string }) => row.id === id));
    const deleted = await graphql('mutation Delete($guild: ID!, $id: ID!) { deleteResponse(guildId: $guild, id: $id) }', { guild: guildId, id });
    assert.equal(deleted.errors, undefined);
    assert.equal(deleted.data.deleteResponse, true);
    assert.equal(discordCalls, initialCalls, 'CRUD must not make any Discord requests once the sign-in snapshot exists');
  } finally { discordUnavailable = false; }
});

test('a Managed Guild manager creates and retrieves Recommendation Entries in all four categories', async () => {
  const categories = ['CHARACTER', 'WRITER', 'MODERATOR', 'BOOSTER'];
  const created = await Promise.all(categories.map(category => graphql(
    'mutation Create($guild: ID!, $input: RecommendationInput!) { createRecommendation(guildId: $guild, input: $input) { id guildId category name description url } }',
    { guild: guildId, input: { category, name: category === 'BOOSTER' ? 'Booster person' : 'Shared name', description: `Pick ${category.toLowerCase()}`, url: 'https://example.com/recommendation' } },
  )));
  for (const result of created) assert.equal(result.errors, undefined);
  assert.deepEqual(created.map(result => result.data.createRecommendation.category), categories);

  const listed = await graphql('query Recommendations($guild: ID!) { recommendationEntries(guildId: $guild) { id category name description url } }', { guild: guildId });
  assert.equal(listed.errors, undefined);
  assert.deepEqual(listed.data.recommendationEntries.map((entry: any) => entry.category).sort(), [...categories].sort());
  assert.ok(listed.data.recommendationEntries.every((entry: any) => entry.name === (entry.category === 'BOOSTER' ? 'Booster person' : 'Shared name')));

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

test('a Managed Guild manager can configure and retrieve moderator settings independently per Guild', async () => {
  const defaults = await graphql('query Settings($guild: ID!) { moderatorSettings(guildId: $guild) { guildId releaseListChannelId releaseListDayOfWeek releaseListHour releaseListMinute releaseListTimeZone tvmazeShowIds } }', { guild: guildId });
  assert.equal(defaults.errors, undefined);
  assert.deepEqual(defaults.data.moderatorSettings, {
    guildId,
    releaseListChannelId: null,
    releaseListDayOfWeek: 0,
    releaseListHour: 0,
    releaseListMinute: 0,
    releaseListTimeZone: 'UTC',
    tvmazeShowIds: [13, 689, 706, 1850, 1851, 1859, 20683, 27557, 33452, 36745, 36774, 37776, 37809, 39764, 40884, 42668, 42827, 44751, 44776, 44777, 45844, 47261, 50603, 51042, 52243, 55414, 55415, 57400, 59492, 60920, 61066, 66738, 73090],
  });

  const updated = await graphql(
    'mutation Settings($guild: ID!, $input: ModeratorSettingsInput!) { updateModeratorSettings(guildId: $guild, input: $input) { guildId releaseListChannelId releaseListDayOfWeek releaseListHour releaseListMinute releaseListTimeZone tvmazeShowIds } }',
    { guild: guildId, input: { releaseListChannelId: '123456789012345678', releaseListDayOfWeek: 4, releaseListHour: 19, releaseListMinute: 30, releaseListTimeZone: 'America/Toronto', tvmazeShowIds: [13, 706] } },
  );
  assert.equal(updated.errors, undefined);
  assert.deepEqual(updated.data.updateModeratorSettings, {
    guildId, releaseListChannelId: '123456789012345678', releaseListDayOfWeek: 4, releaseListHour: 19,
    releaseListMinute: 30, releaseListTimeZone: 'America/Toronto', tvmazeShowIds: [13, 706],
  });
  const persisted = await graphql('query Settings($guild: ID!) { moderatorSettings(guildId: $guild) { releaseListChannelId releaseListDayOfWeek releaseListHour releaseListMinute releaseListTimeZone tvmazeShowIds } }', { guild: guildId });
  assert.deepEqual(persisted.data.moderatorSettings, {
    releaseListChannelId: '123456789012345678', releaseListDayOfWeek: 4, releaseListHour: 19,
    releaseListMinute: 30, releaseListTimeZone: 'America/Toronto', tvmazeShowIds: [13, 706],
  });

  const otherGuild = await graphql('query Settings($guild: ID!) { moderatorSettings(guildId: $guild) { releaseListChannelId releaseListDayOfWeek releaseListTimeZone tvmazeShowIds } }', { guild: `other-${guildId}` });
  assert.equal(otherGuild.errors, undefined);
  assert.equal(otherGuild.data.moderatorSettings.releaseListChannelId, null);
  assert.equal(otherGuild.data.moderatorSettings.releaseListDayOfWeek, 0);
  assert.equal(otherGuild.data.moderatorSettings.releaseListTimeZone, 'UTC');
  assert.equal(otherGuild.data.moderatorSettings.tvmazeShowIds.length, 33);
});

test('moderator settings require Managed Guild access and CSRF protection for updates', async () => {
  const deniedRead = await graphql('query Settings($guild: ID!) { moderatorSettings(guildId: $guild) { guildId } }', { guild: 'not-managed' });
  assert.ok(deniedRead.errors?.some((error: { message: string }) => /Managed Guild access required/.test(error.message)));

  const input = { releaseListChannelId: '123456789012345678', releaseListDayOfWeek: 0, releaseListHour: 0, releaseListMinute: 0, releaseListTimeZone: 'UTC', tvmazeShowIds: [13] };
  const missingCsrf = await graphql('mutation Settings($guild: ID!, $input: ModeratorSettingsInput!) { updateModeratorSettings(guildId: $guild, input: $input) { guildId } }', { guild: `csrf-${guildId}`, input }, false);
  assert.ok(missingCsrf.errors?.some((error: { message: string }) => /CSRF validation failed/.test(error.message)));

  const invalidChannel = await graphql(
    'mutation Settings($guild: ID!, $input: ModeratorSettingsInput!) { updateModeratorSettings(guildId: $guild, input: $input) { guildId } }',
    { guild: guildId, input: { ...input, releaseListChannelId: 'not-a-discord-channel' } },
  );
  assert.ok(invalidChannel.errors?.some((error: { message: string }) => /valid Discord channel/.test(error.message)));

  canManage = false;
  const revoked = await graphql('mutation Settings($guild: ID!, $input: ModeratorSettingsInput!) { updateModeratorSettings(guildId: $guild, input: $input) { guildId } }', { guild: `revoked-${guildId}`, input });
  canManage = true;
  assert.ok(revoked.errors?.some((error: { message: string }) => /Managed Guild access required/.test(error.message)));
});

test('a manager saves a rich Recommendation Entry independently of Responses', async () => {
  const input = { category: 'CHARACTER', name: 'The Bat Family', aliases: ['batfam'], content: 'Start here, {username}.', embedsJson: JSON.stringify([{ title: 'Reading order', description: 'Book one', thumbnail: { url: 'https://example.com/cover.png' }, custom_property: 'preserve' }, { title: 'Next', description: 'Book two' }]), introductionMode: 'NONE', introduction: '', curatorName: '', curatorUserId: null };
  const created = await graphql('mutation($guild: ID!, $input: RecommendationInput!) { createRecommendation(guildId: $guild, input: $input) { id name aliases content embedsJson introductionMode } }', { guild: guildId, input });
  assert.equal(created.errors, undefined);
  assert.equal(created.data.createRecommendation.name, 'The Bat Family');
  assert.deepEqual(created.data.createRecommendation.aliases, ['batfam']);
  assert.deepEqual(JSON.parse(created.data.createRecommendation.embedsJson), JSON.parse(input.embedsJson));
  const read = await graphql('query($guild: ID!) { recommendationEntries(guildId: $guild) { id content embedsJson } }', { guild: guildId });
  const saved = read.data.recommendationEntries.find((entry: any) => entry.id === created.data.createRecommendation.id);
  assert.equal(saved.content, 'Start here, {username}.');
  assert.deepEqual(JSON.parse(saved.embedsJson), JSON.parse(input.embedsJson));
});

test('personal recommendation lists inherit configurable introductions and reject an overflowing default change', async () => {
  const defaults = await graphql('query($guild: ID!) { recommendationSettings(guildId: $guild) { ' + settingsFields + ' } }', { guild: guildId });
  assert.equal(defaults.errors, undefined);
  const settings = defaults.data.recommendationSettings;
  assert.match(settings.categories.find((c: any) => c.category === 'MODERATOR').introduction, /Welcome to \*\*Taste Test\*\*/);
  const input = { category: 'MODERATOR', name: 'Alex Marvel', aliases: ['alex-books'], content: 'Books chosen by {curator_name}.', embedsJson: '[]', curatorName: 'Alex', curatorUserId: '123456789012345678', introductionMode: 'INHERIT', introduction: '' };
  const created = await graphql('mutation($guild: ID!, $input: RecommendationInput!) { createRecommendation(guildId: $guild, input: $input) { id curatorName curatorUserId effectiveIntroduction } }', { guild: guildId, input });
  assert.equal(created.errors, undefined);
  assert.match(created.data.createRecommendation.effectiveIntroduction, /Taste Test/);
  const changed = { ...settings, categories: settings.categories.map((c: any) => ({ ...c, introduction: c.category === 'MODERATOR' ? 'Picks by {curator_name}' : c.introduction })) };
  const update = await graphql('mutation($guild: ID!, $input: RecommendationSettingsInput!) { updateRecommendationSettings(guildId: $guild, input: $input) { categories { category } } }', { guild: guildId, input: changed });
  assert.equal(update.errors, undefined);
  const listed = await graphql('query($guild: ID!) { recommendationEntries(guildId: $guild) { id effectiveIntroduction curatorUserId } }', { guild: guildId });
  assert.equal(listed.data.recommendationEntries.find((e: any) => e.id === created.data.createRecommendation.id).effectiveIntroduction, 'Picks by {curator_name}');
  changed.categories = changed.categories.map((c: any) => ({ ...c, introduction: c.category === 'MODERATOR' ? 'x'.repeat(2000) : c.introduction }));
  const overflow = await graphql('mutation($guild: ID!, $input: RecommendationSettingsInput!) { updateRecommendationSettings(guildId: $guild, input: $input) { categories { category } } }', { guild: guildId, input: changed });
  assert.match(overflow.errors?.[0].message, /Alex.*2,000/);
});

test('a signed recommendation lookup finds aliases and renders the selected rich reply with a plain curator name', async () => {
  const input = { category: 'BOOSTER', name: 'Sam personal books', aliases: ['sam-books'], content: 'For {user} ({username}) in {channel}: {curator_name}', embedsJson: JSON.stringify([{ title: '{curator} picks', description: 'Book one' }, { title: 'More', description: 'Book two' }]), curatorName: 'Sam', curatorUserId: '222222222222222222', introductionMode: 'CUSTOM', introduction: 'A list from {curator}' };
  const created = await graphql('mutation($guild: ID!, $input: RecommendationInput!) { createRecommendation(guildId: $guild, input: $input) { id } }', { guild: guildId, input });
  assert.equal(created.errors, undefined);
  async function send(type: number, value: string, username = 'Reader') {
    const body = JSON.stringify({ id: '123', application_id: '456', token: 'test-token', guild_id: guildId, channel_id: '789', member: { user: { id: '987', username } }, type, data: { type: 1, name: 'recs', options: [{ name: 'lookup', type: 1, options: [{ name: 'name', type: 3, value, ...(type === 4 ? { focused: true } : {}) }] }] } });
    const timestamp = String(Math.floor(Date.now() / 1000));
    const result = await fetch(`${origin}/interactions`, { method: 'POST', body, headers: { 'content-type': 'application/json', 'x-signature-timestamp': timestamp, 'x-signature-ed25519': sign(null, Buffer.from(timestamp + body), keys.privateKey).toString('hex') } });
    return result.json();
  }
  const completion = await send(4, 'sam-books');
  assert.deepEqual(completion.data.choices, [{ name: 'Sam · Booster', value: 'Sam · Booster' }], 'the value is what Discord echoes in chat, so it must be readable');
  const decoy = await graphql('mutation($guild: ID!, $input: RecommendationInput!) { createRecommendation(guildId: $guild, input: $input) { id } }', { guild: guildId, input: { category: 'WRITER', name: 'Another collection', aliases: [created.data.createRecommendation.id], content: 'Must not replace the selected collection', embedsJson: '[]', introductionMode: 'NONE' } });
  assert.equal(decoy.errors, undefined);
  const reply = await send(2, completion.data.choices[0].value);
  assert.equal((await send(2, created.data.createRecommendation.id)).data.content, reply.data.content, 'IDs remain accepted');
  assert.equal(reply.data.content, 'A list from Sam\n\nFor <@987> (Reader) in <#789>: Sam');
  assert.deepEqual(reply.data.embeds, [{ title: 'Sam picks', description: 'Book one' }, { title: 'More', description: 'Book two' }]);
  assert.deepEqual(reply.data.allowed_mentions, { parse: [] });
  const expanded = await graphql('mutation($guild: ID!, $input: RecommendationInput!) { createRecommendation(guildId: $guild, input: $input) { id } }', { guild: guildId, input: { category: 'WRITER', name: 'Expansion limit', aliases: [], content: '{username}'.repeat(100), embedsJson: '[]', introductionMode: 'NONE' } });
  assert.equal(expanded.errors, undefined);
  const tooLong = await send(2, expanded.data.createRecommendation.id, 'R'.repeat(32));
  assert.match(tooLong.data.content, /exceeds Discord.*limits/);
  assert.equal(tooLong.data.embeds, undefined);
  const longName = 'Long collection ' + 'x'.repeat(84);
  for (const category of ['CHARACTER', 'WRITER']) {
    assert.equal((await graphql('mutation($guild: ID!, $input: RecommendationInput!) { createRecommendation(guildId: $guild, input: $input) { id } }', { guild: guildId, input: { category, name: longName, content: 'A complete collection', embedsJson: '[]', introductionMode: 'NONE' } })).errors, undefined);
  }
  const longChoices = (await send(4, 'Long collection')).data.choices;
  assert.ok(longChoices.some((choice: any) => choice.name.endsWith(' · Character')));
  assert.ok(longChoices.some((choice: any) => choice.name.endsWith(' · Writer')));
  assert.ok(longChoices.every((choice: any) => choice.name.length <= 100));
  assert.ok(longChoices.every((choice: any) => choice.value.length <= 100));
  for (const choice of longChoices) assert.equal((await send(2, choice.value)).data.content, 'A complete collection', 'every offered value can be selected');
});

async function discord(guild: string, type: number, data: Record<string, unknown>, token = 'test-token') {
  const body = JSON.stringify({ id: randomUUID(), application_id: '456', token, guild_id: guild, channel_id: '789', member: { user: { id: '987' } }, type, data });
  const timestamp = String(Math.floor(Date.now() / 1000));
  const result = await fetch(`${origin}/interactions`, { method: 'POST', body, headers: { 'content-type': 'application/json', 'x-signature-timestamp': timestamp, 'x-signature-ed25519': sign(null, Buffer.from(timestamp + body), keys.privateKey).toString('hex') } });
  return result.json();
}
const recs = (guild: string, subcommand: string, token?: string) => discord(guild, 2, { type: 1, name: 'recs', options: [{ name: subcommand, type: 1 }] }, token);
const followupsFor = async (token: string, count: number) => {
  for (let attempt = 0; attempt < 100 && webhookPosts.filter(post => post.token === token).length < count; attempt++) await new Promise(resolve => setTimeout(resolve, 20));
  return webhookPosts.filter(post => post.token === token).map(post => post.body);
};
const addEntry = async (guild: string, category: string, name: string) => {
  const created = await graphql('mutation($guild: ID!, $input: RecommendationInput!) { createRecommendation(guildId: $guild, input: $input) { id } }', { guild, input: { category, name, curatorName: ['MODERATOR', 'BOOSTER'].includes(category) ? name : '', content: 'Private reply body', embedsJson: '[]', introductionMode: 'NONE' } });
  assert.equal(created.errors, undefined, JSON.stringify(created.errors));
};
const settingsFields = 'lists { tasteTest { title introduction color moderatorHeading boosterHeading } characters { title introduction color } writers { title introduction color } } categories { category introduction }';

const historyFields = 'page pageCount pageSize total items { action subject trigger actorId actorName occurredAt }';
const historyQuery = (args: string) => `query($guild: ID!) { changeHistory(guildId: $guild${args}) { ${historyFields} } }`;

test('Change History records Responses and recommendations, oldest or newest first', async () => {
  const guild = `history-${guildId}`;
  const mutate = async (query: string, variables: Record<string, unknown>) => { const result = await graphql(query, { guild, ...variables }); assert.equal(result.errors, undefined, JSON.stringify(result.errors)); return result.data; };
  const response = (await mutate('mutation($guild: ID!, $input: ResponseInput!) { createResponse(guildId: $guild, input: $input) { id } }', { input: { trigger: 'Alpha', aliases: [], content: 'a', embedsJson: '[]' } })).createResponse;
  const entryInput = { category: 'CHARACTER', name: 'Beta', aliases: [], content: 'b', embedsJson: '[]', introductionMode: 'NONE' };
  const entry = (await mutate('mutation($guild: ID!, $input: RecommendationInput!) { createRecommendation(guildId: $guild, input: $input) { id } }', { input: entryInput })).createRecommendation;
  await mutate('mutation($guild: ID!, $id: ID!, $input: RecommendationInput!) { updateRecommendation(guildId: $guild, id: $id, input: $input) { id } }', { id: entry.id, input: { ...entryInput, content: 'b2' } });
  await mutate('mutation($guild: ID!, $id: ID!, $input: ResponseInput!) { updateResponse(guildId: $guild, id: $id, input: $input) { id } }', { id: response.id, input: { trigger: 'Alpha', aliases: [], content: 'a2', embedsJson: '[]' } });
  await mutate('mutation($guild: ID!, $id: ID!) { deleteRecommendation(guildId: $guild, id: $id) }', { id: entry.id });

  const rows = (items: any[]) => items.map(item => [item.action, item.subject, item.trigger, item.actorName]);
  const oldest = (await mutate(historyQuery(', order: OLDEST'), {})).changeHistory;
  assert.deepEqual(rows(oldest.items), [['CREATED', 'RESPONSE', 'Alpha', 'manager'], ['CREATED', 'CHARACTER', 'Beta', 'manager'], ['UPDATED', 'CHARACTER', 'Beta', 'manager'], ['UPDATED', 'RESPONSE', 'Alpha', 'manager'], ['DELETED', 'CHARACTER', 'Beta', 'manager']]);
  assert.deepEqual([oldest.total, oldest.page, oldest.pageCount], [5, 1, 1]);
  const newest = (await mutate(historyQuery(''), {})).changeHistory;
  assert.deepEqual(rows(newest.items), rows(oldest.items).reverse(), 'newest first is the default');
  assert.ok(newest.items.every((item: any) => item.actorId === 'content-manager' && Number.isFinite(Date.parse(item.occurredAt))));
});

test('Change History pages server-side and keeps pages within range', async () => {
  const guild = `history-paged-${guildId}`;
  for (let index = 0; index < 30; index++) await addEntry(guild, 'WRITER', `Paged ${String(index).padStart(2, '0')}`);
  const read = async (args: string) => (await graphql(historyQuery(args), { guild })).data.changeHistory;
  const first = await read('');
  assert.deepEqual([first.total, first.pageCount, first.page, first.pageSize, first.items.length], [30, 2, 1, 25, 25]);
  assert.equal(first.items[0].trigger, 'Paged 29');
  const second = await read(', page: 2');
  assert.deepEqual([second.page, second.items.length, second.items.at(-1).trigger], [2, 5, 'Paged 00']);
  assert.equal((await read(', page: 99')).page, 2, 'out-of-range pages clamp to the last page');
  assert.equal((await read(', page: 0')).page, 1);
  const small = await read(', pageSize: 10, order: OLDEST, page: 3');
  assert.deepEqual([small.pageCount, small.items.length, small.items[0].trigger], [3, 10, 'Paged 20']);
  assert.equal((await read(', pageSize: 1000')).pageSize, 100, 'page size is capped');
  assert.match((await graphql(historyQuery(''), { guild: 'not-managed' })).errors[0].message, /Managed Guild/);
  const other = await graphql(historyQuery(''), { guild: `other-${guildId}` });
  assert.ok(other.data.changeHistory.items.every((item: any) => !/^Paged/.test(item.trigger)), 'history never crosses servers');
});

test('{trigger} inserts what the requester entered for /response and /recs lookup', async () => {
  const guild = guildId;
  const response = await graphql('mutation($guild: ID!, $input: ResponseInput!) { createResponse(guildId: $guild, input: $input) { id } }', { guild, input: { trigger: 'Trigger Demo', aliases: ['tdemo'], content: 'You asked for {trigger}', embedsJson: JSON.stringify([{ title: 'About {trigger}', description: 'By {username}' }]) } });
  assert.equal(response.errors, undefined);
  const asked = (await discord(guild, 2, { type: 1, name: 'response', options: [{ type: 3, name: 'trigger', value: 'TDEMO' }] })).data;
  assert.equal(asked.content, 'You asked for TDEMO', 'keeps exactly what was typed, including an alias and its capitals');
  assert.equal(asked.embeds[0].title, 'About TDEMO');

  const entry = await graphql('mutation($guild: ID!, $input: RecommendationInput!) { createRecommendation(guildId: $guild, input: $input) { id } }', { guild, input: { category: 'CHARACTER', name: 'Trigger Family', aliases: ['tfam'], content: 'Showing {trigger}', embedsJson: JSON.stringify([{ title: '{trigger} picks' }]), introductionMode: 'CUSTOM', introduction: 'Intro for {trigger}' } });
  assert.equal(entry.errors, undefined);
  const lookupAs = (value: string) => discord(guild, 2, { type: 1, name: 'recs', options: [{ type: 1, name: 'lookup', options: [{ type: 3, name: 'name', value }] }] });
  const picked = (await lookupAs('Trigger Family · Character')).data;
  assert.equal(picked.content, 'Intro for Trigger Family\n\nShowing Trigger Family', 'an autocomplete pick drops the category suffix');
  assert.equal(picked.embeds[0].title, 'Trigger Family picks');
  assert.equal((await lookupAs('TFam')).data.content, 'Intro for TFam\n\nShowing TFam', 'a typed alias is kept as typed');
});

test('/recs taste-test lists mods and boosters alphabetically under their headings with the original introduction', async () => {
  const guild = `taste-${guildId}`;
  for (const [category, name] of [['MODERATOR', 'zed'], ['MODERATOR', 'Alex'], ['BOOSTER', 'Sam'], ['CHARACTER', 'Not a person'], ['WRITER', 'Not a writer either']]) await addEntry(guild, category!, name!);
  const reply = await recs(guild, 'taste-test');
  assert.equal(reply.type, 4);
  assert.equal(reply.data.embeds.length, 1);
  const embed = reply.data.embeds[0];
  assert.equal(embed.title, 'Taste Test');
  assert.equal(embed.description, "Welcome to **Taste Test**, where you can sample our mods' and boosters' personal recommendations and personal taste! Feel free to engage us on a discussion, and please, have fun discovering what we love.");
  assert.deepEqual(embed.fields, [{ name: 'Mods', value: 'Alex\nzed' }, { name: 'Boosters', value: 'Sam' }]);
  assert.equal(reply.data.components, undefined);
  assert.doesNotMatch(JSON.stringify(reply), /Not a person|Private reply body/);
  assert.deepEqual(reply.data.allowed_mentions, { parse: [] });
});

test('/recs taste-test keeps both headings with None yet, and shows a clear message when everything is empty', async () => {
  const guild = `taste-empty-${guildId}`;
  const empty = (await recs(guild, 'taste-test')).data.embeds[0];
  assert.match(empty.description, /Welcome to \*\*Taste Test\*\*/);
  assert.match(empty.description, /No personal lists have been added yet\./);
  await addEntry(guild, 'BOOSTER', 'Only booster');
  const partial = (await recs(guild, 'taste-test')).data.embeds[0];
  assert.deepEqual(partial.fields, [{ name: 'Mods', value: 'None yet' }, { name: 'Boosters', value: 'Only booster' }]);
});

test('/recs taste-test sends extra embeds instead of truncating when names exceed Discord limits', async () => {
  const guild = `taste-long-${guildId}`;
  const names = Array.from({ length: 70 }, (_, index) => `Mod ${String(index).padStart(2, '0')} ${'x'.repeat(80)}`);
  for (const name of names) await addEntry(guild, 'MODERATOR', name);
  await addEntry(guild, 'BOOSTER', 'Last booster');
  const token = `long-${randomUUID()}`;
  const reply = await recs(guild, 'taste-test', token);
  assert.equal(reply.data.embeds[0].title, 'Taste Test');
  assert.match(reply.data.embeds[0].description, /Welcome to/);
  const followups = await followupsFor(token, 1);
  assert.ok(followups.length >= 1);
  const embeds = [...reply.data.embeds, ...followups.flatMap((message: any) => message.embeds)];
  for (const message of [reply.data, ...followups]) {
    assert.ok(message.embeds.length <= 10);
    assert.ok(message.embeds.reduce((sum: number, embed: any) => sum + (embed.title?.length ?? 0) + (embed.description?.length ?? 0) + embed.fields.reduce((n: number, f: any) => n + f.name.length + f.value.length, 0), 0) <= 6000);
    assert.deepEqual(message.allowed_mentions, { parse: [] });
  }
  for (const embed of embeds) for (const field of embed.fields) assert.ok(field.value.length <= 1024);
  const fields = embeds.flatMap((embed: any) => embed.fields);
  const section = (heading: string) => fields.filter((f: any) => f.name === heading || f.name === `${heading} (continued)`).flatMap((f: any) => f.value.split('\n'));
  assert.deepEqual(section('Mods'), names);
  assert.deepEqual(section('Boosters'), ['Last booster']);
});

test('/recs characters and /recs writers page 10 names at a time with public buttons and no cross-category leakage', async () => {
  const guild = `paged-${guildId}`;
  const characters = Array.from({ length: 23 }, (_, index) => `Hero ${String(22 - index).padStart(2, '0')}`);
  for (const name of characters) await addEntry(guild, 'CHARACTER', name);
  await addEntry(guild, 'WRITER', 'Only writer');
  await addEntry(guild, 'MODERATOR', 'A moderator');
  const seen: string[] = [];
  let reply = await recs(guild, 'characters');
  for (let page = 1; ; page++) {
    assert.equal(reply.type, page === 1 ? 4 : 7);
    const embed = reply.data.embeds[0];
    assert.equal(embed.title, 'Character Recommendations');
    assert.match(embed.description, /\/recs lookup/);
    assert.equal(embed.footer.text, `Page ${page} of 3`);
    const names = embed.description.split('\n\n').slice(1).join('\n\n').split('\n');
    assert.ok(names.length <= 10);
    seen.push(...names);
    assert.equal(reply.data.components[0].components.find((b: any) => b.label === 'Previous').disabled, page === 1);
    const next = reply.data.components[0].components.find((b: any) => b.label === 'Next');
    assert.equal(next.disabled, page === 3);
    if (next.disabled) break;
    reply = await discord(guild, 3, { custom_id: next.custom_id, component_type: 2 });
  }
  assert.deepEqual(seen, [...characters].sort());
  assert.doesNotMatch(JSON.stringify(seen), /writer|moderator/i);
  const writers = await recs(guild, 'writers');
  assert.equal(writers.data.embeds[0].title, 'Writer Recommendations');
  assert.match(writers.data.embeds[0].description, /Only Writer/);
  assert.equal(writers.data.components.length, 0);
});

test('/recs characters and /recs writers title-case names for display while keeping them alphabetical', async () => {
  const guild = `paged-${guildId}`.replace('paged', 'taste-empty');
  await addEntry(guild, 'CHARACTER', 'the bat family');
  await addEntry(guild, 'CHARACTER', 'DC black label');
  await addEntry(guild, 'WRITER', 'alan moore');
  await addEntry(guild, 'WRITER', "neil gaiman's co-writer");
  const lines = async (sub: string) => (await recs(guild, sub)).data.embeds[0].description.split('\n\n').at(-1).split('\n');
  assert.deepEqual(await lines('characters'), ['DC Black Label', 'The Bat Family']);
  assert.deepEqual(await lines('writers'), ['Alan Moore', "Neil Gaiman's Co-Writer"]);
});

test('/recs characters never splits or drops long names and shows a clear empty message', async () => {
  const guild = `paged-long-${guildId}`;
  assert.match((await recs(guild, 'characters')).data.embeds[0].description, /No Character recommendations have been added yet\./);
  const names = Array.from({ length: 12 }, (_, index) => `${String.fromCharCode(65 + index)} Y${'y'.repeat(96)}`);
  for (const name of names) await addEntry(guild, 'CHARACTER', name);
  const settings = (await graphql(`query($guild: ID!) { recommendationSettings(guildId: $guild) { ${settingsFields} } }`, { guild })).data.recommendationSettings;
  settings.lists.characters.introduction = 'i'.repeat(2000);
  assert.equal((await graphql('mutation($guild: ID!, $input: RecommendationSettingsInput!) { updateRecommendationSettings(guildId: $guild, input: $input) { lists { characters { title } } } }', { guild, input: settings })).errors, undefined);
  const seen: string[] = [];
  let reply = await recs(guild, 'characters');
  for (;;) {
    const embed = reply.data.embeds[0];
    assert.ok(embed.description.length <= 4096);
    seen.push(...embed.description.split('\n\n').slice(1).join('\n\n').split('\n'));
    const next = reply.data.components[0].components.find((b: any) => b.label === 'Next');
    if (next.disabled) break;
    reply = await discord(guild, 3, { custom_id: next.custom_id, component_type: 2 });
  }
  assert.deepEqual(seen, names);
});

test('list settings customize each list independently and old saved settings fall back to the new defaults', async () => {
  const guild = `settings-${guildId}`;
  const initial = await graphql(`query($guild: ID!) { recommendationSettings(guildId: $guild) { ${settingsFields} } }`, { guild });
  assert.equal(initial.errors, undefined);
  const settings = initial.data.recommendationSettings;
  assert.deepEqual(settings.lists.tasteTest, { title: 'Taste Test', introduction: settings.lists.tasteTest.introduction, color: 3447003, moderatorHeading: 'Mods', boosterHeading: 'Boosters' });
  assert.equal(settings.lists.characters.title, 'Character Recommendations');
  assert.equal(settings.lists.writers.title, 'Writer Recommendations');
  settings.lists.tasteTest = { title: 'Our taste', introduction: 'Hi there', color: 255, moderatorHeading: 'Staff', boosterHeading: 'Supporters' };
  settings.lists.writers = { title: 'Authors', introduction: 'Pick via /recs lookup', color: 65280 };
  assert.equal((await graphql('mutation($guild: ID!, $input: RecommendationSettingsInput!) { updateRecommendationSettings(guildId: $guild, input: $input) { lists { writers { title } } } }', { guild, input: settings })).errors, undefined);
  await addEntry(guild, 'MODERATOR', 'Quinn');
  await addEntry(guild, 'WRITER', 'Ursula');
  const taste = (await recs(guild, 'taste-test')).data.embeds[0];
  assert.deepEqual([taste.title, taste.description, taste.color, taste.fields], ['Our taste', 'Hi there', 255, [{ name: 'Staff', value: 'Quinn' }, { name: 'Supporters', value: 'None yet' }]]);
  const writers = (await recs(guild, 'writers')).data.embeds[0];
  assert.deepEqual([writers.title, writers.color, writers.description], ['Authors', 65280, 'Pick via /recs lookup\n\nUrsula']);
  assert.equal((await recs(guild, 'characters')).data.embeds[0].title, 'Character Recommendations');
  const invalid = structuredClone(settings);
  invalid.lists.tasteTest.boosterHeading = ' ';
  assert.match((await graphql('mutation($guild: ID!, $input: RecommendationSettingsInput!) { updateRecommendationSettings(guildId: $guild, input: $input) { lists { writers { title } } } }', { guild, input: invalid })).errors[0].message, /headings/);
  assert.match((await graphql('mutation($guild: ID!, $input: RecommendationSettingsInput!) { updateRecommendationSettings(guildId: $guild, input: $input) { lists { writers { title } } } }', { guild, input: settings }, false)).errors[0].message, /CSRF/);

  const legacy = `legacy-${guildId}`;
  const database = (await import('postgres')).default(process.env.TEST_DATABASE_URL ?? 'postgres://localhost/robotman_test');
  try {
    await database`insert into robotman_recommendation_settings (guild_id, data) values (${legacy}, ${database.json({ directoryTitle: 'Old', directoryText: 'Old', directoryColor: 1, categories: [{ category: 'MODERATOR', label: 'Mods', introduction: 'Kept intro' }] })})`;
  } finally { await database.end(); }
  const migrated = (await graphql(`query($guild: ID!) { recommendationSettings(guildId: $guild) { ${settingsFields} } }`, { guild: legacy })).data.recommendationSettings;
  assert.equal(migrated.lists.tasteTest.title, 'Taste Test');
  assert.equal(migrated.categories.find((c: any) => c.category === 'MODERATOR').introduction, 'Kept intro');
  assert.match(migrated.categories.find((c: any) => c.category === 'BOOSTER').introduction, /special \*\*Taste Test/);
});

test('recommendation naming, personal curator validation, and settings keep server permissions and CSRF boundaries', async () => {
  const input = { category: 'MODERATOR', name: 'Curator boundary', aliases: [], content: 'A personal reading list', embedsJson: '[]', curatorName: '', introductionMode: 'NONE' };
  const create = 'mutation($guild: ID!, $input: RecommendationInput!) { createRecommendation(guildId: $guild, input: $input) { id } }';
  assert.match((await graphql(create, { guild: guildId, input })).errors[0].message, /curator name/i);
  input.curatorName = 'Taylor';
  assert.match((await graphql(create, { guild: guildId, input: { ...input, curatorUserId: 'not-an-id' } })).errors[0].message, /Discord user ID/);
  const first = await graphql(create, { guild: guildId, input }); assert.equal(first.errors, undefined);
  assert.match((await graphql(create, { guild: guildId, input: { ...input, name: 'CURATOR BOUNDARY' } })).errors[0].message, /already exists/);
  assert.match((await graphql(create, { guild: guildId, input: { ...input, name: 'Curator second list' } })).errors[0].message, /already exists/);
  assert.match((await graphql(create, { guild: guildId, input: { ...input, category: 'BOOSTER', curatorName: 'TAYLOR', curatorUserId: '333333333333333333' } })).errors[0].message, /already exists/);
  assert.match((await graphql(create, { guild: guildId, input: { ...input, name: 'No CSRF' } }, false)).errors[0].message, /CSRF/);
  assert.match((await graphql('query($guild: ID!) { recommendationSettings(guildId: $guild) { categories { category } } }', { guild: 'not-managed' })).errors[0].message, /Managed Guild/);
  const updated = await graphql('mutation($guild: ID!, $id: ID!, $input: RecommendationInput!) { updateRecommendation(guildId: $guild, id: $id, input: $input) { id } }', { guild: `other-${guildId}`, id: first.data.createRecommendation.id, input });
  assert.match(updated.errors[0].message, /not found/);
});


test('a personal list uses its curator name and prevents duplicate accounts across categories', async () => {
  const guild = `other-${guildId}`;
  const create = 'mutation($guild: ID!, $input: RecommendationInput!) { createRecommendation(guildId: $guild, input: $input) { id name curatorName } }';
  const input = { category: 'MODERATOR', name: 'Ignored separate name', curatorName: 'Morgan', curatorUserId: '444444444444444444', content: 'Books', embedsJson: '[]', introductionMode: 'NONE' };
  const first = await graphql(create, { guild, input });
  assert.equal(first.errors, undefined);
  assert.equal(first.data.createRecommendation.name, 'Morgan');
  const duplicate = await graphql(create, { guild, input: { ...input, category: 'BOOSTER', curatorName: 'Different label' } });
  assert.match(duplicate.errors[0].message, /already exists/);
  const update = 'mutation($guild: ID!, $id: ID!, $input: RecommendationInput!) { updateRecommendation(guildId: $guild, id: $id, input: $input) { name category } }';
  const changed = await graphql(update, { guild, id: first.data.createRecommendation.id, input: { ...input, category: 'BOOSTER', curatorName: 'Morgan R' } });
  assert.equal(changed.errors, undefined);
  assert.equal(changed.data.updateRecommendation.name, 'Morgan R');
});
