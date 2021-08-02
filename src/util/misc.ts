import { Colors, DateFormats } from '#util/constants';
import { regExpEsc, toTitleCase } from '@sapphire/utilities';
import type { CollectorFilter, Message, User } from 'discord.js';
import { ButtonInteraction, CommandInteraction, MessageActionRow, MessageButton } from 'discord.js';
import { DateTime } from 'luxon';
import os from 'node:os';
import { setTimeout as wait } from 'node:timers/promises';

/* Strings */

export function capitalize(str: string): string {
	return str.charAt(0).toUpperCase() + str.slice(1);
}

export function trim(str: string, max: number): string {
	return str.length > max ? `${str.slice(0, max - 3).trimEnd()}...` : str;
}

export function pluralize(word: string, length: number, includeLength = true): string {
	return `${includeLength ? `${length} ` : ''}${word}${length === 1 ? '' : 's'}`;
}

export function difference(date: Date, format: string = DateFormats.DAYS): string {
	return DateTime.local().diff(DateTime.fromJSDate(date), 'days').toFormat(format);
}

export function formatQuery(str: string): string {
	return toTitleCase(str).split(' ').join('_');
}

export function redact(str: string): string {
	const tokens = [
		'WEBHOOK_URL',
		'DISCORD_TOKEN',
		'POSTGRES_URL',
		'GOOGLE_SEARCH_KEY',
		'GOOGLE_ENGINE_KEY',
		'SERVICE_ACCOUNT_EMAIL',
		'SERVICE_ACCOUNT_KEY',
		'SPREADSHEET_ID',
		'COMICVINE_KEY',
		'PASTEE_KEY',
		'WEBSTER_DICTIONARY_KEY',
		'WEBSTER_THESAURUS_KEY',
		'OPEN_MOVIE_DB_KEY'
	];

	return str.replaceAll(new RegExp(tokens.map((t) => regExpEsc(process.env[t])).join('|'), 'gi'), '[REDACTED]');
}

export function removeArticles(str: string): string {
	const words = str.split(' ');
	if (['a', 'the', 'an'].includes(words[0]) && words[1]) return words.slice(1).join(' ');
	return str;
}

export function compare(first: string, second: string): number {
	first = first.replace(/\s+/g, '');
	second = second.replace(/\s+/g, '');

	if (first === second) return 1;
	if (!first.length || !second.length || first.length < 2 || second.length < 2) return 0;

	const compared = new Map();

	for (let i = 0; i < first.length - 1; i++) {
		const compare = first.substring(i, i + 2);
		let num = 0;
		if (compared.has(compare)) num = compared.get(compare);
		compared.set(compare, num + 1);
	}

	let size = 0;

	for (let i = 0; i < second.length - 1; i++) {
		const compare = second.substring(i, i + 2);
		const count = compared.get(compare) ?? 0;

		if (count > 0) {
			compared.set(compare, count - 1);
			size++;
		}
	}

	return (2.0 * size) / (first.length + second.length - 2);
}

export function closest(target: string, arr: string[]): string {
	const compared = [];
	let match = 0;

	for (const str of arr) {
		const rating = compare(target, str);
		compared.push({ str, rating });
		if (rating > compared[match].rating) match = arr.indexOf(str);
	}

	return compared[match].str;
}

/* Dates and Numbers */

export function formatDate(date: Date, format: string = DateFormats.LOG): string {
	return DateTime.fromJSDate(date).setZone('utc').toFormat(format);
}

export function getPullDate(date: DateTime): DateTime {
	return date.set({ weekday: 3 }).plus({ weeks: date.weekday <= 3 ? 0 : 1 });
}

export function pad(num: number): string {
	return num.toString().padStart(2, '0');
}

/* Arrays */

export function sort(arr: any[]): any[] {
	return arr.sort((a, b) => {
		a = removeArticles((a.name ?? a).toLowerCase());
		b = removeArticles((b.name ?? b).toLowerCase());

		if (a > b) return 1;
		if (a < b) return -1;

		return 0;
	});
}

export function randomResponse<T>(arr: T[]): T {
	return arr[Math.floor(Math.random() * arr.length)];
}

/* Discord */

