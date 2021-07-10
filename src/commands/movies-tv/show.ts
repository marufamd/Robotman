import { Command } from 'discord-akairo';
import { CommandInteraction, Constants, Message } from 'discord.js';
import TurndownService from 'turndown';
import { colors } from '../../util/constants';
import request from '../../util/request';

export default class extends Command {
    public constructor() {
        super('show', {
            aliases: ['show', 'tv', 'tv-show'],
            description: 'Shows information about a TV show.',
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

    public interactionOptions = {
        name: 'show',
        description: 'Shows information about a TV show.',
        options: [
            {
                type: Constants.ApplicationCommandOptionTypes.STRING,
                name: 'query',
                description: 'The TV show to search for.',
                required: true
            }
        ]
    };

    public async exec(message: Message, { query }: { query: string }) {
        return message.util.send(await this.run(query));
    }

    public async interact(interaction: CommandInteraction, { query }: { query: string }) {
        return interaction.reply(await this.run(query));
    }

    private async run(query: string) {
        const { body } = await request
            .get('https://api.tvmaze.com/search/shows')
            .query('q', query);

        if (!body?.length) return { content: 'No results found.', ephemeral: true };

        const { show } = body[0];
        const network = show.network || show.webChannel;

        const embed = this.client.util
            .embed()
            .setColor(colors.TVMAZE)
            .setAuthor('TVmaze', 'https://i.imgur.com/ExggnTB.png', 'https://www.tvmaze.com/')
            .setTitle(show.name)
            .setURL(show.url)
            .setDescription(new TurndownService().turndown(show.summary))
            .setThumbnail(show.image.original)
            .addField('Language', show.language, true)
            .addField('Premiered', show.premiered, true)
            .addField('Status', show.status, true)
            .addField('Genres', show.genres.join(', '), true);

        if (network) embed.addField('Network', network.name, true);
        if (show.officialSite) embed.addField('Website', `[Click Here](${show.officialSite})`, true);
        if (embed.fields.length === 5) embed.addField('\u200b', '\u200b', true);

        return { embeds: [embed] };
    }
}