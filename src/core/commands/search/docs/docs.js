const Command = require("../../../classes/Command");
const { Embed, capitalize } = require("../../../../util");
const Docs = require("discord.js-docs");

module.exports = class extends Command {
    constructor(client) {
        super(client, {
            name: "docs",
            description: "Retrieves Discord.js documentation data",
            group: "owner",
            aliases: ["djs"],
            usage: "<query> <repo>",
            args: {
                flags: {
                    force: { matches: ["force", "f"] }
                }
            }
        });
    }

    async run(message, { args, flags }) {
        const repos = ["stable", "master", "commando", "rpc", "akairo-master", "collection"];
        if (args[1] === "akairo") args[1] = "akairo-master";
        const docs = await Docs.fetch(repos.includes((args[1] || "").toLowerCase()) ? args[1] : repos[0], { force: flags.force });
        const query = args[0];

        const embed = new Embed(docs.color)
            .setFooter(`${capitalize(docs.repo.replace("-akairo", " Akairo")).replace("Rpc", "Discord RPC")} ${capitalize(docs.branch)} Documentation`,
                       docs.icon.includes("akairo") ? "https://discord-akairo.github.io/static/favicon.ico" : docs.icon);

        const element = docs.get(...query.split(/\.|#/));
        if (element) {
            let title = element.formattedName;
            if (element.access === "private") title += " [Private]";
            if (element.deprecated) title += " [Deprecated]";

            if (element.extends) embed.addField("Extends", element.formatInherits(element.extends), true);
            if (element.implements) embed.addField("Implements", element.formatInherits(element.implements), true);

            embed
                .setTitle(title)
                .setURL(element.url)
                .setDescription(element.formattedDescription);

            element.formatEmbed(embed);
            embed.addField("Source", `[Click Here](${element.sourceURL})`);

            return message.embed(embed);
        }

        const results = docs.search(query);
        if (!results) return message.respond("Could not find that item in the docs.");

        embed
            .setTitle("Search Results")
            .setDescription(results.map(e => `${e.embedPrefix ? `${e.embedPrefix} ` : ""}**${e.link}**`));

        return message.embed(embed);
    }
};