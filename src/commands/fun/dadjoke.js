const { Command } = require('discord-akairo');
const { dadJoke } = require("../../util");

module.exports = class extends Command {
    constructor() {
        super('dadjoke', {
            aliases: ['dad-joke'],
            description: 'Sends a dad joke.',
            ratelimit: 3
        });
    }

    async exec(message) {
        return message.util.send(await dadJoke());
    }
};