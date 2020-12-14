const Command = require("../../../classes/Command");

module.exports = class extends Command {
    constructor(client) {
        super(client, {
            name: "deltag",
            description: "Deletes a tag",
            group: "tags",
            aliases: ["tagdel", "dtag", "del-tag", "tag-del", "removetag"],
            usage: "<tag name>",
            examples: ["daredevil"],
            info: ["Requires the message author to have the Manage Server permission."],
            disableEdits: true
        });
    }

    async run(message, args) {
        if (!message.author.owner && !message.member.permissions.has("MANAGE_GUILD")) return;
        if (!args.length) return message.usage(this.usage);

        const name = args[0].toLowerCase();
        const guild = message.guild.id;

        let response;
        const deleted = await this.handler.tags.delete(name, guild);

        if (!deleted) response = `The tag \`${name}\` does not exist.`;
        else response = `Deleted tag \`${name}\`.`;

        return message.respond(response);
    }
};