import type { Listener } from '#util/commands';
import { handleMessageCommand, parseCommand } from '#util/commands';
import { PRODUCTION } from '#util/constants';
import { handleRecommendations } from '#util/recommendations';
import type { Message, TextChannel } from 'discord.js';
import { Constants, Permissions } from 'discord.js';

export default class implements Listener {
	public event = Constants.Events.MESSAGE_UPDATE;

	public async handle(oldMessage: Message, message: Message) {
		if (oldMessage.content === message.content || message.author.bot || message.system || message.webhookId !== null) return;

		if (!(message.channel as TextChannel).permissionsFor(message.client.user.id).has(Permissions.FLAGS.SEND_MESSAGES)) return;

		if (PRODUCTION && (await handleRecommendations(message))) return;

		const { command, args, context } = parseCommand(message);

		await handleMessageCommand(message, command, args, context);
	}
}
