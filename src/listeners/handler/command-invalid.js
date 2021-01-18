const { Listener } = require('discord-akairo');

module.exports = class extends Listener {
    constructor() {
        super('command-invalid', {
            event: 'messageInvalid',
            emitter: 'commandHandler'
        });
    }

    async exec(message) {
        if (!message?.util?.parsed?.afterPrefix) return;
        const { commandHandler } = this.client;

        const command = commandHandler.modules.get('tag');
        const args = await command.parse(message, message?.util?.parsed?.afterPrefix);

        return commandHandler.runCommand(message, command, args);
    }
};