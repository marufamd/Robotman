import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import postgres from 'postgres';
import { InteractionResponseType } from 'discord.js';
import { gamesModule } from '../src/commands/games/index.js';
import type { CommandContext, CommandInteraction } from '../src/commands/types.js';

const databaseUrl = process.env.TEST_DATABASE_URL;
const db = databaseUrl ? postgres(databaseUrl) : undefined;
const created: string[] = [];
let context: CommandContext;

before(async () => {
  if (!db) return;
  context = { sql: db, fetch, startedAt: Date.now() };
  await gamesModule.start?.(context);
});

after(async () => {
  if (!db) return;
  if (created.length) await db`DELETE FROM robotman_game_sessions WHERE session_id IN ${db(created)}`;
  await db.end();
});

function command(game: string, player: string, opponent?: string): CommandInteraction {
  return {
    type: 2,
    guild_id: 'test-guild',
    channel_id: 'test-channel',
    member: { user: { id: player } },
    data: { name: game, options: opponent ? [{ name: 'opponent', type: 6, value: opponent }] : [] },
  } as unknown as CommandInteraction;
}

function component(customId: string, player: string): CommandInteraction {
  return {
    type: 3,
    guild_id: 'test-guild',
    channel_id: 'test-channel',
    member: { user: { id: player } },
    data: { custom_id: customId, component_type: 2 },
  } as unknown as CommandInteraction;
}

function modal(customId: string, player: string, value: string, field: string): CommandInteraction {
  return {
    type: 5,
    guild_id: 'test-guild',
    channel_id: 'test-channel',
    member: { user: { id: player } },
    data: {
      custom_id: customId,
      components: [{ type: 1, components: [{ type: 4, custom_id: field, value }] }],
    },
  } as unknown as CommandInteraction;
}

function idFrom(customId: string) {
  const id = customId.split(':')[1];
  created.push(id);
  return id;
}

function buttonAt(interactionResponse: any, index: number) {
  return interactionResponse.data.components.flatMap((entry: any) => entry.components)[index].custom_id as string;
}

test('Tic Tac Toe moves persist across interactions and reject nonparticipants', { skip: !db }, async () => {
  const start = await gamesModule.handle(command('tic-tac-toe', 'one', 'two'), context);
  assert.equal(start.type, InteractionResponseType.ChannelMessageWithSource);
  const firstId = buttonAt(start, 0);
  idFrom(firstId);
  const unauthorized = await gamesModule.handle(component(firstId, 'outsider'), context);
  assert.equal(unauthorized.data?.flags, 64);

  let current = await gamesModule.handle(component(firstId, 'one'), context);
  assert.match(String(current.data?.content), /two/);

  const stale = await gamesModule.handle(component(firstId, 'two'), context);
  assert.equal(stale.type, InteractionResponseType.UpdateMessage);
  const moves: Array<[string, number]> = [['two', 4], ['one', 1], ['two', 8], ['one', 2]];
  let winningMove = current;
  for (const [player, square] of moves) {
    winningMove = await gamesModule.handle(component(buttonAt(current, square), player), context);
    current = winningMove;
  }
  assert.match(String(winningMove.data?.content), /<@one> wins Tic Tac Toe/);
  assert.equal((winningMove.data?.components?.[0] as any).components.every((entry: any) => entry.disabled), true);
});

test('Hangman uses a private setup modal, a guess modal, and reports completion', { skip: !db }, async () => {
  const setup = await gamesModule.handle(command('hangman', 'setter', 'guesser'), context);
  assert.equal(setup.type, InteractionResponseType.Modal);
  const setupId = (setup.data as any).custom_id;
  idFrom(setupId);
  const started = await gamesModule.handle(modal(setupId, 'setter', 'cat', 'word'), context);
  assert.equal(started.type, InteractionResponseType.ChannelMessageWithSource);
  assert.match(String(started.data?.content), /＿ ＿ ＿/);

  let current = started;
  const wrongPlayer = await gamesModule.handle(component(buttonAt(current, 0), 'setter'), context);
  assert.equal(wrongPlayer.data?.flags, 64);
  for (const letter of ['a', 'c', 't']) {
    const guessModal = await gamesModule.handle(component(buttonAt(current, 0), 'guesser'), context);
    assert.equal(guessModal.type, InteractionResponseType.Modal);
    current = await gamesModule.handle(modal((guessModal.data as any).custom_id, 'guesser', letter, 'letter'), context);
    assert.equal(current.type, InteractionResponseType.UpdateMessage);
  }
  assert.match(String(current.data?.content), /wins Hangman/);
  assert.equal((current.data?.components?.[0] as any).components[0].disabled, true);

  const soloSetup = await gamesModule.handle(command('hangman', 'solo'), context);
  const soloSetupId = (soloSetup.data as any).custom_id;
  const soloId = idFrom(soloSetupId);
  const soloStarted = await gamesModule.handle(modal(soloSetupId, 'solo', 'ok', 'word'), context);
  assert.equal(soloStarted.type, InteractionResponseType.ChannelMessageWithSource);
  await db!`UPDATE robotman_game_sessions SET expires_at = now() - interval '1 second' WHERE session_id = ${soloId}`;
  const expired = await gamesModule.handle(component(buttonAt(soloStarted, 0), 'solo'), context);
  assert.match(String(expired.data?.content), /expired after 30 minutes/);
  assert.equal((expired.data?.components?.[0] as any).components[0].disabled, true);
});

test('Connect Four updates a persistent board and disables controls when won', { skip: !db }, async () => {
  const start = await gamesModule.handle(command('connect-four', 'red', 'yellow'), context);
  const rows = start.data?.components as any[];
  assert.equal(rows.flatMap(entry => entry.components).length, 7);
  assert.ok(rows.every(entry => entry.components.length <= 5));
  idFrom(buttonAt(start, 0));
  const turns: Array<[string, number]> = [
    ['red', 0], ['yellow', 1], ['red', 0], ['yellow', 1], ['red', 0], ['yellow', 1], ['red', 0],
  ];
  let latest = start;
  for (const [player, column] of turns) latest = await gamesModule.handle(component(buttonAt(latest, column), player), context);
  assert.match(String(latest.data?.content), /<@red> wins Connect Four/);
  assert.equal((latest.data?.components as any[]).flatMap(entry => entry.components).every(entry => entry.disabled), true);

});
