import { Embed } from '#util/builders';
import { Channels, Colors, Recommendations } from '#util/constants';
import { chunk, toTitleCase } from '#util/misc';
import { reply, send } from '@skyra/editable-commands';
import type { Message, Snowflake, TextChannel } from 'discord.js';
import type { Sql } from 'postgres';
import { container } from 'tsyringe';

export enum AutoResponseTypes {
	Regular = 'Regular',
	Writer = 'writer',
	Character = 'character',
	Moderator = 'moderator',
	Booster = 'booster'
}

const RECOMMENDATION_TYPES = [AutoResponseTypes.Booster, AutoResponseTypes.Moderator, AutoResponseTypes.Character, AutoResponseTypes.Writer];

export interface AutoResponse {
	id: number;
	name: string;
	type: AutoResponseTypes;
	guild: Snowflake;
	content: string;
	aliases?: string[];
	author: Snowflake;
	editor?: Snowflake;
	created: Date;
	updated?: Date;
	wildcard: boolean;
	embed: boolean;
	embed_color?: number;
}

type Resolver = (message: Message) => string;

const resolvers: { [k: string]: Resolver } = {
	user: (message) => message.author.toString(),
	username: (message) => message.author.username,
	avatar: (message) => message.author.displayAvatarURL({ size: 2048, format: 'png', dynamic: true }),
	server: (message) => message.guild.name,
	channel: (message) => (message.channel as TextChannel).name
};

type Payload = string | Embed;

function resolvePayload(payload: Payload) {
	if (payload instanceof Embed) {
		return { embeds: [payload] };
	}

	return payload;
}

export async function handleAutoResponses(message: Message) {
	const sql = container.resolve<Sql<any>>('sql');

	const content = message.content.toLowerCase();

	const [response] = await sql<AutoResponse[]>`
	select * from auto_responses
	where (
		name = ${content}
		or ${content} = any(aliases)
		or (
			wildcard and (position(name in ${content}) > 0)
		)
	)
	and guild = ${message.guild.id}
	`;

	if (response) {
		let payload: Payload = [AutoResponseTypes.Moderator, AutoResponseTypes.Booster].includes(response.type)
			? `${Reflect.get(Recommendations.TEXT, response.type.toUpperCase())}\n\n${response.content}`
			: response.content;

		for (const [val, resolver] of Object.entries(resolvers)) {
			payload = payload.replaceAll(`{${val}}`, resolver(message));
		}

		if (response.embed) {
			payload = new Embed().setColor(response.embed_color).setDescription(payload);
		}

		if (RECOMMENDATION_TYPES.includes(response.type)) {
			return reply(message, resolvePayload(payload));
		}

		return send(message, resolvePayload(payload));
	}

	return false;
}

export async function handleLists(message: Message) {
	if (!Channels.RECOMMENDATION.includes(message.channel.id)) return false;

	const found = Object.entries(Recommendations.REGEX).find(([, regex]) => regex.test(message.content)) as [
		keyof typeof Recommendations.REGEX,
		RegExp
	];

	if (!found) return false;

	const sql = container.resolve<Sql<any>>('sql');

	const [list] = found;

	const data =
		list === 'TASTE_TEST'
			? await sql<AutoResponse[]>`
			select * from auto_responses
			where type in ('booster', 'moderator')
			and guild = ${message.guild.id};
			`
			: await sql<AutoResponse[]>`
			select * from auto_responses
			where type = ${list.toLowerCase()}
			and guild = ${message.guild.id};
			`;

	if (!data?.length) return false;

	const embed = new Embed().setColor(Colors.DC).setDescription(Recommendations.TEXT[list]);

	switch (list) {
		case 'TASTE_TEST':
			const [mods, boosters] = [
				data.filter((a) => a.type === AutoResponseTypes.Moderator),
				data.filter((a) => a.type === AutoResponseTypes.Booster)
			].map((c) => c.map((a) => a.name.replace(' recs', '')));

			const boosterColumns = chunk(boosters, 15);

			embed.addField('Mods', mods.join('\n'));

			for (const boosterColumn of boosterColumns) {
				embed.addField(embed.fields.length === 1 ? 'Boosters' : '\u200b', boosterColumn.join('\n'), true);
			}
			break;
		case 'CHARACTER':
			const formatted = data.map(
				(a) =>
					`**${
						Reflect.has(Recommendations.CUSTOM_TEXT, a.name.replace(' recs', ''))
							? Reflect.get(Recommendations.CUSTOM_TEXT, a.name.replace(' recs', ''))
							: toTitleCase(a.name)
					}** [${a.name}]`
			);

			embed.setDescription(`${embed.description}\n\n${formatted.join('\n')}`);
			break;
		case 'WRITER':
			const writerColumns = chunk(data.map((a) => toTitleCase(a.name.replace(' recs', ''))).sort(), 20);

			for (const writerColumn of writerColumns) {
				embed.addField('\u200b', writerColumn.join('\n'), true);
			}
			break;
	}

	await reply(message, { embeds: [embed] });

	return true;
}
