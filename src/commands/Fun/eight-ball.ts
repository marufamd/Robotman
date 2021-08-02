import type { Command, CommandOptions } from '#util/commands';
import { randomResponse } from '#util/misc';
import { reply } from '@skyra/editable-commands';
import type { ApplicationCommandOptionData, CommandInteraction, Message } from 'discord.js';
import { readdir, readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';

export default class implements Command {
	public options: CommandOptions = {
		aliases: ['8-ball', '8', 'eight'],
		description: 'Asks the Magic 8-Ball a question.',
		usage: '<question>',
		example: 'Will the weather be good today?',
		args: [
			{
				name: 'question',
				match: 'content',
				prompt: 'What would you like to ask the Magic 8-Ball?'
			}
		]
	};

	public interactionOptions: ApplicationCommandOptionData[] = [
		{
			name: 'question',
			description: 'The question to ask the Magic 8-Ball.',
			type: 'STRING',
			required: true
		}
	];

	public async exec(message: Message) {
		return reply(message, await this.run());
	}

	public async interact(interaction: CommandInteraction) {
		await interaction.defer();
		return interaction.editReply(await this.run());
	}

	private async run() {
		const imageDir = join(__dirname, '..', '..', '..', 'images', 'eight-balls');
		const answers = (await readdir(imageDir)).filter((f) => extname(f) === '.png');

		const random = randomResponse(answers);
		const file = await readFile(join(imageDir, random));

		return {
			files: [{ name: random, attachment: file }]
		};
	}
}
