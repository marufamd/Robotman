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
        const list = await message.guild.listTags();
        const response = list ? `Available tags (${list.length})\n\`\`\`\n${list.join(", ")}\`\`\`` : "There are no tags for this server.";
        return message.respond(response);
    }
};