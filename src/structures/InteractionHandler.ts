import type { APIApplicationCommand, APIApplicationCommandOption, APIInteraction } from 'discord-api-types/v8';
import type { Guild, TextChannel } from 'discord.js';
import { resolveGuild } from '../util';
import type RobotmanClient from './Client';
import Interaction from './Interaction';

export interface APICommandData {
    name: string;
    description: string;
    options?: APIApplicationCommandOption[];
}

export default class InteractionHandler {
    public constructor(public client: RobotmanClient) {
        Object.defineProperty(this, 'client', { value: client });
    }

    public fetchCommands(guild?: string | Guild): Promise<APIApplicationCommand[]> {
        let path = Reflect
            .get(this.client, 'api')
            .applications(this.client.user.id);

        if (guild) path = path.guilds(resolveGuild(guild));

        return path.commands.get();
    }

    public create(data: string | APICommandData, guild?: string | Guild): Promise<APIApplicationCommand> {
        if (typeof data === 'string') data = this.client.commandHandler.findCommand(data)?.interactionOptions;
        if (!data) return;

        let path = Reflect
            .get(this.client, 'api')
            .applications(this.client.user.id);

        if (guild) path = path.guilds(resolveGuild(guild));

        return path.commands.post({ data });
    }

    public edit(command: string | APIApplicationCommand, data: string | APICommandData, guild?: string | Guild): Promise<APIApplicationCommand> {
        if (typeof data === 'string') data = this.client.commandHandler.findCommand(data)?.interactionOptions;
        if (!data) return;

        if (command && typeof command === 'object') command = command.id;

        let path = Reflect
            .get(this.client, 'api')
            .applications(this.client.user.id);

        if (guild) path = path.guilds(resolveGuild(guild));

        return path.commands(command).patch({ data });
    }

    public delete(command: string | APIApplicationCommand, guild?: string | Guild): Promise<unknown> {
        if (command && typeof command === 'object') command = command.id;

        let path = Reflect
            .get(this.client, 'api')
            .applications(this.client.user.id);

        if (guild) path = path.guilds(resolveGuild(guild));

        return path.commands(command).delete();
    }

    public async handle(data: APIInteraction): Promise<void> {
        const interaction = new Interaction(this.client, data);
        const command = this.client.commandHandler.findCommand(interaction.command.name);

        if (!command?.interact) return;
        if (this.client.commandHandler.runCooldowns(interaction, command)) return;

        try {
            if (command.typing) void (interaction.channel as TextChannel)?.startTyping();
            await command.interact(interaction);
        } catch (e) {
            this.client.commandHandler.emit('error', e, interaction, command);
        } finally {
            if (command.typing) void (interaction.channel as TextChannel)?.stopTyping(true);
        }
    }
}