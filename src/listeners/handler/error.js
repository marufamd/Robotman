const { Listener } = require('discord-akairo');

module.exports = class extends Listener {
    constructor() {
        super('command-error', {
            event: 'error',
            emitter: 'commandHandler'
        });
    }

    exec(error, message, command) {
        message.util.send('An error occurred.');
        const str = [error.stack];
        if (command) str.unshift(`Command: ${command.id}`);
        this.client.log(str, 'error', { ping: true });
    }
};