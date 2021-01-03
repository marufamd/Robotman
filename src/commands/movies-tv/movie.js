const { Command } = require('discord-akairo');
const request = require('node-superfetch');
const { colors } = require('../../util/constants');

module.exports = class extends Command {
    constructor() {
        super('movie', {
            aliases: ['movie', 'movies', 'film', 'films'],
            description: {
                info: 'Shows information about a movie.',
                usage: '<query>',
                examples: ['Daredevil 2003'],
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

    interactionOptions = {
        name: 'movie',
        description: 'Shows information about a movie.',
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
            .get('https://www.omdbapi.com/')
            .query({
                apikey: process.env.MOVIEDB_KEY,
                type: 'movie',
                t: query.replaceAll(/spider man/gi, 'spider-man')
            });
            
        if (body.Response === 'False') return { content: 'No results found.', type: 'message', ephemeral: true };

        const embed = this.client.util.embed()
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

        if (body.Ratings?.length) embed.addField('Ratings', body.Ratings.map(r => `**${r.Source}:** ${r.Value}`));

        return embed;
    }
};