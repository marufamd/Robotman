const Command = require("../../classes/Command");
const { randomResponse } = require("../../../util");

const { readdir, readFile } = require("fs/promises");
const { join, extname } = require("path");

module.exports = class extends Command {
    constructor(client) {
        super(client, {
            name: "8ball",
            description: "Asks the Magic 8-Ball a question",
            group: "fun",
            aliases: ["8", "8-ball", "eight-ball", "eight"],
            usage: "<question>",
            examples: ["Will it be sunny today?"],
            args: true,
            disableEdits: true
        });
    }

    async run(message) {
        const imageDir = join(__dirname, "..", "..", "..", "util", "8balls");
        const answers = (await readdir(imageDir)).filter(f => extname(f) === ".png");
        const random = randomResponse(answers);

        const file = await readFile(join(imageDir, random));

        return message.file({ name: random, attachment: file });
    }
};