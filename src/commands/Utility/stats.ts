import { Embed } from '#util/builders';
import type { Command, CommandOptions } from '#util/commands';
import { DateFormats } from '#util/constants';
import { cpuUsage } from '#util/misc';
import type { CommandInteraction, Message } from 'discord.js';
import { Client } from 'discord.js';
import { Duration } from 'luxon';
import { injectable } from 'tsyringe';

// eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
const { dependencies, version } = require('../../../package.json');

@injectable()
export default class implements Command {
	public constructor(private readonly client: Client) {}

	public options: CommandOptions = {
		description: 'Displays bot statistics.',
		typing: true
	};

	public async exec(message: Message) {
		return message.send(await this.run());
	}

	public async interact(interaction: CommandInteraction) {
		return interaction.reply(await this.run());
	}

	private async run() {
		return {
			embeds: [
				new Embed()
					.setTitle('Statistics')
					.setThumbnail(this.client.user.displayAvatarURL())
					.addField('Version', version, true)
					.addField('Dependencies', Object.keys(dependencies).length.toString(), true)
					.addField('Node.js Version', process.version, true)
					.addField('Memory Usage', `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`, true)
					.addField('CPU Usage', `${await cpuUsage()}%`, true)
					.addField('Uptime', Duration.fromMillis(this.client.uptime).toFormat(DateFormats.UPTIME), true)
			]
		};
	}
}
