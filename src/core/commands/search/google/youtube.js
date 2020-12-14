const Command = require("../../../classes/Command");
const { youtube } = require("../../../../util");

module.exports = class extends Command {
    constructor(client) {
        super(client, {
            name: "youtube",
            description: "Searches YouTube",
            group: "search",
            aliases: ["yt", "video", "vid", "song"],
            usage: "<query>",
            examples: ["daredevil opening theme"],
            args: true,
            cooldown: 10,
            disableEdits: true,
            typing: true
        });
    }

    async run(message, args) {
        message.channel.startTyping();

        const query = args.join(" ");
        const result = await this.search(query);

        if (result) message.respond(`**Top result for \`${query}\`**\n${result.link}`);
        else message.respond("No results found");
        
        message.channel.stopTyping();
    }

    async search(query, safe = false) {
        const params = {
            part: "snippet",
            type: "video",
            safeSearch: safe ? "strict" : "none",
            q: query,
            maxResults: 1
        };

        const output = await youtube(params);
        if (!output) return null;

        return {
            link: `https://www.youtube.com/watch?v=${output.id.videoId}`,
            title: output.snippet.title,
            description: output.snippet.description
        };
    }
};