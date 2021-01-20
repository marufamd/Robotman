import { CommandHandler } from 'discord-akairo';

import {
    APIApplicationCommandInteractionDataOption,
    APIEmbed,
    APIInteraction,
    APIInteractionApplicationCommandCallbackData,
    APIMessage as DiscordAPIMessage,
    APIInteractionResponse,
    Snowflake
} from 'discord-api-types';

import {
    APIMessage,
    APIMessageContentResolvable,
    Base,
    Channel,
    Guild,
    GuildMember,
    Message,
    MessageAdditions,
    MessageEmbed,
    MessageOptions,
    MessageTarget,
    SnowflakeUtil,
    StringResolvable,
    TextChannel,
    User,
    Webhook,
    WebhookClient,
    WebhookMessageOptions
} from 'discord.js';

import RobotmanClient from './Client';
import { ResponseTypes } from '../util/constants';
import type { KVObject } from '../util';
import RobotmanEmbed from '../util/embed';

Object.defineProperty(APIMessage, 'create', {
    value: function create(target: MessageTarget | Interaction, content: APIMessageContentResolvable, options: MessageOptions | WebhookMessageOptions | MessageAdditions, extra = {}): APIMessage {
        const isWebhook = target instanceof Webhook || target instanceof WebhookClient || target instanceof Interaction;
        const transformed = this.transformOptions(content, options, extra, isWebhook);
        return new this(target, transformed);
    }
});

export interface InteractionMessageOptions {
    content?: string;
    embeds?: (MessageEmbed | APIEmbed)[];
    ephemeral?: boolean;
    flags?: number;
    type?: string;
}

export interface InteractionCommand {
    id: Snowflake;
    name: string;
}

export default class Interaction extends Base {
    public id: Snowflake;
    public token: string;
    public channel: Channel | null;
    public guild: Guild | null;
    public member: GuildMember;
    public author: User;
    public command: InteractionCommand;
    public handler: CommandHandler;
    public options: APIApplicationCommandInteractionDataOption[];
    public response: boolean;

    public constructor(public client: RobotmanClient, data: APIInteraction) {
        super(client);

        this.id = data.id;
        this.token = data.token;

        this.channel = this.client.channels?.cache.get(data.channel_id) ?? null;
        this.guild = this.client.guilds?.cache.get(data.guild_id) ?? null;

        this.member = this.guild?.members.add(data.member, false) ?? null;
        this.author = this.member?.user ?? null;

        this.command = {
            id: data.data.id,
            name: data.data.name
        };

        this.handler = this.client.commandHandler;

        this.options = data.data.options;
        this.response = false;
    }

    public get createdTimestamp(): number {
        return SnowflakeUtil.deconstruct(this.id).timestamp;
    }

    public get createdAt(): Date {
        return new Date(this.createdTimestamp);
    }

    public option(name: string): unknown {
        return this.options?.find(o => o.name === name)?.value;
    }

    public findOptions(...names: string[]): any[] {
        const found = [];
        for (const name of names) {
            const option = this.option(name);
            if (option) found.push(option);
        }
        return found;
    }

    public async respond(content: string | RobotmanEmbed | MessageEmbed | InteractionMessageOptions, options?: InteractionMessageOptions) {
        if (this.response) return;
        const data = Interaction.resolveData(content, options);

        await Reflect.get(this.client, 'api')
            .interactions(this.id, this.token).callback
            .post({ data });

        this.response = true;
        return this.response;
    }

    public async edit(content: string, options?: InteractionMessageOptions): Promise<boolean> {
        if (!this.response) return false;
        const { data } = Interaction.resolveData(content, options);

        await Reflect.get(this.client, 'api')
            .webhooks(this.client.user.id, this.token)
            .messages('@original')
            .patch({ data });

        return true;
    }

    public async delete(): Promise<boolean> {
        if (!this.response) return false;

        await Reflect.get(this.client, 'api')
            .webhooks(this.client.user.id, this.token)
            .messages('@original')
            .delete();

        return true;
    }

    public async send(content: APIMessage | APIMessageContentResolvable | StringResolvable, options?: MessageOptions | WebhookMessageOptions | MessageAdditions): Promise<Message | DiscordAPIMessage> {
        if (!this.response) return;
        let apiMessage: APIMessage;

        if (content instanceof APIMessage) {
            apiMessage = content.resolveData();
        } else {
            apiMessage = Reflect.get(APIMessage, 'create')(this, content, options).resolveData();
            if (Array.isArray((apiMessage.data as KVObject).content)) (apiMessage.data as KVObject).content = (apiMessage.data as KVObject).content[0];
        }

        const { data, files } = await apiMessage.resolveFiles();
        return Reflect.get(this.client, 'api')
            .webhooks(this.client.user.id, this.token)
            .post({
                data,
                files,
                query: { wait: true },
                auth: false
            })
            .then((d: DiscordAPIMessage) => {
                const channel = this.client.channels ? this.client.channels.cache.get(d.channel_id) : undefined;
                if (!channel) return d;
                return (channel as TextChannel).messages.add(d, false);
            });
    }

    private static resolveData(content: string | RobotmanEmbed | MessageEmbed | InteractionMessageOptions, options: InteractionMessageOptions = {}): APIInteractionResponse {
        if (content) {
            if (content instanceof MessageEmbed || content instanceof RobotmanEmbed) options = { embeds: [content] };
            else if (typeof content === 'object') options = content;
            else options.content = content;
        }

        if (options.content?.length > 2000) throw new Error('Message content exceeds maximum length (2000).');

        if (options.embeds && Array.isArray(options.embeds)) {
            options.embeds = options.embeds.map(e => {
                if (e instanceof MessageEmbed) return e.toJSON();
                if (e && typeof e === 'object') return e;
                return undefined;
            });
        }

        let type = 4;
        if (options.type) type = ResponseTypes[options.type as keyof typeof ResponseTypes];

        if (options.ephemeral) {
            options.flags = 64;
            delete options.ephemeral;
        }

        return { type, data: options as APIInteractionApplicationCommandCallbackData };
    }
}