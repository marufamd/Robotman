const { Listener } = require('discord-akairo');

module.exports = class extends Listener {
    constructor() {
        super('command-ran', {
            event: 'commandStarted',
            emitter: 'commandHandler'
        });
    }

    exec() {
        this.client.config.stat('commands_run');
    }
};