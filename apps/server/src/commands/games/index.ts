import { migrateDatabase } from '../../database/migrate.js';
import { randomUUID } from 'node:crypto';
import {
  ApplicationCommandOptionType,
  ButtonStyle,
  ComponentType,
  InteractionResponseType,
} from 'discord.js';
import type {
  APIApplicationCommandInteraction,
  APIInteractionResponse,
  APIMessageComponentInteraction,
  APIModalSubmitInteraction,
  RESTPostAPIChatInputApplicationCommandsJSONBody,
} from 'discord.js';
import type { CommandContext, CommandInteraction, CommandModule } from '../types.js';

type GameName = 'connect-four' | 'hangman' | 'tic-tac-toe';
type Session = {
  session_id: string;
  game: GameName;
  guild_id: string;
  channel_id: string;
  players: string[];
  state: Record<string, any>;
  status: 'setting' | 'active' | 'finished' | 'expired';
  expires_at: Date | string;
};

const lifetimeMs = 30 * 60 * 1000;
const commandNames = new Set<GameName>(['connect-four', 'hangman', 'tic-tac-toe']);
const option = (name: string, description: string, required = true) => ({
  type: ApplicationCommandOptionType.User as const,
  name,
  description,
  required,
});

const commands: RESTPostAPIChatInputApplicationCommandsJSONBody[] = [
  {
    type: 1,
    name: 'connect-four',
    description: 'Play Connect Four against another member.',
    options: [option('opponent', 'The member you want to play against.')],
  },
  {
    type: 1,
    name: 'hangman',
    description: 'Play Hangman solo or challenge another member.',
    options: [option('opponent', 'Optional challenger. Omit to play solo.', false)],
  },
  {
    type: 1,
    name: 'tic-tac-toe',
    description: 'Play Tic Tac Toe against another member.',
    options: [option('opponent', 'The member you want to play against.')],
  },
];

function response(type: InteractionResponseType, data: Record<string, unknown>): APIInteractionResponse {
  return { type, data } as APIInteractionResponse;
}

function row(components: unknown[]) {
  return { type: ComponentType.ActionRow, components };
}

function button(label: string, customId: string, disabled = false) {
  return {
    type: ComponentType.Button,
    style: ButtonStyle.Secondary,
    label,
    custom_id: customId,
    disabled,
  };
}

function textInput(customId: string, label: string, maxLength: number) {
  return {
    type: ComponentType.ActionRow,
    components: [{
      type: ComponentType.TextInput,
      custom_id: customId,
      label,
      style: 1,
      min_length: 1,
      max_length: maxLength,
      required: true,
    }],
  };
}

function isCommand(interaction: CommandInteraction): interaction is APIApplicationCommandInteraction {
  return interaction.type === 2;
}
function isComponent(interaction: CommandInteraction): interaction is APIMessageComponentInteraction {
  return interaction.type === 3;
}
function isModal(interaction: CommandInteraction): interaction is APIModalSubmitInteraction {
  return interaction.type === 5;
}

function getOption(interaction: APIApplicationCommandInteraction, name: string): string | undefined {
  if (!('options' in interaction.data)) return undefined;
  const option = interaction.data.options?.find(item => item.name === name);
  return option && 'value' in option ? String(option.value) : undefined;
}

function getCustomId(interaction: APIMessageComponentInteraction | APIModalSubmitInteraction) {
  return interaction.data.custom_id;
}

function getModalValue(interaction: APIModalSubmitInteraction, customId: string): string | undefined {
  for (const actionRow of interaction.data.components) {
    if (!('components' in actionRow)) continue;
    for (const component of actionRow.components) {
      if (component.custom_id === customId && 'value' in component) return component.value;
    }
  }
  return undefined;
}

function userId(interaction: CommandInteraction) {
  return interaction.member?.user?.id ?? interaction.user?.id;
}

function mention(id: string) { return `<@${id}>`; }

