import type { ArgumentGenerator, ArgumentOption } from '#util/arguments';
import { parseArguments } from '#util/arguments';
import { ALIAS_REPLACEMENT_REGEX, Links, PRODUCTION } from '#util/constants';
import { log } from '#util/logger';
import { getUser, isInteraction, isOwner, pluralize } from '#util/misc';
import { regExpEsc } from '@sapphire/utilities';
import type {
	ApplicationCommandOptionData,
	ClientEvents,
	Collection,
	CommandInteraction,
	CommandInteractionOption,
	Message,
	MessageEmbedOptions,
	Snowflake,
	User
} from 'discord.js';
import { Permissions } from 'discord.js';
import { Args, Lexer, longShortStrategy, Parser } from 'lexure';
import { basename, dirname } from 'node:path';
import { setTimeout as wait } from 'node:timers/promises';
import { container } from 'tsyringe';

export type Commands = Collection<string, Command>;

const cooldowns = new Map<string, Map<string, number>>();
const locks = new Map<string, Set<Snowflake>>();

export interface MessageContext {
	alias: string;
}

export interface Command {
	path?: string;

	options: CommandOptions;

	interactionOptions?: ApplicationCommandOptionData[];

	args?: ArgumentGenerator;

	exec?(message?: Message, args?: Record<string, any>, context?: MessageContext): any;
	interact?(interaction: CommandInteraction, args?: Record<string, any>): any;
}

export interface CommandOptions {
	name?: string;
	group?: string;
	aliases?: string[];
	description?: string;
	extended?: string[] | string;
	regex?: RegExp;
	usage?: string;
	example?: string[] | string;
	args?: ArgumentOption[];
	cooldown?: number;
	sub?: boolean;
	owner?: boolean;
	mod?: boolean;
	lock?: boolean;
	disableEdits?: boolean;
	disableHelp?: boolean;
	typing?: boolean;
}

export interface Listener {
	event: keyof ClientEvents;

	handle(...args: ClientEvents[Listener['event']]): any;
}

export function assignOptions(command: Command, path: string) {
	command.path = path;

	command.options = Object.assign(
		{
			name: basename(path, '.js'),
			group: basename(dirname(path)),
			aliases: [],
			description: null,
			extended: null,
			args: [],
			usage: null,
			example: null,
			cooldown: 0,
			sub: false,
			owner: false,
			mod: false,
			lock: false,
			disableEdits: false,
			disableHelp: false,
			typing: false
		},
		command.options
	);

	if (!command.options.sub) {
		command.options.aliases.push(command.options.name);
	}
}

export function parseCommand(message: Message): { command: Command; args: Args; context: MessageContext } {
	const commands = container.resolve<Commands>('commands');

	const prefixRegix = new RegExp(`^(<@!?${message.client.user.id}>|${regExpEsc(process.env.BOT_PREFIX)})\\s*`);

	const lexer = new Lexer(message.content).setQuotes([
		['"', '"'],
		['“', '”']
	]);

	const res = lexer.lexCommand((s) => prefixRegix.exec(s)?.[0]?.length ?? null);

	if (!res) return { command: null, args: null, context: null };

	const [cmd, tokens] = res;

	const command = commands.find(
		(c) =>
			c.options.aliases.includes(cmd.value.toLowerCase()) ||
			c.options.aliases.map((a) => a.replace(ALIAS_REPLACEMENT_REGEX, '')).includes(cmd.value.toLowerCase())
	);

	if (command.options.owner && !isOwner(message.author)) {
		return { command: null, args: null, context: null };
	}

	if (command.options.mod && !message.member?.permissions.has(Permissions.FLAGS.MANAGE_GUILD) && !isOwner(message.author)) {
		return { command: null, args: null, context: null };
	}

	const parser = new Parser(tokens()).setUnorderedStrategy(longShortStrategy());

	return {
		command,
		args: new Args(parser.parse()),
		context: {
			alias: cmd.value.toLowerCase()
		}
	};
}

