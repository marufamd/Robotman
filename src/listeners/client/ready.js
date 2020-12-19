const { Listener } = require('discord-akairo');

module.exports = class extends Listener {
    constructor() {
        super('ready', {
            event: 'ready',
            emitter: 'client'
        });
    }

    exec() {
        this.client.log(`Logged in as ${this.client.user.tag} (${this.client.user.id})!`);
        if (!this.client.development) this.client.user.setPresence({ activity: { name: `${process.env.CLIENT_PREFIX}help` } });
    }
};