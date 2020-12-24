const { Command } = require('discord-akairo');
const { fetch, capitalize, trim } = require('../../util');
const { colors } = require('../../util/constants');

module.exports = class extends Command {
    constructor() {
        super('define', {
            aliases: ['define', 'dictionary'],
            description: {
                info: 'Displays a definition for a word from the dictionary.',
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
            ratelimit: 4
        });
    }

    async exec(message, { word }) {
        const defined = await this.search(word);

        if (!defined) return message.util.send('No results found');
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

        return message.util.send(embed);
    }

    async search(word) {
        if (!word.length) throw new Error('No query provided');
        const url = `https://www.dictionaryapi.com/api/v3/references/collegiate/json/${encodeURIComponent(word)}`;

        const res = await fetch(url, { key: process.env.DICTIONARY_KEY });

        if (!res.length) return null;
        const result = res[0];
        if (typeof result[0] === 'string') return res.slice(0, 3);

        return {
            word: result.meta.stems[0],
            type: result.fl,
            definitions: result.shortdef,
            date: result.date?.replace(/\{(.*?)\}/gi, '')
        };
    }
};