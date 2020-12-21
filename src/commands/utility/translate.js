const { Command, Argument } = require('discord-akairo');
const translate = require('@vitalets/google-translate-api');
const { trim, paste } = require('../../util');

module.exports = class extends Command {
    constructor() {
        super('translate', {
            aliases: ['translate'],
            description: {
                info: 'Translates text.',
                usage: '-from=[lang] -to=[lang] <text>',
                extended: ['You can optionally specify the language to translate from and to with the -to and -from flags.'],
                examples: ['-from=fr -to=es Bonjour'],
            },
            args: [
                {
                    id: 'from',
                    type: Argument.validate('string', (m, _, str) => translate.languages.isSupported(str.toLowerCase())),
                    match: 'option',
                    flag: ['-from=', 'from:', '--from=']
                },
                {
                    id: 'to',
                    type: Argument.validate('string', (m, _, str) => translate.languages.isSupported(str.toLowerCase())),
                    match: 'option',
                    flag: ['-to=', 'to:', '--to=']
                },
                {
                    id: 'text',
                    type: 'string',
                    match: 'rest',
                    prompt: {
                        start: 'What text would you like to translate?'
                    }
                }
            ],
        });
    }

    async exec(message, { from, to, text }) {
        const options = { to: 'en' };

        if (from) options.from = from.toLowerCase();
        if (to) options.to = to.toLowerCase();

        const translated = await translate(text, options);
        const result = translated.from?.text?.value || translated.text;

        const embed = this.client.util.embed()
            .setColor('#4d8cf5')
            .addField(`Input (${translate.languages[translated.from.language.iso]})`, trim(text, 1024))
            .addField(`Translation (${translate.languages[options.to]})`, result.length > 1024 ? await paste(result, '') : result)
            .setFooter('Google Translate', 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d7/Google_Translate_logo.svg/128px-Google_Translate_logo.svg.png');

        return message.util.send(embed);
    }
};