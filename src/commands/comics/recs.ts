import { Command } from 'discord-akairo';
import { Message } from 'discord.js';
import { scrapeRedditWiki } from '../../util';

export default class extends Command {
    public constructor() {
        super('recs', {
            aliases: ['recs', 'recommendations'],
            description: 'Displays a user\'s recommendation list.',
            regex: /^(\w+)\srec(commendation)?s$/i,
            args: [
                {
                    id: 'user',
                    type: 'lowercase',
                    match: 'content',
                    prompt: {
                        start: 'Which user\'s recommendations would you like to view?'
                    }
                }
            ],
            cooldown: 1000
        });
    }

    public async exec(message: Message, { user, match }: { user: string; match: string }) {
        if (!user?.length && match) user = match[1]?.toLowerCase();

        const body = await scrapeRedditWiki(`recsbot/tastetest/${user}recs`, 'DCcomics') ?? await scrapeRedditWiki(`recsbot/tastetest/${user}recsmod`, 'DCcomics');
        if (!body || body.kind !== 'wikipage') return;

        return message.util.send(
            body.data.content_md
                .split('\r\n\r\n')
                .join('\n')
                .replaceAll('amp;', '')
        );
    }
}