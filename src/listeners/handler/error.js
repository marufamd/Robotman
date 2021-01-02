const { Listener } = require('discord-akairo');
const { e } = require('mathjs');
const Interaction = require('../../structures/Interaction');

module.exports = class extends Listener {
    constructor() {
        super('command-error', {
            event: 'error',
            emitter: 'commandHandler'
        });
    }

    async exec(error, message, command) {
        if (message instanceof Interaction && !message.response && e.message !== 'Unknown interaction') {
            await message.respond('An error occurred', { type: 'message', ephemeral: true });
        } else {
            const channel = message?.util ?? message?.channel;
            if (channel) channel.send('An error occurred.');
        }

        const str = [error.stack];
        if (command) str.unshift(`Command: ${command.id}`);

        this.client.log(str, 'error', { ping: true });
    }
};