import { Listener } from 'discord-akairo';
import { Message, Permissions } from 'discord.js';
import { scrapeRedditWiki, split } from '../../util';
import { colors, recChannels, tasteTestText } from '../../util/constants';

const clean = (p: string): string => p.replace(/recsbot\/tastetest\/(.+)recs(?:mod)?/g, '$1');

export default class extends Listener {
    public constructor() {
        super('message', {
            event: 'message',
            emitter: 'client'
        });
    }

    public async exec(message: Message) {
        if (recChannels.includes(message.channel.id)) {
            if (/^taste test$/i.test(message.content)) {
                const { data } = await scrapeRedditWiki(`pages`, 'DCcomics');
                const list = (data as string[]).filter(p => p.startsWith('recsbot/tastetest/'));

                const mods = list
                    .filter(p => p.endsWith('mod'))
                    .map(clean)
                    .sort();

                const boosters = list
                    .filter(p => !p.endsWith('mod'))
                    .map(clean)
                    .sort();

                const columns = split(boosters, 15);

                const embed = this.client.util.embed()
                    .setColor(colors.DC)
                    .setDescription(tasteTestText)
                    .addField('Mods', mods.join('\n'), true);

                for (const column of columns) {
                    embed.addField(embed.fields.length === 1 ? 'Boosters' : '\u200b', column.join('\n'), true);
                }

                return message.util.send({ embed });
            }

            if (/^writers? rec(ommendation)?s$/i.test(message.content)) {
                const { data: { content_md: data } } = await scrapeRedditWiki(`recsbot/writersrecs`, 'DCcomics');
                const [text, writers] = data.split('\r\n\r\n');

                const list = (writers as string)
                    .split('\n')
                    .map(w => w
                        .replace(/\[(.+?)\]\((https?:\/\/[a-zA-Z0-9/.(]+?)\)/g, '$1')
                        .trim())
                    .sort();

                const columns = split(list, 20);

                const embed = this.client.util.embed()
                    .setColor(colors.DC)
                    .setDescription(text);

                for (const column of columns) {
                    embed.addField('\u200b', column.join('\n'), true);
                }

                return message.util.send({ embed });
            }
        }

        if (message.channel.type !== 'news' || !message.channel.permissionsFor(this.client.user).has(Permissions.FLAGS.MANAGE_MESSAGES)) return;

        const channels = this.client.settings.get(message.guild.id, 'crosspost_channels', []);
        if (!channels.includes(message.channel.id)) return;

        await message.crosspost().catch(e => this.client.log(e.stack, 'error'));
    }
}