const { Command } = require('discord-akairo');
const { stripIndents } = require('common-tags');
const { cpu } = require('node-os-utils');
const moment = require('moment');
require('moment-duration-format');

const { dependencies, version } = require('../../../package.json');
const { formats } = require('../../util/constants');

module.exports = class extends Command {
    constructor() {
        super('stats', {
            aliases: ['stats', 'stat', 'bot-stats'],
            description: 'Displays the bot\'s statistics.',
            ratelimit: 2,
            typing: true
        });
    }

    interactionOptions = {
        name: 'stats',
        description: 'Displays the bot\'s statistics.',
    }

    async exec(message) {
        const embed = await this.main();
        return message.util.send(embed);
    }

    async interact(interaction) {
        const embed = await this.main();
        return interaction.respond(embed);
    }

    async main() {
        const stats = await this.client.config.get();

        const embed = this.client.util.embed()
            .setThumbnail(this.client.user.displayAvatarURL())
            .addFields({
                name: 'Statistics',
                value: stripIndents`
                • **Version:** ${version}
                • **Dependencies:** ${Object.keys(dependencies).length}
                • **Memory Usage:** ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB
                • **CPU Usage:** ${await cpu.usage()}%
                • **Uptime:** ${moment.duration(this.client.uptime).format(formats.uptime)}
                `,
                inline: true
            }, {
                name: '\u200b',
                value: stripIndents`
                • **Commands Processed:** ${stats.commands_run}
                • **Akinator Games:** ${stats.aki}
                • **Connect Four Games:** ${stats.connect_four}
                • **Hangman Games:** ${stats.hangman}
                • **Trivia Games:** ${stats.trivia}
                `,
                inline: true
            });

        return embed;
    }
};