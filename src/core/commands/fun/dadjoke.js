const Command = require("../../classes/Command");
const { dadJoke } = require("../../../util");

module.exports = class extends Command {
    constructor(client) {
        super(client, {
            name: "dadjoke",
            description: "Sends a dad joke.",
            group: "fun",
            cooldown: 3
        });
    }

    async run(message) {
        return message.respond(await dadJoke());
    }
};