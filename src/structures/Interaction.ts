import {
    APIApplicationCommandInteractionDataOption,
    APIEmbed,
    APIInteraction,
    APIInteractionApplicationCommandCallbackData,
    APIMessage as DiscordAPIMessage,
    APIInteractionResponse,
    Snowflake,
    APIInteractionResponseType,
    MessageFlags
} from 'discord-api-types/v8';

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

import type RobotmanClient from './Client';
import RobotmanEmbed from '../util/embed';

export interface InteractionMessageOptions {
    content?: string;
    embeds?: (MessageEmbed | APIEmbed)[];
    ephemeral?: boolean;
    flags?: number;
    type?: number;
}

interface InteractionCommand {
    id: Snowflake;
    name: string;
}

export default class Interaction extends Base {
    public client: RobotmanClient;
    public id: Snowflake;
    public token: string;
    public channel: Channel | null;
    public guild: Guild | null;
    public member: GuildMember;
    public author: User;
    public command: InteractionCommand;
    public options: APIApplicationCommandInteractionDataOption[];
    public response: boolean;

    public constructor(client: RobotmanClient, data: APIInteraction) {
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

        this.options = data.data.options;
        this.response = false;
    }

    public get createdTimestamp() {
        return SnowflakeUtil.deconstruct(this.id).timestamp;
    }

    public get createdAt() {
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

        await Reflect
            .get(this.client, 'api')
            .interactions(this.id, this.token).callback
            .post({ data });

        this.response = true;
        return this.response;
    }

    public async edit(content: string, options?: InteractionMessageOptions) {
        if (!this.response) return false;
        const { data } = Interaction.resolveData(content, options);

        await Reflect
            .get(this.client, 'api')
            .webhooks(this.client.user.id, this.token)
            .messages('@original')
            .patch({ data });

        return true;
    }

    public async delete() {
        if (!this.response) return false;

        await Reflect
            .get(this.client, 'api')
            .webhooks(this.client.user.id, this.token)
            .messages('@original')
            .delete();

        return true;
    }

    public async send(content: APIMessage | APIMessageContentResolvable | StringResolvable, options?: MessageOptions | WebhookMessageOptions | MessageAdditions): Promise<Message | DiscordAPIMessage> {
        if (!this.response) return;
        let apiMessage: InteractionAPIMessage;

        if (content instanceof InteractionAPIMessage) {
            apiMessage = content.resolveData();
        } else {
            apiMessage = InteractionAPIMessage.create(this, content, options).resolveData();
            if (Array.isArray(apiMessage.data.content)) apiMessage.data.content = apiMessage.data.content[0];
        }

        const { data, files } = await apiMessage.resolveFiles();
        return Reflect
            .get(this.client, 'api')
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
            if (content instanceof MessageEmbed || content instanceof RobotmanEmbed) {
                options = { embeds: [content] };
            } else if (typeof content === 'object') {
                options = content;
            } else {
                options.content = content;
            }
        }

        if (options.content?.length > 2000) throw new Error('Message content exceeds maximum length (2000).');

        if (options.embeds && Array.isArray(options.embeds)) {
            options.embeds = options.embeds.map(e => {
                if (e instanceof MessageEmbed) return e.toJSON();
                if (e && typeof e === 'object') return e;
                return undefined;
            });
        }

        const type = options.type ?? APIInteractionResponseType.ChannelMessageWithSource;
        if (options.type) delete options.type;

        if (options.ephemeral) {
            options.flags = MessageFlags.EPHEMERAL;
            delete options.ephemeral;
        }

        return { type, data: options as APIInteractionApplicationCommandCallbackData };
    }
}

class InteractionAPIMessage extends APIMessage {
    public constructor(target: MessageTarget | Interaction, options: MessageOptions | WebhookMessageOptions) {
        super(target as MessageTarget, options);
    }

    public data: Record<string, unknown>;

    public static create(target: MessageTarget | Interaction, content: APIMessageContentResolvable, options: MessageOptions | WebhookMessageOptions | MessageAdditions, extra = {}) {
        const isWebhook = target instanceof Webhook || target instanceof WebhookClient || target instanceof Interaction;
        const transformed = this.transformOptions(content, options, extra, isWebhook);
        return new this(target, transformed);
    }
}