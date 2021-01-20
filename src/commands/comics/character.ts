import { Command } from 'discord-akairo';
import { ApplicationCommandOptionType } from 'discord-api-types';
import type { Message } from 'discord.js';
import Interaction from '../../structures/Interaction';
import { colors } from '../../util/constants';
import request from '../../util/request';

const BASE_URL = 'https://comicvine.gamespot.com';

export default class extends Command {
    public constructor() {
        super('character', {
            aliases: ['character', 'char', 'comic-vine'],
            description: {
                info: 'Searches Comic Vine for a character.',
                usage: '<query>',
                examples: [
                    'daredevil',
                    'batman',
                    'spider-man'
                ]
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
            cooldown: 10e3
        });
    }

    public interactionOptions = {
        name: 'character',
        description: 'Searches Comic Vine for a character.',
        options: [
            {
                type: ApplicationCommandOptionType.STRING,
                name: 'query',
                description: 'The character to search for.',
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
        const params = {
            api_key: process.env.COMICVINE_KEY,
            filter: `name:${query}`,
            format: 'json'
        };

        const { body } = await request
            .get(`${BASE_URL}/api/characters/`)
            .query(params);

        if (!body.number_of_total_results || !body.results?.length) return { content: 'No results found.', type: 'message', ephemeral: true };

        const char = body.results[0];

        let str = char.deck ? `${char.deck}\n\n` : '';

        if (char.real_name?.length) str += `• **Real Name:** ${char.real_name}\n`;
        if (char.first_appeared_in_issue?.name) str += `• **First Appearance:** '${char.first_appeared_in_issue.name.split(' / ')[0]}'\n`;
        if (char.origin?.name) str += `• **Origin:** ${char.origin.name}\n`;
        if (char.publisher?.name) str += `• **Published by:** ${char.publisher.name}`;

        const embed = this.client.util.embed()
            .setColor(colors.COMICVINE)
            .setAuthor('Comic Vine', 'https://i.imgur.com/AgMseb9.png', BASE_URL)
            .setTitle(char.name)
            .setURL(char.site_detail_url)
            .setThumbnail(char.image.original_url)
            .setDescription(str);

        if (char.aliases?.length) embed.addField('Aliases', char.aliases.replaceAll('\r', '').split('\n').join(', '));

        return embed;
    }
}