import { ArgumentUtil } from '#util/arguments';
import { Embed } from '#util/builders';
import type { Command, CommandOptions } from '#util/commands';
import { Colors, NO_RESULTS_FOUND } from '#util/constants';
import { randomResponse } from '#util/misc';
import { google } from '#util/wrappers';
import { reply } from '@skyra/editable-commands';
import { oneLine } from 'common-tags';
import type { ApplicationCommandOptionData, CommandInteraction, Message, TextChannel } from 'discord.js';

export default class implements Command {
	public options: CommandOptions = {
		aliases: ['search', 'google-search'],
		description: 'Searches Google.',
		extended: 'You can say a variation of `okay google, <query>` to call the command',
		regex: /^(?:ok(?:ay)?|hey) google,?\s(.+)/i,
		usage: '<query>',
		example: ['comicbooks', 'daredevil'],
		args: [
			{
				name: 'query',
				type: 'string',
				match: 'content',
				prompt: 'What would you like to search for?'
			},
			{
				name: 'amount',
				type: ArgumentUtil.range('number', 1, 5),
				match: 'option',
				flags: ['amount', 'results', 'a'],
				default: 1
			}
		],
		cooldown: 4,
		typing: true
	};

	public interactionOptions: ApplicationCommandOptionData[] = [
		{
			name: 'query',
			description: 'The query to search for.',
			type: 'STRING',
			required: true
		},
		{
			name: 'amount',
			description: 'The amount of results to return (Max 5).',
			type: 'STRING'
		}
	];

	public async exec(message: Message, { query, amount, match }: { query: string; amount: number; match: any }) {
		if (!query && match) {
			query = match[1];
			amount = 1;
		}

		return reply(message, await this.run(query, amount, message));
	}

	public async interact(interaction: CommandInteraction, { query, amount }: { query: string; amount: number }) {
		return interaction.reply(await this.run(query, amount || 1, interaction));
	}

	private async run(query: string, amount: number, data: Message | CommandInteraction) {
		if (amount > 5) amount = 5;

		const results = await this.search(query, amount, !(data.channel as TextChannel).nsfw);

		if (!results) {
			return NO_RESULTS_FOUND;
		}

		if (amount === 1) {
			return `Top result for **${results.query}**\n${results.results[0].link}`;
		}

		return {
			embeds: [
				new Embed()
					.setColor(randomResponse([Colors.GOOGLE_BLUE, Colors.GOOGLE_GREEN, Colors.GOOGLE_RED, Colors.GOOGLE_YELLOW]))
					.setAuthor(
						`Top results for '${results.query}'`,
						'https://i.imgur.com/DaNRfwC.png',
						`https://www.google.com/search?q=${encodeURIComponent(query)}`
					)
					.setDescription(results.results.map((r) => `[${r.title}](${r.link})\n${oneLine(r.description.trim())}`).join('\n\n'))
					.setFooter(`About ${results.totalResults} results (${results.time} seconds)`)
			]
		};
	}

	private async search(query: string, amount = 1, safe = false) {
		if (!query) throw new Error('No query provided');

		const res = await google(query, safe);
		if (!res) return null;

		if (res.queries.request[0].totalResults < amount) amount = 1;

		const arr = [];

		for (let i = 0; i < amount; i++) {
			const output = res.items[i];
			if (!output) break;
			arr.push({
				title: output.title,
				link: output.link,
				description: output.snippet
			});
		}

		return {
			query: query,
			totalResults: res.searchInformation.formattedTotalResults,
			time: res.searchInformation.formattedSearchTime,
			results: arr
		};
	}
}
