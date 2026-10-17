import type {
  APIApplicationCommandInteraction,
  APIInteractionResponse,
  RESTPostAPIChatInputApplicationCommandsJSONBody,
} from 'discord.js';
import type { CommandContext, CommandInteraction, CommandModule } from '../types.js';

const commandDefinitions = [
  {
    name: 'color',
    description: 'Convert a hexadecimal color to RGB and HSL',
    options: [{ name: 'hex', description: 'A 3 or 6 digit hexadecimal color, such as #8b5cf6', type: 3, required: true }],
  },
  {
    name: 'math',
    description: 'Evaluate a basic arithmetic expression',
    options: [{ name: 'expression', description: 'Use numbers, +, -, *, /, %, ^, and parentheses', type: 3, required: true, max_length: 200 }],
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

function formatColor(input: string): string | null {
  const match = /^#?([\da-f]{3}|[\da-f]{6})$/i.exec(input.trim());
  if (!match) return null;
  const digits = match[1]!;
  const value = digits.length === 3 ? [...digits].map((part) => part + part).join('') : digits;
  const red = Number.parseInt(value.slice(0, 2), 16);
  const green = Number.parseInt(value.slice(2, 4), 16);
  const blue = Number.parseInt(value.slice(4, 6), 16);
  const r = red / 255, g = green / 255, b = blue / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  const lightness = (max + min) / 2;
  const saturation = delta === 0 ? 0 : delta / (1 - Math.abs(2 * lightness - 1));
  let hue = 0;
  if (delta !== 0) {
    if (max === r) hue = ((g - b) / delta) % 6;
    else if (max === g) hue = (b - r) / delta + 2;
    else hue = (r - g) / delta + 4;
    hue *= 60;
    if (hue < 0) hue += 360;
  }
  return `#${value.toUpperCase()} · RGB ${red}, ${green}, ${blue} · HSL ${Math.round(hue)}°, ${Math.round(saturation * 100)}%, ${Math.round(lightness * 100)}%`;
}

class MathParser {
  private cursor = 0;

  constructor(private readonly source: string) {}

  parse(): number {
    const value = this.expression();
    this.skipSpaces();
    if (this.cursor !== this.source.length) throw new Error('Unexpected input');
    if (!Number.isFinite(value) || Math.abs(value) > 1e100) throw new Error('Result is too large');
    return value;
  }

  private expression(): number {
    let left = this.term();
    while (true) {
      this.skipSpaces();
      const operator = this.source[this.cursor];
      if (operator !== '+' && operator !== '-') return left;
      this.cursor += 1;
      const right = this.term();
      left = operator === '+' ? left + right : left - right;
    }
  }

  private term(): number {
    let left = this.unary();
    while (true) {
      this.skipSpaces();
      const operator = this.source[this.cursor];
      if (operator !== '*' && operator !== '/' && operator !== '%') return left;
      this.cursor += 1;
      const right = this.unary();
      if ((operator === '/' || operator === '%') && right === 0) throw new Error('Cannot divide by zero');
      left = operator === '*' ? left * right : operator === '/' ? left / right : left % right;
    }
  }

  private unary(): number {
    this.skipSpaces();
    const operator = this.source[this.cursor];
    if (operator === '+' || operator === '-') {
      this.cursor += 1;
      const value = this.unary();
      return operator === '-' ? -value : value;
    }
    return this.power();
  }

  private power(): number {
    let left = this.primary();
    this.skipSpaces();
    if (this.source[this.cursor] === '^') {
      this.cursor += 1;
      left **= this.unary();
    }
    return left;
  }

  private primary(): number {
    this.skipSpaces();
    if (this.source[this.cursor] === '(') {
      this.cursor += 1;
      const value = this.expression();
      this.skipSpaces();
      if (this.source[this.cursor] !== ')') throw new Error('Missing closing parenthesis');
      this.cursor += 1;
      return value;
    }
    const match = /^(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?/i.exec(this.source.slice(this.cursor));
    if (!match) throw new Error('Expected a number');
    this.cursor += match[0].length;
    const value = Number(match[0]);
    if (!Number.isFinite(value)) throw new Error('Number is too large');
    return value;
  }

  private skipSpaces(): void {
    while (/\s/.test(this.source[this.cursor] ?? '')) this.cursor += 1;
  }
}

function calculate(input: string): number | string {
  if (!input.trim() || input.length > 200) return 'Enter an expression up to 200 characters long.';
  try {
    const result = new MathParser(input).parse();
    return Number(result.toPrecision(12));
  } catch (error) {
    if (error instanceof Error && error.message === 'Cannot divide by zero') return error.message;
    return 'That expression is invalid. Use numbers, +, -, *, /, %, ^, and parentheses.';
  }
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
    return `Discord API HTTP latency: ${elapsed} ms.`;
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

const eightBallAnswers = [
  'It is certain.', 'Without a doubt.', 'You may rely on it.', 'Yes, definitely.', 'Most likely.',
  'Outlook good.', 'Signs point to yes.', 'Reply hazy, try again.', 'Ask again later.',
  'Better not tell you now.', 'Cannot predict now.', 'Concentrate and ask again.',
  "Don't count on it.", 'My reply is no.', 'Outlook not so good.', 'Very doubtful.',
];

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
        const color = getStringOption(command, 'hex');
        if (!color) return respond('Enter a hexadecimal color such as #8b5cf6.');
        return respond(formatColor(color) ?? 'That color is invalid. Use 3 or 6 hexadecimal digits, with an optional #.');
      }
      case 'math': {
        const expression = getStringOption(command, 'expression');
        if (expression === undefined) return respond('Enter an arithmetic expression to calculate.');
        const result = calculate(expression);
        return respond(typeof result === 'number' ? `Result: ${result}` : result);
      }
      case 'ping': return respond(await measureDiscordApi(context));
      case 'stats': {
        const uptimeSeconds = Math.max(0, Math.floor((Date.now() - context.startedAt) / 1000));
        const hours = Math.floor(uptimeSeconds / 3600);
        const minutes = Math.floor((uptimeSeconds % 3600) / 60);
        const seconds = uptimeSeconds % 60;
        const memoryMb = Math.round(process.memoryUsage().rss / 1024 / 1024);
        return respond(`Uptime: ${hours}h ${minutes}m ${seconds}s · Memory: ${memoryMb} MB`);
      }
      case 'coin': return respond(Math.random() < 0.5 ? 'Heads!' : 'Tails!');
      case 'dad-joke': return respond(await getDadJoke(context));
      case 'eight-ball': {
        const question = getStringOption(command, 'question');
        if (!question?.trim()) return respond('Ask a question to consult the magic eight ball.');
        return respond(eightBallAnswers[Math.floor(Math.random() * eightBallAnswers.length)]!);
      }
      default: return respond('This command is not supported.');
    }
  },
};
