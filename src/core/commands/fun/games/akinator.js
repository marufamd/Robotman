const Command = require("../../../classes/Command");
const Akinator = require("../../../games/Akinator");

module.exports = class extends Command {
    constructor(client) {
        super(client, {
            name: "akinator",
            description: "Starts an Akinator game",
            group: "fun",
            aliases: ["aki"],
            info: [
                "You have 40 seconds to answer each question, or else you automatically lose.",
                "Aliases for answers:",
                "Yes: `y`, `yeah`, `ye`",
                "No: `n`, `nah`",
                "Don't Know: `d`, `dk`, `idk`, `dunno`",
                "Probably: `p`, `prob`, `probs`",
                "Probably Not: `pn`, `prob not`, `probs not`",
                "Back: `b`",
                "Stop: `s`"
            ],
            disableEdits: true
        });
    }

    async run(message) {
        if (this.client.games.aki.has(message.channel.id)) return message.progress("an Akinator");

        message.respond("Starting...");

        try {
            this.client.util.stat("akiGames");
            this.client.games.aki.add(message.channel.id);
            const aki = new Akinator(message.author.id);
            await aki.startGame(message);
        } catch (e) {
            message.error(e);
            this.client.log(`Akinator Error\n${e.stack}`, "error");
        } finally {
            this.client.games.aki.delete(message.channel.id);
        }
    }
};