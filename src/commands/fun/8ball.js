const { Command } = require('discord-akairo');
const { readdir, readFile } = require("fs/promises");
const { join, extname } = require("path");
const { randomResponse } = require("../../util");

module.exports = class extends Command {
    constructor() {
        super('8ball', {
            aliases: ["8-ball", "8", "eight", "eight-ball"],
            description: {
                info: 'Asks the Magic 8-Ball a question.',
                usage: '<question>',
                examples: ['Is Daredevil awesome?']
            },
            typing: true
        });
    }

    async exec(message) {
        const imageDir = join(__dirname, "..", "..", "data", "8balls");
        const answers = (await readdir(imageDir)).filter(f => extname(f) === ".png");
        const random = randomResponse(answers);

        const file = await readFile(join(imageDir, random));

        return message.file({ name: random, attachment: file });
    }
};