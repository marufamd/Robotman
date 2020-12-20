const { Listener } = require('discord-akairo');

module.exports = class extends Listener {
    constructor() {
        super('error', {
            event: 'error',
            emitter: 'client'
        });
    }

    exec(error) {
        this.client.log(error.stack, 'error', { ping: true });
    }
};