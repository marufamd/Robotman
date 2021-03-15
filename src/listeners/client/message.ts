import { Listener } from 'discord-akairo';
import { Message, Permissions } from 'discord.js';

export default class extends Listener {
    public constructor() {
        super('message', {
            event: 'message',
            emitter: 'client'
        });
    }

    public async exec(message: Message) {
        if (message.channel.type !== 'news' || !message.channel.permissionsFor(this.client.user).has(Permissions.FLAGS.MANAGE_MESSAGES)) return;

        const channels = this.client.settings.get(message.guild.id, 'crosspost_channels', []);
        if (!channels.includes(message.channel.id)) return;

        await message.crosspost().catch(e => this.client.log(e.stack, 'error'));
    }
}