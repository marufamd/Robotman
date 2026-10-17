import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import postgres from 'postgres';
import { InteractionResponseType, PermissionFlagsBits } from 'discord.js';
import { moderatorModule, releaseEmbedPages, runScheduledReleaseList } from '../src/commands/moderator/index.js';
import type { CommandContext, CommandInteraction } from '../src/commands/types.js';
import type { Sql } from 'postgres';

const databaseUrl = process.env.TEST_DATABASE_URL;
const db = databaseUrl ? postgres(databaseUrl) : undefined;
const requestLog: Array<{ url: string; method: string; body?: Record<string, unknown> }> = [];
let context: CommandContext;

let comicItemCount = 1;
let comicDescriptionLength = 16;
let tvEpisodesPerRequest = 1;
const queuedFollowups: Array<Record<string, unknown>> = [];

function comicHtml() {
  const description = 'A'.repeat(comicDescriptionLength);
  return `<ul>${Array.from({ length: comicItemCount }, (_, index) => `<li>
    <div class="comic-cover-art"><img data-src="https://images.example/medium-cover.jpg"></div>
    <div class="comic-details"><span>DC Comics · Regular</span></div>
    <div class="title color-primary">Action Comics #${index + 1}</div>
    <div class="comic-description col-feed-max">${description} <a href="/comics/action-comics-${index + 1}">Read more</a></div>
    <span class="price">$4.99</span>
  </li>`).join('')}</ul>`;
}

function response(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), { status, headers: { 'content-type': 'application/json' } });
}

const fixtureFetch: typeof fetch = async (input, init) => {
  const url = new URL(typeof input === 'string' || input instanceof URL ? input.toString() : input.url);
  const method = init?.method ?? 'GET';
  const body = typeof init?.body === 'string' ? JSON.parse(init.body) as Record<string, unknown> : undefined;
  requestLog.push({ url: url.toString(), method, ...(body ? { body } : {}) });

  if (url.hostname === 'leagueofcomicgeeks.com') return response({ list: comicHtml() });
  if (url.hostname === 'api.tvmaze.com') {
    return response(Array.from({ length: tvEpisodesPerRequest }, (_, index) => url.pathname.endsWith('/web')
      ? { name: `Web episode ${index + 1}`, season: 1, number: index + 1, airdate: url.searchParams.get('date'), airtime: null, summary: `<p>${'Streaming episode '.repeat(60)}</p>`, _embedded: { show: { id: 13, name: 'DC Show', webChannel: { name: 'Stream' } } } }
      : { name: `Pilot ${index + 1}`, season: 1, number: index + 1, airdate: url.searchParams.get('date'), airtime: '20:00', summary: `<p>${'First episode '.repeat(60)}</p>`, show: { id: 13, name: 'DC Show', network: { name: 'Network' } } }));
  }
  if (url.hostname === 'discord.com') {
    if (method === 'POST') return response({ id: 'message-1' });
    return new Response(null, { status: 204 });
  }
  throw new Error(`Unexpected fixture request: ${url}`);
};

before(async () => {
  requestLog.length = 0;
  queuedFollowups.length = 0;
  context = { sql: db ?? ({} as Sql), fetch: fixtureFetch, startedAt: Date.now(), botToken: 'fixture-token', queueFollowup: data => queuedFollowups.push(data) };
  if (db) await moderatorModule.start?.(context);
});

after(async () => {
  if (!db) return;
  await moderatorModule.close?.();
  await db`DELETE FROM robotman_release_list_runs WHERE release_date IN ('2099-09-08', '2099-09-15')`;
  await db.end();
});

function command(name: string, permissions: string, date?: string): CommandInteraction {
  return {
    type: 2,
    guild_id: 'test-guild',
    channel_id: 'test-channel',
    member: { permissions, user: { id: 'moderator' } },
    data: {
      name,
      options: date ? [{ name: 'date', type: 3, value: date }] : [],
    },
  } as unknown as CommandInteraction;
}

test('moderator commands reject non-moderators and stay server-only', async () => {
  const denied = await moderatorModule.handle(command('release-list', '0'), context);
  assert.equal(denied.data?.flags, 64);
  assert.match(String(denied.data?.content), /Manage Server/);
  assert.equal(requestLog.length, 0);

  const dm = command('shows', PermissionFlagsBits.ManageGuild.toString());
  (dm as any).guild_id = undefined;
  const dmDenied = await moderatorModule.handle(dm, context);
  assert.equal(dmDenied.data?.flags, 64);
  assert.match(String(dmDenied.data?.content), /only be used in a server/);
  assert.equal(requestLog.length, 0);
});

test('release-list queries League of Comic Geeks and returns release embeds', async () => {
  const result = await moderatorModule.handle(command('release-list', PermissionFlagsBits.ManageGuild.toString(), '2099-09-08'), context);
  assert.equal(result.type, InteractionResponseType.ChannelMessageWithSource);
  assert.match(String(result.data?.content), /Comics Release List for 2099-09-08/);
  assert.equal(result.data?.embeds?.length, 1);
  assert.equal(requestLog.filter(request => request.url.includes('/channels/test-channel/messages') && request.method === 'POST').length, 0);
  const locg = new URL(requestLog[0]!.url);
  assert.equal(locg.pathname, '/comic/get_comics');
  assert.deepEqual(locg.searchParams.getAll('publisher[]'), ['1', '59']);
  assert.deepEqual(locg.searchParams.getAll('format[]'), ['1', '5', '6']);
});

