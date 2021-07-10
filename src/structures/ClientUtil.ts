import { ClientUtil, Command } from 'discord-akairo';
import { Message, MessageEmbed, MessageEmbedOptions } from 'discord.js';
import RobotmanEmbed from '../util/embed';
import type RobotmanClient from './Client';

export default class extends ClientUtil {
    public constructor(client: RobotmanClient) {
        super(client);
    }

    public embed(data?: MessageEmbed | MessageEmbedOptions): RobotmanEmbed {
        return new RobotmanEmbed(data);
    }

    public getExtended(command: Command, prefix: string): string {
        if (!command?.data?.extended?.length) return command.description;
        return `${command.description}\n\n${command.data.extended.join('\n').replaceAll('{p}', prefix)}`;
    }

    public formatPrefix(message: Message): string {
        return new RegExp(`<@!?${message.client.user.id}>`).test(message.util.parsed.prefix) ? `@${message.client.user.tag} ` : message.util.parsed.prefix;
    }

    public formatExamples(command: Command, prefix: string): string {
        return command.data.examples
            .map((e: string) => {
                if (command.aliases.some(a => e.startsWith(a + ' '))) return `${prefix}${e}`;
                return `${prefix}${command.id} ${e}`;
            })
            .join('\n');
    }

    public getPrefix(message: Message): string {
        return new RegExp(`<@!?${message.client.user.id}>`).test(message.util?.parsed?.prefix) ? `@${message.client.user.tag} ` : (message.util?.parsed?.prefix ?? process.env.CLIENT_PREFIX);
    }
}