import { Embed } from '#util/builders';
import type { Command, CommandOptions } from '#util/commands';
import { Colors, Links, NO_RESULTS_FOUND } from '#util/constants';
import { formatQuery, getWikiParams, trim } from '#util/misc';
import { request } from '#util/request';
import { reply } from '@skyra/editable-commands';
import type { ApplicationCommandOptionData, CommandInteraction, Message } from 'discord.js';

const PROFANITY_URL = 'https://raw.githubusercontent.com/RobertJGabriel/Google-profanity-words/master/list.txt';

export default class implements Command {
	private blacklist: string[] = [];

	public options: CommandOptions = {
		aliases: ['wikipedia'],
		description: 'Searches Wikipedia.',
		usage: '<query>',
		example: ['daredevil', 'batman', 'marvel'],
		args: [
			{
				name: 'query',
				match: 'content',
				prompt: 'What would you like to search for?'
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
		}
	];

	public async exec(message: Message, { query }: { query: string }) {
		return reply(message, await this.run(query));
	}

	public async interact(interaction: CommandInteraction, { query }: { query: string }) {
		return interaction.reply(await this.run(query));
	}

	private async run(query: string) {
		const wordlist = await this.getBlacklist();
		if (query.split(/ +/).some((a) => wordlist.includes(a))) return { content: 'You cannot search for that term.', ephemeral: true };

		const page = await this.search(formatQuery(query));

		if (!page) return NO_RESULTS_FOUND;

		const embed = new Embed()
			.setColor(Colors.WIKIPEDIA)
			.setTitle(page.title)
			.setDescription(page.description)
			.setURL(page.url)
			.setFooter('Wikipedia', 'https://upload.wikimedia.org/wikipedia/commons/7/75/Wikipedia_mobile_app_logo.png');

		if (page.image) embed.setImage(page.image);

		return { embeds: [embed] };
	}

	private async search(query: string) {
		const { body } = await request.get(`${Links.WIKIPEDIA}/w/api.php`).query(getWikiParams(query));

		const [page] = body.query.pages;

		if (page.missing || !page.extract) return null;

		let description = page.extract;

		if (/(may )?(also )?refer to/gi.test(description)) {
			const links = page.links.map((l: { title: string }) => `[${l.title}](${this.getLink(l.title)})`).join('\n');

			description = `${trim(description.trimEnd(), 1015)}\n${trim(links, 1015)}`;
		} else {
			description = trim(description.split('\n')[0].trimEnd(), 1015);
		}

		return {
			title: page.title,
			description,
			url: this.getLink(page.title),
			image: page.thumbnail ? page.thumbnail.source : null
		};
	}

	private getLink(page: string) {
		return `${Links.WIKIPEDIA}/wiki/${encodeURIComponent(page.replaceAll(' ', '_'))}`;
	}

	private async getBlacklist() {
		if (this.blacklist.length) {
			return this.blacklist;
		}

		const { text } = await request.get(PROFANITY_URL);

		this.blacklist = text.split('\n');

		return this.blacklist;
	}
}
