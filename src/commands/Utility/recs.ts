import type { Command, CommandOptions } from '#util/commands';
import { Channels, Recommendations } from '#util/constants';
import { redditWiki } from '#util/wrappers';
import { stripIndents } from 'common-tags';
import type { Message } from 'discord.js';

export default class implements Command {
    public options: CommandOptions = {
        aliases: ['recommendations'],
        description: 'Displays a recommendation list.',
        regex: /^(.+)\srec(commendation)?s$/i,
        usage: '<list>',
        args: [
            {
                name: 'list',
                type: 'lowercase',
                match: 'content',
                otherwise: 'Please provide a recommendation list to view.'
            }
        ],
        cooldown: 2
    };

    public async exec(message: Message, { list, match }: { list: string; match: RegExpMatchArray }) {
        if (!Channels.RECOMMENDATION.includes(message.channel.id)) return;

        if (!list?.length && match) list = match[1]?.toLowerCase();

        const isWriter = list.includes(' ');

        let body: Record<string, any>;
        let prefix: string;

        if (isWriter) {
            body = await redditWiki(`recsbot/writersrecs/${list.replace(/[^a-z]+/g, '')}recs`, 'DCcomics');
        } else {
            body = await redditWiki(`recsbot/tastetest/${list}recs`, 'DCcomics');

            if (!body) {
                body = await redditWiki(`recsbot/tastetest/${list}recsmod`, 'DCcomics');
                prefix = Recommendations.TEXT.MOD;
            } else {
                prefix = Recommendations.TEXT.BOOSTER;
            }
        }

        if (!body || body.kind !== 'wikipage') return;

        const text = isWriter
            ? body.data.content_md
            : stripIndents`
            ${prefix}

            ${body.data.content_md.split('\r\n\r\n').join('\n')}
            `;

        return message.send(
            text
                .replaceAll('amp;', '')
                .replaceAll('&lt;', '<')
                .replaceAll('&gt;', '>')
        );
    }
}