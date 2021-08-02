import type { MessageOptions, MessagePayload, Snowflake } from 'discord.js';
import { Message } from 'discord.js';

export const messageMap = new Map<Snowflake, Message>();

Reflect.defineProperty(Message.prototype, 'send', {
	value: async function send(options: string | MessagePayload | MessageOptions): Promise<Message> {
		const msg = this as Message;
		const response = messageMap.get(msg.id);

		if (response && !response.deleted) {
			return response.edit(options);
		}

		const message = await msg.channel.send(options);
		messageMap.set(msg.id, message);

		setTimeout(() => messageMap.delete(msg.id), msg.client.options.messageCacheLifetime * 1000);

		return message;
	}
});

declare module 'discord.js' {
	interface Message {
		alias?: string;
		send(options: string | MessagePayload | MessageOptions): Promise<Message>;
	}
}
