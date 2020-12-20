const { Command } = require('discord-akairo');
const { beautify } = require('../../util');

module.exports = class extends Command {
    constructor() {
        super('beautify', {
            aliases: ['beautify'],
            description: {
                info: 'Beautifies a codeblock in a message, if any.',
                extended: ['If no message ID is provided, the bot will search for the most recent codeblock in the channel.'],
                usage: '<message id>',
                examples: ['703478308469342214'],
            },
            ownerOnly: true,
            args: [
                {
                    id: 'codeblock',
                    type: 'guildMessage'
                }
            ],
        });
    }

    async exec(message, { codeblock }) {
        let code;
        const reg = /```(?:js|json|javascript)?\n?((?:\n|.)+?)\n?```/gi;

        if (!codeblock) {
            const msgs = (await message.channel.messages.fetch({ limit: 100 })).map(m => m.content);

            for (const msg of msgs) {
                const groups = reg.exec(msg);
                if (groups?.[1].length) {
                    code = groups[1];
                    break;
                }
            }
        } else {
            const groups = reg.exec(codeblock.content);
            if (groups?.[1].length) code = groups[1];
        }

        if (!code) return message.respond(`No code blocks found`);
        return message.util.send(beautify(code), { code: 'js' });
    }
};