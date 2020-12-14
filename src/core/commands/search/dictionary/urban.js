const Command = require("../../../classes/Command");
const { trim, Embed, fetch } = require("../../../../util");

module.exports = class extends Command {
    constructor(client) {
        super(client, {
            name: "urban",
            description: "Searches Urban Dictionary",
            group: "search",
            aliases: ["ud", "urbandictionary"],
            usage: "<word>",
            examples: ["hello world"],
            args: true,
            cooldown: 10,
            typing: true
        });
    }

    async run(message, args) {
        const defined = await this.search(args.join(" "));

        if (defined === "error") return message.respond("Error fetching result from the API. Try again later.");
        else if (!defined) return message.respond("No results found");

        const embed = new Embed()
            .setTitle(defined.word)
            .setURL(defined.permalink)
            .setThumbnail("https://i.imgur.com/UYmtNYu.png")
            .setDescription(trim(defined.definition, 2040).trim())
            .setFooter(`Defined by ${defined.author}`);
        if (defined.example) embed.addField("Example", trim(defined.example, 1020).trim());

        embed
            .addField("👍", defined.thumbs_up, true)
            .addField("👎", defined.thumbs_down, true);

        return message.embed(embed);
    }

    async search(term) {
        if (!term) throw new Error("No query provided");
        const res = fetch("http://api.urbandictionary.com/v0/define", { term });

        if (res.error) return "error";
        if (!res.list.length) return null;

        return res.list[0];
    }
};