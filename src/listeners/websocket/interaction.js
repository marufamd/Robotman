const { Listener } = require('discord-akairo');

module.exports = class extends Listener {
    constructor() {
        super('interactionCreate', {
            event: 'INTERACTION_CREATE',
            emitter: 'websocket'
        });
    }

    exec(data) {
        return this.client.interactionHandler.handle(data);
    }
};