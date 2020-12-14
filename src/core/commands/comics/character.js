const Command = require("../../classes/Command");
const { Embed, fetch } = require("../../../util");

module.exports = class extends Command {
    constructor(client) {
        super(client, {
            name: "character",
            description: "Searches Comic Vine for a character",
            group: "comics",
            aliases: ["comicvine", "char"],
            usage: "<character>",
            examples: ["daredevil", "batman", "spider-man"],
            args: true,
            cooldown: 10,
            typing: true
        });
    }

    async run(message, args) {
        const params = {
            api_key: process.env.COMICVINE_KEY,
            filter: `name:${args.join(" ")}`,
            format: "json"
        };

        const res = await fetch("https://comicvine.gamespot.com/api/characters/", params);
        if (!res.number_of_total_results || !res.results || !res.results.length) return message.respond("No results found");

        const char = res.results[0];

        let str = char.deck ? (char.deck + "\n\n") : "";

        if (char.real_name && char.real_name.length) str += `• **Real Name:** ${char.real_name}\n`;
        if (char.first_appeared_in_issue && char.first_appeared_in_issue.name) str += `• **First Appearance:** "${char.first_appeared_in_issue.name.split(" / ")[0]}"\n`;
        if (char.origin && char.origin.name) str += `• **Origin:** ${char.origin.name}\n`;
        if (char.publisher && char.publisher.name) str += `• **Published by:** ${char.publisher.name}`;

        const embed = new Embed("3dcc87")
            .setTitle(char.name)
            .setURL(char.site_detail_url)
            .setThumbnail(char.image.original_url)
            .setDescription(str)
            .setFooter("Comic Vine", "https://i.imgur.com/AgMseb9.png");

        if (char.aliases && char.aliases.length) embed.addField("Aliases", char.aliases.replaceAll("\r", "").split("\n").join(", "));

        message.embed(embed);
    }
};