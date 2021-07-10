import { stripIndents } from 'common-tags';
import { Command } from 'discord-akairo';
import type { Message } from 'discord.js';
import { Duration } from 'luxon';
import { formats } from '../../util/constants';
import usage from '../../util/cpu';

// eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
const { dependencies, version } = require('../../../package.json');

export default class extends Command {
    public constructor() {
        super('stats', {
            aliases: ['stats'],
            description: 'Displays the bot\'s statistics.',
            typing: true
        });
    }

    public async exec(message: Message) {
        const stats = await this.client.config.getStats();

        const embed = this.client.util
            .embed()
            .setThumbnail(this.client.user.displayAvatarURL())
            .addFields({
                name: 'Statistics',
                value: stripIndents`
                • **Version:** ${version}
                • **Dependencies:** ${Object.keys(dependencies).length}
                • **Memory Usage:** ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB
                • **CPU Usage:** ${await usage()}%
                • **Uptime:** ${Duration.fromMillis(this.client.uptime).toFormat(formats.uptime)}
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
                • **Tic Tac Toe Games:** ${stats.tic_tac_toe}
                `,
                inline: true
            });

        return message.util.send({ embeds: [embed] });
    }
}