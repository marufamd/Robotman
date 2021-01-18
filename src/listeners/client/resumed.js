const { Listener } = require('discord-akairo');

module.exports = class extends Listener {
    constructor() {
        super('resume', {
            event: 'shardResume',
            emitter: 'client'
        });
    }

    exec() {
        this.client.log('Reconnected');
    }
};