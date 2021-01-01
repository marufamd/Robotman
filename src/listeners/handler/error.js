const { Listener } = require('discord-akairo');

module.exports = class extends Listener {
    constructor() {
        super('command-error', {
            event: 'error',
            emitter: 'commandHandler'
        });
    }

    exec(error, message, command) {
        const channel = message?.util ? message.util : message?.channel; 
        if (channel) channel.send('An error occurred.');

        const str = [error.stack];
        if (command) str.unshift(`Command: ${command.id}`);
        
        this.client.log(str, 'error', { ping: true });
    }
};