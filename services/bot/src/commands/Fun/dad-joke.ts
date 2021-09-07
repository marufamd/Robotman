import type { Command, CommandOptions } from '#util/commands';
import { dadJoke } from '#util/wrappers';
import { reply } from '@skyra/editable-commands';
import type { CommandInteraction, Message } from 'discord.js';

export default class implements Command {
	public options: CommandOptions = {
		description: 'Sends a dad joke.',
		cooldown: 3
	};

	public async exec(message: Message) {
		return reply(message, await dadJoke());
	}

	public async interact(interaction: CommandInteraction) {
		return interaction.reply(await dadJoke());
	}
}
