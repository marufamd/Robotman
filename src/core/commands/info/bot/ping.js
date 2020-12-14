const Command = require("../../../classes/Command");
const { Embed } = require("../../../../util");

module.exports = class extends Command {
    constructor(client) {
        super(client, {
            name: "ping",
            description: "Checks the bot's connection",
            group: "info",
            aliases: ["latency"]
        });
    }

    async run(message) {
        const msg = await message.respond('Getting Ping...');

        const embed = new Embed()
            .setTitle("🏓 Pong!")
            .setDescription([
                `⏱️ **Roundtrip:** \`${(msg.editedTimestamp || msg.createdTimestamp) - (message.editedTimestamp || message.createdTimestamp)}ms\``,
                `<a:a_heartbeat:759165128448016492> **Heartbeat:** \`${this.client.ws.ping}ms\``
            ]);

        return msg.editEmbed(embed);
    }
};