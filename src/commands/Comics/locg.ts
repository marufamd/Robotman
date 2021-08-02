import { Embed } from '#util/builders';
import type { Command, CommandOptions } from '#util/commands';
import { Colors, NO_RESULTS_FOUND } from '#util/constants';
import { chunk } from '@sapphire/utilities';
import { BASE_URL, CollectionTypes, fetchSearchResults } from 'comicgeeks';
import type { ApplicationCommandOptionData, CommandInteraction, Message } from 'discord.js';

const MAX_SEARCH_RESULTS = 8;

export default class implements Command {
	public options: CommandOptions = {
		aliases: ['series'],
		description: 'Searches League of Comic Geeks for a series.',
		usage: '<query>',
		example: ['batman', 'daredevil', 'stillwater'],
		args: [
			{
				name: 'query',
				match: 'content',
				prompt: 'What would you like to search for?'
			}
		],
		cooldown: 5,
		typing: true
	};

	public interactionOptions: ApplicationCommandOptionData[] = [
		{
			name: 'query',
			description: 'The query to search for.',
			type: 'STRING',
			required: true
		}
	];

	public async exec(message: Message, { query }: { query: string }) {
		return message.send(await this.run(query));
	}

	public async interact(interaction: CommandInteraction, { query }: { query: string }) {
		return interaction.reply(await this.run(query));
	}

	private async run(query: string) {
		const results = await fetchSearchResults(query, CollectionTypes.Series);
		if (!results.length) return NO_RESULTS_FOUND;

		let num = MAX_SEARCH_RESULTS;
		const half = num / 2;
		if (results.length < num) num = results.length;

		let formatted = [];

		for (let i = 0; i < num; i++) {
			const result = results[i];
			const str = `**[${result.name}](${result.url})**\n${result.publisher} | [Cover](${result.cover})`;
			formatted.push(str);
		}

		if (formatted.length > half) {
			formatted = chunk(formatted, half);
		} else {
			formatted = [formatted];
		}

		const [page1, page2] = formatted;

		const embed = new Embed()
			.setColor(Colors.LOCG)
			.setAuthor('League of Comic Geeks', `${BASE_URL}/assets/images/user-menu-logo-icon.png`, BASE_URL)
			.setTitle(`Top results for '${query}'`)
			.setURL(`${BASE_URL}/search?keyword=${encodeURIComponent(query)}`)
			.addField('Page 1', page1.join('\n'), true)
			.setThumbnail(results[0].cover);

		if (page2?.length) embed.addField('Page 2', page2.join('\n'), true);

		return { embeds: [embed] };
	}
}
