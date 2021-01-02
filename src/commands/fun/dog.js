const { Command } = require('discord-akairo');
const { extname } = require("path");
const { fetch } = require("../../util");

module.exports = class extends Command {
    constructor() {
        super('randomdog', {
            aliases: ['random-dog', 'dog', 'r-dog'],
            description: 'Sends a random dog image/gif.',
            typing: true
        });
    }

    interactionOptions = {
        name: 'random-dog',
        description: 'Sends a random dog image/gif'
    }

    async exec(message) {
        return message.util.send(await this.main());
    }

    async interact(interaction) {        
        await interaction.respond({ type: 'acknowledgeWithSource' });
        return interaction.send(await this.main());
    }

    async main() {
        const { url } = await fetch('https://random.dog/woof.json');
        return this.client.util.attachment(url, `dog${extname(url)}`);
    }
};