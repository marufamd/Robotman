import { Command } from 'discord-akairo';
import { APIInteractionResponseType, ApplicationCommandOptionType } from 'discord-api-types/v8';
import type { Message } from 'discord.js';
import type Interaction from '../../structures/Interaction';
import { colors } from '../../util/constants';
import request from '../../util/request';

export default class extends Command {
    public constructor() {
        super('movie', {
            aliases: ['movie', 'movies', 'film', 'films'],
            description: {
                info: 'Shows information about a movie.',
                usage: '<query>',
                examples: ['Daredevil 2003']
            },
            args: [
                {
                    id: 'query',
                    match: 'content',
                    prompt: {
                        start: 'What movie would you like to search for?'
                    }
                }
            ],
            cooldown: 4e3,
            typing: true
        });
    }

    public interactionOptions = {
        name: 'movie',
        description: 'Shows information about a movie.',
        options: [
            {
                type: ApplicationCommandOptionType.STRING,
                name: 'query',
                description: 'The movie to search for.',
                required: true
            }
        ]
    };

    public async exec(message: Message, { query }: { query: string }) {
        return message.util.send(await this.main(query));
    }

    public async interact(interaction: Interaction) {
        const query = interaction.option('query') as string;
        return interaction.respond(await this.main(query));
    }

    private async main(query: string) {
        const { body } = await request
            .get('https://www.omdbapi.com/')
            .query({
                apikey: process.env.MOVIEDB_KEY,
                type: 'movie',
                t: query.replaceAll(/spider man/gi, 'spider-man')
            });

        if (body.Response === 'False') return { content: 'No results found.', type: APIInteractionResponseType.ChannelMessage, ephemeral: true };

        const embed = this.client.util
            .embed()
            .setColor(colors.MOVIE_DB)
            .setTitle(`${body.Title} (${body.Year})`)
            .setThumbnail(body.Poster === 'N/A' ? null : body.Poster)
            .setURL(`https://www.imdb.com/title/${body.imdbID}`)
            .setDescription([
                body.Plot,
                '',
                `**Genres**: ${body.Genre}`,
                `**Age Rating**: ${body.Rated}`,
                `**Country:** ${body.Country}`,
                `**Runtime:** ${body.Runtime}`,
                '',
                `**Directed by:** ${body.Director}`,
                `**Credits:** ${body.Writer.replaceAll(' by', '')}`,
                `**Starring:** ${body.Actors}`,
                `**Production Companies:** ${body.Production}`
            ])
            .setFooter('Open Movie Database');

        if (body.Ratings?.length) embed.addField('Ratings', body.Ratings.map((r: { Source: string; Value: string }) => `**${r.Source}:** ${r.Value}`));

        return embed;
    }
}