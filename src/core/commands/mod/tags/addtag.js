const Command = require("../../../classes/Command");
const { Util: { cleanContent } } = require("discord.js");

module.exports = class extends Command {
    constructor(client) {
        super(client, {
            name: "addtag",
            description: "Adds a tag",
            group: "tags",
            aliases: ["tagadd", "atag", "add-tag", "tag-add"],
            usage: "<tag name> <contents>",
            examples: ["daredevil Daredevil rocks"],
            info: ["Requires the message author to have the Manage Server permission."],
            disableEdits: true
        });
    }

    async run(message, [name, ...contents]) {
        if (!message.author.owner && !message.member.permissions.has("MANAGE_GUILD")) return;
        if (!name || !contents.length && !message.attachments.size) return message.usage(this.usage);

        name = name.replaceAll("@", "").toLowerCase();
        if (await this.handler.exists(name, message.guild.id)) return message.respond(`The \`${name}\` shortcut/command/tag already exists.`);

        contents = contents ? cleanContent(contents.join(" "), message) : "";
        const attachments = message.attachments.size ? message.attachments.map(a => a.proxyURL) : [];

        const tag = await this.handler.tags.add(name, contents, attachments, message.guild.id, message.author);
        return message.respond(`Added tag \`${tag}\``);
    }
};