function fourInARow(board: Array<Array<string | null>>, player: string): boolean {
  const directions: Array<[number, number]> = [[0, 1], [1, 0], [1, 1], [1, -1]];
  for (let r = 0; r < 6; r++) for (let c = 0; c < 7; c++) {
    if (board[r]?.[c] !== player) continue;
    for (const [dr, dc] of directions) {
      if ([1, 2, 3].every(step => board[r + dr * step]?.[c + dc * step] === player)) return true;
    }
  }
  return false;
}

function ticWinner(board: Array<Array<string | null>>): string | undefined {
  const lines: Array<Array<[number, number]>> = [
    [[0, 0], [0, 1], [0, 2]], [[1, 0], [1, 1], [1, 2]], [[2, 0], [2, 1], [2, 2]],
    [[0, 0], [1, 0], [2, 0]], [[0, 1], [1, 1], [2, 1]], [[0, 2], [1, 2], [2, 2]],
    [[0, 0], [1, 1], [2, 2]], [[0, 2], [1, 1], [2, 0]],
  ];
  for (const line of lines) {
    const start = line[0];
    if (!start) continue;
    const first = board[start[0]]?.[start[1]];
    if (first && line.every(([r, c]) => board[r]?.[c] === first)) return first;
  }
  return undefined;
}

