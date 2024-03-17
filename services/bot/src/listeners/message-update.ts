import { handleAutoResponses, handleLists } from '#util/auto-responses';
import type { Listener } from '#util/commands';
import { handleListenerError, handleMessageCommand, parseCommand } from '#util/commands';
import type { Message, TextChannel } from 'discord.js';
import { Constants, Permissions } from 'discord.js';

export default class implements Listener {
	public event = Constants.Events.MESSAGE_UPDATE;

	public async handle(oldMessage: Message, message: Message) {
		try {
			if (oldMessage.content === message.content || message.author.bot || message.system || message.webhookId !== null) return;

			if (!(message.channel as TextChannel).permissionsFor(message.client.user.id)?.has(Permissions.FLAGS.SEND_MESSAGES)) return;

			if (await handleLists(message)) return;

			if (await handleAutoResponses(message)) return;

			const { command, args, context } = parseCommand(message);

			await handleMessageCommand(message, command, args, context);
		} catch (e) {
			handleListenerError(this, e);
		}
	}
}
