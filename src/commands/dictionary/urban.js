const { Command } = require('discord-akairo');
const { fetch, trim } = require('../../util');

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
        });
    }

    async exec(message, { term }) {
        const defined = await this.search(term);

        if (defined === 'error') return message.util.send('Error fetching result. Try again later.');
        else if (!defined) return message.respond('No results found');

        const embed = this.client.util.embed()
            .setColor('1b9eea')
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
        const res = await fetch('http://api.urbandictionary.com/v0/define', { term });

        if (res.error) return 'error';
        return res.list?.[0];
    }
};