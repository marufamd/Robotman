const Command = require("../../../classes/Command");
const { formatDate, Embed, title, difference } = require("../../../../util");

const { stripIndents } = require("common-tags");
const { escapeMarkdown } = require("discord.js");

module.exports = class extends Command {
    constructor(client) {
        super(client, {
            name: "serverinfo",
            description: "Gets info about the server",
            group: "info",
            aliases: ["sinfo", "server", "server-info", "guild"]
        });
    }

    run(message) {
        const guild = message.guild;
        const icon = guild.iconURL({ format: "png", size: 2048 });
        const splash = guild.splashURL({ format: "png", size: 2048 });
        const [bots, users] = guild.members.cache.partition(m => m.user.bot);

        const channels = guild.channels.cache;
        const voice = channels.filter(c => c.type === "voice");
        const text = channels.filter(c => c.type === "text");
        const categories = channels.filter(c => c.type === "category");

        const filterLevel = {
            "DISABLED": "None",
            "MEMBERS_WITHOUT_ROLES": "Scan media content from members without a role",
            "ALL_MEMBERS": "Scan media content from all members"
        };

        let str = stripIndents`
            • **Created On:** ${formatDate(guild.createdAt)} UTC (${difference(guild.createdAt)} years ago)
            • **Owner:** ${escapeMarkdown(guild.owner.user.tag)}
            • **Region:** ${this.formatRegion(guild.region)}
            • **Members:** ${guild.memberCount} (${users.size} Users, ${bots.size} Bots)
            • **Channels:** ${channels.size} (${categories.size} Categories, ${text.size} Text, ${voice.size} Voice)
            • **Roles** ${guild.roles.cache.size}
            • **Emojis:** ${guild.emojis.cache.size}
            • **Boosts:** ${guild.premiumSubscriptionCount ? guild.premiumSubscriptionCount : "None"}${message.guild.premiumTier ? ` (Level ${message.guild.premiumTier})` : ""}
            • **Verification Level:** ${title(guild.verificationLevel.replaceAll("_", " "))}
            • **Explicit Content Filter:** ${filterLevel[guild.explicitContentFilter]}`;

        if (splash) str += `\n• **Splash URL:** [Click Here](${splash})`;

        const embed = new Embed()
            .setTitle(`${guild.name}`)
            .setURL(icon)
            .setThumbnail(icon)
            .setDescription(str)
            .setFooter(`ID: ${guild.id}${guild.partnered ? " | This server is Partnered" : ""}`, guild.partnered ? "https://www.discordia.me/uploads/badges/new_partner_badge.png" : null);

        if (guild.owner.displayColor) embed.setColor(guild.owner.displayColor);

        return message.embed(embed);
    }

    formatRegion(region) {
        return title(region.replace(/-/g, " ")
            .replace("southafrica", "south africa")
            .replace("hongkong", "hong kong"))
            .replace(/(Eu|Us) /g, a => a.toUpperCase());
    }
};