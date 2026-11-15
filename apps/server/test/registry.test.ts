import assert from 'node:assert/strict';
import { test } from 'node:test';
import { commandDefinitions } from '../src/commands/registry.js';

test('registration exposes the retained commands from tickets 5 through 9, all server-only', () => {
  const commands = commandDefinitions();
  const expected = ['color', 'math', 'ping', 'stats', 'coin', 'dad-joke', 'eight-ball', 'character', 'locg', 'pull', 'pull-user', 'letterboxd', 'movie', 'show', 'pokemon', 'youtube', 'connect-four', 'hangman', 'tic-tac-toe', 'release-list', 'shows', 'response', 'recs'];
  assert.deepEqual(commands.map(command => command.name).sort(), expected.sort());
  for (const command of commands) {
    assert.deepEqual(command.contexts, [0]);
    assert.deepEqual(command.integration_types, [0]);
  }
});
