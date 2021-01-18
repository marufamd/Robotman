const { Command } = require('discord-akairo');

module.exports = class extends Command {
    constructor() {
        super('enable', {
            aliases: ['enable', 'enable-command'],
            description: {
                info: 'Enables a command.',
                usage: '<command>',
                examples: ['ping']
            },
            args: [
                {
                    id: 'command',
                    type: 'commandAlias',
                    prompt: {
                        start: 'What command would you like to enable?',
                        retry: 'Invalid command. Please try again.'
                    }
                }
            ],
        });
    }

    mod = true;

    exec(message, { command }) {
        let response;
        
        const disabled = this.client.settings.get(message.guild.id, 'disabledCommands', []);
        if (!disabled.includes(command.id)) {
            response = `The command **${command.id}** is already enabled.`;
        } else {
            disabled.splice(disabled.indexOf(command.id), 1);
            this.client.settings.set(message.guild.id, 'disabledCommands', disabled);
            response = `Enabled the command **${command.id}**`;
        }

        return message.util.send(response);
    }
};