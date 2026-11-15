import { readFileSync } from 'node:fs';
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

const words: string[] = JSON.parse(readFileSync(new URL('../../../assets/words.json', import.meta.url), 'utf8'));
const durationFor = (game: GameName) => game === 'tic-tac-toe' ? 20_000 : 60_000;
const now = (context: CommandContext) => context.now?.().getTime() ?? Date.now();
const timers = new Map<CommandContext['sql'], { timer: ReturnType<typeof setInterval>; pending?: Promise<void> }>();
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
    description: 'Play Connect Four against Robotman or another member.',
    options: [option('opponent', 'Optional opponent. Omit to play against Robotman.', false)],
  },
  {
    type: 1,
    name: 'hangman',
    description: 'Guess a random word in Hangman.',
  },
  {
    type: 1,
    name: 'tic-tac-toe',
    description: 'Play Tic Tac Toe against Robotman or another member.',
    options: [option('opponent', 'Optional opponent. Omit to play against Robotman.', false)],
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

const botNameCache = new Map<string, { name: string; expires: number }>();
async function botName(context: CommandContext): Promise<string> {
  if (!context.botToken) return 'Robotman';
  const cached = botNameCache.get(context.botToken);
  if (cached && cached.expires > Date.now()) return cached.name;
  try {
    const result = await context.fetch('https://discord.com/api/v10/users/@me', { headers: { authorization: `Bot ${context.botToken}` }, signal: AbortSignal.timeout(2000) });
    if (!result.ok) return 'Robotman';
    const user = await result.json() as { username?: unknown };
    if (typeof user.username !== 'string' || !user.username.trim()) return 'Robotman';
    botNameCache.set(context.botToken, { name: user.username, expires: Date.now() + 300_000 });
    return user.username;
  } catch { return 'Robotman'; }
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

function gallows(wrong: number) {
  return '```diff\n' + [' ----------', ' |        |', ` |        ${wrong >= 1 ? '😐' : ''}`, ` |      ${wrong >= 3 ? '🤛' : '  '}${wrong >= 2 ? '👕' : '  '}${wrong >= 4 ? '🤜' : ''}`, ` |        ${wrong >= 5 ? '👖' : ''}`, ` |       ${wrong >= 6 ? '👞' : '  '}${wrong >= 7 ? '👞' : ''}`, ' |', '-------------'].map((line, i) => (wrong >= i + 1 ? '-' : '+') + line).join('\n') + '\n```';
}
function makeMove(session: Session, player: string, position: number) {
  const board = session.state.board as Array<Array<string | null>>;
  if (session.game === 'connect-four') { for (let r = 5; r >= 0; r--) if (!board[r]![position]) { board[r]![position] = player; break; } }
  else board[Math.floor(position / 3)]![position % 3] = player;
  const winner = session.game === 'connect-four' ? fourInARow(board, player) ? player : undefined : ticWinner(board);
  if (winner) { session.status = 'finished'; session.state.winner = winner; session.state.result = `${mention(winner)} wins ${session.game === 'connect-four' ? 'Connect Four' : 'Tic Tac Toe'}!`; }
  else if (session.game === 'connect-four' ? board[0]!.every(Boolean) : board.every(line => line.every(Boolean))) { session.status = 'finished'; session.state.result = 'The game is a draw!'; }
  else session.state.turn = session.players.find(id => id !== player);
}
function bestMove(session: Session, player: string): number {
  const board = session.state.board as Array<Array<string | null>>;
  const other = session.players.find(id => id !== player)!;
  const options = () => session.game === 'connect-four' ? [3, 2, 4, 1, 5, 0, 6].filter(c => !board[0]![c]) : Array.from({ length: 9 }, (_, i) => i).filter(i => !board[Math.floor(i / 3)]![i % 3]);
  const winner = (p: string) => session.game === 'connect-four' ? fourInARow(board, p) : ticWinner(board) === p;
  function search(turn: string, depth: number, alpha: number, beta: number): number {
    if (winner(player)) return 10000 + depth;
    if (winner(other)) return -10000 - depth;
    const choices = options(); if (!choices.length) return 0;
    if (!depth) { // Favor center control and open four-cell windows.
      let score = 0;
      if (session.game === 'connect-four') {
        for (const line of board) score += line[3] === player ? 3 : line[3] === other ? -3 : 0;
        for (let r = 0; r < 6; r++) for (let c = 0; c < 7; c++) for (const [dr, dc] of [[0, 1], [1, 0], [1, 1], [1, -1]]) {
          const cells = Array.from({ length: 4 }, (_, n) => board[r + dr! * n]?.[c + dc! * n]);
          if (cells.some(cell => cell === undefined)) continue;
          const mine = cells.filter(cell => cell === player).length, theirs = cells.filter(cell => cell === other).length;
          if (!theirs) score += [0, 1, 5, 40, 10000][mine]!;
          if (!mine) score -= [0, 1, 5, 40, 10000][theirs]!;
        }
      }
      return score;
    }
    let value = turn === player ? -Infinity : Infinity;
    for (const move of choices) {
      const r = session.game === 'connect-four' ? board.map(line => line[move]).lastIndexOf(null) : Math.floor(move / 3), c = session.game === 'connect-four' ? move : move % 3;
      board[r]![c] = turn; const result = search(turn === player ? other : player, depth - 1, alpha, beta); board[r]![c] = null;
      value = turn === player ? Math.max(value, result) : Math.min(value, result);
      if (turn === player) alpha = Math.max(alpha, value); else beta = Math.min(beta, value);
      if (beta <= alpha) break;
    }
    return value;
  }
  let best = options()[0]!, score = -Infinity;
  for (const move of options()) {
    const r = session.game === 'connect-four' ? board.map(line => line[move]).lastIndexOf(null) : Math.floor(move / 3), c = session.game === 'connect-four' ? move : move % 3;
    board[r]![c] = player; const value = search(other, session.game === 'connect-four' ? 4 : 8, -Infinity, Infinity); board[r]![c] = null;
    if (value > score) { best = move; score = value; }
  }
  return best;
}
function playBot(session: Session) {
  if (session.game !== 'hangman' && session.status === 'active' && session.state.bot && session.state.turn === session.state.bot) makeMove(session, session.state.bot, bestMove(session, session.state.bot));
}

function render(session: Session, id: string) {
  if (session.game === 'connect-four') {
    const board = session.state.board as Array<Array<string | null>>;
    const indicators: Record<string, string> = { [session.players[0] ?? '']: '🔴', [session.players[1] ?? '']: '🟡' };
    const pieces: Record<string, string> = { [session.players[0] ?? '']: '<:red:769980739361570836>', [session.players[1] ?? '']: '<:yellow:769980715697700874>' };
    const numbers = '<:c1:771557387944722462><:c2:771557387907104779><:c3:771557387798577183><:c4:771557387634606091><:c5:771557388108955679><:c6:771557388057706538><:c7:771557387814567939>';
    const grid = board.map(line => line.map(cell => cell ? pieces[cell] ?? '<:blank:769981408990068836>' : '<:blank:769981408990068836>').join('')).join('\n') + `\n${numbers}`;
    const name = (player: string) => session.state.names?.[player] ?? `Player ${session.players.indexOf(player) + 1}`;
    const legacyWinner = /<@([^>]+)> wins Connect Four/.exec(session.state.result ?? '')?.[1];
    const winner = session.state.winner ?? legacyWinner;
    const title = session.status === 'active' ? `${indicators[session.state.turn]} ${name(session.state.turn)}, it's your turn!`
      : winner ? `${indicators[winner]} ${name(winner)} wins Connect Four!` : (session.state.result ?? 'Game ended.').replace(/<@([^>]+)>/g, (_: string, player: string) => name(player));
    const revision = session.state.revision ?? 0;
    const controls = Array.from({ length: 7 }, (_, c) => button(String(c + 1), `gm:${id}:drop:${c}:${revision}`, session.status !== 'active' || board[0]?.[c] !== null));
    const rows = [row(controls.slice(0, 4)), row([...controls.slice(4), { ...button('Forfeit', `gm:${id}:forfeit:0:${revision}`, session.status !== 'active'), style: ButtonStyle.Danger }])];
    const notice = (session.state.notice ?? (winner && session.state.result?.includes('forfeited') ? `${name(session.players.find(player => player !== winner)!)} forfeited.` : '')).replace(/<@([^>]+)>/g, (_: string, player: string) => name(player));
    return { content: `${name(session.players[0]!)} vs. ${name(session.players[1]!)}${notice ? `\n\n${notice}` : ''}`, embeds: [{ title, color: 813765, description: grid, ...(session.status === 'active' ? { fields: [{ name: 'Time', value: '<:Timer:654794151841366058>', inline: true }], footer: { text: 'You have 1 minute to make a move, or your move will be made for you.' } } : {}) }], components: rows };
  }
  if (session.game === 'tic-tac-toe') {
    const board = session.state.board as Array<Array<string | null>>;
    const symbols: Record<string, string> = { [session.players[0] ?? '']: '❌', [session.players[1] ?? '']: '⭕' };
    const grid = board.map(line => line.map(cell => cell ? symbols[cell] : '⬜').join('')).join('\n');
    const revision = session.state.revision ?? 0;
    const rows = board.map((line, r) => row(line.map((cell, c) => button(cell ? symbols[cell] ?? '·' : '·', `gm:${id}:mark:${r * 3 + c}:${revision}`, Boolean(cell) || session.status !== 'active'))));
    return { content: `${mention(session.players[0]!)} vs. ${mention(session.players[1]!)}${session.state.notice ? `\n${session.state.notice}` : ''}\n\n${session.status === 'active' ? `${mention(session.state.turn ?? '')}'s turn. You have 20 seconds.` : session.state.result ?? ''}`, components: rows };

  }
  const wrong = session.state.wrong as string[];
  const word = session.state.word as string;
  const guessed = session.state.guessed as string[];
  const visible = [...word].map(ch => ch === ' ' ? '　' : guessed.includes(ch) ? ch.toUpperCase() : '＿').join(' ');
  return {
    // Clear text left by a game started before this change when updating its message.
    content: null,
    embeds: [{ title: session.status === 'active' ? 'Hangman' : session.state.result?.includes('wins') ? 'You won!' : session.state.result?.includes('stopped') ? 'Hangman stopped' : session.status === 'expired' ? "Time's up!" : 'You lost!', color: session.status === 'active' ? 15905081 : session.state.result?.includes('wins') ? 3066993 : 15158332, description: gallows(wrong.length), fields: [{ name: session.status === 'active' ? 'Word' : 'The word was', value: session.status === 'active' ? visible : word }, { name: `Guesses (${wrong.length}/7)`, value: wrong.join(' ') || 'None', inline: true }, ...(session.status === 'active' ? [{ name: 'Time', value: '1 minute', inline: true }] : [])], footer: { text: session.status === 'active' ? 'You have 1 minute to make a guess' : 'To start another game, type /hangman' } }],
    components: [row([button('Guess a letter', `gm:${id}:guess:${session.state.revision ?? 0}`, session.status !== 'active'), button('Guess Word', `gm:${id}:wordguess:${session.state.revision ?? 0}`, session.status !== 'active'), button('Stop', `gm:${id}:stop:0:${session.state.revision ?? 0}`, session.status !== 'active')])],
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

  async start(context) {
    await migrateDatabase(context.sql);
    const task: { timer: ReturnType<typeof setInterval>; pending?: Promise<void> } = { timer: setInterval(() => { if (!task.pending) task.pending = advanceTimers(context).catch(() => console.error('Game timeout processing failed')).finally(() => { delete task.pending; }); }, 500) };
    task.timer.unref(); timers.set(context.sql, task);
  },
  async close(context) { const task = timers.get(context.sql); if (task) { clearInterval(task.timer); await task.pending; } timers.delete(context.sql); },

  async handle(interaction, context) {
    if (!interaction.guild_id) return errorReply('Games can only be played in a server.');
    const actor = userId(interaction);
    if (!actor) return errorReply('Could not identify the player for this interaction.');

    if (isCommand(interaction)) {
      const game = interaction.data.name as GameName;
      const opponent = getOption(interaction, 'opponent');
      if (!commandNames.has(game)) return errorReply('Choose an opponent to start this game.');
      if (opponent === actor) return errorReply('Choose another member as your opponent.');
      const id = randomUUID();
      if ((game === 'connect-four' || game === 'tic-tac-toe') && !opponent) {
        const state = { phase: 'choose', starter: actor, names: { [actor]: interaction.member?.user?.username ?? actor }, delivery: { applicationId: interaction.application_id, token: interaction.token }, revision: 0 };
        const expiresAt = new Date(now(context) + 10_000);
        await context.sql`INSERT INTO robotman_game_sessions ${context.sql({ session_id: id, game, guild_id: interaction.guild_id, channel_id: interaction.channel_id ?? '', players: [actor], state, status: 'setting', expires_at: expiresAt })}`;
        return response(InteractionResponseType.ChannelMessageWithSource, { content: 'Who would you like to play against? You have ten seconds to choose.', components: [row([{ ...button('Human', `gm:${id}:human:0:0`), style: ButtonStyle.Success }, { ...button('Computer', `gm:${id}:computer:0:0`), style: ButtonStyle.Danger }])], allowed_mentions: { parse: [] } });
      }
      const bot = opponent && interaction.data.type === 1 && interaction.data.resolved?.users?.[opponent]?.bot ? opponent : context.applicationId ?? 'robotman';
      const players = game === 'hangman' ? [actor, actor] : Math.random() < 0.5 ? [actor, opponent ?? bot] : [opponent ?? bot, actor];
      const base = {
        session_id: id,
        game,
        guild_id: interaction.guild_id,
        channel_id: interaction.channel_id ?? '',
        players,
        expires_at: new Date(now(context) + durationFor(game)),
      };
      if (game === 'hangman') {
        const word = words[Math.floor(Math.random() * words.length)]!.toLowerCase();
        const state = { word, guessed: [], wrong: [], turn: players[0], result: '', revision: 0 };
        await context.sql`INSERT INTO robotman_game_sessions ${context.sql({ ...base, state, status: 'active' })}`;
        return messageResponse({ ...base, state, status: 'active' } as Session, id);
      }
      const state = game === 'connect-four'
        ? { board: Array.from({ length: 6 }, () => Array(7).fill(null)), turn: players[0], result: '', revision: 0 }
        : { board: Array.from({ length: 3 }, () => Array(3).fill(null)), turn: players[0], result: '', revision: 0 };
      Object.assign(state, { names: { [actor]: interaction.member?.user?.username ?? actor, [opponent ?? bot]: opponent ? ((interaction.data.type === 1 ? interaction.data.resolved?.users?.[opponent]?.username : undefined) ?? opponent) : await botName(context) }, delivery: { applicationId: interaction.application_id, token: interaction.token }, bot: !opponent || opponent === bot ? bot : undefined });
      const prepared = { ...base, state, status: 'active' } as Session;
      playBot(prepared);
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

    if (['human', 'computer', 'join', 'cancel'].includes(action) && isComponent(interaction)) {
      const result = await context.sql.begin(async tx => {
        const [session] = await tx<Session[]>`SELECT * FROM robotman_game_sessions WHERE session_id = ${id} FOR UPDATE`;
        if (!session || !['connect-four', 'tic-tac-toe'].includes(session.game) || session.status !== 'setting' || session.guild_id !== interaction.guild_id || session.channel_id !== (interaction.channel_id ?? '')) return { error: 'This game lobby is no longer available.' };
        if (new Date(session.expires_at).getTime() <= now(context)) return { error: 'This game lobby has expired.' };
        const starter = session.state.starter as string;
        if ((action === 'human' || action === 'computer' || action === 'cancel') && actor !== starter) return { error: 'Only the person who started the game can choose or cancel.' };
        if (action === 'join' && actor === starter) return { error: 'Another player must join.' };
        if ((action === 'human' || action === 'computer') && session.state.phase !== 'choose' || (action === 'join' || action === 'cancel') && session.state.phase !== 'join') return { error: 'This lobby control is no longer available.' };
        session.state.delivery = { applicationId: interaction.application_id, token: interaction.token, messageId: interaction.message?.id };
        if (action === 'human') {
          session.state.phase = 'join'; session.expires_at = new Date(now(context) + 300_000);
          await tx`UPDATE robotman_game_sessions SET state = ${tx.json(session.state)}, expires_at = ${session.expires_at} WHERE session_id = ${id}`;
          return { lobby: { content: `**${session.state.names[starter]}** has started a game!`, components: [row([{ ...button('Join', `gm:${id}:join:0:0`), style: ButtonStyle.Success }, { ...button('Cancel', `gm:${id}:cancel:0:0`), style: ButtonStyle.Danger }])], allowed_mentions: { parse: [] } } };
        }
        if (action === 'cancel') {
          await tx`UPDATE robotman_game_sessions SET status = 'finished' WHERE session_id = ${id}`;
          return { lobby: { content: 'The game has been cancelled.', components: [] } };
        }
        const opponent = action === 'computer' ? context.applicationId ?? 'robotman' : actor;
        const names = { ...session.state.names, [opponent]: action === 'computer' ? await botName(context) : interaction.member?.user?.username ?? actor };
        session.players = Math.random() < 0.5 ? [starter, opponent] : [opponent, starter];
        session.state = { board: session.game === 'connect-four' ? Array.from({ length: 6 }, () => Array(7).fill(null)) : Array.from({ length: 3 }, () => Array(3).fill(null)), turn: session.players[0], result: '', revision: 0, names, bot: action === 'computer' ? opponent : undefined, delivery: session.state.delivery };
        session.status = 'active'; session.expires_at = new Date(now(context) + durationFor(session.game));
        playBot(session);
        await tx`UPDATE robotman_game_sessions SET players = ${tx.json(session.players)}, state = ${tx.json(session.state)}, status = 'active', expires_at = ${session.expires_at} WHERE session_id = ${id}`;
        return { session };
      });
      if ('error' in result && result.error) return errorReply(result.error);
      if ('lobby' in result && result.lobby) return response(InteractionResponseType.UpdateMessage, result.lobby);
      if ('session' in result && result.session) return messageResponse(result.session, id, InteractionResponseType.UpdateMessage);
      return errorReply('This game lobby is no longer available.');
    }

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
        if (new Date(session.expires_at).getTime() <= now(context)) {
          await tx`UPDATE robotman_game_sessions SET status = 'expired' WHERE session_id = ${id}`;
          return { error: 'This Hangman setup expired. Start a new game.' };
        }
        session.state = { word: raw, guessed: [], wrong: [], turn: session.players[1] ?? '', result: '', revision: 0 };
        session.status = 'active';
        session.expires_at = new Date(now(context) + durationFor(session.game));
        await tx`UPDATE robotman_game_sessions SET state = ${tx.json(session.state)}, status = 'active', expires_at = ${session.expires_at} WHERE session_id = ${id}`;
        return { session };
      });
      if ('error' in result && result.error) return errorReply(result.error);
      if (!('session' in result) || !result.session) return errorReply('This Hangman setup expired. Start a new game.');
      return messageResponse(result.session, id);
    }

    if ((action === 'guess' || action === 'wordguess') && isComponent(interaction)) {
      const session = await loadSession(context, id);
      if (!session) return errorReply('This Hangman game no longer exists. Start a new game.');
      if (session.guild_id !== interaction.guild_id || session.channel_id !== (interaction.channel_id ?? session.channel_id)) {
        return errorReply('This game control belongs to another server or channel.');
      }
      if (!session.players.includes(actor)) return errorReply('You are not a player in this game.');
      if (session.status !== 'active' || new Date(session.expires_at).getTime() <= now(context)) {
        if (session.status !== 'finished') {
          await expire(context, id);
          session.status = 'expired';
          session.state.result = 'Time is up!';
          return messageResponse(session, id, InteractionResponseType.UpdateMessage);
        }
        return messageResponse(session, id, InteractionResponseType.UpdateMessage);
      }
      if (actor !== (session.players[1] ?? session.players[0])) return errorReply('Only the challenged player can guess in this Hangman game.');
      return response(InteractionResponseType.Modal, {
        custom_id: `gm:${id}:${action === 'wordguess' ? 'wholeword' : 'letter'}:${argument ?? '0'}`,
        title: action === 'wordguess' ? 'Guess Word (wrong answer loses)' : 'Guess a letter',
        components: [textInput(action === 'wordguess' ? 'word' : 'letter', action === 'wordguess' ? 'The word (Cancel closes without guessing)' : 'Enter one letter', action === 'wordguess' ? 100 : 1)],
      });
    }

    if ((action === 'stop' || action === 'forfeit') && isComponent(interaction)) {
      return updateSession(context, id, interaction, actor, session => {
        if (action === 'stop' && session.game !== 'hangman' || action === 'forfeit' && session.game !== 'connect-four') return 'This control belongs to another game.';
        if (action === 'forfeit' && !validTurn(session, actor)) return 'Wait for your turn to forfeit.';
        session.status = 'finished'; if (action === 'forfeit') session.state.winner = session.players.find(player => player !== actor); session.state.result = action === 'stop' ? 'The game has been stopped' : `${mention(actor)} has forfeited. ${mention(session.players.find(player => player !== actor)!)} wins!`;
        return undefined;
      }, false, Number(revisionText));
    }
    if (action === 'wholeword' && isModal(interaction)) {
      return updateSession(context, id, interaction, actor, session => {
        if (session.game !== 'hangman' || actor !== session.players[0]) return 'Only the player can guess.';
        const word = getModalValue(interaction, 'word')?.trim().toLowerCase();
        if (!word) return 'Enter a word.';
        session.status = 'finished';
        session.state.result = word === session.state.word ? `${mention(actor)} wins Hangman! You guessed the word!` : `You lost! The word was **${session.state.word}**.`;
        if (word === session.state.word) session.state.guessed = [...new Set(word.replaceAll(' ', ''))];
        return undefined;
      }, true, Number(argument));
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
        else if (session.state.wrong.length >= 7) { session.status = 'finished'; session.state.result = `Out of guesses. The word was **${session.state.word}**.`; }
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
          if (fourInARow(board, actor)) { session.status = 'finished'; session.state.winner = actor; session.state.result = `${mention(actor)} wins Connect Four!`; }
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
          if (winner) { session.status = 'finished'; session.state.winner = winner; session.state.result = `${mention(winner)} wins Tic Tac Toe!`; }
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
  await context.sql`UPDATE robotman_game_sessions SET status = 'expired', state = jsonb_set(state, '{result}', '"Time is up!"') WHERE session_id = ${id} AND status IN ('setting', 'active')`;
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
    if (session.status === 'expired' || new Date(session.expires_at).getTime() <= now(context)) {
      session.status = 'expired';
      session.state.result = 'Time is up!';
      await tx`UPDATE robotman_game_sessions SET status = 'expired', state = ${tx.json(session.state)} WHERE session_id = ${id}`;
      return { session, finished: true };
    }
    if (session.status !== 'active') return { error: 'This game has not been set up yet.' };
    if (expectedRevision !== undefined && (session.state.revision ?? 0) !== expectedRevision) {
      return { session, stale: true };
    }
    const error = mutate(session);
    if (error) return { error };
    playBot(session);
    session.state.delivery = { applicationId: interaction.application_id, token: interaction.token, messageId: interaction.message?.id ?? session.state.delivery?.messageId };
    session.state.revision = (session.state.revision ?? 0) + 1;
    session.expires_at = new Date(now(context) + durationFor(session.game));
    await tx`UPDATE robotman_game_sessions SET state = ${tx.json(session.state)}, status = ${session.status}, expires_at = ${session.expires_at} WHERE session_id = ${id}`;
    return { session, finished: false };
  });
  if (result.error) return errorReply(result.error);
  if (!result.session) return errorReply('This game no longer exists. Start a new game.');
  if (result.stale && fromModal) return errorReply('The game changed while this modal was open. Open the current game control to try again.');
  delete result.session.state.notice;
  const update = messageResponse(result.session, id, InteractionResponseType.UpdateMessage);
  if (fromModal) return update;
  return update;
}

/** Persist deadlines and delivery coordinates so restarts do not cancel active turns. */
async function advanceTimers(context: CommandContext) {
  const due = await context.sql<Session[]>`SELECT * FROM robotman_game_sessions WHERE status IN ('setting', 'active') AND expires_at <= ${new Date(now(context))} AND state ? 'delivery' LIMIT 50`;
  for (const row of due) {
    await context.sql.begin(async tx => {
      const [raw] = await tx<Session[]>`SELECT * FROM robotman_game_sessions WHERE session_id = ${row.session_id} FOR UPDATE SKIP LOCKED`;
      if (!raw || !['setting', 'active'].includes(raw.status) || new Date(raw.expires_at).getTime() > now(context)) return;
      const session = raw;
      if (session.status === 'setting') {
        const delivery = session.state.delivery;
        const text = session.state.phase === 'choose' ? 'You took too long. The game has been cancelled.' : 'No one has joined. The game has been cancelled.';
        const sent = await context.fetch(`https://discord.com/api/v10/webhooks/${delivery.applicationId}/${delivery.token}/messages/@original`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ content: text, components: [] }), signal: AbortSignal.timeout(5000) });
        if (!sent.ok && sent.status !== 404 && sent.status !== 401) throw new Error('Game lobby update failed');
        await tx`UPDATE robotman_game_sessions SET status = 'expired' WHERE session_id = ${session.session_id}`;
        return;
      }
      if (session.game === 'connect-four') {
        const missed = session.state.turn;
        makeMove(session, missed, bestMove(session, missed)); playBot(session);
        session.state.notice = `${mention(missed)} has failed to make a move, so I have played for them.`;
      } else {
        session.status = 'expired';
        session.state.result = session.game === 'hangman' ? 'Time is up!' : `${mention(session.state.turn)} has failed to make a move. ${mention(session.players.find(player => player !== session.state.turn)!)} wins!`;
      }
      session.state.revision = (session.state.revision ?? 0) + 1;
      session.expires_at = new Date(now(context) + durationFor(session.game));
      const delivery = session.state.delivery;
      const payload = { ...render(session, session.session_id), allowed_mentions: { parse: [] } };
      const webhook = `https://discord.com/api/v10/webhooks/${delivery.applicationId}/${delivery.token}/messages/@original`;
      if (!delivery.messageId && context.botToken) {
        const original = await context.fetch(webhook, { signal: AbortSignal.timeout(5000) });
        if (original.ok) { const message = await original.json() as { id?: string }; delivery.messageId = message.id; }
      }
      const channelEdit = context.botToken && delivery.messageId;
      const sent = await context.fetch(channelEdit ? `https://discord.com/api/v10/channels/${session.channel_id}/messages/${delivery.messageId}` : webhook, { method: 'PATCH', headers: { 'content-type': 'application/json', ...(channelEdit ? { authorization: `Bot ${context.botToken}` } : {}) }, body: JSON.stringify(payload), signal: AbortSignal.timeout(5000) });
      // Retry transient delivery failures without advancing a second move.
      if (!sent.ok && sent.status !== 404 && sent.status !== 401) throw new Error('Game message update failed');
      if (!sent.ok) { session.status = 'expired'; delete session.state.delivery; }
      await tx`UPDATE robotman_game_sessions SET state = ${tx.json(session.state)}, status = ${session.status}, expires_at = ${session.expires_at} WHERE session_id = ${session.session_id}`;
    });
  }
}
