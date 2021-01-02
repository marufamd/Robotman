const { Command } = require('discord-akairo');
const { fetch } = require('../../util');
const { colors } = require('../../util/constants');

module.exports = class extends Command {
    constructor() {
        super('synonym', {
            aliases: ['synonym', 'thesaurus', 'synonyms', 'syns', 'syn'],
            description: {
                info: 'Displays synonyms for a word from the thesaurus.',
                usage: '<word>',
                examples: ['robot'],
            },
            args: [
                {
                    id: 'word',
                    type: 'string',
                    match: 'content',
                    prompt: {
                        start: 'What word would you like to see synonyms for?'
                    }
                }
            ],
            cooldown: 4e3
        });
    }

    interactionOptions = {
        name: 'synonym',
        description: 'Shows synonyms for a word from the thesaurus.',
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
        const defined = await this.search(word);
        if (!defined?.synonyms?.length) return 'No synonyms found';

        const embed = this.client.util.embed()
            .setColor(colors.DICTIONARY)
            .setFooter('Merriam-Webster', 'https://pbs.twimg.com/profile_images/677210982616195072/DWj4oUuT.png');

        if (Array.isArray(defined)) {
            embed
                .setTitle(`No synonyms found for \`${word}\``)
                .addField('Did you mean:', defined.map(a => `[${a}](https://www.merriam-webster.com/thesaurus/${encodeURIComponent(a)})`).join('\n'));
        } else {
            embed
                .setTitle(`Synonyms for ${defined.word}`)
                .setURL(`https://www.merriam-webster.com/thesaurus/${encodeURIComponent(defined.word)}`)
                .setDescription(defined.synonyms.map(s => `[${s}](https://www.merriam-webster.com/dictionary/${encodeURIComponent(s)})`));
        }

        return embed;
    }

    async search(word) {
        if (!word.length) throw new Error('No query provided');
        const url = `https://www.dictionaryapi.com/api/v3/references/thesaurus/json/${encodeURIComponent(word)}`;

        const res = await fetch(url, { key: process.env.THESAURUS_KEY });

        if (!res?.length) return null;
        if (typeof res[0] === 'string') return res.slice(0, 3);
        const found = res[0].meta;
        return {
            word: found.stems?.[0],
            synonyms: found?.syns?.flat(3)
        };
    }
};