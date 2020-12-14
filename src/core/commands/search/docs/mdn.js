const Command = require("../../../classes/Command");
const { Embed, fetch } = require("../../../../util");
const TurndownService = require("turndown");

module.exports = class extends Command {
    constructor(client) {
        super(client, {
            name: "mdn",
            description: "Searches MDN",
            group: "search",
            aliases: ["mozilladevelopernetwork", "mozilla-developer-network", "js"],
            usage: "<query>",
            examples: [
                "map#get",
                "array.prototype.map",
                "Object.keys"
            ],
            args: true,
            cooldown: 10,
            typing: true
        });
    }

    async run(message, args) {
        const res = await this.search(args.join(" ").replaceAll("#", ".prototype."));
        if (!res) return message.respond("No results found");

        const embed = new Embed()
            .setColor("#066fad")
            .setTitle(res.title)
            .setURL(res.link)
            .setDescription(res.description)
            .setFooter("Mozilla Developer Network", "https://developer.cdn.mozilla.net/static/img/opengraph-logo.72382e605ce3.png");

        return message.embed(embed);
    }

    async search(query) {
        if (!query) throw new Error("No query provided");
        const res = await fetch("https://developer.mozilla.org/api/v1/search/en-US", { q: query, topic: "js" });

        if (!res.count) return null;
        const item = res.documents[0].slug;
        const r = query.toLowerCase().includes("typedarray") ? item : item.replace("TypedArray", "Array");

        const url = `https://developer.mozilla.org/en-US/docs/${r}`;
        const body = await (await fetch(url + "$json")).json();

        const turndown = new TurndownService()
            .addRule("hyperlink", {
                filter: "a",
                replacement: (str, { href }) => `[${str}](https://developer.mozilla.org${href})`
            });

        const description = turndown.turndown(body.summary.replace(/<code><strong>(.+)<\/strong><\/code>/g, "<strong><code>$1</code></strong>"));

        return { title: body.title, description, link: url };
    }
};