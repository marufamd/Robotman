const { Command, Argument } = require('discord-akairo');

module.exports = class extends Command {
    constructor() {
        super('prefix', {
            aliases: ['prefix', 'set-prefix'],
            description: {
                info: 'Changes the bot prefix for the server.',
                usage: '<new prefix>',
                examples: ['$']
            },
            args: [
                {
                    id: 'prefix',
                    type: Argument.validate('string', (m, p, str) => str.length < 20)
                }
            ],
        });
    }

    mod = true;

    exec(message, { prefix }) {
        const current = this.handler.prefix(message);
        let response;
        
        if (!prefix) {
            response = `The current prefix for **${message.guild.name}** is **${current}**`;
        } else if ([process.env.CLIENT_PREFIX, 'reset'].includes(prefix)) {
            this.client.settings.set(message.guild.id, 'prefix', null);
            response = `Reset the prefix for **${message.guild.name}** to **${process.env.CLIENT_PREFIX}**`;
        } else {
            this.client.settings.set(message.guild.id, 'prefix', prefix);
            response = `Changed the prefix for **${message.guild.name}** from **${current}** to **${prefix}**`;
        }

        return message.util.send(response);
    }
};