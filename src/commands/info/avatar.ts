import { Command } from 'discord-akairo';
import type { GuildMember, Message } from 'discord.js';

export default class extends Command {
    public constructor() {
        super('avatar', {
            aliases: ['avatar', 'user-icon', 'u-icon', 'av'],
            description: {
                info: 'Displays a user\'s avatar. Defaults to the command executor.',
                usage: '<user>',
                examples: ['maruf']
            },
            args: [
                {
                    id: 'member',
                    type: 'member',
                    default: (message: Message) => message.member
                }
            ]
        });
    }

    public exec(message: Message, { member }: { member: GuildMember }) {
        const { user } = member;
        const avatar = user.displayAvatarURL({
            format: 'png',
            size: 4096,
            dynamic: true
        });

        const embed = this.client.util
            .embed()
            .setTitle(`${user.tag}'s Avatar`)
            .setURL(avatar)
            .setImage(avatar)
            .setFooter(`ID: ${user.id}`);

        if (member.displayColor) embed.setColor(member.displayColor);

        return message.util.send(embed);
    }
}