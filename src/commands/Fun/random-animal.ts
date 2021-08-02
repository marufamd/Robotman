import type { Command, CommandOptions, MessageContext } from '#util/commands';
import { request } from '#util/request';
import { reply } from '@skyra/editable-commands';
import type { ApplicationCommandOptionData, CommandInteraction, Message } from 'discord.js';
import { extname } from 'node:path';

export default class implements Command {
	public options: CommandOptions = {
		name: 'random',
		aliases: ['random-cat', 'cat', 'random-dog', 'dog'],
		description: 'Sends an image of an animal.',
		cooldown: 2,
		typing: true,
		disableHelp: true
	};

	public interactionOptions: ApplicationCommandOptionData[] = [
		{
			name: 'cat',
			description: 'Sends an image of a cat.',
			type: 'SUB_COMMAND'
		},
		{
			name: 'dog',
			description: 'Sends an image of a dog.',
			type: 'SUB_COMMAND'
		}
	];

	public async exec(message: Message, _: Record<string, any>, context: MessageContext) {
		if (context.alias === 'random') return;
		return reply(message, {
			files: [context.alias.replace(/random-?/i, '') === 'cat' ? await this.cat() : await this.dog()]
		});
	}

	public async interact(interaction: CommandInteraction, { subCommand }: { subCommand: 'cat' | 'dog' }) {
		await interaction.defer();
		return interaction.editReply({
			files: [subCommand === 'cat' ? await this.cat() : await this.dog()]
		});
	}

	private async cat() {
		const {
			body: { file }
		} = await request.get('https://aws.random.cat/meow');

		return { name: `cat${extname(file)}`, attachment: file };
	}

	private async dog() {
		const {
			body: { url }
		} = await request.get('https://random.dog/woof.json');

		return { name: `dog${extname(url)}`, attachment: url };
	}
}
