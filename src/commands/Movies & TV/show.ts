import { Embed } from '#util/builders';
import type { Command, CommandOptions } from '#util/commands';
import { Colors, Links } from '#util/constants';
import { request } from '#util/request';
import type { ApplicationCommandOptionData, CommandInteraction, Message } from 'discord.js';
import TurndownService from 'turndown';

export default class implements Command {
	public options: CommandOptions = {
		aliases: ['tv', 'tv-show', 'television'],
		description: 'Displays information about a TV show.',
		usage: '<show>',
		example: ['Daredevil', 'Game of Thrones', 'Breaking Bad', 'The Expanse'],
		args: [
			{
				name: 'query',
				match: 'content',
				prompt: 'What show would you like to search for?'
			}
		],
		cooldown: 4,
		typing: true
	};

	public interactionOptions: ApplicationCommandOptionData[] = [
		{
			name: 'query',
			description: 'The TV show to search for.',
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
		const { body } = await request.get(`${Links.TV_MAZE}/search/shows`).query('q', query);

		if (!body?.length) return { content: 'No results found.', ephemeral: true };

		const { show } = body[0];
		const network = show.network || show.webChannel;

		const embed = new Embed()
			.setColor(Colors.TV_MAZE)
			.setAuthor('TVmaze', 'https://i.imgur.com/ExggnTB.png', 'https://www.tvmaze.com/')
			.setTitle(show.name)
			.setURL(show.url)
			.setDescription(new TurndownService().turndown(show.summary))
			.setThumbnail(show.image.original)
			.addField('Language', show.language, true)
			.addField('Premiered', show.premiered, true)
			.addField('Status', show.status, true)
			.addField('Genres', show.genres.join(', '), true);

		if (network) {
			embed.addField('Network', network.name, true);
		}

		if (show.officialSite) {
			embed.addField('Website', `[Click Here](${show.officialSite})`, true);
		}

		return {
			embeds: [embed.inlineFields()]
		};
	}
}
