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

    async exec(message) {
        const { url } = await fetch('https://random.dog/woof.json');
        return message.util.send({ files: [{ attachment: url, name: `dog${extname(url)}` }] });
    }
};