import assert from 'node:assert/strict';
import { generateKeyPairSync, randomUUID, sign } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import postgres from 'postgres';
import { createApplication } from '../src/application.js';
import { requestModule } from '../src/commands/requests/index.js';

const url = process.env.TEST_DATABASE_URL;
const skip = !url;
const keys = generateKeyPairSync('ed25519');

async function withApp<T>(run: (ctx: { guild: string; send(data: Record<string, unknown>, type?: number): Promise<any>; sql: postgres.Sql; importer(exportData: unknown, ...flags: string[]): any }) => Promise<T>) {
  const app = createApplication({ publicKey: keys.publicKey.export({ type: 'spki', format: 'der' }).subarray(-32).toString('hex'), databaseUrl: url!, modules: [requestModule] });
  await app.initialize();
  await new Promise<void>((resolve, reject) => { app.server.once('error', reject); app.server.listen(0, '127.0.0.1', resolve); });
  const address = app.server.address();
  if (!address || typeof address === 'string') throw new Error('TCP address required');
  const sql = postgres(url!);
  const guild = `legacy-${randomUUID()}`;
  const send = async (data: Record<string, unknown>, type = 2) => {
    const body = JSON.stringify({ id: randomUUID(), application_id: '1', token: 't', guild_id: guild, channel_id: 'c', member: { user: { id: 'u', username: 'Reader' } }, type, data });
    const timestamp = String(Math.floor(Date.now() / 1000));
    return (await fetch(`http://127.0.0.1:${address.port}/interactions`, { method: 'POST', body, headers: { 'content-type': 'application/json', 'x-signature-timestamp': timestamp, 'x-signature-ed25519': sign(null, Buffer.from(timestamp + body), keys.privateKey).toString('hex') } })).json();
  };
  const importer = (exportData: unknown, ...flags: string[]) => {
    const file = join(mkdtempSync(join(tmpdir(), 'legacy-')), 'export.json');
    writeFileSync(file, JSON.stringify(exportData));
    const result = spawnSync('node', ['--import', 'tsx', 'src/import-legacy.ts', '--file', file, '--json', ...flags], { env: { ...process.env, DATABASE_URL: url }, encoding: 'utf8' });
    return { status: result.status, stderr: result.stderr, report: result.stdout ? JSON.parse(result.stdout) : undefined };
  };
  try { return await run({ guild, send, sql, importer }); } finally { await sql.end(); await app.close(); }
}
const row = (guild: string, over: Record<string, unknown>) => ({ id: Math.floor(Math.random() * 1e9), name: 'x', type: 'regular', guild, content: 'c', aliases: [], author: '111111111111111111', author_tag: 'Author#0', editor: null, editor_tag: null, created: '2021-03-04T05:06:07.123', updated: null, wildcard: false, embed: false, embed_color: null, ...over });
const respond = (trigger: string) => ({ type: 1, name: 'response', options: [{ type: 3, name: 'trigger', value: trigger }] });

test('importing a legacy export makes regular responses answer /response, with embeds converted and wildcard rows treated as ordinary Responses', { skip }, async () => {
  await withApp(async ({ guild, send, importer }) => {
    const data = { auto_responses: [
      row(guild, { name: 'Reading Order', content: 'Start with Year One.', aliases: ['order', 'READING order'] }),
      row(guild, { name: 'Fancy', content: 'Embedded text', embed: true, embed_color: '#ff8800' }),
      row(guild, { name: 'Partial', content: 'Wildcard text', wildcard: true }),
    ], history: [] };
    const dry = importer(data, '--dry-run');
    assert.equal(dry.status, 0, dry.stderr);
    assert.equal(dry.report.dryRun, true);
    assert.equal(dry.report.imported.responses, 3);
    assert.deepEqual(dry.report.warnings, [], 'wildcard rows are ordinary exact-trigger Responses');
    assert.match((await send(respond('order'))).data.content, /No Response found/);

    const run = importer(data);
    assert.equal(run.status, 0, run.stderr);
    assert.equal(run.report.dryRun, false);
    assert.equal((await send(respond('ORDER'))).data.content, 'Start with Year One.');
    const fancy = (await send(respond('fancy'))).data;
    assert.deepEqual(fancy.embeds, [{ description: 'Embedded text', color: 0xff8800 }]);
    assert.equal(fancy.content, undefined);
    assert.equal((await send(respond('partial'))).data.content, 'Wildcard text');
  });
});

const lookup = (value: string, focused = false) => ({ type: 1, name: 'recs', options: [{ type: 1, name: 'lookup', options: [{ type: 3, name: 'name', value, ...(focused ? { focused: true } : {}) }] }] });

