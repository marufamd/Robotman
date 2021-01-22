import { oneLine } from 'common-tags';
import { Argument, Command } from 'discord-akairo';
import { APIInteractionResponseType, ApplicationCommandOptionType } from 'discord-api-types/v8';
import type { Message, TextChannel } from 'discord.js';
import type Interaction from '../../structures/Interaction';
import { google, randomResponse } from '../../util';

const COLORS = ['#008744', '#0057e7', '#d62d20', '#ffa700'];

export default class extends Command {
    public constructor() {
        super('google', {
            aliases: ['google', 'search', 'google-search'],
            description: {
                info: 'Searches Google.',
                usage: '<query>',
                extended: ['You can put `--first` in the command to only send the first result'],
                examples: ['comicbooks']
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
            cooldown: 8e3
        });
    }

    public interactionOptions = {
        name: 'google',
        description: 'Searches Google.',
        options: [
            {
                type: ApplicationCommandOptionType.STRING,
                name: 'query',
                description: 'The query to search for.',
                required: true
            },
            {
                type: ApplicationCommandOptionType.STRING,
                name: 'amount',
                description: 'The amount of results to return (Max 5).'
            }
        ]
    };

    public async exec(message: Message, { query, amount, match }: { query: string; amount: number; match: any }) {
        if (!query && match) {
            query = match[1];
            amount = 1;
        }

        return message.util.send(await this.main(query, amount, message));
    }

    public async interact(interaction: Interaction) {
        const [query, amount] = interaction.findOptions('query', 'amount');
        return interaction.respond(await this.main(query, amount || 1, interaction));
    }

    private async main(query: string, amount: number, message: Message | Interaction) {
        if (amount > 5) amount = 5;

        let response;
        const results = await this.search(query, amount, !(message.channel as TextChannel)?.nsfw ?? true);

        if (!results) {
            response = { content: 'No results found.', type: APIInteractionResponseType.ChannelMessage, ephemeral: true };
        } else if (amount === 1) {
            response = `Top result for **${results.query}**\n${results.results[0].link}`;
        } else {
            response = this.client.util
                .embed()
                .setColor(randomResponse(COLORS))
                .setAuthor(
                    `Top results for '${results.query}'`,
                    'https://i.imgur.com/DaNRfwC.png',
                    `https://www.google.com/search?q=${encodeURIComponent(query)}`
                )
                .setDescription(results.results
                    .map(r => `[${r.title}](${r.link})\n${oneLine`${r.description.trim()}`}`)
                    .join('\n\n'))
                .setFooter(`About ${results.totalResults} results (${results.time} seconds)`);
        }

        return response;
    }

    private async search(query: string, amount = 1, safe = false) {
        if (!query) throw new Error('No query provided');

        const res = await google(query, safe);
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
}