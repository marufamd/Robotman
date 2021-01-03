const { Command } = require('discord-akairo');
const request = require('node-superfetch');
const { colors } = require('../../util/constants');

module.exports = class extends Command {
    constructor() {
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

    interactionOptions = {
        name: 'character',
        description: 'Searches Comic Vine for a character.',
        options: [
            {
                type: 'string',
                name: 'query',
                description: 'The character to search for.',
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
        const params = {
            api_key: process.env.COMICVINE_KEY,
            filter: `name:${query}`,
            format: 'json'
        };

        const { body } = await request
            .get('https://comicvine.gamespot.com/api/characters/')
            .query(params);
            
        if (!body.number_of_total_results || !body.results?.length) return { content: 'No results found.', type: 'message', ephemeral: true };

        const char = body.results[0];

        let str = char.deck ? (char.deck + '\n\n') : '';

        if (char.real_name && char.real_name.length) str += `• **Real Name:** ${char.real_name}\n`;
        if (char.first_appeared_in_issue && char.first_appeared_in_issue.name) str += `• **First Appearance:** '${char.first_appeared_in_issue.name.split(' / ')[0]}'\n`;
        if (char.origin && char.origin.name) str += `• **Origin:** ${char.origin.name}\n`;
        if (char.publisher && char.publisher.name) str += `• **Published by:** ${char.publisher.name}`;

        const embed = this.client.util.embed()
            .setColor(colors.COMICVINE)
            .setTitle(char.name)
            .setURL(char.site_detail_url)
            .setThumbnail(char.image.original_url)
            .setDescription(str)
            .setFooter('Comic Vine', 'https://i.imgur.com/AgMseb9.png');

        if (char.aliases && char.aliases.length) embed.addField('Aliases', char.aliases.replaceAll('\r', '').split('\n').join(', '));

        return embed;
    }
};