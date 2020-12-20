const { Command } = require('discord-akairo');

module.exports = class extends Command {
    constructor() {
        super('avatar', {
            aliases: ['avatar', 'user-icon', 'u-icon', 'av'],
            description: {
                info: 'Displays a user\'s avatar. Defaults to the command executor.',
                usage: '<user>',
                examples: ['maruf'],
            },
            args: [
                {
                    id: 'user',
                    type: 'user',
                    default: message => message.author
                }
            ],
        });
    }

    async exec(message, { user }) {
        const avatar = user.displayAvatarURL({ format: "png", size: 4096, dynamic: true });
        const member = message.guild.members.cache.get(user.id);

        const embed = this.client.util.embed()
            .setTitle(`${user.tag}'s Avatar`)
            .setURL(avatar)
            .setImage(avatar)
            .setFooter(`ID: ${user.id}`);

        if (member?.displayColor) embed.setColor(member.displayColor);

        return message.util.send(embed);
    }
};