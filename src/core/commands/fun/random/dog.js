const Command = require("../../../classes/Command");
const { fetch } = require("../../../../util");
const { extname } = require("path");

module.exports = class extends Command {
    constructor(client) {
        super(client, {
            name: "randomdog",
            description: "Sends a random dog image/video",
            group: "fun",
            aliases: ["dog", "rdog"],
            cooldown: 3
        });
    }

    async run(message) {
        const { url } = await fetch("https://random.dog/woof.json");
        return message.file({ attachment: url, name: `dog${extname(url)}` });
    }
};