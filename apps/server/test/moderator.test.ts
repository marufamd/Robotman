import { mockComicGeeks } from './comicgeeks-fixtures.js';
import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import postgres from 'postgres';
import { InteractionResponseType, PermissionFlagsBits } from 'discord.js';
import { moderatorModule, releaseEmbedPages, runScheduledReleaseList, runScheduledReleaseLists } from '../src/commands/moderator/index.js';
import type { CommandContext, CommandInteraction } from '../src/commands/types.js';
import type { Sql } from 'postgres';

const databaseUrl = process.env.TEST_DATABASE_URL;
const db = databaseUrl ? postgres(databaseUrl) : undefined;
const requestLog: Array<{ url: string; method: string; body?: Record<string, unknown>; headers?: Record<string, string> }> = [];
let context: CommandContext;
let transport: ReturnType<typeof mockComicGeeks>;

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
  const headers = Object.fromEntries(new Headers(init?.headers).entries());
  requestLog.push({ url: url.toString(), method, ...(body ? { body } : {}), headers });

  if (url.hostname === 'leagueofcomicgeeks.com') return response({ list: comicHtml() });
  if (url.hostname === 'api.tvmaze.com') {
    return response(Array.from({ length: tvEpisodesPerRequest }, (_, index) => url.pathname.endsWith('/web')
      ? { name: `Web episode ${index + 1}`, season: 1, number: index + 1, airdate: url.searchParams.get('date'), airtime: null, summary: `<p>${'Streaming episode '.repeat(60)}</p>`, _embedded: { show: { id: 13, name: 'DC Show', webChannel: { name: 'Stream' } } } }
      : { name: `Pilot ${index + 1}`, season: 1, number: index + 1, airdate: url.searchParams.get('date'), airtime: '20:00', summary: `<p>${'First episode '.repeat(60)}</p>`, show: { id: 13, name: 'DC Show', network: { name: 'Network' } } }));
  }
  if (url.hostname === 'api.paste.ee') return response({ link: 'https://paste.ee/p/abc123' });
  if (url.hostname === 'discord.com') {
    if (method === 'POST') return response({ id: 'message-1' });
    return new Response(null, { status: 204 });
  }
  throw new Error(`Unexpected fixture request: ${url}`);
};

before(async () => {
  transport = mockComicGeeks(fixtureFetch);
  requestLog.length = 0;
  queuedFollowups.length = 0;
  context = { sql: db ?? ({} as Sql), fetch: fixtureFetch, startedAt: Date.now(), botToken: 'fixture-token', queueFollowup: data => queuedFollowups.push(data) };
  if (db) await moderatorModule.start?.(context);
});

