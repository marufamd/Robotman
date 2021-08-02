import type { Listener } from '#util/commands';
import { handleListenerError, handleMessageCommand, parseCommand } from '#util/commands';
import { Channels, PRODUCTION } from '#util/constants';
import { log } from '#util/logger';
import { handleRecommendations } from '#util/recommendations';
import type { Message, PermissionResolvable, TextChannel } from 'discord.js';
import { Constants, Permissions } from 'discord.js';

export default class implements Listener {
	public event = Constants.Events.MESSAGE_CREATE;

	public async handle(message: Message) {
		const hasPermission = (permission: PermissionResolvable) =>
			(message.channel as TextChannel).permissionsFor(message.client.user).has(permission);

		try {
			if (
				message.channel.type === 'GUILD_NEWS' &&
				hasPermission(Permissions.FLAGS.MANAGE_MESSAGES) &&
				Object.values(Channels.NEWS).includes(message.channel.id)
			) {
				await message.crosspost().catch((e) => log(e.stack, 'error'));
			}

			if (message.author.bot || message.system || message.webhookId !== null) return;

			if (!hasPermission(Permissions.FLAGS.SEND_MESSAGES)) return;

			if (PRODUCTION && (await handleRecommendations(message))) return;

			const { command, args, context } = parseCommand(message);

			await handleMessageCommand(message, command, args, context);
		} catch (e) {
			handleListenerError(this, e);
		}
	}
}
