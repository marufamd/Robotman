const { oneLine } = require('common-tags');
const { Command } = require('discord-akairo');
const { google, randomResponse } = require('../../util');
const { googleColors } = require('../../util/constants');

module.exports = class extends Command {
    constructor() {
        super('google', {
            aliases: ['google', 'search'],
            description: {
                info: 'Searches Google and returns the first three results.',
                usage: '<query>',
                extended: ['You can put `--first` in the command to only send the first result'],
                examples: ['comicbooks'],
            },
            regex: /^(?:ok(?:ay)?|hey) google,?\s(.+)/i,
            args: [
                {
                    id: 'first',
                    match: 'flag',
                    flag: ['--first', '-first']
                },
                {
                    id: 'query',
                    type: 'string',
                    match: 'rest',
                    prompt: {
                        start: 'What would you like to search for?'
                    }
                }
            ],
            typing: true
        });
    }

    async exec(message, { query, first, match }) {
        if (!query && match) {
            query = match[1];
            first = true;
        }

        let response;
        const results = await this.search(query, first ? 1 : 3, !message.channel.nsfw);

        if (!results) {
            response = 'No results found';
        } else if (first) {
            response = results.results[0].link;
        } else {
            response = this.client.util.embed()
                .setColor(randomResponse(googleColors))
                .setAuthor(
                    `Top results for '${results.query}'`,
                    'https://i.imgur.com/DaNRfwC.png',
                    `https://www.google.com/search?q=${encodeURIComponent(query)}`)
                .setDescription(results.results
                    .map(r => `[${r.title}](${r.link})\n${oneLine`${r.description.trim()}`}`)
                    .join('\n\n'))
                .setFooter(`About ${results.totalResults} results (${results.time} seconds)`);
        }


        return message.util.send(response);
    }

    async search(query, amount = 1, safe = false) {
        if (!query) throw new Error('No query provided');
        const safeSearch = safe ? 'active' : 'off';

        const res = await google(query, safeSearch);
        if (!res) return null;

        if (res.queries.request[0].totalResults < amount) amount = 1;

        const arr = [];

        for (let i = 0; i < amount; i++) {
            const output = res.items[i];
            if (!output) break;
            arr.push({
                title: output.title,
                link: output.link,
                description: output.snippet
            });
        }

        return {
            query: query,
            totalResults: res.searchInformation.formattedTotalResults,
            time: res.searchInformation.formattedSearchTime,
            results: arr
        };
    }
};