const Command = require("../../../classes/Command");
const { sort, Embed, fetch } = require("../../../../util");
const { getPulls } = require("../../../../util/locg");

const cheerio = require("cheerio");
const moment = require("moment");

const current = ["pu", "puser", "pullu"];
const previous = ["pulllastuser", "plu", "plastuser", "pluser", "releaseslastuser"];
const next = ["pullnextuser", "pnu", "pnextuser", "pnuser", "pullnu"];

module.exports = class extends Command {
    constructor(client) {
        super(client, {
            name: "pulluser",
            description: "Gets this/last/next week's pull list for a user on League of Comic Geeks",
            group: "comics",
            aliases: [current, previous, next].flat(),
            usage: "<locg username> <optional date>",
            examples: [
                "maruf99",
                "pullnextuser maruf99",
                "pulllastuser maruf99",
                "pulluser maruf99 Jan 2 2021"
            ],
            info: [
                `To get next week's pull list, do \`pullnextuser\``,
                `To get last week's pull list, do \`pulllastuser\`\n`,
                "You can create a LOCG account [here](https://leagueofcomicgeeks.com/)",
                "Once you have an account, simply subscribe to whatever series' you are pulling to create a pull list"
            ],
            args: true,
            cooldown: 20,
            typing: true
        });
    }

    async run(message, [username, ...date]) {
        let ncbd = moment().weekday() <= 3 ? moment().day(3) : moment().day(3).add(7, "days");

        if (next.includes(message.command)) ncbd = ncbd.add(7, "days");
        else if (previous.includes(message.command)) ncbd = ncbd.subtract(7, "days");
        else if (date && date.length && moment(new Date(date.join(" "))).isValid()) ncbd = moment(new Date(date.join(" "))).day(3);

        ncbd = ncbd.format('YYYY-MM-DD');

        const url = `https://leagueofcomicgeeks.com/profile/${username.toLowerCase()}/pull-list`;

        const body = await fetch(url, null, "text");
        const $ = cheerio.load(body);

        const userDetails = $("#comic-list-block")[0];
        if (!userDetails) return message.respond("Invalid username");

        const userID = userDetails.attribs["data-user"];
        const name = $("title").text().slice(0, -47);
        
        const pullList = await getPulls(userID, ncbd);
        const pulls = sort(pullList).map(p => p.name).join("\n");
        const prices = pullList.length ? pullList.map(p => Number(p.price.replaceAll("$", ""))).reduce((a, b) => a + b).toFixed(2) : null;

        const embed = new Embed("#ff4300")
            .setTitle(`${name}'s Pull List for the Week of ${ncbd}`)
            .setURL(url)
            .setDescription(pulls.length ? pulls : "No pulls for this week")
            .setFooter("League of Comic Geeks", "https://leagueofcomicgeeks.com/assets/images/user-menu-logo-icon.png");

        if (prices) embed.addField("Total", `$${prices} USD`);

        return message.embed(embed);
    }
};