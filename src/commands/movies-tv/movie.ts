import { Command } from 'discord-akairo';
import { CommandInteraction, Constants, Message } from 'discord.js';
import { colors } from '../../util/constants';
import request from '../../util/request';

interface OpenMovieDatabaseResponse {
    Title: string;
    Year: `${number}`;
    Rated: string;
    Released: string;
    Runtime: string;
    Genre: string;
    Director: string;
    Writer: string;
    Actors: string;
    Plot: string;
    Language: string;
    Country: string;
    Awards: string;
    Poster: string;
    Production: string;
    Ratings: Array<{
        Source: string;
        Value: string;
    }>;
    Metascore: string;
    imdbRating: string;
    imdbVotes: string;
    imdbID: string;
    Type: string;
    totalSeasons: string;
    Response: 'True' | 'False';
}

export default class extends Command {
    public constructor() {
        super('movie', {
            aliases: ['movie', 'movies', 'film', 'films'],
            description: 'Shows information about a movie.',
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
                type: Constants.ApplicationCommandOptionTypes.STRING,
                name: 'query',
                description: 'The movie to search for.',
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
        const { body }: { body: OpenMovieDatabaseResponse } = await request
            .get('https://www.omdbapi.com/')
            .query({
                apikey: process.env.OPEN_MOVIE_DB_KEY,
                type: 'movie',
                t: query.replaceAll(/spider man/gi, 'spider-man')
            });

        if (body.Response === 'False') return { content: 'No results found.', ephemeral: true };

        const embed = this.client.util
            .embed()
            .setColor(colors.MOVIE_DB)
            .setTitle(`${body.Title} (${body.Year})`)
            .setThumbnail(body.Poster === 'N/A' ? null : body.Poster)
            .setURL(`https://www.imdb.com/title/${body.imdbID}`)
            .setDescription(
                [
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
                ].join('\n')
            )
            .setFooter('Open Movie Database');

        if (body.Ratings?.length) {
            embed.addField(
                'Ratings',
                body.Ratings
                    .map((r: { Source: string; Value: string }) => `**${r.Source}:** ${r.Value}`)
                    .join('\n')
            );
        }

        return { embeds: [embed] };
    }
}