function render(session: Session, id: string) {
  if (session.game === 'connect-four') {
    const board = session.state.board as Array<Array<string | null>>;
    const symbols: Record<string, string> = { [session.players[0] ?? '']: '🔴', [session.players[1] ?? '']: '🟡' };
    const grid = board.map(line => line.map(cell => cell ? symbols[cell] : '⚪').join('')).join('\n');
    const revision = session.state.revision ?? 0;
    const controls = Array.from({ length: 7 }, (_, c) => button(String(c + 1), `gm:${id}:drop:${c}:${revision}`, session.status !== 'active' || board[0]?.[c] !== null));
    const rows = [row(controls.slice(0, 4)), row(controls.slice(4))];
    return { content: `${grid}\n\n${session.status === 'active' ? `${mention(session.state.turn ?? '')}'s turn.` : session.state.result ?? ''}`, components: rows };
  }
  if (session.game === 'tic-tac-toe') {
    const board = session.state.board as Array<Array<string | null>>;
    const symbols: Record<string, string> = { [session.players[0] ?? '']: '❌', [session.players[1] ?? '']: '⭕' };
    const grid = board.map(line => line.map(cell => cell ? symbols[cell] : '⬜').join('')).join('\n');
    const revision = session.state.revision ?? 0;
    const rows = board.map((line, r) => row(line.map((cell, c) => button(cell ? symbols[cell] ?? '·' : '·', `gm:${id}:mark:${r * 3 + c}:${revision}`, Boolean(cell) || session.status !== 'active'))));
    return { content: `${grid}\n\n${session.status === 'active' ? `${mention(session.state.turn ?? '')}'s turn.` : session.state.result ?? ''}`, components: rows };
  }
  const wrong = session.state.wrong as string[];
  const word = session.state.word as string;
  const guessed = session.state.guessed as string[];
  const visible = [...word].map(ch => ch === ' ' ? '　' : guessed.includes(ch) ? ch.toUpperCase() : '＿').join(' ');
  const remaining = Math.max(0, 6 - wrong.length);
  const content = session.status === 'active'
    ? `Hangman for ${mention(session.players[0] ?? '')} vs ${mention(session.players[1] ?? '')}\n\n${visible}\nWrong guesses: ${wrong.length ? wrong.join(', ') : 'none'} (${remaining} tries left).`
    : `${session.state.result}${session.status === 'expired' ? ` The word was **${word}**.` : ''}\n\n${visible}\nWrong guesses: ${wrong.length ? wrong.join(', ') : 'none'}.`;
  return {
    content,
    components: [row([button('Guess a letter', `gm:${id}:guess:${session.state.revision ?? 0}`, session.status !== 'active')])],
  };
}

function validTurn(session: Session, actor: string) {
  return session.status === 'active' && session.state.turn === actor;
}

function messageResponse(session: Session, id: string, type = InteractionResponseType.ChannelMessageWithSource): APIInteractionResponse {
  const data = render(session, id);
  return response(type, { ...data, allowed_mentions: { parse: [] } });
}

function errorReply(content: string): APIInteractionResponse {
  return response(InteractionResponseType.ChannelMessageWithSource, { content, flags: 64 });
}

export const gamesModule: CommandModule = {
  commands,
  matches(interaction) {
    if (isCommand(interaction)) return commandNames.has(interaction.data.name as GameName);
    if (isComponent(interaction) || isModal(interaction)) return getCustomId(interaction).startsWith('gm:');
    return false;
  },

  async start({ sql }) { await migrateDatabase(sql); },

  async handle(interaction, context) {
    if (!interaction.guild_id) return errorReply('Games can only be played in a server.');
    const actor = userId(interaction);
    if (!actor) return errorReply('Could not identify the player for this interaction.');

    if (isCommand(interaction)) {
      const game = interaction.data.name as GameName;
      const opponent = getOption(interaction, 'opponent');
      if (!commandNames.has(game) || (!opponent && game !== 'hangman')) return errorReply('Choose an opponent to start this game.');
      if (opponent === actor) return errorReply('Choose another member as your opponent.');
      const id = randomUUID();
      const players = [actor, opponent ?? actor];
      const base = {
        session_id: id,
        game,
        guild_id: interaction.guild_id,
        channel_id: interaction.channel_id ?? '',
        players,
        expires_at: new Date(Date.now() + lifetimeMs),
      };
      if (game === 'hangman') {
        const state = { setter: actor };
        await context.sql`INSERT INTO robotman_game_sessions ${context.sql({ ...base, state, status: 'setting' })}`;
        return response(InteractionResponseType.Modal, {
          custom_id: `gm:${id}:setword:0`,
          title: 'Choose the Hangman word',
          components: [textInput('word', 'Word or short phrase (letters and spaces)', 24)],
        });
      }
      const state = game === 'connect-four'
        ? { board: Array.from({ length: 6 }, () => Array(7).fill(null)), turn: actor, result: '', revision: 0 }
        : { board: Array.from({ length: 3 }, () => Array(3).fill(null)), turn: actor, result: '', revision: 0 };
      await context.sql`INSERT INTO robotman_game_sessions ${context.sql({ ...base, state, status: 'active' })}`;
      const session: Session = { ...base, players, state, status: 'active', expires_at: base.expires_at } as Session;
      return messageResponse(session, id);
    }

    const customId = getCustomId(interaction);
    const match = /^gm:([\da-f-]{36}):([a-z]+)(?::(\d+))?(?::(\d+))?$/.exec(customId);
    if (!match) return errorReply('This game control is invalid. Start a new game.');
    const id = match[1];
    const action = match[2];
    const argument = match[3];
    const revisionText = match[4];
    if (!id || !action) return errorReply('This game control is invalid. Start a new game.');

    if (action === 'setword' && isModal(interaction)) {
      const raw = getModalValue(interaction, 'word')?.trim().toLocaleLowerCase();
      if (!raw || !/^[a-z]+(?:[ ]+[a-z]+)*$/.test(raw)) return errorReply('Use letters and spaces only for the Hangman word.');
      const result = await context.sql.begin(async tx => {
        await tx`SELECT pg_advisory_xact_lock(hashtext(${id}))`;
        const [session] = await tx<Session[]>`SELECT * FROM robotman_game_sessions WHERE session_id = ${id} FOR UPDATE`;
        if (!session || session.status !== 'setting') return { error: 'This Hangman setup expired. Start a new game.' };
        session.players = session.players as unknown as string[];
        session.state = session.state as unknown as Record<string, any>;
        if (session.state.setter !== actor || session.guild_id !== interaction.guild_id || session.channel_id !== (interaction.channel_id ?? '')) {
          return { error: 'Only the person who started this game can set its word.' };
        }
        if (new Date(session.expires_at).getTime() <= Date.now()) {
          await tx`UPDATE robotman_game_sessions SET status = 'expired' WHERE session_id = ${id}`;
          return { error: 'This Hangman setup expired. Start a new game.' };
        }
        session.state = { word: raw, guessed: [], wrong: [], turn: session.players[1] ?? '', result: '', revision: 0 };
        session.status = 'active';
        session.expires_at = new Date(Date.now() + lifetimeMs);
        await tx`UPDATE robotman_game_sessions SET state = ${tx.json(session.state)}, status = 'active', expires_at = ${session.expires_at} WHERE session_id = ${id}`;
        return { session };
      });
      if ('error' in result && result.error) return errorReply(result.error);
      if (!('session' in result) || !result.session) return errorReply('This Hangman setup expired. Start a new game.');
      return messageResponse(result.session, id);
    }

    if (action === 'guess' && isComponent(interaction)) {
      const session = await loadSession(context, id);
      if (!session) return errorReply('This Hangman game no longer exists. Start a new game.');
      if (session.guild_id !== interaction.guild_id || session.channel_id !== (interaction.channel_id ?? session.channel_id)) {
        return errorReply('This game control belongs to another server or channel.');
      }
      if (!session.players.includes(actor)) return errorReply('You are not a player in this game.');
      if (session.status !== 'active' || new Date(session.expires_at).getTime() <= Date.now()) {
        if (session.status !== 'finished') {
          await expire(context, id);
          session.status = 'expired';
          session.state.result = 'This game expired after 30 minutes.';
          return messageResponse(session, id, InteractionResponseType.UpdateMessage);
        }
        return messageResponse(session, id, InteractionResponseType.UpdateMessage);
      }
      if (actor !== (session.players[1] ?? session.players[0])) return errorReply('Only the challenged player can guess in this Hangman game.');
      return response(InteractionResponseType.Modal, {
        custom_id: `gm:${id}:letter:${argument ?? '0'}`,
        title: 'Guess a letter',
        components: [textInput('letter', 'Enter one letter', 1)],
      });
    }

    if (action === 'letter' && isModal(interaction)) {
      return updateSession(context, id, interaction, actor, (session) => {
        if (session.game !== 'hangman' || actor !== (session.players[1] ?? session.players[0])) return 'Only the challenged player can guess in this Hangman game.';
        const letter = getModalValue(interaction, 'letter')?.trim().toLocaleLowerCase();
        if (!letter || !/^[a-z]$/.test(letter)) return 'Enter one letter from A to Z.';
        if (session.state.guessed.includes(letter) || session.state.wrong.includes(letter)) return `${letter.toUpperCase()} was already guessed.`;
        if (session.state.word.includes(letter)) session.state.guessed.push(letter);
        else session.state.wrong.push(letter);
        const won = [...session.state.word].filter((char: string) => char !== ' ').every((char: string) => session.state.guessed.includes(char));
        if (won) { session.status = 'finished'; session.state.result = `${mention(actor)} wins Hangman!`; }
        else if (session.state.wrong.length >= 6) { session.status = 'finished'; session.state.result = `Out of guesses. The word was **${session.state.word}**.`; }
        return undefined;
      }, true, Number(argument));
    }

    const expected = action === 'drop' || action === 'mark';
    if (expected && isComponent(interaction)) {
      const col = Number(argument);
      const revision = Number(revisionText);
      return updateSession(context, id, interaction, actor, session => {
        if (session.game === 'connect-four' && action === 'drop') {
          if (!validTurn(session, actor)) return 'Wait for your turn, or start a new game if this one has ended.';
          if (!Number.isInteger(col) || col < 0 || col > 6) return 'That column is invalid.';
          const board = session.state.board as Array<Array<string | null>>;
          let target = -1;
          for (let r = board.length - 1; r >= 0; r--) if (board[r]?.[col] === null) { target = r; break; }
          if (target < 0) return 'That column is full.';
          const targetRow = board[target];
          if (!targetRow) return 'That column is full.';
          targetRow[col] = actor;
          if (fourInARow(board, actor)) { session.status = 'finished'; session.state.result = `${mention(actor)} wins Connect Four!`; }
          else if (board[0]?.every(Boolean)) { session.status = 'finished'; session.state.result = 'Connect Four is a draw.'; }
          else session.state.turn = session.players.find(player => player !== actor);
          return undefined;
        }
        if (session.game === 'tic-tac-toe' && action === 'mark') {
          if (!validTurn(session, actor)) return 'Wait for your turn, or start a new game if this one has ended.';
          if (!Number.isInteger(col) || col < 0 || col > 8) return 'That square is invalid.';
          const board = session.state.board as Array<Array<string | null>>;
          const r = Math.floor(col / 3), c = col % 3;
          const targetRow = board[r];
          if (!targetRow) return 'That square is invalid.';
          if (targetRow[c]) return 'That square is already taken.';
          targetRow[c] = actor;
          const winner = ticWinner(board);
          if (winner) { session.status = 'finished'; session.state.result = `${mention(winner)} wins Tic Tac Toe!`; }
          else if (board.every(line => line.every(Boolean))) { session.status = 'finished'; session.state.result = 'Tic Tac Toe is a draw.'; }
          else session.state.turn = session.players.find(player => player !== actor);
          return undefined;
        }
        return 'This control does not belong to that game.';
      }, false, revision);
    }
    return errorReply('This game action is no longer available.');
  },
};

async function loadSession(context: CommandContext, id: string): Promise<Session | undefined> {
  const [session] = await context.sql<Session[]>`SELECT * FROM robotman_game_sessions WHERE session_id = ${id}`;
  if (!session) return undefined;
  return { ...session, players: session.players as unknown as string[], state: session.state as unknown as Record<string, any> };
}

async function expire(context: CommandContext, id: string) {
  await context.sql`UPDATE robotman_game_sessions SET status = 'expired', state = jsonb_set(state, '{result}', '"This game expired after 30 minutes."') WHERE session_id = ${id} AND status IN ('setting', 'active')`;
}

async function updateSession(
  context: CommandContext,
  id: string,
  interaction: APIMessageComponentInteraction | APIModalSubmitInteraction,
  actor: string,
  mutate: (session: Session) => string | undefined,
  fromModal = false,
  expectedRevision?: number,
): Promise<APIInteractionResponse> {
  const result = await context.sql.begin(async tx => {
    await tx`SELECT pg_advisory_xact_lock(hashtext(${id}))`;
    const [raw] = await tx<Session[]>`SELECT * FROM robotman_game_sessions WHERE session_id = ${id} FOR UPDATE`;
    if (!raw) return { error: 'This game no longer exists. Start a new game.' };
    const session = { ...raw, players: raw.players as unknown as string[], state: raw.state as unknown as Record<string, any> };
    if (session.guild_id !== interaction.guild_id || session.channel_id !== (interaction.channel_id ?? session.channel_id)) {
      return { error: 'This game control belongs to another server or channel.' };
    }
    if (!session.players.includes(actor)) return { error: 'You are not a player in this game.' };
    if (session.status === 'finished') return { session, finished: true };
    if (session.status === 'expired' || new Date(session.expires_at).getTime() <= Date.now()) {
      session.status = 'expired';
      session.state.result = 'This game expired after 30 minutes.';
      await tx`UPDATE robotman_game_sessions SET status = 'expired', state = ${tx.json(session.state)} WHERE session_id = ${id}`;
      return { session, finished: true };
    }
    if (session.status !== 'active') return { error: 'This game has not been set up yet.' };
    if (expectedRevision !== undefined && (session.state.revision ?? 0) !== expectedRevision) {
      return { session, stale: true };
    }
    const error = mutate(session);
    if (error) return { error };
    session.state.revision = (session.state.revision ?? 0) + 1;
    session.expires_at = new Date(Date.now() + lifetimeMs);
    await tx`UPDATE robotman_game_sessions SET state = ${tx.json(session.state)}, status = ${session.status}, expires_at = ${session.expires_at} WHERE session_id = ${id}`;
    return { session, finished: false };
  });
  if (result.error) return errorReply(result.error);
  if (!result.session) return errorReply('This game no longer exists. Start a new game.');
  if (result.stale && fromModal) return errorReply('The game changed while this modal was open. Open the current game control to try again.');
  const update = messageResponse(result.session, id, InteractionResponseType.UpdateMessage);
  if (fromModal) return update;
  return update;
}
