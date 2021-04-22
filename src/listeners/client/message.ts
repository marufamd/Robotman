import { Listener } from 'discord-akairo';
import { Message, Permissions } from 'discord.js';
import { scrapeRedditWiki } from '../../util';

export default class extends Listener {
    public constructor() {
        super('message', {
            event: 'message',
            emitter: 'client'
        });
    }

    public async exec(message: Message) {
        if (/^rec(ommendation)?s\sindex$/i.test(message.content)) {
            const body = await scrapeRedditWiki(`recsbot/tastetest`, 'DCcomics');
            if (!body || body.kind !== 'wikipage') return;
            return message.util.send(
                body.data.content_md
                    .split('\r\n\r\n')
                    .join('\n')
                    .replace(/\[(.+?)\]\((https?:\/\/[a-zA-Z0-9/.(]+?)\)/g, '$1')
                    .replaceAll('amp:', '')
            );
        }

        if (message.channel.type !== 'news' || !message.channel.permissionsFor(this.client.user).has(Permissions.FLAGS.MANAGE_MESSAGES)) return;

        const channels = this.client.settings.get(message.guild.id, 'crosspost_channels', []);
        if (!channels.includes(message.channel.id)) return;

        await message.crosspost().catch(e => this.client.log(e.stack, 'error'));
    }
}