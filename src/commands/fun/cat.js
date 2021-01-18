const { Command } = require('discord-akairo');
const request = require('node-superfetch');
const { extname } = require("path");

module.exports = class extends Command {
    constructor() {
        super('randomcat', {
            aliases: ['random-cat', 'cat', 'r-cat'],
            description: 'Sends a random cat image/gif.',
            typing: true
        });
    }

    interactionOptions = {
        name: 'random-cat',
        description: 'Sends a random cat image/gif'
    }

    async exec(message) {
        return message.util.send(await this.main());
    }

    async interact(interaction) {        
        await interaction.respond({ type: 'acknowledgeWithSource' });
        return interaction.send(await this.main());
    }

    async main() {
        const { body: { file } } = await request.get('https://aws.random.cat/meow');
        return this.client.util.attachment(file, `cat${extname(file)}`);
    }
};