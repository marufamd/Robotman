import { stripIndents } from 'common-tags';
import { Command } from 'discord-akairo';
import type { Message } from 'discord.js';
import { DateTime } from 'luxon';
import { stringify } from 'querystring';
import TurndownService from 'turndown';
import { pastee as paste } from '../../util';
import { formats, shows } from '../../util/constants';
import request from '../../util/request';

const pad = (num: number) => num.toString().padStart(2, '0');

export default class extends Command {
    public constructor() {
        super('templates', {
            aliases: ['templates'],
            description: {
                info: 'Displays the upcoming shows for the specified week.',
                usage: '<date>',
                examples: ['jan 1 2021'],
                disableHelp: true
            },
            args: [
                {
                    id: 'date',
                    type: 'parsedDate',
                    match: 'content',
                    default: () => new Date()
                }
            ],
            typing: true
        });
    }

    public mod = true;

    public async exec(message: Message, { date }: { date: Date }) {
        const dtf = DateTime.fromJSDate(date, { zone: 'utc' });

        const final = [];
        let firstDay;

        for (let i = 1; i < 8; i++) {
            const date = dtf
                .set({ weekday: i })
                .toFormat(formats.locg);

            if (i === 1) firstDay = date;

            const { body } = await request
                .get('http://api.tvmaze.com/schedule')
                .query({ country: 'US', date });

            const found = body.filter((e: Record<string, any>) => shows.has(e.show.id));
            if (!found.length) continue;

            for (const episode of found) {
                if (episode.number === null) continue;

                const day = DateTime.fromJSDate(new Date(episode.airdate), { zone: 'utc' });

                const season = pad(episode.season);
                const number = pad(episode.number);

                const synopsis = () => new TurndownService()
                    .turndown(episode.summary)
                    .split('\n').map(s => `> ${s}`)
                    .join('\n');

                const template = stripIndents`
                [***${episode.show.name}*** **s${season}e${number}** - *${episode.name}*](${episode.show.image.original})

                Time/Date: ${day.toFormat(`MMMM d`)} ${convertTime(episode.airtime)} ET

                Network/Channel: ${(episode.show.network ?? episode.show.webChannel).name}
                ${episode.summary?.length ? `\n${synopsis()}` : ''}

                ---

                * [Previous Episode Discussions](https://www.reddit.com/r/DCcomics/search?${stringify({
                    q: `tv discussion network ${episode.show.name?.toLowerCase()}`,
                    restrict_sr: 'on',
                    include_over_18: 'on',
                    sort: 'new',
                    t: 'all'
                })})

                * [TV Discussion Archives](https://www.reddit.com/r/DCcomics/search/?${stringify({
                    q: 'tv discussion network service',
                    restrict_sr: 'on',
                    include_over_18: 'on',
                    sort: 'new',
                    t: 'all'
                })})

                * [This Week's Weekly Discussion]()
                `;

                final.push(template);
            }
        }

        if (!final.length) return message.channel.send(`There are no episodes scheduled for the week of ${firstDay}`);

        const str = `Episode templates for the week of ${firstDay}`;

        const link = await paste(final.join(`\n\n${'-'.repeat(150)}\n\n`), str, 'markdown');

        return message.util.send(`${str}\n\n<${link}>`);
    }
}

function convertTime(time: string): string {
    return new Date(`1970-01-01T${time}Z`)
        .toLocaleTimeString([], {
            timeZone: 'UTC',
            hour12: true,
            hour: 'numeric',
            minute: 'numeric'
        })
        .toUpperCase()
        .replaceAll('.', '');
}