const Command = require("../../../classes/Command");
const { Embed, findUser } = require("../../../../util");

module.exports = class extends Command {
    constructor(client) {
        super(client, {
            name: "avatar",
            description: "Get's a user's avatar",
            group: "info",
            aliases: ["usericon", "uicon", "pfp", "av"],
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

    run(message, args) {
        const found = findUser(message, args.join(" "), false);
        const avatar = found.displayAvatarURL({ format: "png", size: 4096, dynamic: true });
        const member = message.guild.members.cache.get(found.id);

        const embed = new Embed()
            .setImage(avatar)
            .setTitle(`${found.tag}'s Avatar`)
            .setFooter(`ID: ${found.id}`)
            .setURL(avatar);

        if (member.displayColor) embed.setColor(member.displayColor);

        return message.embed(embed);
    }
};