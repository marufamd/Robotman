import type { Command, CommandOptions } from '#util/commands';
import { request } from '#util/request';
import type { ApplicationCommandOptionData, CommandInteraction, Message } from 'discord.js';
import { MessageAttachment } from 'discord.js';
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

	public async exec(message: Message) {
		if (message.alias === 'random') return;
		return message.send({
			files: [message.alias.replace(/random-?/i, '') === 'cat' ? await this.cat() : await this.dog()]
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
		return new MessageAttachment(file, `cat${extname(file)}`);
	}

	private async dog() {
		const {
			body: { url }
		} = await request.get('https://random.dog/woof.json');
		return new MessageAttachment(url, `dog${extname(url)}`);
	}
}
