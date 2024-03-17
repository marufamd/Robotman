import { handleAutoResponses, handleLists } from '#util/auto-responses';
import type { Listener } from '#util/commands';
import { handleListenerError, handleMessageCommand, parseCommand } from '#util/commands';
import { Channels } from '#util/constants';
import { log } from '#util/logger';
import { handleScores } from '#util/ranks';
import type { Message, TextChannel } from 'discord.js';
import { Constants, Permissions } from 'discord.js';

export default class implements Listener {
	public event = Constants.Events.MESSAGE_CREATE;

	public async handle(message: Message) {
		try {
			if (message.crosspostable && Object.values(Channels.NEWS).includes(message.channel.id)) {
				await message.crosspost().catch((e) => log(e.stack, 'error'));
			}

			if (message.author.bot || message.system || message.webhookId !== null) return;

			void handleScores(message);

			if (!(message.channel as TextChannel).permissionsFor(message.client.user)?.has(Permissions.FLAGS.SEND_MESSAGES)) return;

			if (await handleLists(message)) return;

			if (await handleAutoResponses(message)) return;

			const { command, args, context } = parseCommand(message);

			await handleMessageCommand(message, command, args, context);
		} catch (e) {
			handleListenerError(this, e);
		}
	}
}
