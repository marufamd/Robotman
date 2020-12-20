const { Command } = require('discord-akairo');
const { stripIndents } = require("common-tags");
const { cpu } = require("node-os-utils");

const moment = require("moment");
require("moment-duration-format");

const { dependencies, version } = require("../../../package.json");
const { formats } = require("../../util/constants");

module.exports = class extends Command {
    constructor() {
        super('stats', {
            aliases: ['stats', 'stat', 'botstats'],
            description: 'Displays the bot\'s statistics.',
            ratelimit: 2,
            typing: true
        });
    }

    async exec(message) {
        const uptime = moment.duration(this.client.uptime).format(formats.uptime);
        const memUsage = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);
        const cpuUsage = await cpu.usage();

        const embed = this.client.util.embed()
            .setTitle('Statistics')
            .setDescription(stripIndents`
            • **Version:** ${version}
            • **Dependencies:** ${Object.keys(dependencies).length}
            • **Memory Usage:** ${memUsage} MB
            • **CPU Usage:** ${cpuUsage}%
            • **Uptime:** ${uptime}`);

        return message.util.send(embed);
    }
};