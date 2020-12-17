const Command = require("../../../classes/Command");
const { trim, capitalize, Embed, fetch } = require("../../../../util");

module.exports = class extends Command {
    constructor(client) {
        super(client, {
            name: "define",
            description: "Defines a word",
            group: "search",
            aliases: ["dictionary", "dict", "definition"],
            usage: "<word>",
            examples: ["comicbook"],
            args: true,
            cooldown: 7,
            typing: true
        });
    }

    async run(message, args) {
        const defined = await this.search(args.join(" "));

        if (!defined) return message.respond("No results found");
        const embed = new Embed("#336078").setFooter("Merriam-Webster", "https://pbs.twimg.com/profile_images/677210982616195072/DWj4oUuT.png");

        if (Array.isArray(defined)) {
            embed
                .setTitle(`No results found for \`${args.join(" ")}\``)
                .addField("Did You Mean:", defined.map(a => `[${a}](https://www.merriam-webster.com/dictionary/${encodeURIComponent(a)})`).join("\n"));
        } else {
            embed
                .setTitle(defined.word)
                .setURL(`https://www.merriam-webster.com/dictionary/${encodeURIComponent(defined.word)}`)
                .setDescription(trim(defined.definitions.map(a => {
                    if (defined.definitions.indexOf(a) === 0) return a;
                    return `• ${a}`;
                }).join("\n\n"), 2040))
                .addField("Part of Speech", capitalize(defined.type));
            if (defined.date) embed.addField("First Known Use", defined.date);
        }

        return message.embed(embed);
    }

    async search(word) {
        if (!word.length) throw new Error("No query provided");
        const url = `https://www.dictionaryapi.com/api/v3/references/collegiate/json/${encodeURIComponent(word)}`;

        const res = await fetch(url, { key: process.env.DICTIONARY_KEY });

        if (!res.length) return null;
        const result = res[0];
        if (typeof result[0] === "string") return res.slice(0, 3);

        return {
            word: result.meta.stems[0],
            type: result.fl,
            definitions: result.shortdef,
            date: result.date?.replace(/\{(.*?)\}/gi, "")
        };
    }
};