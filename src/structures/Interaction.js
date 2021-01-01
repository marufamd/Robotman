const { MessageEmbed } = require('discord.js');
const { SnowflakeUtil, APIMessage, Webhook, WebhookClient } = require('discord.js');
const { Base } = require('discord.js');

Object.defineProperty(APIMessage, 'create', {
    value: function create(target, content, options, extra = {}) {
        const isWebhook = target instanceof Webhook || target instanceof WebhookClient || target instanceof Interaction;
        const transformed = this.transformOptions(content, options, extra, isWebhook);
        return new this(target, transformed);
    }
});

const ResponseTypes = {
    pong: 1,
    acknowledge: 2,
    message: 3,
    messageWithSource: 4,
    acknowledgeWithSource: 5
};

class Interaction extends Base {
    constructor(client, data) {
        super(client);

        this.id = data.id;
        this.token = data.token;

        this.channel = this.client.channels?.cache.get(data.channel_id) || null;
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

    get createdTimestamp() {
        return SnowflakeUtil.deconstruct(this.id).timestamp;
    }

    get createdAt() {
        return new Date(this.createdTimestamp);
    }

    option(name) {
        return this.options.find(o => o.name === name)?.value;
    }

    findOptions(...names) {
        const found = [];
        for (const name of names) {
            const option = this.option(name);
            if (option) found.push(option);
        }
        return found;
    }

    async respond(content, options = {}) {
        if (this.response) return;
        options = resolveData(content, options);

        await this.client.api.interactions(this.id, this.token).callback.post({ data: options });

        this.response = true;
        return this.response;
    }

    async edit(content, options) {
        if (!this.response) return;

        options = resolveData(content, options);
        await this.client.api.webhooks(this.client.user.id, this.token).messages('@original').patch({ data: options.data });

        return true;
    }

    async delete() {
        if (!this.response) return;
        await this.client.api.webhooks(this.client.user.id, this.token).messages('@original').delete();
        return true;
    }

    async send(content, options) {
        let apiMessage;

        if (content instanceof APIMessage) {
            apiMessage = content.resolveData();
        } else {
            apiMessage = APIMessage.create(this, content, options).resolveData();
            if (Array.isArray(apiMessage.data.content)) {
                return Promise.all(apiMessage.split().map(this.send.bind(this)));
            }
        }

        const { data, files } = await apiMessage.resolveFiles();
        return this.client.api
            .webhooks(this.id, this.token)
            .post({
                data,
                files,
                query: { wait: true },
                auth: false,
            })
            .then(d => {
                const channel = this.client.channels ? this.client.channels.cache.get(d.channel_id) : undefined;
                if (!channel) return d;
                return channel.messages.add(d, false);
            });
    }
}

module.exports = Interaction;

function resolveData(content, options) {
    if (content) {
        if (content instanceof MessageEmbed) options = { embed: content };
        else if (typeof content === 'object') options = content;
        else options.content = content;
    }

    if (options.content?.length > 2000) throw new Error('Message content exceeds maximum length (2000).');

    if (options.embed) {
        options.embeds = [options.embed],
        delete options.embed;
    }

    if (options.embeds && Array.isArray(options.embeds)) options.embeds = options.embeds.map(e => {
        if (e instanceof MessageEmbed) return e.toJSON();
        if (e && typeof e === 'object') return e;
        return undefined;
    });

    let type;

    if (typeof options.type !== 'undefined') {
        type = !isNaN(options.type) ? options.type : ResponseTypes[options.type];
        delete options.type;
    } else {
        type = 4;
    }

    return { type, data: options };
}