import { readFileSync, readdirSync } from 'node:fs';
import { PNG } from 'pngjs';
import { Worker } from 'node:worker_threads';
import { createRequire } from 'node:module';
import type {
  APIApplicationCommandInteraction,
  APIInteractionResponse,
  RESTPostAPIChatInputApplicationCommandsJSONBody,
} from 'discord.js';
import type { CommandContext, CommandInteraction, CommandModule } from '../types.js';

const commandDefinitions = [
  {
    name: 'color',
    description: 'Display a color, its values and a color swatch',
    options: [{ name: 'color', description: 'A color name, hex code, decimal integer, or RGB triple', type: 3, required: true }],
  },
  {
    name: 'math',
    description: 'Evaluate a mathematical expression',
    options: [{ name: 'expression', description: 'Expression with arithmetic, functions and constants', type: 3, required: true, max_length: 4000 }],
  },
  { name: 'ping', description: 'Measure the HTTP response time of the Discord API' },
  { name: 'stats', description: 'Show Robotman server runtime statistics' },
  { name: 'coin', description: 'Flip a coin' },
  { name: 'dad-joke', description: 'Get a dad joke' },
  {
    name: 'eight-ball',
    description: 'Ask the magic eight ball a question',
    options: [{ name: 'question', description: 'Your question', type: 3, required: true, max_length: 200 }],
  },
] satisfies RESTPostAPIChatInputApplicationCommandsJSONBody[];

const commandNames = new Set(commandDefinitions.map(({ name }) => name));

function respond(content: string): APIInteractionResponse {
  return { type: 4, data: { content } };
}

function getStringOption(interaction: APIApplicationCommandInteraction, name: string): string | undefined {
  if (interaction.data.type !== 1 || !interaction.data.options) return undefined;
  const option = interaction.data.options.find((entry) => entry.name === name);
  return option?.type === 3 ? option.value : undefined;
}

