import type { Command, CommandOptions } from '#util/commands';
import { Channels } from '#util/constants';
import { redditWiki } from '#util/wrappers';
import { Message } from 'discord.js';

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

        const body = isWriter
            ? await redditWiki(`recsbot/writersrecs/${list.replace(/[^a-z]+/g, '')}recs`, 'DCcomics')
            : (
                await redditWiki(`recsbot/tastetest/${list}recs`, 'DCcomics') ??
                await redditWiki(`recsbot/tastetest/${list}recsmod`, 'DCcomics')
            );

        if (!body || body.kind !== 'wikipage') return;

        const text = isWriter
            ? body.data.content_md
            : body.data.content_md
                .split('\r\n\r\n')
                .join('\n');

        return message.send(
            text
                .replaceAll('amp;', '')
                .replaceAll('&lt;', '<')
                .replaceAll('&gt;', '>')
        );
    }
}