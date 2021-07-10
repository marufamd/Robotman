import { Command } from 'discord-akairo';
import { Message } from 'discord.js';
import { scrapeRedditWiki } from '../../util';
import { channels } from '../../util/constants';

export default class extends Command {
    public constructor() {
        super('recs', {
            aliases: ['recs', 'recommendations'],
            description: 'Displays a user\'s recommendation list.',
            regex: /^(.+)\srec(commendation)?s$/i,
            args: [
                {
                    id: 'list',
                    type: 'lowercase',
                    match: 'content',
                    otherwise: 'Please provide a recommendation list to view.'
                }
            ],
            cooldown: 1000
        });
    }

    public async exec(message: Message, { list, match }: { list: string; match: string }) {
        if (!channels.RECOMMENDATION.includes(message.channel.id)) return;

        if (!list?.length && match) list = match[1]?.toLowerCase();

        const isWriter = list.includes(' ');

        const body = isWriter
            ? await scrapeRedditWiki(`recsbot/writersrecs/${list.replace(/[^a-z]+/g, '')}recs`, 'DCcomics')
            : await scrapeRedditWiki(`recsbot/tastetest/${list}recs`, 'DCcomics') ?? await scrapeRedditWiki(`recsbot/tastetest/${list}recsmod`, 'DCcomics');

        if (!body || body.kind !== 'wikipage') return;

        const text = isWriter
            ? body.data.content_md
            : body.data.content_md
                .split('\r\n\r\n')
                .join('\n');

        return message.util.send(
            text
                .replaceAll('amp;', '')
                .replaceAll('&lt;', '<')
                .replaceAll('&gt;', '>')
        );
    }
}