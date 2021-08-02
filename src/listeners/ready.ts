import type { TextChannel } from 'discord.js';
import { Client, Constants } from 'discord.js';
import { existsSync, promises as fs } from 'fs';
import { join } from 'path';
import { injectable } from 'tsyringe';
import type { Listener } from '#util/commands';
import { handleListenerError } from '#util/commands';
import { log } from '#util/logger';

@injectable()
export default class implements Listener {
	public event = Constants.Events.CLIENT_READY;

	public constructor(private readonly client: Client) {}

	public async handle() {
		try {
			const rebootPath = join(__dirname, '..', 'reboot.json');

			if (existsSync(rebootPath)) {
				const reboot = JSON.parse(await fs.readFile(rebootPath, 'utf8'));

				const m = await (this.client.channels.cache.get(reboot.channel) as TextChannel).messages.fetch(reboot.message);
				const msg = await m.edit('Rebooted!');
				await msg.edit(`Rebooted! Took ${msg.editedTimestamp - msg.createdTimestamp}ms`);

				await fs.unlink(rebootPath);
			}

			if (!this.client.application?.owner) {
				await this.client.application?.fetch();
			}

			log(`Logged in as ${this.client.user.tag} (${this.client.user.id})!`);

			await this.client.user.setPresence({
				activities: [
					{
						name: `${process.env.BOT_PREFIX}help`,
						type: 'LISTENING'
					}
				]
			});
		} catch (e) {
			handleListenerError(this, e);
		}
	}
}
