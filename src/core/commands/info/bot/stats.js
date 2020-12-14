const Command = require("../../../classes/Command");
const { Embed } = require("../../../../util");
const { formats } = require("../../../../util/constants");

const { stripIndents } = require("common-tags");
const { cpu } = require("node-os-utils");
const moment = require("moment");
require("moment-duration-format");

const { version: DiscordVersion } = require("discord.js");
const { dependencies, version } = require("../../../../../package.json");

module.exports = class extends Command {
    constructor(client) {
        super(client, {
            name: "stats",
            description: "Gets bot's statistics",
            group: "info",
            aliases: ["stat", "botinfo"],
            typing: true
        });
    }

    async run(message) {
        const memUsage = `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`;
        const uptime = moment.duration(this.client.uptime).format(formats.uptime);

        const data = await this.client.util.get();

        const embed = new Embed()
            .setAuthor(this.client.owner.tag, this.client.owner.displayAvatarURL())
            .setThumbnail(this.client.user.displayAvatarURL())
            .addFields({
                name: "Statistics",
                value: stripIndents`
                    • **Version:** ${version}
                    • **Node.js:** ${process.version}
                    • **Library:** Discord.js v${DiscordVersion}
                    • **Dependencies:** ${Object.keys(dependencies).length}
                    • **Memory Usage:** ${memUsage}
                    • **CPU Usage:** ${await cpu.usage()}%
                    `,
                inline: true
            }, {
                name: "\u200b",
                value: stripIndents`
                    • **Total Commands:** ${this.handler.commands.size}
                    • **Commands Processed:** ${data.commandsUsed}
                    • **Akinator Games:** ${data.akiGames}
                    • **Connect Four Games:** ${data.connectGames}
                    • **Hangman Games:** ${data.hangmanGames}
                    • **Trivia Games:** ${data.triviaGames}
                    `,
                inline: true
            })
            .setFooter(`Uptime: ${uptime}`);

        return message.embed(embed);
    }
};