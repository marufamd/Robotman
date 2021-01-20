import { ClientUtil, Command } from 'discord-akairo';
import type { Message, MessageEmbed, MessageEmbedOptions } from 'discord.js';
import RobotmanClient from './Client';
import RobotmanEmbed from '../util/embed';

export default class extends ClientUtil {
    public constructor(client: RobotmanClient) {
        super(client);
    }

    public embed(data?: MessageEmbed | MessageEmbedOptions) {
        return new RobotmanEmbed(data);
    }

    public getDescription(command: Command) {
        if (!command?.description) return null;
        return typeof command.description !== 'string' ? command.description.info : command.description;
    }

    public getExtended(command: Command, prefix: string) {
        if (!command?.description?.extended?.length) return this.getDescription(command);
        return `${command.description.info}\n\n${command.description.extended.join('\n').replaceAll('{p}', prefix)}`;
    }

    public formatPrefix(message: Message): string {
        return new RegExp(`<@!?${message.client.user.id}>`).test(message.util.parsed.prefix) ? `@${message.client.user.tag} ` : message.util.parsed.prefix;
    }

    public formatExamples(command: Command, prefix: string) {
        return command.description.examples
            .map((e: string) => {
                if (command.aliases.some(a => e.startsWith(a + ' '))) return `${prefix}${e}`;
                return `${prefix}${command.id} ${e}`;
            })
            .join('\n');
    }

    public getPrefix(message: Message) {
        return new RegExp(`<@!?${message.client.user.id}>`).test(message.util?.parsed?.prefix) ? `@${message.client.user.tag} ` : (message.util?.parsed?.prefix ?? process.env.CLIENT_PREFIX);
    }
}