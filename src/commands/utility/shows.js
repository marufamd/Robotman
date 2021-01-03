const { Command } = require('discord-akairo');
const { DateTime } = require('luxon');
const request = require('node-superfetch');

const { pastee: paste } = require('../../util');
const { shows, formats } = require('../../util/constants');

module.exports = class extends Command {
    constructor() {
        super('shows', {
            aliases: ['shows'],
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
                    default: new Date()
                }
            ],
            typing: true
        });
    }

    async exec(message, { date }) {
        let dtf = DateTime.fromJSDate(date);
        const dates = [];

        if (dtf.weekday === 7) {
            dates.push(dtf.toFormat(formats.locg)); // Start from Sunday
            dtf = dtf.plus({ days: 1 }); // Increment to Monday so that Luxon doesn't use the previous week
        }

        for (let i = 1; i < 7; i++) dates.push(dtf.set({ weekday: i }).toFormat(formats.locg));

        let final = [];

        for (const date of dates) {
            const { body } = await request
                .get('http://api.tvmaze.com/schedule')
                .query({ country: 'US', date});

            const found = body.filter(s => shows.includes(s.show.id));
            if (!found.length) continue;

            for (const episode of found) {
                const day = DateTime.fromJSDate(new Date(episode.airdate));

                const season = episode.season.toString().padStart(2, '0');
                const number = episode.number.toString().padStart(2, '0');

                const str = `* **${day.toFormat(formats.day)}:** [***${episode.show.name}*** **s${season}e${number}** - *${episode.name}*](${episode.show.image.original})`;
                final.push(str);
            }
        }

        if (!final.length) return message.channel.send('There are no episodes scheduled for this week.');

        const str = `Episodes releasing for the week of ${dtf.minus({ days: 1 }).toFormat(formats.locg)}`;
        final = final.join('\n');

        final = final.length > 1900 ? await paste(final, str, 'markdown', true) : ['```md', final, '```'].join('\n');

        return message.util.send([str, final]);
    }
};