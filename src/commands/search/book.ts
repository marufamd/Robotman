import { Command } from 'discord-akairo';
import { CommandInteraction, Constants, Message } from 'discord.js';
import { plural, trim } from '../../util';
import { colors } from '../../util/constants';
import request from '../../util/request';

const stars = (num: number) => '★'.repeat(num);

export default class extends Command {
    public constructor() {
        super('book', {
            aliases: ['book', 'novel'],
            description: 'Shows information about a book.',
            args: [
                {
                    id: 'query',
                    match: 'content',
                    prompt: {
                        start: 'What book would you like to search for?'
                    }
                }
            ],
            typing: true,
            cooldown: 5e3
        });
    }

    public interactionOptions = {
        name: 'book',
        description: 'Shows information about a book.',
        options: [
            {
                type: Constants.ApplicationCommandOptionTypes.STRING,
                name: 'query',
                description: 'The book to search for.',
                required: true
            }
        ]
    };

    public async exec(message: Message, { query }: { query: string }) {
        return message.util.send(await this.run(query));
    }

    public async interact(interaction: CommandInteraction, { query }: { query: string }) {
        const data = this.client.util.checkEmbed(await this.run(query));
        return interaction.reply(data);
    }

    private async run(query: string) {
        const { body } = await request
            .get('https://www.googleapis.com/books/v1/volumes')
            .query({
                apiKey: process.env.GOOGLE_SEARCH_KEY,
                q: query,
                maxResults: 1,
                orderBy: 'relevance',
                printType: 'books'
            });

        if (body.totalItems === 0 || !body.items?.length) return { content: 'No results found.', ephemeral: true };

        const { volumeInfo: book } = body.items[0];

        const embed = this.client.util
            .embed()
            .setColor(colors.GOOGLE_BOOKS)
            .setAuthor('Google Books', 'https://i.imgur.com/Xe6BhJA.png', 'https://books.google.com/')
            .setTitle(book.title)
            .setURL(book.previewLink)
            .setDescription(book.description?.length ? trim(book.description, 2048) : null)
            .setThumbnail(book.imageLinks?.extraLarge ?? book.imageLinks.large ?? book.imageLinks.medium ?? book.imageLinks.small ?? book.imageLinks.thumbnail ?? null);

        if (book.authors?.length) embed.addField(plural('Author', book.authors.length), book.authors.join('\n'), true);
        if (book.publishedDate) embed.addField('Published', book.publishedDate, true);
        if (book.publisher?.length) embed.addField('Publisher', book.publisher, true);
        if ('averageRating' in book) embed.addField('Average Rating', stars(parseInt(book.averageRating)) ?? 'None', true);
        if ('pageCount' in book) embed.addField('Page Count', book.pageCount.toString(), true);
        if (book.categories?.length) embed.addField('Categories', book.categories.join(', '), true);

        return { embed: embed.inlineFields() };
    }
}