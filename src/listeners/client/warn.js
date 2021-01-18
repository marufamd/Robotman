const { Listener } = require('discord-akairo');

module.exports = class extends Listener {
    constructor() {
        super('warn', {
            event: 'warn',
            emitter: 'client'
        });
    }

    exec(warning) {
        this.client.log(warning, 'warn');
    }
};