const { Command } = require('discord-akairo');
const moment = require("moment");
const { pastee: paste, fetch } = require("../../util");
const { shows, formats } = require("../../util/constants");

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
        const dtf = moment(date);
        let final = [];

        for (let i = 1; i < 8; i++) {
            const day = dtf.day(i).format(formats.locg);
            const res = await fetch("http://api.tvmaze.com/schedule", { country: "US", date: day });

            const found = res.filter(s => shows.includes(s.show.id));
            if (!found.length) continue;

            for (const episode of found) {
                const day = moment(new Date(episode.airdate));
                const zero = str => str.length <= 1 ? `0${str}` : str;

                const season = zero(episode.season.toString());
                const number = zero(episode.number.toString());

                const str = `* **${day.format(formats.day)}:** [***${episode.show.name}*** **s${season}e${number}** - *${episode.name}*](${episode.show.image.original})`;
                final.push(str);
            }
        }

        if (!final.length) return message.channel.send("There are no shows scheduled for this week.");

        const str = `Episodes releasing for the week of ${dtf.day(1).format(formats.locg)}`;
        final = final.join("\n");

        final = final.length > 1900 ? await paste(final, str, "markdown", true) : ["```md", final, "```"].join("\n");

        return message.util.send([str, final]);
    }
};