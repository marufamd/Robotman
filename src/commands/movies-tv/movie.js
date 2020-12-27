const { Command } = require('discord-akairo');
const { fetch } = require('../../util');
const { colors } = require('../../util/constants');

module.exports = class extends Command {
    constructor() {
        super('movie', {
            aliases: ['movie', 'movies', 'film', 'films'],
            description: {
                info: 'Displays info about a movie.',
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
            ratelimit: 4
        });
    }

    async exec(message, { query }) {
        const params = {
            apikey: process.env.MOVIEDB_KEY,
            type: 'movie',
            t: query.replaceAll(/spider man/gi, 'spider-man')
        };

        const res = await fetch('https://www.omdbapi.com/', params);
        if (res.Response === 'False') return message.util.send('No results found.');

        const embed = this.client.util.embed()
            .setColor(colors.MOVIE_DB)
            .setTitle(`${res.Title} (${res.Year})`)
            .setThumbnail(res.Poster === 'N/A' ? null : res.Poster)
            .setURL(`https://www.imdb.com/title/${res.imdbID}`)
            .setDescription([
                res.Plot,
                '',
                `**Genres**: ${res.Genre}`,
                `**Age Rating**: ${res.Rated}`,
                `**Country:** ${res.Country}`,
                `**Runtime:** ${res.Runtime}`,
                '',
                `**Directed by:** ${res.Director}`,
                `**Credits:** ${res.Writer.replaceAll(' by', '')}`,
                `**Starring:** ${res.Actors}`,
                `**Production Companies:** ${res.Production}`
            ])
            .setFooter('Open Movie Database');

        if (res.Ratings?.length) embed.addField('Ratings', res.Ratings.map(r => `**${r.Source}:** ${r.Value}`));

        return message.util.send(embed);
    }
};