import { Embed } from '#util/builders';
import type { Command, CommandOptions } from '#util/commands';
import { Colors, Links, NO_RESULTS_FOUND } from '#util/constants';
import { request } from '#util/request';
import { reply } from '@skyra/editable-commands';
import type { ApplicationCommandOptionData, CommandInteraction, Message } from 'discord.js';

export default class implements Command {
	public options: CommandOptions = {
		aliases: ['char', 'comic-vine'],
		description: 'Searches Comic Vine for a character.',
		usage: '<query>',
		example: ['daredevil', 'batman', 'spider-man'],
		args: [
			{
				name: 'query',
				match: 'content',
				prompt: 'What character would you like to search for?'
			}
		],
		cooldown: 10,
		typing: true
	};

	public interactionOptions: ApplicationCommandOptionData[] = [
		{
			name: 'query',
			description: 'The character to search for.',
			type: 'STRING',
			required: true
		}
	];

	public async exec(message: Message, { query }: { query: string }) {
		return reply(message, await this.run(query));
	}

	public async interact(interaction: CommandInteraction, { query }: { query: string }) {
		return interaction.reply(await this.run(query));
	}

	private async run(query: string) {
		const params = {
			api_key: process.env.COMICVINE_KEY,
			filter: `name:${query}`,
			format: 'json'
		};

		const { body } = await request.get(`${Links.COMICVINE}/api/characters/`).query(params);

		if (!body.number_of_total_results || !body.results?.length) return NO_RESULTS_FOUND;

		const [char] = body.results;

		let str = char.deck ? `${char.deck}\n\n` : '';

		if (char.real_name?.length) {
			str += `• **Real Name:** ${char.real_name}\n`;
		}

		if (char.first_appeared_in_issue?.name) {
			str += `• **First Appearance:** '${char.first_appeared_in_issue.name.split(' / ')[0]}'\n`;
		}

		if (char.origin?.name) {
			str += `• **Origin:** ${char.origin.name}\n`;
		}

		if (char.publisher?.name) {
			str += `• **Published by:** ${char.publisher.name}`;
		}

		const embed = new Embed()
			.setColor(Colors.COMICVINE)
			.setAuthor('Comic Vine', 'https://i.imgur.com/AgMseb9.png', Links.COMICVINE)
			.setTitle(char.name)
			.setURL(char.site_detail_url)
			.setThumbnail(char.image.original_url)
			.setDescription(str);

		if (char.aliases?.length) embed.addField('Aliases', char.aliases.replaceAll('\r', '').split('\n').join(', '));

		return { embeds: [embed] };
	}
}
