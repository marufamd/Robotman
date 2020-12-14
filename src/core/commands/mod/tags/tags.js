const Command = require("../../../classes/Command");

module.exports = class extends Command {
    constructor(client) {
        super(client, {
            name: "tags",
            description: "Lists all tags for the server",
            group: "tags",
            aliases: ["taglist", "tagslist", "tag-list", "list-tags"],
            disableEdits: true,
        });
    }

    async run(message) {
        const list = await this.handler.tags.list(message.guild.id);
        let response;

        if (!list) response = "There are no tags for this server.";
        else response = `Available tags (${list.length})\n\`\`\`\n${list.join(", ")}\`\`\``;

        return message.respond(response);
    }
};