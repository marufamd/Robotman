import { Command } from 'discord-akairo';
import { APIInteractionResponseType, ApplicationCommandOptionType } from 'discord-api-types/v8';
import type { Message } from 'discord.js';
import locg from '../../util/locg';
import type Interaction from '../../structures/Interaction';
import { split } from '../../util';
import { colors } from '../../util/constants';

export default class extends Command {
    private readonly MAX_SEARCH_RESULTS = 8;

    public constructor() {
        super('series', {
            aliases: ['series', 'locg-search', 'comic-search', 'series-search'],
            description: {
                info: 'Searches League of Comic Geeks for a series.',
                usage: '<query>',
                examples: ['batman', 'daredevil', 'stillwater']
            },
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

    public interactionOptions = {
        name: 'series',
        description: 'Searches League of Comic Geeks for a series.',
        options: [
            {
                type: ApplicationCommandOptionType.STRING,
                name: 'query',
                description: 'The series to search for.',
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
        const results = await locg.search(query);
        if (!results.length) return { content: 'No results found', type: APIInteractionResponseType.ChannelMessage, ephemeral: true };

        let num = this.MAX_SEARCH_RESULTS;
        const half = num / 2;
        if (results.length < num) num = results.length;

        let formatted = [];

        for (let i = 0; i < num; i++) {
            const result = results[i];
            const str = `**[${result.name}](${result.link})**\n${result.publisher} | [Cover](${result.cover})`;
            formatted.push(str);
        }

        if (formatted.length > half) formatted = split(formatted, half);
        else formatted = [formatted];

        const [page1, page2] = formatted;

        const embed = this.client.util
            .embed()
            .setColor(colors.LOCG)
            .setAuthor('League of Comic Geeks', 'https://leagueofcomicgeeks.com/assets/images/user-menu-logo-icon.png', locg.url)
            .setTitle(`Top results for '${query}'`)
            .setURL(`https://leagueofcomicgeeks.com/search?keyword=${encodeURIComponent(query)}`)
            .addField('Page 1', page1.join('\n'), true)
            .setThumbnail(results[0].cover);

        if (page2?.length) embed.addField('Page 2', page2.join('\n'), true);

        return embed;
    }
}