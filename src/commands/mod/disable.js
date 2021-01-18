const { Command } = require('discord-akairo');

module.exports = class extends Command {
    constructor() {
        super('disable', {
            aliases: ['disable', 'disable-command'],
            description: {
                info: 'Disables a command.',
                usage: '<command>',
                examples: ['ping']
            },
            args: [
                {
                    id: 'command',
                    type: 'commandAlias',
                    prompt: {
                        start: 'What command would you like to disable?',
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
        if (disabled.includes(command.id)) {
            response = `The command **${command.id}** is already disabled.`;
        } else {
            disabled.push(command.id);
            this.client.settings.set(message.guild.id, 'disabledCommands', disabled);
            response = `Disabled the command **${command.id}**`;
        }

        return message.util.send(response);
    }
};