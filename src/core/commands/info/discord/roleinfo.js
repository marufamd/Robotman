const Command = require("../../../classes/Command");
const { Embed, findRole, title, formatDate, difference } = require("../../../../util");

const { stripIndents } = require("common-tags");
const { escapeMarkdown } = require("discord.js");

module.exports = class extends Command {
    constructor(client) {
        super(client, {
            name: "roleinfo",
            description: "Gets info about a role",
            group: "info",
            aliases: ["role-info", "role", "rinfo"],
            usage: "<role>",
            examples: ["everyone"],
            info: ["Role argument can be name, mention, or id"],
            args: true
        });
    }

    run(message, args) {
        const role = findRole(message, args.join(" "));
        if (!role) return message.channel.send("That role does not exist.");

        const image = `http://www.beautycolorcode.com/${role.color === 0 ? "B9BBBE" : role.hexColor.slice(1)}-256x256.png`;
        const members = role.members;

        let memberList = members.map(m => m.toString()).join(", ");
        if (memberList.length > 1024) memberList = "Too many members to display";

        const permissions = role.permissions;
        let permList;
        if (permissions.has("ADMINISTRATOR")) permList = "All Permissions (Administrator)";
        else permList = permissions.toArray().map(a => title(a.replace(/_/gi, " ")).replace(/(tts|vad)/gi, (a) => a.toUpperCase()).replace(/guild/gi, "Server")).sort().map(b => `\`${b}\``).join(", ");

        const embed = new Embed(role.color === 0 ? "b9bbbe" : role.color)
            .setTitle(`${escapeMarkdown(role.name)}`)
            .setThumbnail(image)
            .setDescription(stripIndents`
                • **Created On:** ${formatDate(role.createdAt)} UTC (${difference(role.createdAt)} years ago)
                • **Mentionable:** ${role.mentionable ? "Yes" : "No"}
                • **Hoisted:** ${role.hoist ? "Yes" : "No"}
                • **Integration:** ${role.managed ? "Yes" : "No"}
                • **Position:** ${role.position}/${message.guild.roles.cache.size - 1}
                • **Hex Color:** ${role.hexColor === `#000000` ? "None" : role.hexColor}`)
            .addField("Permissions", permissions.toArray().length ? permList : "None")
            .addField(`${members.size} Member${members.size === 1 ? " Has" : "s Have"} This Role`, members.size > 0 ? memberList : "No members to display")
            .setFooter(`ID: ${role.id}`);

        return message.embed(embed);
    }
};