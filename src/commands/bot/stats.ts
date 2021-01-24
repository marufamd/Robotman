import { stripIndents } from 'common-tags';
import { Command } from 'discord-akairo';
import type { Message } from 'discord.js';
import { readFileSync } from 'fs';
import { Duration } from 'luxon';
import { join } from 'path';
import type Interaction from '../../structures/Interaction';
import usage from '../../util/cpu';
import { formats } from '../../util/constants';

const { dependencies, version } = JSON.parse(readFileSync(join(__dirname, '..', '..', '..', 'package.json')).toString());

export default class extends Command {
    public constructor() {
        super('stats', {
            aliases: ['stats'],
            description: 'Displays the bot\'s statistics.',
            typing: true
        });
    }

    public interactionOptions = {
        name: 'stats',
        description: 'Displays the bot\'s statistics.'
    };

    public async exec(message: Message) {
        return message.util.send(await this.main());
    }

    public async interact(interaction: Interaction) {
        return interaction.respond(await this.main());
    }

    private async main() {
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
                `,
                inline: true
            });

        return embed;
    }
}