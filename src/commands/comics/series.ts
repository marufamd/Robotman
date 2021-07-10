import { BASE_URL, CollectionTypes, fetchSearchResults } from 'comicgeeks';
import { Command } from 'discord-akairo';
import { CommandInteraction, Constants, Message } from 'discord.js';
import { split } from '../../util';
import { colors } from '../../util/constants';

export default class extends Command {
    private readonly MAX_SEARCH_RESULTS = 8;

    public constructor() {
        super('series', {
            aliases: ['series', 'locg-search', 'comic-search', 'series-search'],
            description: 'Searches League of Comic Geeks for a series.',
            args: [
                {
                    id: 'query',
                    match: 'content',
                    prompt: {
                        start: 'What would you like to search for?'
                    }
                }
            ],
            typing: true,
            cooldown: 5e3
        });
    }

    public data = {
        usage: '<query>',
        examples: [
            'batman',
            'daredevil',
            'stillwater'
        ]
    };

    public interactionOptions = {
        name: 'series',
        description: 'Searches League of Comic Geeks for a series.',
        options: [
            {
                type: Constants.ApplicationCommandOptionTypes.STRING,
                name: 'query',
                description: 'The series to search for.',
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
        const results = await fetchSearchResults(query, CollectionTypes.Series);
        if (!results.length) return { content: 'No results found', ephemeral: true };

        let num = this.MAX_SEARCH_RESULTS;
        const half = num / 2;
        if (results.length < num) num = results.length;

        let formatted = [];

        for (let i = 0; i < num; i++) {
            const result = results[i];
            const str = `**[${result.name}](${result.url})**\n${result.publisher} | [Cover](${result.cover})`;
            formatted.push(str);
        }

        if (formatted.length > half) {
            formatted = split(formatted, half);
        } else {
            formatted = [formatted];
        }

        const [page1, page2] = formatted;

        const embed = this.client.util
            .embed()
            .setColor(colors.LOCG)
            .setAuthor('League of Comic Geeks', `${BASE_URL}/assets/images/user-menu-logo-icon.png`, BASE_URL)
            .setTitle(`Top results for '${query}'`)
            .setURL(`${BASE_URL}/search?keyword=${encodeURIComponent(query)}`)
            .addField('Page 1', page1.join('\n'), true)
            .setThumbnail(results[0].cover);

        if (page2?.length) embed.addField('Page 2', page2.join('\n'), true);

        return { embeds: [embed] };
    }
}