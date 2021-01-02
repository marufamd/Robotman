const { oneLine } = require('common-tags');
const { Command, Argument } = require('discord-akairo');
const { google, randomResponse } = require('../../util');
const { googleColors } = require('../../util/constants');

module.exports = class extends Command {
    constructor() {
        super('google', {
            aliases: ['google', 'search', 'google-search'],
            description: {
                info: 'Searches Google.',
                usage: '<query>',
                extended: ['You can put `--first` in the command to only send the first result'],
                examples: ['comicbooks'],
            },
            regex: /^(?:ok(?:ay)?|hey) google,?\s(.+)/i,
            args: [
                {
                    id: 'query',
                    type: 'string',
                    match: 'rest',
                    prompt: {
                        start: 'What would you like to search for?'
                    }
                },
                {
                    id: 'amount',
                    type: Argument.range('number', 1, 5, true),
                    match: 'option',
                    flag: ['--amount=', '-amount=', '--results=', '-results=', 'amount:'],
                    default: 1
                }
            ],
            typing: true,
            cooldown: 8
        });
    }

    interactionOptions = {
        name: 'google',
        description: 'Searches Google.',
        options: [
            {
                type: 'string',
                name: 'query',
                description: 'The query to search for.',
                required: true
            },
            {
                type: 'integer',
                name: 'amount',
                description: 'The amount of results to return (Max 5).'
            }
        ]
    }

    async exec(message, { query, amount, match }) {
        if (!query && match) {
            query = match[1];
            amount = 1;
        }

        const result = await this.main(query, amount, message);
        return message.util.send(result);
    }

    async interact(interaction) {
        let [query, amount] = interaction.findOptions('query', 'amount'); // eslint-disable-line prefer-const
        if (!amount) amount = 1;

        const result = await this.main(query, amount, interaction);
        return interaction.respond(result);
    }

    async main(query, amount, message) {
        if (amount > 5) amount = 5;

        let response;
        const results = await this.search(query, amount, !message.channel?.nsfw ?? true);

        if (!results) {
            response = { content: 'No results found.', type: 'message', ephemeral: true };
        } else if (amount === 1) {
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

        return response;
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