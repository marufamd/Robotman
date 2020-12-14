const Command = require("../../classes/Command");
const { title, split, Embed } = require("../../../util");
const moment = require("moment");
const { timezones } = require("../../../util/constants");

module.exports = class extends Command {
    constructor(client) {
        super(client, {
            name: "time",
            description: "Gets the current time in a time zone",
            group: "utility",
            aliases: ["timeconvert", "currentime", "timezone", "timezones"],
            usage: "<time zone>",
            examples: [
                "utc",
                "los angeles",
                "America/New York",
                "gmt"
            ],
            info: ["To view a list of timezones, do `{p}timezones index`"],
            args: true
        });
    }

    run(message, args) {
        if (["index", "list"].includes(args[0])) {
            const embeds = [];
            const pages = split(timezones.map(t => t.replaceAll("_", " ")), 37);
            for (const page of pages) {
                let subpages = [page];
                if (page.length > 13) subpages = split(page, 13);
                const embed = new Embed()
                    .setTitle("List of Timezones")
                    .setFooter(`Page ${pages.indexOf(page) + 1}/${pages.length}`);
                for (const subpage of subpages) embed.addField("\u200b", subpage.join("\n"), true);
                embeds.push(embed);
            }

            return message.paginate(embeds, 240000);
        }

        const timezone = new RegExp(args.join("_"), "gi");
        const correct = moment.tz.zone(args.join("_")) ? args.join("_") : timezones.find(a => timezone.test(a));

        if (!moment.tz.zone(correct)) return message.respond(`Invalid time zone. ${this.info[0].replace("{p}", message.prefix)}.`);

        const formatted = moment().tz(correct).format('h:mm A');

        let formatText = (correct.length <= 3) ? correct.toUpperCase() : title(correct.replaceAll(/(_|\/)/gi, " "));
        formatText = correct.includes("/") ? formatText.replace(" ", "/") : formatText;

        return message.respond(`The current time for **${formatText.replaceAll("_", " ")}** is **${formatted}**`);
    }
};