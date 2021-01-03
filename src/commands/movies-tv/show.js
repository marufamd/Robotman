const { Command } = require('discord-akairo');
const request = require('node-superfetch');
const TurndownService = require('turndown');
const { colors } = require('../../util/constants');

module.exports = class extends Command {
    constructor() {
        super('show', {
            aliases: ['show', 'tv', 'tv-show'],
            description: {
                info: 'Shows information about a TV show.',
                usage: '<query>',
                examples: ['Daredevil'],
            },
            args: [
                {
                    id: 'query',
                    match: 'content',
                    prompt: {
                        start: 'What show would you like to search for?'
                    }
                }
            ],
            cooldown: 4e3,
            typing: true
        });
    }

    interactionOptions = {
        name: 'show',
        description: 'Shows information about a TV show.',
        options: [
            {
                type: 'string',
                name: 'query',
                description: 'The TV show to search for.',
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
            .get('https://api.tvmaze.com/search/shows')
            .query('q', query);

        if (!body?.length) return { content: 'No results found.', type: 'message', ephemeral: true };

        const { show } = body[0];
        const network = show.network || show.webChannel;

        const embed = this.client.util.embed()
            .setColor(colors.TVMAZE)
            .setTitle(show.name)
            .setURL(show.url)
            .setDescription(new TurndownService().turndown(show.summary))
            .setThumbnail(show.image.original)
            .addField('Language', show.language, true)
            .addField('Premiered', show.premiered, true)
            .addField('Status', show.status, true)
            .addField('Genres', show.genres.join(', '), true)
            .setFooter('TVmaze', 'https://i.imgur.com/ExggnTB.png');

        if (network) embed.addField('Network', network.name, true);
        if (show.officialSite) embed.addField('Website', `[Click Here](${show.officialSite})`, true);
        if (embed.fields.length === 5) embed.addField('\u200b', '\u200b', true);

        return embed;
    }
};