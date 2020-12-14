const Command = require("../../../classes/Command");
const { sort, Embed } = require("../../../../util");
const { getComics, filterPulls } = require("../../../../util/locg");
const { publishers } = require("../../../../util/constants");
const moment = require("moment");

const current = ["p", "releases"];
const previous = ["pulllast", "pl", "plast", "releaseslast"];
const next = ["pullnext", "pn", "pnext", "releasesnext"];

module.exports = class extends Command {
    constructor(client) {
        super(client, {
            name: "pull",
            description: "Gets this/last/next week's pull list for a publisher.",
            group: "comics",
            aliases: [current, previous, next].flat(),
            usage: "<publisher code> <optional date>",
            examples: [
                "dc",
                "pulllast marvel",
                "pullnext archie",
                "idw December 2 2020",
                "darkhorse 17 Jan 2021",
                "boom 2021-02-13"
            ],
            info: [
                `To get next week's pull list, do \`pullnext\``,
                `To get last week's pull list, do \`pulllast\``,
                `To get the pull list for a different week, you can put the date you want after the publisher\n`,
                "The default publisher is DC Comics",
                `Publisher codes are in codeblocks:\n\n${Object.keys(publishers).map(c => `${publishers[c].name} \`${c}\``).join("\n")}`
            ],
            cooldown: 5,
            typing: true
        });
    }

    async run(message, args) {
        let ncbd = moment().weekday() <= 3 ? moment().day(3) : moment().day(3).add(7, "days");

        if (next.includes(message.command)) ncbd = ncbd.add(7, "days");
        else if (previous.includes(message.command)) ncbd = ncbd.subtract(7, "days");

        let publisher;
        let [pub, ...date] = args; // eslint-disable-line prefer-const
        if (pub) pub = pub.toLowerCase();

        if (!args.length || !publishers[pub] && moment(new Date(args.join(" "))).isValid()) {
            publisher = publishers["dc"];
            if (args.length) ncbd = moment(new Date(args.join(" "))).day(3);
        } else if (publishers[pub]) {
            publisher = publishers[pub];
        } else {
            return message.respond(`Invalid Publisher. Do \`${message.prefix}help ${message.command}\` to see a list of available publishers.`);
        }

        if (date && date.length && moment(new Date(date.join(" "))).isValid()) ncbd = moment(new Date(date.join(" "))).day(3);

        ncbd = ncbd.format("YYYY-MM-DD");

        let pull = await getComics(publisher.id, ncbd);
        pull = filterPulls(pull);
        pull = sort(pull);

        let ncbdate = ncbd;
        if (publisher.name === "DC Comics") ncbdate = moment(ncbd).subtract(1, "days").format('YYYY-MM-DD');

        const embed = new Embed(publisher.color)
            .setTitle(`**${publisher.name}** Pull List for the Week of **${ncbdate}**`)
            .setDescription(pull.length ? pull.map(p => p.name).join("\n") : "No comics for this week (yet).")
            .setThumbnail(publisher.thumbnail);

        return message.embed(embed);
    }
};