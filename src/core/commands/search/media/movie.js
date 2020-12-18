const Command = require("../../../classes/Command");
const { Embed, fetch } = require("../../../../util");

module.exports = class extends Command {
    constructor(client) {
        super(client, {
            name: "movie",
            description: "Searches for a movie",
            group: "search",
            aliases: ["film"],
            usage: "<query>",
            examples: ["iron man"],
            args: true,
            cooldown: 5,
            typing: true
        });
    }

    async run(message, args) {
        const params = {
            apikey: process.env.MOVIEDB_KEY,
            type: "movie",
            t: args.join(" ").replaceAll("spider man", "spider-man")
        };

        const res = await fetch("https://www.omdbapi.com/", params);
        if (res.Response === "False") return message.respond("No results found.");

        const embed = new Embed("33bad7")
            .setTitle(`${res.Title} (${res.Year})`)
            .setThumbnail(res.Poster === "N/A" ? null : res.Poster)
            .setURL(`https://www.imdb.com/title/${res.imdbID}`)
            .setDescription([
                res.Plot,
                "",
                `**Genres**: ${res.Genre}`,
                `**Age Rating**: ${res.Rated}`,
                `**Country:** ${res.Country}`,
                `**Runtime:** ${res.Runtime}`,
                "",
                `**Directed by:** ${res.Director}`,
                `**Credits:** ${res.Writer}`,
                `**Starring:** ${res.Actors}`,
                `**Production Companies:** ${res.Production}`
            ])
            .setFooter("Open Movie Database");
        if (res.Ratings.length) embed.addField("Ratings", res.Ratings.map(r => `**${r.Source}:** ${r.Value}`));

        return message.embed(embed);
    }
};