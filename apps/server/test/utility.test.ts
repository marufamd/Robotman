import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Sql } from 'postgres';
import type { APIApplicationCommandInteraction } from 'discord.js';
import type { CommandContext, CommandInteraction } from '../src/commands/types.js';
import { utilityModule } from '../src/commands/utility/index.js';

function interaction(name: string, options: Array<{ name: string; value: string }> = []): CommandInteraction {
  return {
    type: 2,
    data: { type: 1, name, options: options.map((option) => ({ ...option, type: 3 })) },
  } as unknown as APIApplicationCommandInteraction;
}

function context(overrides: Partial<CommandContext> = {}): CommandContext {
  return {
    sql: {} as Sql,
    fetch: globalThis.fetch,
    startedAt: Date.now(),
    ...overrides,
  };
}

async function content(name: string, options: Array<{ name: string; value: string }> = [], ctx = context()): Promise<string> {
  const result = await utilityModule.handle(interaction(name, options), ctx);
  assert.equal(result.type, 4);
  if (result.type !== 4 || !('content' in result.data)) throw new Error('Expected a message response');
  return result.data.content ?? '';
}

test('utility module registers only the retained utility and fun commands', () => {
  assert.deepEqual(utilityModule.commands.map((command) => command.name), [
    'color', 'math', 'ping', 'stats', 'coin', 'dad-joke', 'eight-ball',
  ]);
  assert.equal(utilityModule.matches(interaction('help')), false);
  assert.equal(utilityModule.matches(interaction('math')), true);
});

test('color converts short and full hexadecimal colors and explains invalid input', async () => {
  assert.equal(await content('color', [{ name: 'hex', value: '#f0a' }]), '#FF00AA · RGB 255, 0, 170 · HSL 320°, 100%, 50%');
  assert.equal(await content('color', [{ name: 'hex', value: '336699' }]), '#336699 · RGB 51, 102, 153 · HSL 210°, 50%, 40%');
  assert.match(await content('color', [{ name: 'hex', value: 'red' }]), /color is invalid/i);
});

test('math evaluates arithmetic safely and returns useful validation messages', async () => {
  assert.equal(await content('math', [{ name: 'expression', value: '(2 + 3) * 4 - 2^3' }]), 'Result: 12');
  assert.equal(await content('math', [{ name: 'expression', value: '1 / 0' }]), 'Cannot divide by zero');
  assert.match(await content('math', [{ name: 'expression', value: '1 + process.exit()' }]), /expression is invalid/i);
  assert.match(await content('math', [{ name: 'expression', value: '9'.repeat(201) }]), /up to 200 characters/i);
});

test('ping measures an HTTP request to the Discord API and handles failure', async () => {
  let requestedUrl = '';
  const fetchStub: typeof fetch = async (input) => {
    requestedUrl = String(input);
    return new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } });
  };
  assert.match(await content('ping', [], context({ fetch: fetchStub })), /^Discord API HTTP latency: \d+ ms\.$/);
  assert.equal(requestedUrl, 'https://discord.com/api/v10/gateway');
  const unavailable: typeof fetch = async () => { throw new Error('offline'); };
  assert.match(await content('ping', [], context({ fetch: unavailable })), /could not be reached/i);
});

test('stats reports process uptime and runtime memory', async () => {
  assert.match(await content('stats', [], context({ startedAt: Date.now() - 65_000 })), /^Uptime: 0h 1m 5s · Memory: \d+ MB$/);
});

test('coin and eight-ball respond within their expected answer sets', async () => {
  assert.ok(['Heads!', 'Tails!'].includes(await content('coin')));
  assert.match(await content('eight-ball', [{ name: 'question', value: 'Will this work?' }]), /.+/);
  assert.match(await content('eight-ball', [{ name: 'question', value: '  ' }]), /Ask a question/i);
});

test('dad-joke fetches a joke and handles unavailable or invalid responses', async () => {
  let requestedUrl = '';
  const jokeFetch: typeof fetch = async (input) => {
    requestedUrl = String(input);
    return new Response(JSON.stringify({ joke: 'I only know 25 letters of the alphabet. I do not know y.' }), {
      status: 200, headers: { 'content-type': 'application/json' },
    });
  };
  assert.equal(await content('dad-joke', [], context({ fetch: jokeFetch })), 'I only know 25 letters of the alphabet. I do not know y.');
  assert.equal(requestedUrl, 'https://icanhazdadjoke.com/');
  const failed: typeof fetch = async () => new Response('', { status: 503 });
  assert.match(await content('dad-joke', [], context({ fetch: failed })), /could not fetch a dad joke/i);
});
