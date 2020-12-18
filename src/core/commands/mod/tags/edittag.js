const Command = require("../../../classes/Command");
const { Util: { cleanContent } } = require("discord.js");

module.exports = class extends Command {
    constructor(client) {
        super(client, {
            name: "edittag",
            description: "Edits a tag",
            group: "tags",
            aliases: ["tagedit", "etag", "edit-tag", "tag-edit"],
            usage: `<tag name> <new contents>`,
            examples: ["daredevil Daredevil sucks"],
            info: ["Requires the message author to have the Manage Server permission."],
            disableEdits: true
        });
    }

    async run(message, args) {
        try {
            if (!message.author.owner && !message.member.permissions.has("MANAGE_GUILD")) return;
            if (!args.length) return message.usage(this.usage);

            let [name, ...contents] = args;
            name = name.toLowerCase();
            if (!contents.length && !message.attachments.size) return message.usage(this.usage);
            contents = contents ? cleanContent(contents.join(" "), message) : "";

            const attachments = message.attachments.size ? message.attachments.map(a => a.proxyURL) : [];
            const updated = await message.guild.editTag({
                name, 
                contents, 
                attachments, 
                user: message.author 
            });
            const response = updated ? `Edited tag \`${name}\`` : `The tag \`${name}\` does not exist`;

            return message.respond(response);
        } catch (e) {
            message.error(e);
            this.client.log(`Command: ${this.name}\n${e.stack}`, "error");
        }
    }
};