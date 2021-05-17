import { Listener } from 'discord-akairo';
import { Message, Permissions } from 'discord.js';
import { scrapeRedditWiki, split } from '../../util';
import { colors } from '../../util/constants';

export default class extends Listener {
    public constructor() {
        super('message', {
            event: 'message',
            emitter: 'client'
        });
    }

    public async exec(message: Message) {
        if (/^taste test$/i.test(message.content)) {
            const body = await scrapeRedditWiki(`recsbot/tastetest`, 'DCcomics');
            if (!body || body.kind !== 'wikipage') return;
            let [desc, mods, boosters] = this.formatData(body.data.content_md).split('\n\n');

            mods = mods
                .split('\n')
                .splice(1)
                .join('\n');

            const [first, second] = split(boosters.split('\n').splice(1), 15);

            const embed = this.client.util.embed()
                .setColor(colors.DC)
                .setDescription(desc)
                .addField('Mods', mods, true)
                .addField('Boosters', first.join('\n'), true)
                .addField('\u200b', second.join('\n'), true);

            return message.util.send(embed);
        }

        if (message.channel.type !== 'news' || !message.channel.permissionsFor(this.client.user).has(Permissions.FLAGS.MANAGE_MESSAGES)) return;

        const channels = this.client.settings.get(message.guild.id, 'crosspost_channels', []);
        if (!channels.includes(message.channel.id)) return;

        await message.crosspost().catch(e => this.client.log(e.stack, 'error'));
    }

    private formatData(str: string): string {
        return str
            .split('\r\n\r\n')
            .join('\n')
            .replace(/\[(.+?)\]\((https?:\/\/[a-zA-Z0-9/.(]+?)\)/g, '$1')
            .replace(/##\*\*(Mods|Boosters)\*\*/g, '\n**$1**')
            .replaceAll('amp:', '');
    }
}