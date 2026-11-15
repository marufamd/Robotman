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

  const first = /<@([^>]+)>'s turn/.exec(String(start.data?.content))![1]!;
  const second = first === 'one' ? 'two' : 'one';
  let current = await gamesModule.handle(component(firstId, first), context);
  assert.match(String(current.data?.content), /two/);

  const stale = await gamesModule.handle(component(firstId, 'two'), context);
  assert.equal(stale.type, InteractionResponseType.UpdateMessage);
  const moves: Array<[string, number]> = [[second, 4], [first, 1], [second, 8], [first, 2]];
  let winningMove = current;
  for (const [player, square] of moves) {
    winningMove = await gamesModule.handle(component(buttonAt(current, square), player), context);
    current = winningMove;
  }
  assert.match(String(winningMove.data?.content), new RegExp(`<@${first}> wins Tic Tac Toe`));
  assert.equal((winningMove.data?.components?.[0] as any).components.every((entry: any) => entry.disabled), true);
});

test('Hangman starts with a random word and Stop finishes the game', { skip: !db }, async () => {
  const started = await gamesModule.handle(command('hangman', 'solo'), context);
  assert.equal(started.type, InteractionResponseType.ChannelMessageWithSource);
  idFrom(buttonAt(started, 0));
  const stopped = await gamesModule.handle(component(buttonAt(started, 2), 'solo'), context);
  assert.equal((stopped.data as any).embeds[0].title, 'Hangman stopped');
  assert.ok((stopped.data?.components?.[0] as any).components.every((entry: any) => entry.disabled));
});

test('Connect Four updates a persistent board and disables controls when won', { skip: !db }, async () => {
  const start = await gamesModule.handle(command('connect-four', 'red', 'yellow'), context);
  const rows = start.data?.components as any[];
  assert.equal(rows.flatMap(entry => entry.components).length, 8);
  assert.ok(rows.every(entry => entry.components.length <= 5));
  idFrom(buttonAt(start, 0));
  const startEmbed = (start.data as any).embeds[0];
  assert.match(startEmbed.title, /^🔴 (red|yellow), it's your turn!/);
  assert.ok(startEmbed.description.includes('<:blank:769981408990068836>'));
  assert.ok(startEmbed.description.endsWith('<:c1:771557387944722462><:c2:771557387907104779><:c3:771557387798577183><:c4:771557387634606091><:c5:771557388108955679><:c6:771557388057706538><:c7:771557387814567939>'));
  const first = /🔴 (red|yellow),/.exec(startEmbed.title)![1]!;
  const second = first === 'red' ? 'yellow' : 'red';
  const turns: Array<[string, number]> = [[first, 0], [second, 1], [first, 0], [second, 1], [first, 0], [second, 1], [first, 0]];
  let latest = start;
  for (const [player, column] of turns) latest = await gamesModule.handle(component(buttonAt(latest, column), player), context);
  const endEmbed = (latest.data as any).embeds[0];
  assert.equal(endEmbed.title, `🔴 ${first} wins Connect Four!`);
  assert.ok(endEmbed.description.includes('<:red:769980739361570836>'));
  assert.ok(endEmbed.description.includes('<:yellow:769980715697700874>'));
  assert.doesNotMatch(JSON.stringify(endEmbed), /<@/);
  assert.equal(endEmbed.footer, undefined);
  assert.equal((latest.data?.components as any[]).flatMap(entry => entry.components).every(entry => entry.disabled), true);

});
