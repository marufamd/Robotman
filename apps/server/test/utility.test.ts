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

test('math uses expression syntax and rejects member access', async () => {
  assert.equal(await content('math', [{ name: 'expression', value: '(2 + 3) * 4 - 2^3' }]), '```\n12\n```');
  assert.match(await content('math', [{ name: 'expression', value: 'process.exit()' }]), /not a valid mathematical expression/);
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
