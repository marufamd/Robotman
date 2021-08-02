import { Embed } from '#util/builders';
import type { Command, CommandOptions } from '#util/commands';
import { Colors, NO_RESULTS_FOUND } from '#util/constants';
import { pluralize, trim } from '#util/misc';
import { request } from '#util/request';
import type { ApplicationCommandOptionData, CommandInteraction, Message } from 'discord.js';

export default class implements Command {
	public options: CommandOptions = {
		aliases: ['novel'],
		description: 'Displays information about a book.',
		usage: '<book>',
		example: ['daredevil'],
		args: [
			{
				name: 'query',
				type: 'string',
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
			description: 'The book to search for.',
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
		const { body } = await request.get('https://www.googleapis.com/books/v1/volumes').query({
			apiKey: process.env.GOOGLE_SEARCH_KEY,
			q: query,
			maxResults: 1,
			orderBy: 'relevance',
			printType: 'books'
		});

		if (body.totalItems === 0 || !body.items?.length) return NO_RESULTS_FOUND;

		const { volumeInfo: book } = body.items[0];

		const embed = new Embed()
			.setColor(Colors.GOOGLE_BOOKS)
			.setAuthor('Google Books', 'https://i.imgur.com/Xe6BhJA.png', 'https://books.google.com/')
			.setTitle(book.title)
			.setURL(book.previewLink)
			.setDescription(book.description?.length ? trim(book.description, 2048) : null)
			.setThumbnail(
				book.imageLinks?.extraLarge ??
					book.imageLinks.large ??
					book.imageLinks.medium ??
					book.imageLinks.small ??
					book.imageLinks.thumbnail ??
					null
			);

		if (book.authors?.length) {
			embed.addField(pluralize('Author', book.authors.length, false), book.authors.join('\n'), true);
		}

		if (book.publishedDate) {
			embed.addField('Published', book.publishedDate, true);
		}

		if (book.publisher?.length) {
			embed.addField('Publisher', book.publisher, true);
		}

		if ('averageRating' in book) {
			embed.addField('Average Rating', book.averageRating ? '★'.repeat(parseInt(book.averageRating)) : 'None', true);
		}

		if ('pageCount' in book) {
			embed.addField('Page Count', book.pageCount.toString(), true);
		}

		if (book.categories?.length) {
			embed.addField('Categories', book.categories.join(', '), true);
		}

		return {
			embeds: [embed.inlineFields()]
		};
	}
}