test('release-list paging respects Discord limits and delivers every issue', async () => {
  comicItemCount = 15;
  comicDescriptionLength = 7_000;
  requestLog.length = 0;
  queuedFollowups.length = 0;
  try {
    const result = await moderatorModule.handle(command('release-list', PermissionFlagsBits.ManageGuild.toString(), '2099-09-08'), context);
    assert.match(String(result.data?.content), /Comics Release List for 2099-09-08/);
    const pages = [result.data?.embeds as unknown as Record<string, unknown>[] ?? [], ...queuedFollowups.map(followup => followup.embeds as Record<string, unknown>[])];
    const delivered = pages.flat();
    assert.equal(delivered.length, 15);
    assert.deepEqual(new Set(delivered.map(embed => embed.title)), new Set(Array.from({ length: 15 }, (_, i) => `Action Comics #${i + 1}`)));
    for (const page of pages) {
      assert.ok(page.length <= 10);
      assert.ok(page.reduce((sum, embed) => sum + embedCharacterCount(embed), 0) <= 6000);
      assert.ok(page.every(embed => String(embed.description ?? '').length <= 4096));
    }
  } finally {
    comicItemCount = 1;
    comicDescriptionLength = 16;
  }
});

test('embed paging splits by both embed count and Discord’s aggregate character limit', () => {
  const embeds = Array.from({ length: 12 }, (_, index) => ({ title: `Release ${index}`, description: 'x'.repeat(3_000) }));
  const pages = releaseEmbedPages(embeds);
  assert.equal(pages.flat().length, 12);
  assert.ok(pages.every(page => page.length <= 10));
  assert.ok(pages.every(page => page.reduce((sum, embed) => sum + embedCharacterCount(embed), 0) <= 6000));
});

test('shows includes this week’s scheduled broadcast and streaming episodes', async () => {
  requestLog.length = 0;
  queuedFollowups.length = 0;
  tvEpisodesPerRequest = 6;
  const result = await moderatorModule.handle(command('shows', PermissionFlagsBits.ManageGuild.toString(), '2099-09-08'), context);
  assert.equal(result.type, InteractionResponseType.ChannelMessageWithSource);
  const pages = [result.data?.embeds as unknown as Record<string, unknown>[] ?? [], ...queuedFollowups.map(followup => followup.embeds as Record<string, unknown>[])];
  const embeds = pages.flat();
  assert.ok(embeds.length > 10);
  assert.ok(embeds.some(embed => String(embed.description).includes('DC Show')));
  assert.ok(embeds.some(embed => String(embed.description).includes('Streaming episode')));
  assert.equal(embeds.reduce((count, embed) => count + (String(embed.description).match(/DC Show/g)?.length ?? 0), 0), 84);
  for (const page of pages) {
    assert.ok(page.length <= 10);
    assert.ok(page.reduce((sum, embed) => sum + embedCharacterCount(embed), 0) <= 6000);
  }
  tvEpisodesPerRequest = 1;
  assert.equal(requestLog.filter(request => request.url.startsWith('https://api.tvmaze.com/')).length, 14);
});

test('scheduled release runs are durable and repeated deliveries do not repost', { skip: !db }, async () => {
  requestLog.length = 0;
  const args = { channelId: 'release-channel', releaseDate: '2099-09-08', now: new Date('2099-09-01T12:00:00.000Z') };
  const results = await Promise.all([
    runScheduledReleaseList(context, args),
    runScheduledReleaseList(context, args),
  ]);
  assert.equal(results.filter(result => result === 'posted').length, 1);
  assert.ok(results.every(result => result === 'posted' || result === 'in-progress' || result === 'already-posted'));
  const messagePosts = requestLog.filter(request => request.url.includes('/channels/release-channel/messages') && request.method === 'POST');
  assert.equal(messagePosts.length, 2);
  assert.ok(messagePosts.every(request => request.body?.enforce_nonce === true && typeof request.body.nonce === 'string'));

  const repeated = await runScheduledReleaseList(context, args);
  assert.equal(repeated, 'already-posted');
  assert.equal(requestLog.filter(request => request.url.includes('/channels/release-channel/messages') && request.method === 'POST').length, 2);
  const peer = postgres(databaseUrl!);
  try {
    assert.equal(await runScheduledReleaseList({ ...context, sql: peer }, args), 'already-posted');
    assert.equal(requestLog.filter(request => request.url.includes('/channels/release-channel/messages') && request.method === 'POST').length, 2);
  } finally { await peer.end({ timeout: 2 }); }
});

test('scheduled release delivery pages a large list without dropping issues', { skip: !db }, async () => {
  comicItemCount = 15;
  comicDescriptionLength = 7_000;
  requestLog.length = 0;
  try {
    const result = await runScheduledReleaseList(context, { channelId: 'release-channel', releaseDate: '2099-09-15' });
    assert.equal(result, 'posted');
    const posts = requestLog.filter(request => request.url.includes('/channels/release-channel/messages') && request.method === 'POST');
    const pages = posts.flatMap(request => Array.isArray(request.body?.embeds) ? [request.body.embeds as Record<string, unknown>[]] : []);
    const delivered = pages.flat();
    assert.equal(delivered.length, 15);
    for (const page of pages) {
      assert.ok(page.length <= 10);
      assert.ok(page.reduce((sum, embed) => sum + embedCharacterCount(embed), 0) <= 6000);
    }
  } finally {
    comicItemCount = 1;
    comicDescriptionLength = 16;
  }
});

function embedCharacterCount(embed: Record<string, unknown>) {
  const footer = embed.footer as { text?: string } | undefined;
  return String(embed.title ?? '').length + String(embed.description ?? '').length + String(footer?.text ?? '').length;
}
