import type { Command, CommandOptions } from '#util/commands';
import { log } from '#util/logger';
import { reply } from '@skyra/editable-commands';
import type { Message } from 'discord.js';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';

export default class implements Command {
	public options: CommandOptions = {
		aliases: ['restart'],
		description: 'Restarts the bot.',
		owner: true
	};

	public async exec(message: Message) {
		log('Rebooting...', 'info');
		const msg = await reply(message, 'Rebooting...');

		await writeFile(
			join(__dirname, '..', '..', 'reboot.json'),
			JSON.stringify({
				channel: msg.channel.id,
				message: msg.id
			})
		);

		process.exit();
	}
}