test('importing recommendation-type rows creates entries that /recs lookup finds without the old "recs" suffix', { skip }, async () => {
  await withApp(async ({ guild, send, importer }) => {
    const data = { auto_responses: [
      row(guild, { name: 'Maruf recs', type: 'moderator', content: '**Saga** by Brian K. Vaughan' }),
      row(guild, { name: 'brian michael bendis recs', type: 'writer', content: 'Powers', aliases: ['bendis recs', 'BMB recs', 'bendis recs'] }),
      row(guild, { name: 'the question recs', type: 'character', content: 'Start with Zero Hour', aliases: ['question recs'] }),
      row(guild, { name: 'Sam recs', type: 'booster', content: 'Booster picks' }),
      row(guild, { name: 'maruf recs', type: 'booster', content: 'Same curator as a moderator' }),
    ], history: [] };
    const run = importer(data);
    assert.equal(run.status, 0, run.stderr);
    assert.equal(run.report.imported.recommendations, 4);
    assert.deepEqual(run.report.unmapped.map((item: any) => item.reason), ['duplicate-curator']);

    const writer = await send(lookup('bendis'));
    assert.equal(writer.data.content, 'Powers');
    const completion = await send(lookup('bmb', true), 4);
    assert.deepEqual(completion.data.choices.map((choice: any) => choice.name), ['brian michael bendis · Writer']);
    assert.equal((await send(lookup('question'))).data.content, 'Start with Zero Hour');
    const moderator = await send(lookup('Maruf'));
    assert.equal(moderator.data.content, '**Saga** by Brian K. Vaughan');
    assert.equal((await send(lookup('Sam'))).data.content, 'Booster picks');
  });
});

const event = (guild: string, over: Record<string, unknown>) => ({ guild, user_id: '222222222222222222', user_tag: 'Editor#1234', action: 'edit', response: 'Reading Order', date: '2022-05-06 07:08:09.5', ...over });

test('importing history keeps response change history and authors, skips recommendation history, and is safe to re-run', { skip }, async () => {
  await withApp(async ({ guild, sql, importer }) => {
    const data = { auto_responses: [
      row(guild, { name: 'Reading Order', content: 'x', created: '2021-03-04T05:06:07.123', author: '111111111111111111', author_tag: 'Author#0' }),
      row(guild, { name: 'No Events', content: 'y', created: '2021-01-01T00:00:00', updated: '2021-02-01T00:00:00', editor: '333333333333333333', editor_tag: 'Fixer#0' }),
      row(guild, { name: 'Maruf recs', type: 'moderator', content: 'z' }),
    ], history: [
      event(guild, { action: 'add', date: '2021-03-04 05:06:07.123', user_id: '111111111111111111', user_tag: 'Author#0' }),
      event(guild, { action: 'edit' }),
      event(guild, { action: 'add', response: 'Old Gone', date: '2020-01-01 00:00:00' }),
      event(guild, { action: 'delete', response: 'Old Gone', date: '2020-02-01 00:00:00' }),
      event(guild, { action: 'edit', response: 'maruf recs' }),
      event(guild, { action: '', response: 'Reading Order' }),
    ] };
    const first = importer(data);
    assert.equal(first.status, 0, first.stderr);
    assert.equal(first.report.imported.history, 6); // 4 recorded events + created/updated derived for the response with none
    assert.deepEqual(first.report.skipped, { recommendationHistory: 1 });
    assert.deepEqual(first.report.unmapped.map((item: any) => item.reason), ['unknown-history-action']);

    const history = await sql<{ trigger: string; action: string; actor_id: string; occurred_at: Date; response_id: string }[]>`select trigger, action, actor_id, occurred_at, response_id from robotman_response_change_history where guild_id = ${guild} order by trigger, occurred_at`;
    assert.deepEqual(history.map(item => [item.trigger, item.action, item.actor_id, item.occurred_at.toISOString()]), [
      ['No Events', 'created', '111111111111111111', '2021-01-01T00:00:00.000Z'],
      ['No Events', 'updated', '333333333333333333', '2021-02-01T00:00:00.000Z'],
      ['Old Gone', 'created', '222222222222222222', '2020-01-01T00:00:00.000Z'],
      ['Old Gone', 'deleted', '222222222222222222', '2020-02-01T00:00:00.000Z'],
      ['Reading Order', 'created', '111111111111111111', '2021-03-04T05:06:07.123Z'],
      ['Reading Order', 'updated', '222222222222222222', '2022-05-06T07:08:09.500Z'],
    ]);
    const [live] = await sql`select response_id from robotman_responses where guild_id = ${guild} and trigger = 'Reading Order'`;
    assert.equal(history.find(item => item.trigger === 'Reading Order')!.response_id, live!.response_id);
    const users = await sql`select user_id, username from robotman_discord_users where user_id in ('111111111111111111', '222222222222222222') order by user_id`;
    assert.deepEqual(users.map(user => [user.user_id, user.username]), [['111111111111111111', 'Author'], ['222222222222222222', 'Editor']]);

    const second = importer(data);
    assert.equal(second.status, 0, second.stderr);
    assert.deepEqual(second.report.written, { responses: 0, recommendations: 0, history: 0 });
    const [count] = await sql`select count(*)::int as total from robotman_response_change_history where guild_id = ${guild}`;
    assert.equal(count!.total, 6);
  });
});