after(async () => {
  transport.restore();
  if (!db) return;
  await moderatorModule.close?.();
  await db`DELETE FROM robotman_release_list_runs WHERE release_date IN ('2099-09-08', '2099-09-15', '2099-10-13')`;
  await db`DELETE FROM robotman_moderator_settings WHERE guild_id IN ('test-guild', 'schedule-a', 'schedule-b')`;
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

async function configureGuild(guildId: string, channelId: string | null, options: { day?: number; hour?: number; minute?: number; timeZone?: string; showIds?: number[] } = {}) {
  if (!db) throw new Error('A test PostgreSQL database is required');
  await db`INSERT INTO robotman_moderator_settings (guild_id, release_list_channel_id, release_list_day_of_week, release_list_hour, release_list_minute, release_list_time_zone, tvmaze_show_ids)
    VALUES (${guildId}, ${channelId}, ${options.day ?? 0}, ${options.hour ?? 0}, ${options.minute ?? 0}, ${options.timeZone ?? 'UTC'}, ${JSON.stringify(options.showIds ?? [13])}::jsonb)
    ON CONFLICT (guild_id) DO UPDATE SET release_list_channel_id = EXCLUDED.release_list_channel_id, release_list_day_of_week = EXCLUDED.release_list_day_of_week,
      release_list_hour = EXCLUDED.release_list_hour, release_list_minute = EXCLUDED.release_list_minute, release_list_time_zone = EXCLUDED.release_list_time_zone, tvmaze_show_ids = EXCLUDED.tvmaze_show_ids`;
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

test('manual release-list posts to the configured channel and confirms ephemerally', { skip: !db }, async () => {
  await configureGuild('test-guild', 'configured-release-channel');
  requestLog.length = 0;
  const result = await moderatorModule.handle(command('release-list', PermissionFlagsBits.ManageGuild.toString(), '2099-09-08'), context);
  assert.equal(result.type, InteractionResponseType.ChannelMessageWithSource);
  assert.equal(result.data?.flags, 64);
  assert.match(String(result.data?.content), /Release List for 2099-09-08 was sent/);
  const messagePosts = requestLog.filter(request => request.url.includes('/channels/configured-release-channel/messages') && request.method === 'POST');
  assert.equal(messagePosts.length, 2);
  assert.match(String(messagePosts[0]?.body?.content), /Comics Release List for 2099-09-08/);
  assert.equal(messagePosts[1]?.body?.embeds instanceof Array, true);
  assert.equal(requestLog.some(request => request.url.includes('/channels/test-channel/messages')), false);
});

test('manual release-list explains ephemerally when no channel is configured', { skip: !db }, async () => {
  await configureGuild('test-guild', null);
  requestLog.length = 0;
  const result = await moderatorModule.handle(command('release-list', PermissionFlagsBits.ManageGuild.toString()), context);
  assert.equal(result.data?.flags, 64);
  assert.match(String(result.data?.content), /Configure a release-list channel in the dashboard/);
  assert.equal(requestLog.length, 0);
});

test('manual release-list reports delivery failures ephemerally', { skip: !db }, async () => {
  await configureGuild('test-guild', 'configured-release-channel');
  const failing: CommandContext = { ...context, fetch: async (input, init) => {
    const url = String(input);
    if (url.includes('leagueofcomicgeeks.com')) return response({ list: comicHtml() });
    if (url.includes('/channels/configured-release-channel/messages')) return response({}, 500);
    return fixtureFetch(input, init);
  } };
  const result = await moderatorModule.handle(command('release-list', PermissionFlagsBits.ManageGuild.toString(), '2099-09-08'), failing);
  assert.equal(result.data?.flags, 64);
  assert.match(String(result.data?.content), /could not be delivered/);
});

test('release-list keeps the existing heading, embeds, and pinned heading delivery', { skip: !db }, async () => {
  await configureGuild('test-guild', 'configured-release-channel');
  requestLog.length = 0;
  const result = await moderatorModule.handle(command('release-list', PermissionFlagsBits.ManageGuild.toString(), '2099-09-08'), context);
  assert.equal(result.data?.flags, 64);
  assert.ok(requestLog.some(request => request.url.endsWith('/pins/message-1') && request.method === 'PUT'));
  assert.equal(requestLog.find(request => request.url.includes('/channels/configured-release-channel/messages'))?.body?.nonce !== undefined, true);
});

test('configured release-list queries League of Comic Geeks for its chosen date', { skip: !db }, async () => {
  await configureGuild('test-guild', 'configured-release-channel');
  requestLog.length = 0;
  await moderatorModule.handle(command('release-list', PermissionFlagsBits.ManageGuild.toString(), '2099-09-08'), context);
  const locg = new URL(requestLog[0]!.url);
  assert.equal(locg.pathname, '/comic/get_comics');
  assert.deepEqual(locg.searchParams.getAll('publisher[]'), ['1', '59']);
  assert.deepEqual(locg.searchParams.getAll('format[]'), ['1', '5', '6']);
});

test('manual release-list uses the Guild time zone to choose its default date', { skip: !db }, async () => {
  await configureGuild('test-guild', 'configured-release-channel', { timeZone: 'Pacific/Kiritimati' });
  requestLog.length = 0;
  const localMorning = new Date('2099-09-07T12:00:00.000Z');
  await moderatorModule.handle(command('release-list', PermissionFlagsBits.ManageGuild.toString()), { ...context, now: () => localMorning });
  const locg = requestLog.find(request => request.url.includes('leagueofcomicgeeks.com'));
  assert.equal(new URL(locg!.url).searchParams.get('date'), '2099-09-15');
});

test('manual release-list paging respects Discord limits and delivers every issue', { skip: !db }, async () => {
  await configureGuild('test-guild', 'configured-release-channel');
  comicItemCount = 15;
  comicDescriptionLength = 7_000;
  requestLog.length = 0;
  queuedFollowups.length = 0;
  try {
    const result = await moderatorModule.handle(command('release-list', PermissionFlagsBits.ManageGuild.toString(), '2099-09-08'), context);
    assert.equal(result.data?.flags, 64);
    assert.match(String(result.data?.content), /Release List for 2099-09-08 was sent/);
    const pages = requestLog.filter(request => request.url.includes('/channels/configured-release-channel/messages') && request.method === 'POST')
      .flatMap(request => Array.isArray(request.body?.embeds) ? [request.body.embeds as Record<string, unknown>[]] : []);
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

test('shows publishes the legacy Comment Templates link without Discord embeds', { skip: !db }, async () => {
  await configureGuild('test-guild', null, { showIds: [13] });
  const previousKey = process.env.PASTEE_KEY;
  process.env.PASTEE_KEY = 'paste-test-key';
  requestLog.length = 0;
  queuedFollowups.length = 0;
  tvEpisodesPerRequest = 6;
  try {
    const result = await moderatorModule.handle(command('shows', PermissionFlagsBits.ManageGuild.toString(), '2099-09-08'), context);
    assert.equal(result.type, InteractionResponseType.ChannelMessageWithSource);
    assert.equal(result.data?.embeds?.length ?? 0, 0);
    const components = result.data?.components as Array<{ components: Array<{ label: string; url: string }> }>;
    assert.deepEqual(components[0]?.components[0], { type: 2, style: 5, label: 'Comment Templates', url: 'https://paste.ee/p/abc123' });
    const paste = requestLog.find(request => request.url === 'https://api.paste.ee/v1/pastes');
    assert.equal(paste?.headers?.['x-auth-token'], 'paste-test-key');
    assert.equal(paste?.body?.sections instanceof Array, true);
    assert.match(String((paste?.body?.sections as Array<{ contents: string }>)[0]?.contents), /Episode Comment Templates for the week of 2099-09-07/);
    assert.match(String((paste?.body?.sections as Array<{ contents: string }>)[0]?.contents), /DC Show/);
  } finally {
    if (previousKey === undefined) delete process.env.PASTEE_KEY; else process.env.PASTEE_KEY = previousKey;
    tvEpisodesPerRequest = 1;
  }
});

test('shows sends a public text file when Paste.ee is not configured or unavailable', { skip: !db }, async () => {
  await configureGuild('test-guild', null, { showIds: [13] });
  const previousKey = process.env.PASTEE_KEY;
  delete process.env.PASTEE_KEY;
  queuedFollowups.length = 0;
  try {
    const missingKey = await moderatorModule.handle(command('shows', PermissionFlagsBits.ManageGuild.toString(), '2099-09-08'), context);
    assert.equal(missingKey.data?.flags, undefined);
    assert.equal(queuedFollowups[0]?.content, 'Episode Comment Templates are attached as a text file.');
    const file = (queuedFollowups[0]?.files as Array<{ name: string; content: string }>)[0];
    assert.equal(file?.name, 'episode-comment-templates-2099-09-07.txt');
    assert.match(file?.content ?? '', /Episode Comment Templates/);

    process.env.PASTEE_KEY = 'paste-test-key';
    queuedFollowups.length = 0;
    const failingPaste: CommandContext = { ...context, fetch: async (input, init) => {
      if (String(input) === 'https://api.paste.ee/v1/pastes') return response({}, 503);
      return fixtureFetch(input, init);
    } };
    await moderatorModule.handle(command('shows', PermissionFlagsBits.ManageGuild.toString(), '2099-09-08'), failingPaste);
    assert.equal(queuedFollowups.length, 1);
    assert.match(String((queuedFollowups[0]?.files as Array<{ content: string }>)[0]?.content), /DC Show/);
  } finally {
    if (previousKey === undefined) delete process.env.PASTEE_KEY; else process.env.PASTEE_KEY = previousKey;
  }
});

test('shows returns a plain no-episodes message without uploading an empty template', { skip: !db }, async () => {
  await configureGuild('test-guild', null, { showIds: [13] });
  queuedFollowups.length = 0;
  tvEpisodesPerRequest = 0;
  try {
    const result = await moderatorModule.handle(command('shows', PermissionFlagsBits.ManageGuild.toString(), '2099-09-08'), context);
    assert.equal(result.data?.embeds?.length ?? 0, 0);
    assert.match(String(result.data?.content), /There are no episodes scheduled/);
    assert.equal(queuedFollowups.length, 0);
  } finally { tvEpisodesPerRequest = 1; }
});

test('scheduled release runs are durable and repeated deliveries do not repost', { skip: !db }, async () => {
  requestLog.length = 0;
  const args = { guildId: 'scheduled-test-guild', channelId: 'release-channel', releaseDate: '2099-09-08', now: new Date('2099-09-01T12:00:00.000Z') };
  await db!`DELETE FROM robotman_release_list_runs WHERE guild_id = ${args.guildId} AND release_date = ${args.releaseDate}`;
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
  await db!`DELETE FROM robotman_release_list_runs WHERE guild_id = 'paging-test-guild' AND release_date = '2099-09-15'`;
  try {
    const result = await runScheduledReleaseList(context, { guildId: 'paging-test-guild', channelId: 'release-channel', releaseDate: '2099-09-15' });
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

test('scheduled release lists run independently for each Guild and suppress duplicate runs', { skip: !db }, async () => {
  await db!`DELETE FROM robotman_release_list_runs WHERE guild_id IN ('schedule-a', 'schedule-b') AND release_date = '2099-10-13'`;
  await configureGuild('schedule-a', 'channel-a', { day: 1, hour: 0, minute: 0, timeZone: 'UTC' });
  await configureGuild('schedule-b', 'channel-b', { day: 1, hour: 0, minute: 0, timeZone: 'UTC' });
  const now = new Date('2099-10-12T00:00:20.000Z');
  requestLog.length = 0;
  const first = await runScheduledReleaseLists(context, now);
  assert.deepEqual(first.map(run => [run.guildId, run.channelId, run.releaseDate, run.result]).sort(), [
    ['schedule-a', 'channel-a', '2099-10-13', 'posted'],
    ['schedule-b', 'channel-b', '2099-10-13', 'posted'],
  ]);
  const second = await runScheduledReleaseLists(context, new Date('2099-10-12T00:00:40.000Z'));
  assert.deepEqual(second.map(run => run.result).sort(), ['already-posted', 'already-posted']);
  assert.equal(requestLog.filter(request => request.url.includes('/channels/channel-a/messages') || request.url.includes('/channels/channel-b/messages')).length, 4);
  await db!`DELETE FROM robotman_release_list_runs WHERE guild_id IN ('schedule-a', 'schedule-b') AND release_date = '2099-10-13'`;
  await db!`DELETE FROM robotman_moderator_settings WHERE guild_id IN ('schedule-a', 'schedule-b')`;
});

function embedCharacterCount(embed: Record<string, unknown>) {
  const footer = embed.footer as { text?: string } | undefined;
  return String(embed.title ?? '').length + String(embed.description ?? '').length + String(footer?.text ?? '').length;
}
