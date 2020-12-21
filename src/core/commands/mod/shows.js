const Command = require("../../classes/Command");
const { pastee: paste, fetch } = require("../../../util");
const { shows } = require("../../../util/constants");
const moment = require("moment");

module.exports = class extends Command {
    constructor(client) {
        super(client, {
            name: "shows",
            group: "moderation",
            aliases: ["wshows", "weeklyshows"],
            disableHelp: true,
            disableEdits: true,
            cooldown: 0,
            typing: true
        });
    }

    async run(message, args) {
        let parsedDate;

        if (args.length) {
            const params = args.join(" ");
            const month = params.match(/(jan(uary)?|feb(ruary)?|mar(ch)?|apr(il)?|may|jun(e)?|jul(y)?|aug(ust)?|sep(tember)?|oct(ober)?|nov(ember)?|dec(ember)?)/gi);
            const day = params.match(/[0-9]{1,2}(st|th|nd|rd|\s)/gi);
            const year = params.match(/[0-9]{4}/g);

            if (month && day && year) parsedDate = `${month[0]} ${day[0].replace(/(st|nd|rd|th)/gi, "")} ${year[0]}`;
        }

        const dates = [];
        const dtf = moment(new Date(parsedDate)).isValid() ? new Date(parsedDate) : new Date();

        for (let i = 1; i < 8; i++) {
            const toPush = moment(dtf).day(i).format("YYYY-MM-DD");
            dates.push(toPush);
        }

        let final = [];

        for (const date of dates) {
            const res = await fetch("http://api.tvmaze.com/schedule", { country: "US", date });

            const found = res.filter(s => shows.includes(s.show.id));
            if (!found.length) continue;

            for (const show of found) {
                let day = moment(new Date(show.airdate));

                let episode = show.number;

                if (show.show.id === 706) {
                    episode = episode + 1;
                    day = day.add(1, "days");
                }
                let season = show.season.toString();
                if (season.length === 1) season = "0" + season;

                episode = episode.toString();
                if (episode.length === 1) episode = "0" + episode;

                const str = `* **${day.format("dddd")}:** [***${show.show.name}*** **s${season}e${episode}** - *${show.name}*](${show.show.image.original})`;
                final.push(str);
            }
        }

        if (!final.length) return message.respond("There are no shows scheduled for this week.");

        const str = `Episodes releasing for the week of ${dates[0]}`;

        final = final.join("\n");
        if (final.length > 1900) final = await paste(final, str, "markdown", true);
        else final = ["```md", final, "```"].join("\n");

        return message.respond([str, final]);
    }
};