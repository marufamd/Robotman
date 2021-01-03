const { Command } = require('discord-akairo');
const request = require('node-superfetch');
const { trim } = require('../../util');
const { colors } = require('../../util/constants');

module.exports = class extends Command {
    constructor() {
        super('urban', {
            aliases: ['urban', 'urban-dictionary', 'ud'],
            description: {
                info: 'Searches Urban Dictionary.',
                usage: '<term>',
                examples: ['batman'],
            },
            args: [
                {
                    id: 'term',
                    type: 'string',
                    match: 'content',
                    prompt: {
                        start: 'What term would you like to search for?'
                    }
                }
            ],
            cooldown: 4e3,
            typing: true
        });
    }

    async exec(message, { term }) {
        const defined = await this.search(term);

        if (defined === 'error') return message.util.send('Error fetching result. Try again later.');
        else if (!defined) return message.respond('No results found');

        const embed = this.client.util.embed()
            .setColor(colors.URBAN)
            .setTitle(defined.word)
            .setURL(defined.permalink)
            .setThumbnail('https://i.imgur.com/Xv1NhhY.png')
            .setDescription(trim(defined.definition.trim(), 2040))
            .setFooter(`Defined by ${defined.author}`);
        if (defined.example) embed.addField('Example', trim(defined.example.trim(), 1020));

        embed
            .addField('👍', defined.thumbs_up, true)
            .addField('👎', defined.thumbs_down, true);

        return message.util.send(embed);
    }

    async search(term) {
        if (!term) throw new Error('No query provided');
        const { body } = await request
            .get('http://api.urbandictionary.com/v0/define')
            .query({ term });

        if (body.error) return 'error';
        return body.list?.[0];
    }
};