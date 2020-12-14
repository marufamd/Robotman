const Command = require("../../../classes/Command");
const { Embed, formatQuery, fetch } = require("../../../../util");

module.exports = class extends Command {
    constructor(client) {
        super(client, {
            name: "wikia",
            description: "Searches Wikia",
            group: "search",
            aliases: ["fandom"],
            usage: "<wikia> <query>",
            examples: [
                "dc batman",
                "marvel daredevil"
            ],
            disableEdits: true,
            cooldown: 10,
            typing: true
        });
    }

    async run(message, args) {
        if (args.length < 2) return message.usage(this.usage);

        const baseURL = `https://${args.shift()}.fandom.com`;

        const params = {
            action: "query",
            titles: formatQuery(args.join(" ")),
            format: "json",
            formatversion: 2,
            redirects: true
        };

        const { query } = await fetch(`${baseURL}/api.php`, params);
        if (!query || !query.pages.length || query.pages[0].missing) return message.respond("No results found.");
        const { pageid } = query.pages[0];

        const result = await this.getData(`${baseURL}/api/v1/Articles/Details`, { ids: pageid, abstract: 500 }, pageid);
        if (!result) return message.respond("No results found");

        const embed = new Embed("08d7d7")
            .setTitle(result.title)
            .setURL(result.url)
            .setDescription(result.description)
            .setImage(result.image)
            .setFooter("FANDOM", "https://upload.wikimedia.org/wikipedia/commons/thumb/e/ee/Fandom_heart-logo.svg/128px-Fandom_heart-logo.svg.png");

        return message.embed(embed);
    }

    async getData(webURL, params, id) {
        const res = await fetch(webURL, params);
        if (res.ok === false) return null;

        const { items, basepath } = res;
        const { title, url, abstract, thumbnail, original_dimensions } = this.getItem(items, id);

        const description = abstract.split(/1 (Powers and Abilities|Physical Appearance|History|Biology)/)[0].trimEnd();
        let image;
        if (original_dimensions) {
            const { width, height } = original_dimensions;
            image = this.getOriginalSize(thumbnail, width, height);
        }

        return {
            title,
            description: description.endsWith(".") ? description : `${description}...`,
            image,
            url: basepath + url
        };
    }

    getOriginalSize(url, width, height) {
        return url
            .replace("width/200", `width/${width}`)
            .replace("height/200", `height/${height}`);
    }

    getItem(items, id) {
        return items[id.toString()];
    }
};