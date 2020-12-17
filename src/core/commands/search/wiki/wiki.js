const Command = require("../../../classes/Command");
const { trim, Embed, formatQuery, fetch } = require("../../../../util");

module.exports = class extends Command {
    constructor(client) {
        super(client, {
            name: "wiki",
            description: "Seaches Wikipedia",
            group: "search",
            aliases: ["wikipedia"],
            usage: "<query>",
            examples: ["batman"],
            args: true,
            cooldown: 10,
            typing: true
        });

        this.badWords = null;
    }

    async run(message, args) {
        const wordlist = await this.getBadWords();
        if (args.some(a => wordlist.includes(a))) return message.respond("You cannot search for that term.");

        const params = {
            action: "query",
            titles: formatQuery(args.join(" ")),
            prop: "extracts|pageimages|links",
            format: "json",
            formatversion: 2,
            exintro: true,
            redirects: true,
            explaintext: true,
            pithumbsize: 1000
        };

        const page = await this.search(params);
        if (!page) return message.respond("No results found.");

        const embed = new Embed()
            .setColor("#F8F8F8")
            .setTitle(page.title)
            .setDescription(page.description)
            .setURL(page.url)
            .setFooter("Wikipedia", "https://upload.wikimedia.org/wikipedia/commons/7/75/Wikipedia_mobile_app_logo.png");
        if (page.image) embed.setImage(page.image);

        return message.embed(embed);
    }

    async search(params) {
        const res = await fetch("https://en.wikipedia.org/w/api.php", params);

        const page = res.query.pages[0];
        if (page.missing || !page.extract) return null;
        let description = page.extract;

        if (/may (also )?refer to/gi.test(description)) {
            const links = page.links.map(l => `[${l.title}](${this.getLink(l.title)})`).join("\n");
            description = `${trim(description.trimEnd(), 1015)}\n${trim(links, 1015)}`;
        } else {
            description = trim(description.split("\n")[0].trimEnd(), 1015);
        }

        return {
            title: page.title,
            description,
            url: this.getLink(page.title),
            image: page.thumbnail ? page.thumbnail.source : null
        };
    }

    getLink(page) {
        return `https://en.wikipedia.org/wiki/${encodeURIComponent(page.replaceAll(" ", "_"))}`;
    }

    async getBadWords() {
        if (this.badWords) return this.badWords;
        const url = "https://raw.githubusercontent.com/RobertJGabriel/Google-profanity-words/master/list.txt";
        const body = (await fetch(url, null, "text")).split("\n");
        this.badWords = body;
        return this.badWords;
    }
};