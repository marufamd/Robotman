import assert from 'node:assert/strict';
import { generateKeyPairSync, randomUUID, sign } from 'node:crypto';
import { mkdtemp, mkdir, readFile, writeFile, copyFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { createApplication } from '../src/application.js';
import { requestModule } from '../src/commands/requests/index.js';

test('upgrading existing recommendation entries preserves their details and links in the public reply', { skip: !process.env.TEST_DATABASE_URL }, async () => {
  const admin = postgres(process.env.TEST_DATABASE_URL!);
  const name = `recs_migration_${randomUUID().replaceAll('-', '')}`;
  const folder = await mkdtemp(join(tmpdir(), 'robotman-recs-migration-'));
  let application: ReturnType<typeof createApplication> | undefined;
  let fixture: ReturnType<typeof postgres> | undefined;
  let created = false;
  try {
    await admin.unsafe(`CREATE DATABASE "${name}"`); created = true;
    const url = new URL(process.env.TEST_DATABASE_URL!); url.pathname = `/${name}`;
    const source = fileURLToPath(new URL('../migrations/', import.meta.url));
    const journal = JSON.parse(await readFile(join(source, 'meta/_journal.json'), 'utf8'));
    journal.entries = journal.entries.filter((entry: { idx: number }) => entry.idx < 8);
    await mkdir(join(folder, 'meta'));
    await writeFile(join(folder, 'meta/_journal.json'), JSON.stringify(journal));
    for (const entry of journal.entries) await copyFile(join(source, `${entry.tag}.sql`), join(folder, `${entry.tag}.sql`));
    const oldDatabase = postgres(url.toString());
    try { await migrate(drizzle(oldDatabase), { migrationsFolder: folder }); } finally { await oldDatabase.end(); }
    fixture = postgres(url.toString());
    await fixture`insert into robotman_recommendation_entries (recommendation_id, guild_id, category, name, description, url) values (${randomUUID()}, 'migration-server', 'writer', 'Stored Writer', 'A preserved reading list', 'https://example.com/reading-list')`;
    const keys = generateKeyPairSync('ed25519');
    application = createApplication({ publicKey: keys.publicKey.export({ type: 'spki', format: 'der' }).subarray(-32).toString('hex'), databaseUrl: url.toString(), modules: [requestModule] });
    await application.initialize();
    await new Promise<void>(resolve => application!.server.listen(0, '127.0.0.1', resolve));
    const port = (application.server.address() as { port: number }).port;
    const body = JSON.stringify({ type: 2, id: '123', application_id: '456', token: 'token', guild_id: 'migration-server', data: { type: 1, name: 'recs', options: [{ type: 1, name: 'lookup', options: [{ type: 3, name: 'name', value: 'Stored Writer' }] }] } });
    const timestamp = String(Math.floor(Date.now() / 1000));
    const response = await fetch(`http://127.0.0.1:${port}/interactions`, { method: 'POST', body, headers: { 'x-signature-timestamp': timestamp, 'x-signature-ed25519': sign(null, Buffer.from(timestamp + body), keys.privateKey).toString('hex') } });
    const reply = await response.json();
    assert.deepEqual(reply.data.embeds, [{ title: 'Stored Writer · Writer', description: 'A preserved reading list', url: 'https://example.com/reading-list' }]);
  } finally {
    await application?.close(); await fixture?.end();
    if (created) await admin.unsafe(`DROP DATABASE "${name}"`);
    await admin.end(); await rm(folder, { recursive: true, force: true });
  }
});