export async function handleMessageCommand(message: Message, command: Command, args: Args, context: MessageContext): Promise<void> {
	if (message.editedTimestamp && command?.options?.disableEdits) return;

	let params: Record<string, any> = {};

	if (!command) {
		if (!PRODUCTION) return;

		const commands = container.resolve<Commands>('commands');

		command = commands.find((c) => c.options.regex?.test(message.content));

		if (!command) return;

		const match = command.options.regex.exec(message.content);
		params.match = match;
	}

	if (!locks.has(command.options.name)) {
		locks.set(command.options.name, new Set());
	}

	if (await handleLocks(message, command)) return;

	if (!cooldowns.has(command.options.name)) {
		cooldowns.set(command.options.name, new Map());
	}

	if (command.options.cooldown > 0 && (await runCooldowns(message, command))) return;

	if ((command.options.args?.length || (command.args && typeof command.args === 'function')) && typeof params.match === 'undefined') {
		params = await parseArguments(message, command, args);
		if (params == null) return;

		if (params.continue) {
			const commands = container.resolve<Commands>('commands');
			const subCommand = commands.get(params.continue);

			if (!subCommand) return;

			return handleMessageCommand(message, subCommand, args, context);
		}
	}

	if (typeof command.exec !== 'function') return;

	if (command.options.typing) {
		void message.channel.sendTyping();
	}

	const commandLocks = locks.get(command.options.name);

	try {
		commandLocks.add(message.channel.id);
		await command.exec(message, params, context);
	} catch (e) {
		handleError(message, command, e);
	} finally {
		commandLocks.delete(message.channel.id);
	}
}

export async function handleSlashCommand(interaction: CommandInteraction, command: Command): Promise<void> {
	if (!command || typeof command.interact !== 'function') return;

	if (!locks.has(command.options.name)) {
		locks.set(command.options.name, new Set());
	}

	if (await handleLocks(interaction, command)) return;

	if (!cooldowns.has(command.options.name)) {
		cooldowns.set(command.options.name, new Map());
	}

	if (command.options.cooldown > 0 && (await runCooldowns(interaction, command))) return;

	const args = parseSlashCommandOptions(interaction.options.data.slice());

	const commandLocks = locks.get(command.options.name);

	try {
		commandLocks.add(interaction.channel.id);
		await command.interact(interaction, args);
	} catch (e) {
		handleError(interaction, command, e);
	} finally {
		commandLocks.delete(interaction.channel.id);
	}
}

export function parseSlashCommandOptions(options: CommandInteractionOption[]): Record<string, string | number | boolean | CommandInteractionOption> {
	const args: Record<string, string | number | boolean | CommandInteractionOption> = {};

	for (const option of options) {
		if (option.type === 'SUB_COMMAND') {
			args.subCommand = option.name;
		} else {
			args[option.name] = option.value;
		}
	}

	return args;
}

async function runCooldowns(data: CommandInteraction | Message, command: Command): Promise<boolean> {
	const user = getUser(data);

	if (isOwner(user)) return;

	const now = Date.now();
	const cooldownUsers = cooldowns.get(command.options.name);
	const limit = command.options.cooldown * 1000;

	if (cooldownUsers.has(user.id)) {
		const expiration = cooldownUsers.get(user.id) + limit;

		if (now < expiration) {
			const remaining = (expiration - now) / 1000;
			const seconds = remaining < 1 ? remaining.toFixed(1) : remaining.toFixed();

			const text = `Please wait ${pluralize('second', Number(seconds))} before using \`${
				process.env.BOT_PREFIX + command.options.name
			}\` again.`;

			if (isInteraction(data)) {
				await data.reply({ content: text, ephemeral: true });
				return true;
			}

			const msg = await data.reply(text);

			await wait(remaining * 1000);

			void msg.delete();

			return true;
		}
	}

	cooldownUsers.set(user.id, now);
	setTimeout(() => cooldownUsers.delete(user.id), limit);

	return false;
}

async function handleLocks(data: CommandInteraction | Message, command: Command): Promise<boolean> {
	if (!command.options.lock) return false;

	const commandLocks = locks.get(command.options.name);

	if (commandLocks.has(data.channel.id)) {
		const content = `Please wait for the current \`${command.options.name}\` command to finish running.`;

		if (isInteraction(data)) {
			await data.reply({
				content,
				ephemeral: true
			});
		} else {
			await data.channel.send(content);
		}

		return true;
	}

	return false;
}

function handleError(data: CommandInteraction | Message, command: Command, error: any): void {
	const err = { content: 'An error occurred.', ephemeral: true };

	let user: User;

	if (isInteraction(data)) {
		if (data.replied) {
			void data.followUp(err);
		} else {
			void data.reply(err);
		}

		user = data.user;
	} else {
		void data.channel.send(err);

		user = data.author;
	}

	const extra = {
		title: `Command Error (${data.constructor.name})`,
		fields: [
			{
				name: 'User',
				value: user.toString(),
				inline: true
			},
			{
				name: 'Channel',
				value: data.channel.toString(),
				inline: true
			}
		]
	} as MessageEmbedOptions;

	if (command) {
		extra.fields.push({
			name: 'Command',
			value: command.options.name,
			inline: true
		});
	}

	extra.fields.push({
		name: 'Message',
		value: `${Links.DISCORD}/channels/${data.guild.id}/${data.channel.id}/${isInteraction(data) ? data.channel.lastMessageId : data.id}`
	});

	log(error.stack ?? error, 'error', { ping: true }, extra);
}
