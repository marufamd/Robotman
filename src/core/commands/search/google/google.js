const Command = require("../../../classes/Command");
const { randomResponse, Embed, google } = require("../../../../util");
const { googleColors } = require("../../../../util/constants");
const { oneLine } = require("common-tags");

module.exports = class extends Command {
    constructor(client) {
        super(client, {
            name: "google",
            description: "Searches Google",
            group: "search",
            aliases: ["search"],
            regex: /^(ok(ay)?|hey) google(,)?\s/i,
            usage: "<query>",
            examples: ["comicbook"],
            info: ["You can also type `ok google,` or `hey google,` with or without the comma to run this command, no prefix needed."],
            args: true,
            cooldown: 10,
            typing: true
        });
    }

    async run(message, args) {
        const safe = message.channel.nsfw ? false : true;
        const result = await this.search(args.join(" "), google, 3, safe);

        if (!result) return message.respond("No results found");

        const embed = new Embed(randomResponse(googleColors))
            .setAuthor(`Top results for "${result.query}"`, "https://i.imgur.com/DaNRfwC.png", `https://www.google.com/search?q=${encodeURIComponent(args.join(" "))}`)
            .setDescription(result.results.map(r => `[${r.title}](${r.link})\n${oneLine`${r.description.trim()}`}`).join("\n\n"))
            .setFooter(`About ${result.totalResults} results (${result.time} seconds)`);

        return message.embed(embed);
    }

    async search(query, google, amount = 1, safe = false) {
        if (!query) throw new Error("No query provided");
        const safeSearch = safe ? "active" : "off";

        const res = await google(query, safeSearch);
        if (!res) return null;

        if (res.queries.request[0].totalResults < amount) amount = 1;

        const arr = [];

        for (let i = 0; i < amount; i++) {
            const output = res.items[i];
            if (!output) break;
            arr.push({
                title: output.title,
                link: output.link,
                description: output.snippet
            });
        }

        return {
            query: query,
            totalResults: res.searchInformation.formattedTotalResults,
            time: res.searchInformation.formattedSearchTime,
            results: arr
        };
    }
};