const { Command } = require('discord-akairo');
const { extname } = require("path");
const { fetch } = require("../../util");

module.exports = class extends Command {
    constructor() {
        super('randomcat', {
            aliases: ['random-cat', 'cat', 'r-cat'],
            description: 'Sends a random cat image/gif.',
            typing: true
        });
    }

    async exec(message) {
        const { file } = await fetch('https://aws.random.cat/meow');
        return message.util.send({ files: [{ attachment: file, name: `cat${extname(file)}` }] });
    }
};