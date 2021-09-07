import { Embed } from '#util/builders';
import type { Command, CommandOptions } from '#util/commands';
import { Colors, NO_RESULTS_FOUND } from '#util/constants';
import { formatQuery } from '#util/misc';
import { request } from '#util/request';
import { reply } from '@skyra/editable-commands';
import type { ApplicationCommandOptionData, CommandInteraction, Message } from 'discord.js';

export default class implements Command {
	public options: CommandOptions = {
		aliases: ['fandom'],
		description: 'Searches a specifed wikia site.',
		usage: '<subdomain> <query>',
		example: ['marvel daredevil', 'dc batman'],
		args: [
			{
				name: 'wikia',
				type: 'string',
				prompt: 'Which wikia would you like to search in?'
			},
			{
				name: 'query',
				match: 'rest',
				prompt: 'What would you like to search for?'
			}
		],
		cooldown: 4,
		typing: true
	};

	public interactionOptions: ApplicationCommandOptionData[] = [
		{
			name: 'wikia',
			description: 'The wikia to search in.',
			type: 'STRING',
			required: true
		},
		{
			name: 'query',
			description: 'The query to search for.',
			type: 'STRING',
			required: true
		}
	];

	public async exec(message: Message, { wikia, query }: { wikia: string; query: string }) {
		return reply(message, await this.run(wikia, query));
	}

	public async interact(interaction: CommandInteraction, { wikia, query }: { wikia: string; query: string }) {
		return interaction.reply(await this.run(wikia, query));
	}

	private async run(wikia: string, content: string) {
		const BASE_URL = `https://${wikia}.fandom.com`;

		const {
			body: { query }
		} = await request.get(`${BASE_URL}/api.php`).query({
			action: 'query',
			titles: formatQuery(content),
			format: 'json',
			formatversion: 2,
			redirects: true
		});

		if (!query?.pages?.length || query.pages[0].missing) return NO_RESULTS_FOUND;

		const { pageid } = query.pages[0];

		const result = await this.getData(BASE_URL, pageid);

		if (!result) return NO_RESULTS_FOUND;

		const embed = new Embed()
			.setColor(Colors.FANDOM)
			.setAuthor(
				'FANDOM',
				'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ee/Fandom_heart-logo.svg/128px-Fandom_heart-logo.svg.png',
				'https://www.fandom.com/'
			)
			.setTitle(result.title)
			.setURL(result.url)
			.setDescription(result.description)
			.setImage(result.image);

		return { embeds: [embed] };
	}

	private async getData(baseURL: string, id: number) {
		const res = await request.get(`${baseURL}/api/v1/Articles/Details`).query({
			ids: id,
			abstract: 500
		});

		if (!res.ok) return null;

		const { items, basepath } = res.body;
		const { title, url, abstract, thumbnail, original_dimensions } = items[id.toString()];

		const description = abstract.split(/[0-9]\s(\b[A-Z][a-z]*\s*\b)+/g)[0].trimEnd();
		let image;
		if (original_dimensions) {
			const { width, height } = original_dimensions;
			image = this.getOriginalSize(thumbnail, width, height);
		}

		return {
			title,
			description: description.endsWith('.') ? description : `${description}...`,
			image,
			url: basepath + url
		};
	}

	private getOriginalSize(url: string, width: number, height: number) {
		return url.replace('width/200', `width/${width}`).replace('height/200', `height/${height}`);
	}
}
