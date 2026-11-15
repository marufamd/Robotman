import { execFileSync, spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { setTimeout } from 'node:timers/promises';

const name = `robotman-v7-db-test-${randomUUID().slice(0, 8)}`;
const docker = (...args) => execFileSync('docker', args, { encoding: 'utf8', timeout: 120000 }).trim();
let started = false;
try {
  docker('run', '--rm', '-d', '--name', name, '-e', 'POSTGRES_USER=robotman', '-e', 'POSTGRES_PASSWORD=test-password', '-e', 'POSTGRES_DB=robotman_test', '-p', '127.0.0.1::5432', 'postgres:17-alpine');
  started = true;
  let ready = false;
  for (let attempt = 0; attempt < 50; attempt++) {
    try { docker('exec', name, 'pg_isready', '-U', 'robotman', '-d', 'robotman_test'); ready = true; break; }
    catch { await setTimeout(200); }
  }
  if (!ready) throw new Error('Test PostgreSQL did not become ready');
  const port = docker('port', name, '5432').split(':').at(-1);
  const result = spawnSync('pnpm', ['exec', 'turbo', 'run', 'test', '--filter=@robotman/server', '--cache-dir=.turbo/cache'], {
    stdio: 'inherit', env: { ...process.env, TEST_DATABASE_URL: `postgres://robotman:test-password@127.0.0.1:${port}/robotman_test` },
  });
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
} finally { if (started) docker('stop', name); }
