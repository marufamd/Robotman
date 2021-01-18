const { Command } = require('discord-akairo');
const { capitalize, trim, define } = require('../../util');
const { colors } = require('../../util/constants');

module.exports = class extends Command {
    constructor() {
        super('define', {
            aliases: ['define', 'dictionary'],
            description: {
                info: 'Shows a definition for a word from the dictionary.',
                usage: '<word>',
                examples: ['robot'],
            },
            args: [
                {
                    id: 'word',
                    type: 'string',
                    match: 'content',
                    prompt: {
                        start: 'What word would you like to search for?'
                    }
                }
            ],
            cooldown: 4e3,
            typing: true
        });
    }

    interactionOptions = {
        name: 'define',
        description: 'Shows a definition for a word from the dictionary.',
        options: [
            {
                type: 'string',
                name: 'word',
                description: 'The word to search for.',
                required: true
            }
        ]
    }

    async exec(message, { word }) {
        return message.util.send(await this.main(word));
    }

    async interact(interaction) {
        return interaction.respond(await this.main(interaction.option('word')));
    }

    async main(word) {
        const defined = await define(word);
        if (!defined) return 'No results found';

        const embed = this.client.util.embed()
            .setColor(colors.DICTIONARY)
            .setFooter('Merriam-Webster', 'https://pbs.twimg.com/profile_images/677210982616195072/DWj4oUuT.png');

        if (Array.isArray(defined)) {
            embed
                .setTitle(`No results found for \`${word}\``)
                .addField('Did you mean:', defined.map(a => `[${a}](https://www.merriam-webster.com/dictionary/${encodeURIComponent(a)})`).join('\n'));
        } else {
            embed
                .setTitle(defined.word)
                .setURL(`https://www.merriam-webster.com/dictionary/${encodeURIComponent(defined.word)}`)
                .setDescription(trim(defined.definitions
                    .map(a => {
                        if (defined.definitions.indexOf(a) === 0) return a;
                        return `• ${a}`;
                    })
                    .join('\n\n'), 2040))
                .addField('Part of Speech', capitalize(defined.type));
            if (defined.date) embed.addField('First Known Use', defined.date);
        }

        return embed;
    }
};