const colors: Record<string, number> = JSON.parse(readFileSync(new URL('../../../assets/colors.json', import.meta.url), 'utf8'));
function colorReply(input: string): APIInteractionResponse {
  const text = input.trim();
  const named = text.toUpperCase().replace(/[ -]+/g, '_');
  let value: number | undefined;
  if (named === 'RANDOM') value = Math.floor(Math.random() * 0x1000000);
  else if (named === 'DEFAULT') value = 0;
  else if (Object.hasOwn(colors, named)) value = colors[named];
  else if (/^\d+$/.test(text)) value = Number(text);
  else {
    const hex = /^(?:#|0x)([a-f\d]{3}|[a-f\d]{6})$/i.exec(text) ?? /^([a-f\d]{6})$/i.exec(text);
    if (hex) value = parseInt(hex[1]!.length === 3 ? [...hex[1]!].map(ch => ch + ch).join('') : hex[1]!, 16);
    else {
      const rgb = /^(?:rgb\s*)?\(?\s*(\d+)\s*[, ]\s*(\d+)\s*[, ]\s*(\d+)\s*\)?$/i.exec(text);
      if (rgb) { const channels = rgb.slice(1).map(Number); if (channels.every(channel => channel <= 255)) value = channels[0]! * 65536 + channels[1]! * 256 + channels[2]!; }
    }
  }
  if (value === undefined || !Number.isInteger(value) || value < 0 || value > 0xffffff) return { type: 4, data: { content: 'Invalid color. Use a color name, #hex, decimal integer, or RGB channels from 0 to 255.', flags: 64 } };
  const rgb = [value >> 16 & 255, value >> 8 & 255, value & 255];
  const image = new PNG({ width: 300, height: 300 });
  for (let i = 0; i < image.data.length; i += 4) { image.data[i] = rgb[0]!; image.data[i + 1] = rgb[1]!; image.data[i + 2] = rgb[2]!; image.data[i + 3] = 255; }
  return { type: 4, data: { embeds: [{ color: value === 0xffffff ? 16777200 : value, description: `• Hex: #${value.toString(16).padStart(6, '0')}\n• RGB: (${rgb.join(', ')})\n• Integer: ${value}`, image: { url: 'attachment://color.png' } }], files: [{ name: 'color.png', content: PNG.sync.write(image), contentType: 'image/png' }] } } as APIInteractionResponse;
}

const evaluatorPath = createRequire(import.meta.url).resolve('expr-eval');
async function calculate(input: string): Promise<APIInteractionResponse> {
  try {
    if (!input.trim() || input.length > 4000) throw new Error('Invalid expression length');
    // Keep the original expression language, including user functions, off the HTTP thread.
    const answer = await new Promise<string>((resolve, reject) => {
      const worker = new Worker(`const { parentPort, workerData } = require('node:worker_threads'); const { Parser } = require(workerData.path); try { parentPort.postMessage({ answer: new Parser({ allowMemberAccess: false }).evaluate(workerData.input).toString() }); } catch { parentPort.postMessage({ error: true }); }`, { eval: true, workerData: { input, path: evaluatorPath }, resourceLimits: { maxOldGenerationSizeMb: 32, stackSizeMb: 2 } });
      const timer = setTimeout(() => { void worker.terminate(); reject(new Error('Expression timed out')); }, 1000);
      worker.once('message', (message: { answer?: string; error?: boolean }) => { clearTimeout(timer); void worker.terminate(); if (message.error || message.answer === undefined) reject(new Error('Invalid expression')); else resolve(message.answer); });
      worker.once('error', error => { clearTimeout(timer); reject(error); });
      worker.once('exit', code => { clearTimeout(timer); if (code !== 0) reject(new Error('Evaluator stopped')); });
    });
    if (answer.length > 1015) return { type: 4, data: { content: 'Output was uploaded as a file.', files: [{ name: 'result.txt', content: answer }] } } as APIInteractionResponse;
    return respond('```\n' + answer + '\n```');
  } catch { return { type: 4, data: { content: 'That is not a valid mathematical expression, or it took too long to evaluate.', flags: 64 } }; }
}

async function measureDiscordApi(context: CommandContext): Promise<string> {
  const start = performance.now();
  try {
    const response = await context.fetch('https://discord.com/api/v10/gateway', {
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(5000),
    });
    const elapsed = Math.max(0, Math.round(performance.now() - start));
    if (!response.ok) return `Discord API responded with HTTP ${response.status}.`;
    return `${elapsed} ms.`;
  } catch {
    return 'The Discord API could not be reached right now.';
  }
}

async function getDadJoke(context: CommandContext): Promise<string> {
  try {
    const response = await context.fetch('https://icanhazdadjoke.com/', {
      headers: { accept: 'application/json', 'user-agent': 'Robotman Discord bot' },
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return 'I could not fetch a dad joke right now. Try again shortly.';
    const result: unknown = await response.json();
    if (typeof result !== 'object' || result === null || !('joke' in result) || typeof result.joke !== 'string' || !result.joke.trim()) {
      return 'I could not fetch a dad joke right now. Try again shortly.';
    }
    return result.joke.slice(0, 1900);
  } catch {
    return 'I could not fetch a dad joke right now. Try again shortly.';
  }
}

function imageReply(folder: 'coins' | 'eight-balls'): APIInteractionResponse {
  const root = new URL(`../../../assets/${folder}/`, import.meta.url);
  const images = readdirSync(root).filter(name => name.endsWith('.png'));
  const name = images[Math.floor(Math.random() * images.length)]!;
  return { type: 4, data: { files: [{ name, content: readFileSync(new URL(name, root)), contentType: 'image/png' }] } } as APIInteractionResponse;
}
const manifest = JSON.parse(readFileSync(new URL('../../../package.json', import.meta.url), 'utf8')) as { version: string; dependencies: Record<string, string> };

const avatarCache = new Map<string, { url: string; expires: number }>();
async function botAvatar(context: CommandContext): Promise<string> {
  const fallback = 'https://cdn.discordapp.com/embed/avatars/0.png';
  if (!context.botToken) return fallback;
  const cached = avatarCache.get(context.botToken);
  if (cached && cached.expires > Date.now()) return cached.url;
  try {
    const response = await context.fetch('https://discord.com/api/v10/users/@me', { headers: { authorization: `Bot ${context.botToken}` }, signal: AbortSignal.timeout(5000) });
    if (!response.ok) return fallback;
    const user = await response.json() as { id?: string; avatar?: string };
    if (!user.id || !user.avatar) return fallback;
    const url = `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${user.avatar.startsWith('a_') ? 'gif' : 'png'}`;
    avatarCache.set(context.botToken, { url, expires: Date.now() + 300_000 });
    return url;
  } catch { return fallback; }
}

export const utilityModule: CommandModule = {
  commands: commandDefinitions,
  matches(interaction: CommandInteraction): boolean {
    return interaction.type === 2 && interaction.data.type === 1 && commandNames.has(interaction.data.name);
  },
  async handle(interaction: CommandInteraction, context: CommandContext): Promise<APIInteractionResponse> {
    if (!this.matches(interaction)) return respond('This command is not supported.');
    const command = interaction as APIApplicationCommandInteraction;
    switch (command.data.name) {
      case 'color': {
        return colorReply(getStringOption(command, 'color') ?? getStringOption(command, 'hex') ?? '');
      }
      case 'math': {
        const expression = getStringOption(command, 'expression');
        if (expression === undefined) return respond('Enter an arithmetic expression to calculate.');
        return calculate(expression);
      }
      case 'ping': { const measured = await measureDiscordApi(context); return { type: 4, data: { embeds: [{ title: '🏓 Pong!', color: colors.ROBOTMAN, fields: [{ name: 'Latency', value: measured, inline: true }] }] } }; }
      case 'stats': {
        const uptimeSeconds = Math.max(0, Math.floor((Date.now() - context.startedAt) / 1000));
        const hours = Math.floor(uptimeSeconds / 3600), minutes = Math.floor(uptimeSeconds % 3600 / 60), seconds = uptimeSeconds % 60;
        const cpu = process.cpuUsage();
        const cpuPercent = ((cpu.user + cpu.system) / 1000 / Math.max(1, process.uptime() * 1000) * 100).toFixed(2);
        return { type: 4, data: { embeds: [{ title: 'Statistics', color: colors.ROBOTMAN, thumbnail: { url: await botAvatar(context) }, fields: [
          ['Version', manifest.version], ['Dependencies', String(Object.keys(manifest.dependencies).length)], ['Node.js Version', process.version],
          ['Memory Usage', `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`], ['CPU Usage', `${cpuPercent}%`], ['Uptime', `${Math.floor(hours / 24)}d, ${hours % 24}h, ${minutes}m, ${seconds}s`],
        ].map(([name, value]) => ({ name: name!, value: value!, inline: true })) }] } };
      }
      case 'coin': return imageReply('coins');
      case 'dad-joke': return respond(await getDadJoke(context));
      case 'eight-ball': {
        const question = getStringOption(command, 'question');
        if (!question?.trim()) return respond('Ask a question to consult the magic eight ball.');
        return imageReply('eight-balls');
      }
      default: return respond('This command is not supported.');
    }
  },
};
