const { Inhibitor } = require('discord-akairo');
const { channels } = require("../util/constants");

module.exports = class extends Inhibitor {
    constructor() {
        super('shows-inhibitor', {
            reason: 'Shows'
        });
    }

    exec(message) {
        if (message.util?.parsed?.command?.id !== 'shows') return false;
        return message.guild.id !== process.env.TEST_SERVER && message.channel.id !== channels.rd;
    }
};