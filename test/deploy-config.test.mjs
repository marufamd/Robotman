import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';

const env = { ...process.env, POSTGRES_PASSWORD: 'x', DISCORD_PUBLIC_KEY: 'y', ROBOTMAN_IMAGE: 'ghcr.io/example/robotman-server:test', DASHBOARD_ORIGIN: 'https://dash.example.vercel.app', SESSION_SECRET: 'z' };
const compose = (file, ...args) => execFileSync('docker', ['compose', '-f', file, ...args], { encoding: 'utf8', env });

test('the Robotman stack publishes no ports and joins the shared edge network', () => {
  const file = 'deploy/robotman/compose.yaml';
  assert.deepEqual(compose(file, 'config', '--services').trim().split('\n').sort(), ['postgres', 'server']);
  const config = JSON.parse(compose(file, 'config', '--format', 'json'));
  assert.equal(config.services.server.image, 'ghcr.io/example/robotman-server:test');
  assert.equal(config.services.server.build, undefined);
  assert.equal(config.services.server.ports, undefined, 'only the shared proxy is reachable from outside');
  assert.equal(config.services.postgres.ports, undefined, 'PostgreSQL must not be published to the host');
  assert.ok('edge' in config.services.server.networks, 'the server must be reachable from the shared proxy');
  assert.equal('edge' in config.services.postgres.networks, false, 'the database stays off the shared network');
  assert.equal(config.networks.edge.external, true);
  assert.equal(config.services.server.container_name, 'robotman-server');
  assert.equal(config.services.server.environment.DASHBOARD_ORIGIN, 'https://dash.example.vercel.app');
  assert.match(config.services.server.environment.DATABASE_URL, /@postgres:5432\//);
});

test('CI and deployment workflows exist and the deploy workflow publishes to GHCR before updating the box', () => {
  assert.ok(existsSync('.github/workflows/ci.yaml'));
  const deploy = readFileSync('.github/workflows/deploy-server.yaml', 'utf8');
  assert.match(deploy, /ghcr\.io/);
  assert.match(deploy, /docker compose .*pull/);
  assert.match(deploy, /--wait/);
  assert.doesNotMatch(deploy, /\/opt\/edge|caddy reload/, 'the shared proxy is managed by the server-config repository');
  assert.equal(existsSync('deploy/edge'), false);
  assert.match(deploy, /docker logout ghcr\.io/, 'the temporary registry token must not stay on the server');
  assert.match(deploy, /needs: changes/, 'dashboard-only commits must not redeploy the server');
  assert.doesNotMatch(deploy, /(password|secret|token)\s*:\s*['"]?[A-Za-z0-9]{12,}/i, 'no inline credentials');
});
