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

        const user = this.client.users.cache.has(tag.userID) ? this.client.users.cache.get(tag.userID).tag : tag.createdBy;
        const str = [
            `• **Created on:** ${formatDate(tag.createdAt)}`,
            `• **Created by:** ${user} (${tag.userID})`
        ];

        if (tag.edited_username) {
            const editUser = this.client.users.cache.has(tag.editedUserID) ? this.client.users.cache.get(tag.editedUserID).tag : tag.editedBy;
            str.push(
                `• **Last edited on:** ${formatDate(tag.updatedAt)}`,
                `• **Last edited by:** ${editUser} (${tag.editedUserID})`
            );
        }

        str.push(`• **Uses:** ${tag.uses}`);

        const embed = new Embed()
            .setTitle(`Showing info for ${tag.name}`)
            .setDescription(str);
        if (tag.aliases?.length) embed.addField("Aliases", tag.aliases.join(", "));
        if (tag.attachments?.length) embed.addField("Attachments", tag.attachments.map((a, i) => `[${i}](${a})`).join(", "));
        if (tag.contents.length) embed.addField("Source", contents);

        return message.embed(embed);
    }
};