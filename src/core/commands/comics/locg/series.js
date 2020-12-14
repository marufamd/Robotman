const Command = require("../../../classes/Command");
const { split, Embed } = require("../../../../util");
const { search } = require("../../../../util/locg");

module.exports = class extends Command {
    constructor(client) {
        super(client, {
            name: "series",
            description: "Searches League of Comic Geeks for a series",
            group: "comics",
            aliases: ["locg"],
            usage: "<query>",
            examples: ["batman", "daredevil", "stillwater"],
            args: true,
            cooldown: 5,
            typing: true
        });
    }

    async run(message, args) {
        const results = await search(args.join(" "));
        if (!results.length) return message.respond("No results found.");

        let num = 8;
        const half = num / 2;
        if (results.length < num) num = results.length;

        let formatted = [];

        for (let i = 0; i < num; i++) {
            const result = results[i];
            const str = `**[${result.name}](${result.link})**\n${result.publisher} | [Cover](${result.cover})`;
            formatted.push(str);
        }

        if (formatted.length > half) formatted = split(formatted, half);
        else formatted = [formatted];

        const [page1, page2] = formatted;

        const embed = new Embed("#ff4300")
            .setTitle(`Top results for "${args.join(" ")}"`)
            .setURL(`https://leagueofcomicgeeks.com/search?keyword=${encodeURIComponent(args.join(" "))}`)
            .addField("Page 1", page1.join("\n"), true)
            .setThumbnail(results[0].cover)
            .setFooter("League of Comic Geeks", "https://leagueofcomicgeeks.com/assets/images/user-menu-logo-icon.png");

        if (page2 && page2.length) embed.addField("Page 2", page2.join("\n"), true);
        
        return message.embed(embed);
    }
};