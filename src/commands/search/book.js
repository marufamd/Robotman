const { Command } = require('discord-akairo');
const request = require('node-superfetch');
const { trim, plural } = require('../../util');
const { colors } = require('../../util/constants');

const stars = num => '★'.repeat(num);

module.exports = class extends Command {
    constructor() {
        super('book', {
            aliases: ['book', 'novel'],
            description: {
                info: 'Shows information about a book.',
                usage: '<query>'
            },
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

    interactionOptions = {
        name: 'book',
        description: 'Shows information about a book.',
        options: [
            {
                type: 'string',
                name: 'query',
                description: 'The movie to search for.',
                required: true
            }
        ]
    }

    async exec(message, { query }) {
        return message.util.send(await this.main(query));
    }

    async interact(interaction) {
        return interaction.respond(await this.main(interaction.option('query')));
    }

    async main(query) {
        const { body } = await request
            .get('https://www.googleapis.com/books/v1/volumes')
            .query({
                apiKey: process.env.GOOGLE_SEARCH_KEY,
                q: query,
                maxResults: 1,
                orderBy: 'relevance',
                printType: 'books'
            });

        if (body.totalItems === 0 || !body.items?.length) return { content: 'No results found.', type: 'message', ephemeral: true };

        const { volumeInfo: book } = body.items[0];

        const embed = this.client.util.embed()
            .setColor(colors.GOOGLE_BOOKS)
            .setTitle(book.title)
            .setURL(book.previewLink)
            .setDescription(book.description?.length ? trim(book.description, 2048) : null)
            .setThumbnail(book.imageLinks?.extraLarge ?? book.imageLinks.large ?? book.imageLinks.medium ?? book.imageLinks.small ?? book.imageLinks.thumbnail ?? null)
            .setFooter('Google Books', 'https://i.imgur.com/Xe6BhJA.png');

        if (book.authors?.length) embed.addField(plural('Author', book.authors.length), book.authors.join('\n'), true);
        if (book.publishedDate) embed.addField('Published', book.publishedDate, true);
        if (book.publisher?.length) embed.addField('Publisher', book.publisher, true);
        if ('averageRating' in book) embed.addField('Average Rating', stars(parseInt(book.averageRating)) ?? 'None', true);
        if ('pageCount' in book) embed.addField('Page Count', book.pageCount, true);
        if (book.categories?.length) embed.addField('Categories', book.categories.join(', '), true);

        return embed.inlineFields();
    }
};