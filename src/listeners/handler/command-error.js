const { Listener } = require('discord-akairo');
const Interaction = require('../../structures/Interaction');

module.exports = class extends Listener {
    constructor() {
        super('command-error', {
            event: 'error',
            emitter: 'commandHandler'
        });
    }

    async exec(error, message, command) {
        if (error.message !== 'Unknown interaction') {
            if (message instanceof Interaction && !message.response) {
                message.respond('An error occurred', { type: 'message', ephemeral: true });
            } else {
                const channel = message?.util ?? message?.channel;
                if (channel) channel.send('An error occurred.');
            }
        }

        const fields = [{
            name: 'User',
            value: message.author.toString(),
            inline: true
        }];

        if (command) fields.push({
            name: 'Command',
            value: command.id,
            inline: true
        });

        fields.push({
            name: 'Type',
            value: message instanceof Interaction ? 'Interaction' : 'Message',
            inline: true
        });

        this.client.log(error.stack, 'error', { ping: true }, { fields });
    }
};