const { Listener } = require('discord-akairo');

module.exports = class extends Listener {
    constructor() {
        super('interactionCreate', {
            event: 'INTERACTION_CREATE',
            emitter: 'websocket'
        });
    }

    exec(data) {
        this.client.interactionHandler.handle(data);
        this.client.config.stat('commands_run');
    }
};