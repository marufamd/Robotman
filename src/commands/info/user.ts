import { stripIndents } from 'common-tags';
import { Command } from 'discord-akairo';
import { Message, GuildMember, Util } from 'discord.js';
import { title, formatDate, difference } from '../../util';

export default class extends Command {
    public constructor() {
        super('userinfo', {
            aliases: ['user-info', 'who-is', 'user', 'u-info'],
            description: {
                info: 'Displays info about a user. Defaults to the command executor.',
                usage: '<user>',
                examples: [
                    'maruf',
                    'maruf#9900',
                    '196034947004366849',
                    '@Maruf#9900'
                ]
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
        const avatar = user.displayAvatarURL({ format: 'png', size: 4096, dynamic: true });

        const roles = member.roles.cache.filter(r => r.id !== message.guild.id);
        const roleList = roles.sort((a, b) => b.position - a.position).map(r => r.name).join(', ');

        const badges = user.flags.toArray();

        let game;

        const embed = this.client.util
            .embed()
            .setTitle(`${user.tag}${user.bot ? ' <:bot:764365628169388053>' : ''}`)
            .setURL(avatar)
            .setThumbnail(avatar)
            .setDescription(stripIndents`
                        • **Created On:** ${formatDate(user.createdAt)} (${difference(user.createdAt)} days ago)
                        • **Joined On:** ${formatDate(member.joinedAt)} (${difference(member.joinedAt)} days ago)
                        • **Nickname:** ${member.nickname ? Util.escapeMarkdown(member.nickname) : 'None'}`)
            .setFooter(`ID: ${user.id}`);

        if (member.displayColor) embed.setColor(member.displayColor);

        if (badges.length) embed.addField('Badges', badges.map(f => title(f.replaceAll('_', ' ').replace('HOUSE', 'HYPESQUAD'))).join(', '));

        embed.addField(`${roles.size ? roles.size : 'No'} Role${roles.size === 1 ? '' : 's'}`, roleList.length < 1024 ? (roleList.length ? roleList : 'No Roles to Display') : 'Too Many Roles to Display');

        if (game) embed.setDescription(game);

        return message.util.send(embed);
    }
}