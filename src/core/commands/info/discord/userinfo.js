const Command = require("../../../classes/Command");
const { findUser, title, formatDate, Embed, difference } = require("../../../../util");

const { stripIndents } = require("common-tags");
const { escapeMarkdown } = require("discord.js");

module.exports = class extends Command {
    constructor(client) {
        super(client, {
            name: "userinfo",
            description: "Gets info about a user",
            group: "info",
            aliases: ["uinfo", "user", "member", "whois", "u"],
            usage: "<user>",
            examples: [
                "maruf",
                "maruf#9900",
                "9900",
                "196034947004366849",
                "@Maruf#9900"
            ],
            info: ["User argument can be a mention, id, username, nickname, or discriminator"]
        });
    }

    async run(message, args) {
        const user = findUser(message, args.join(" "), false);
        const member = message.guild.members.cache.get(user.id) || await message.guild.members.fetch(user);

        const avatar = user.displayAvatarURL({ format: "png", size: 4096, dynamic: true });

        const roles = member.roles.cache.filter(r => r.id !== message.guild.id);
        const roleList = roles.sort((a, b) => b.position - a.position).map(r => r.name).join(", ");

        const badges = user.flags.toArray();
        const statuses = {
            "online": "<:online:765076016132653066>Online",
            "dnd": "<:dnd:765075435544510515>Do Not Disurb",
            "idle": "<:idle:765076054988685332>Idle",
            "offline": "<:invis:765075977495117838>Offline/Invisible"
        };
        let game;

        if (user.presence.activities.length && user.presence.activities[0].type !== "CUSTOM_STATUS") {
            const act = user.presence.activities[0];
            game = `${title(act.type)} **${act.type === "STREAMING" ? `[${act.name}](${act.url})` : act.name}**`;
        }

        const embed = new Embed()
            .setTitle(`${user.tag}${user.bot ? " <:bot:764365628169388053>" : ""}`)
            .setURL(avatar)
            .setThumbnail(avatar)
            .addField("Details", stripIndents`
                        • **Created On:** ${formatDate(user.createdAt)} UTC (${difference(user.createdAt)} years ago)
                        • **Joined On:** ${formatDate(member.joinedAt)} UTC (${difference(member.joinedAt)} years ago)
                        • **Status:** ${statuses[user.presence.status]}
                        • **Nickname:** ${member.nickname ? escapeMarkdown(member.nickname) : "None"}`)
            .setFooter(`ID: ${user.id}`);

        if (member.displayColor) embed.setColor(member.displayColor);

        if (badges.length) embed.addField("Badges", badges.map(f => title(f.replaceAll("_", " ").replace("HOUSE", "HYPESQUAD"))).join(", "));

        embed.addField(`${roles.size ? roles.size : "No"} Role${roles.size == 1 ? "" : "s"}`, roleList.length < 1024 ? (roleList.length ? roleList : "No Roles to Display") : "Too Many Roles to Display");

        if (game) embed.setDescription(game);

        return message.embed(embed);
    }
};