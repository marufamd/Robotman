const Command = require("../../../classes/Command");
const { fetch } = require("../../../../util");
const { extname } = require("path");

module.exports = class extends Command {
    constructor(client) {
        super(client, {
            name: "randomcat",
            description: "Sends a random cat image/video",
            group: "fun",
            aliases: ["cat", "rcat"],
            cooldown: 3
        });
    }

    async run(message) {
        const { file } = await fetch("https://aws.random.cat/meow");
        return message.file({ attachment: file, name: `cat${extname(file)}` });
    }
};