export async function choosePlayer(data: Message | CommandInteraction) {
	const row = new MessageActionRow().addComponents(
		new MessageButton().setCustomId('human').setLabel('Human').setStyle('SUCCESS'),
		new MessageButton().setCustomId('cpu').setLabel('Computer').setStyle('DANGER')
	);

	const msg = (await (isInteraction(data) ? data.reply.bind(data) : data.channel.send.bind(data.channel))({
		content: 'Who would you like to play against? You have ten seconds to choose.',
		components: [row]
	})) as Message;

	const author = getUser(data);
	const editReply = isInteraction(data) ? data.editReply.bind(data) : msg.edit.bind(msg);

	const option = await msg
		.awaitMessageComponent<ButtonInteraction>({
			filter: (i) => i.user.id === author.id,
			time: 10000
		})
		.catch(() => null);

	if (!option) {
		await editReply({
			content: 'You took too long. The game has been cancelled.',
			components: []
		});

		return null;
	}

	await option.deferUpdate();

	if (option.customId === 'cpu') {
		return {
			message: msg,
			player: data.client.user,
			interaction: option
		};
	}

	const joinRow = new MessageActionRow().addComponents(
		new MessageButton().setCustomId('join').setLabel('Join').setStyle('SUCCESS'),
		new MessageButton().setCustomId('cancel').setLabel('Cancel').setStyle('DANGER')
	);

	await option.editReply({
		content: `**${author.username}** has started a game!`,
		components: [joinRow]
	});

	const response = await msg
		.awaitMessageComponent<ButtonInteraction>({
			filter: (i) => (i.user.id === author.id && i.customId === 'cancel') || (i.user.id !== author.id && i.customId === 'join'),
			time: 300000
		})
		.catch(() => null);

	if (!response) {
		await editReply({
			content: 'No one has joined. The game has been cancelled.',
			components: []
		});

		return null;
	}

	if (response.customId === 'cancel') {
		await response.update({
			content: 'The game has been cancelled.',
			components: []
		});

		return null;
	}

	await response.deferUpdate();

	return {
		message: msg,
		player: response.user,
		interaction: response
	};
}

export async function raceResponse(
	message: Message,
	time: number,
	{ messageFilter, buttonFilter }: { messageFilter: CollectorFilter<[Message]>; buttonFilter: CollectorFilter<[ButtonInteraction]> }
) {
	const collected = await Promise.race([
		message.channel.awaitMessages({
			filter: messageFilter,
			max: 1,
			time
		}),
		message.awaitMessageComponent<ButtonInteraction>({
			filter: buttonFilter,
			time: time + 10
		})
	]);

	if (collected instanceof ButtonInteraction) {
		return collected;
	}

	if (!collected.size) {
		return null;
	}

	return collected.first();
}

export function disableComponents(rows: MessageActionRow[]): MessageActionRow[] {
	for (const row of rows) {
		for (const button of row.components) {
			button.setDisabled(true);
		}
	}

	return rows;
}

export function isInteraction(data: Message | CommandInteraction): data is CommandInteraction {
	return data instanceof CommandInteraction;
}

export function getUser(data: Message | CommandInteraction): User {
	return isInteraction(data) ? data.user : data.author;
}

export function isOwner(user: User): boolean {
	return user.id === process.env.BOT_OWNER;
}

/* CPU */

export async function cpuUsage(): Promise<number> {
	const start = average();
	await wait(1000);
	const end = average();

	const idleDiff = end.idle - start.idle;
	const totalDiff = end.total - start.total;

	return (10000 - Math.round(10000 * (idleDiff / totalDiff))) / 100;
}

function average(): { idle: number; total: number } {
	let idle = 0;
	let total = 0;

	const cpus = os.cpus();

	for (const cpu of cpus) {
		for (const type of Object.keys(cpu.times)) {
			total += (cpu.times as Record<string, number>)[type];
		}

		idle += cpu.times.idle;
	}

	return {
		idle: idle / cpus.length,
		total: total / cpus.length
	};
}

/* Colors */

export function resolveColor(input: unknown): number {
	let resolved: number;

	if (typeof input === 'string') {
		if (input === 'RANDOM') {
			return Math.floor(Math.random() * (0xffffff + 1));
		}

		if (input === 'DEFAULT') return 0;

		if (input in Colors) {
			return Colors[input as keyof typeof Colors];
		}

		const hex = makeHex(input.replace('#', ''));

		if (!/^#[0-9A-F]{6}$/i.test(hex)) return null;

		resolved = parseInt(input, 16);
	} else if (Array.isArray(input)) {
		resolved = (input[0] << 16) + (input[1] << 8) + input[2];
	}

	if (resolved < 0 || resolved > 0xffffff || (resolved && isNaN(resolved))) return null;

	return resolved;
}

export function makeHex(color: string, prefix = true) {
	const formatted = color.padStart(6, '0').toUpperCase();
	return prefix ? `#${formatted}` : formatted;
}

export function parseRGB(str: string) {
	return parseInt(str.replace(/,/g, '').replace(/(\(|\))/g, ''));
}

/* Misc */

export function getWikiParams(query: string) {
	return {
		action: 'query',
		titles: query,
		prop: 'extracts|pageimages|links',
		format: 'json',
		formatversion: 2,
		exintro: true,
		redirects: true,
		explaintext: true,
		pithumbsize: 1000
	};
}
