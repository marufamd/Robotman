const Command = require("../../../classes/Command");
const { paste, formatDate, Embed } = require("../../../../util");

module.exports = class extends Command {
    constructor(client) {
        super(client, {
            name: "taginfo",
            description: "Shows info for a tag",
            group: "tags",
            aliases: ["tag-info", "tinfo"],
            usage: "<tag>",
            examples: ["daredevil"],
            args: true,
            disableEdits: true
        });
    }

    async run(message, args) {
        const name = args[0].toLowerCase();

        const tag = await this.handler.tags.get(name, message.guild.id);
        if (!tag) return message.respond("That tag does not exist.");
        let contents = tag.contents;

        if (contents.length > 1018) {
            const url = await paste(contents, "md");
            contents = `Too long to display. Source was uploaded to hastebin. ${url}`;
        } else {
            contents = `\`\`\`md\n${contents}\`\`\``;
        }

        const user = this.client.users.cache.has(tag.userid) ? this.client.users.cache.get(tag.userid).tag : tag.username;
        const str = [
            `• **Created on:** ${formatDate(tag.createdAt)} (UTC)`,
            `• **Created by:** ${user} (${tag.userid})`
        ];

        if (tag.edited_username) {
            const editUser = this.client.users.cache.has(tag.edited_userid) ? this.client.users.cache.get(tag.edited_userid).tag : tag.edited_username;
            str.push(`• **Last edited on:** ${formatDate(tag.updatedAt)} (UTC)`, `• **Last edited by:** ${editUser} (${tag.edited_userid})`);
        }

        str.push(`• **Uses:** ${tag.uses}`);

        const embed = new Embed()
            .setTitle(`Showing info for ${tag.name}`)
            .setDescription(str);
        if (tag.aliases.length) embed.addField("Aliases", tag.aliases.join(", "));
        if (tag.attachments.length) {
            let i = 0;
            embed.addField("Attachments", tag.attachments.map(a => `[${++i}](${a})`).join(", "));
        }
        if (tag.contents.length) embed.addField("Source", contents);

        return message.embed(embed);
    }
};