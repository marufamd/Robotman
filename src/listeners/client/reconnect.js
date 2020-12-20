const { Listener } = require('discord-akairo');

module.exports = class extends Listener {
    constructor() {
        super('reconnect', {
            event: 'shardReconnecting',
            emitter: 'client'
        });
    }

    exec() {
        this.client.log('Attempting to reconnect...', 'info');
    }
};