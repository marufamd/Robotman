import { stripIndents } from 'common-tags';
import { Command } from 'discord-akairo';
import type { Message } from 'discord.js';
import { DateTime } from 'luxon';
import { stringify } from 'querystring';
import TurndownService from 'turndown';
import { codeblock, pad, pastee as paste } from '../../util';
import { Formats, shows } from '../../util/constants';
import request from '../../util/request';

export default class extends Command {
    public constructor() {
        super('shows', {
            aliases: ['shows'],
            description: 'Displays the upcoming shows for the specified week.',
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

        const templates = [];
        const list = [];

        let firstDay;

        for (let i = 1; i < 8; i++) {
            const date = dtf
                .set({ weekday: i })
                .toFormat(Formats.LOCG);

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

                const part = (str = '') => `[***${episode.show.name}*** **S${season}E${number}** - *${episode.name}*](${str})`;

                const template = stripIndents`
                >Time/Date: ${day.toFormat(Formats.TEMPLATE)} ${this.convertTime(episode.airtime)} ET

                >Network/Channel: ${(episode.show.network ?? episode.show.webChannel).name}
                ${episode.summary?.length ? `\n${this.makeSynopsis(episode.summary)}` : ''}
                `;

                templates.push(
                    [
                        part(episode.show.image.original),
                        template.replaceAll('\n', '\\n')
                    ]
                        .join('\n')
                );

                list.push(`* **${day.toFormat(Formats.DAY)}:** ${part()}`);
            }
        }

        if (!templates.length) return message.channel.send(`There are no episodes scheduled for the week of ${firstDay}`);

        const str = `Episode comments for the week of ${firstDay}`;

        const link = await paste(
            templates.join(`\n`),
            str
        );

        return message.util.send(stripIndents`
        ${str}
        <${link}>

        List
        ${codeblock(list.join('\n'), 'md')}
        `);
    }

    private convertTime(time: string): string {
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

    private makeSynopsis(str: string): string {
        return new TurndownService()
            .turndown(str)
            .split('\n')
            .map(s => `> ${s}`)
            .join('\n');
    }

    private makeURL(query: string): string {
        const obj = {
            q: query,
            restrict_sr: 'on',
            include_over_18: 'on',
            sort: 'new',
            t: 'all'
        };

        return `https://www.reddit.com/r/DCcomics/search/?${stringify(obj)}`;
    }
}