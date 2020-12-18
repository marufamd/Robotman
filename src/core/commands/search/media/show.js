const Command = require("../../../classes/Command");
const { Embed, fetch } = require("../../../../util");
const TurndownService = require("turndown");

module.exports = class extends Command {
    constructor(client) {
        super(client, {
            name: "show",
            description: "Searches for a TV show",
            group: "search",
            aliases: ["tv", "tvshow"],
            usage: "<query>",
            examples: ["daredevil"],
            args: true,
            cooldown: 5,
            typing: true
        });
    }

    async run(message, args) {
        const res = await fetch("https://api.tvmaze.com/search/shows", { q: args.join(" ") });
        if (!res.length) return message.respond("No results found.");

        const { show } = res[0];
        const network = show.network || show.webChannel;

        const embed = new Embed("43958b")
            .setTitle(show.name)
            .setURL(show.url)
            .setDescription(new TurndownService().turndown(show.summary))
            .setThumbnail(show.image.original)
            .addField("Language", show.language, true)
            .addField("Premiered", show.premiered, true)
            .addField("Status", show.status, true)
            .addField("Genres", show.genres.join(", "), true)
            .setFooter("TVmaze", "https://i.imgur.com/ExggnTB.png");

        if (network) embed.addField("Network", network.name, true);
        if (show.officialSite) embed.addField("Website", `[Click Here](${show.officialSite})`, true);

        if (embed.fields.length === 5) embed.addField("\u200b", "\u200b", true);

        return message.embed(embed);
    }
};