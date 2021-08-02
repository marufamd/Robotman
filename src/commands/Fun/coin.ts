import type { Command, CommandOptions } from '#util/commands';
import { randomResponse } from '#util/misc';
import type { CommandInteraction, Message } from 'discord.js';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export default class implements Command {
	public options: CommandOptions = {
		aliases: ['coin-flip'],
		description: 'Flips a coin.'
	};

	public async exec(message: Message) {
		return message.send(await this.run());
	}

	public async interact(interaction: CommandInteraction) {
		await interaction.defer();
		return interaction.editReply(await this.run());
	}

	private async run() {
		const random = randomResponse(['heads', 'tails']);
		const file = await readFile(join(__dirname, '..', '..', '..', 'coins', random));

		return {
			files: [{ name: random, attachment: file }]
		};
	}
}
