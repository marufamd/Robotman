import { Embed } from '#util/builders';
import { Channels, Colors, Recommendations } from '#util/constants';
import { redditWiki } from '#util/wrappers';
import { chunk } from '@sapphire/utilities';
import { reply } from '@skyra/editable-commands';
import type { Message } from 'discord.js';

export function handleRecommendations(message: Message) {
	if (!Channels.RECOMMENDATION.includes(message.channel.id)) return false;

	if (Recommendations.REGEX.TASTE_TEST.test(message.content)) {
		return tasteTest(message);
	}

	if (Recommendations.REGEX.WRITERS.test(message.content)) {
		return writersRecs(message);
	}
}

async function tasteTest(message: Message) {
	const { data }: Record<string, string[]> = await redditWiki(`pages`, 'DCcomics');
	const list = data.filter((p) => p.startsWith('recsbot/tastetest/'));

	const filter = (fn: (item: string) => boolean) =>
		list
			.filter(fn)
			.map((p) => p.replace(/recsbot\/tastetest\/(.+)recs(?:mod)?/g, '$1'))
			.sort();

	const [mods, boosters] = [filter((p) => p.endsWith('mod')), filter((p) => !p.endsWith('mod'))];

	const columns = chunk(boosters, 15);

	const embed = new Embed().setColor(Colors.DC).setDescription(Recommendations.TEXT.LIST).addField('Mods', mods.join('\n'));

	for (const column of columns) {
		embed.addField(embed.fields.length === 1 ? 'Boosters' : '\u200b', column.join('\n'), true);
	}

	await reply(message, { embeds: [embed] });

	return true;
}

async function writersRecs(message: Message) {
	const {
		data: { content_md: data }
	}: Record<string, Record<string, string>> = await redditWiki(`recsbot/writersrecs`, 'DCcomics');

	const [text, writers] = data.split('\r\n\r\n');

	const list = writers
		.split('\n')
		.map((w) => w.replace(/\[(.+?)\]\((https?:\/\/[a-zA-Z0-9/.(]+?)\)/g, '$1').trim())
		.sort();

	const columns = chunk(list, 20);

	const embed = new Embed().setColor(Colors.DC).setDescription(text);

	for (const column of columns) {
		embed.addField('\u200b', column.join('\n'), true);
	}

	await reply(message, { embeds: [embed] });

	return true;
}
