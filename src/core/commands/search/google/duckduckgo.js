const Command = require("../../../classes/Command");
const { Embed, fetch } = require("../../../../util");
const TurndownService = require("turndown");

module.exports = class extends Command {
    constructor(client) {
        super(client, {
            name: "duckduckgo",
            description: "Searches DuckDuckGo for Instant Answers",
            group: "search",
            aliases: ["ddg"],
            usage: "<query>",
            examples: ["!imdb Daredevil", "duckduckgo"],
            args: true,
            cooldown: 5,
            typing: true
        });
    }

    async run(message, args) {
        const found = await this.search(args.join(" "));
        if (!found) return message.respond("No results found.");
        if (typeof found === "string") return message.respond(found);

        const embed = new Embed("e37151")
            .setTitle(found.title)
            .setURL(found.url)
            .setDescription(found.description)
            .setImage(found.image && found.image.length ? found.image : null)
            .setFooter("DuckDuckGo", "https://i.imgur.com/g9ovNA7.png");

        return message.embed(embed);
    }

    async search(query) {
        const params = {
            q: query,
            format: "json",
            pretty: 0,
            no_redirect: 1,
            t: "Robotman"
        };

        const res = await fetch("https://api.duckduckgo.com/", params);
        if (res.Redirect) return res.Redirect;
        if (!res.Abstract.length || !res.AbstractText.length) {
            const related = res.RelatedTopics;
            if (!related.length) return null;
            return {
                title: `Disambiguation (${res.AbstractSource})`,
                url: res.AbstractURL,
                description: related.map(r => r.Text ? `[${r.Text}](${r.FirstURL})` : "").filter(r => r.length).join("\n\n")
            };
        }


        const turndown = new TurndownService()
            .addRule("codeblock", {
                filter: node => node.nodeName === "PRE" && node.childNodes[0].nodeName === "CODE",
                replacement: str => `\`\`\`js\n${str}\`\`\``
            });

        return {
            title: `${res.Heading} (${res.AbstractSource})`,
            url: res.AbstractURL,
            description: turndown.turndown(res.Abstract),
            image: res.Image
        };
    }
};