const { Command } = require('discord-akairo');
const { escapeMarkdown } = require('discord.js');
const { stripIndents } = require('common-tags');
const { title, formatDate, difference } = require('../../util');

module.exports = class extends Command {
    constructor() {
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
                ],
            },
            args: [
                {
                    id: 'member',
                    type: 'member',
                    default: message => message.member
                }
            ]
        });
    }

    async exec(message, { member }) {
        const user = member.user;
        const avatar = user.displayAvatarURL({ format: 'png', size: 4096, dynamic: true });

        const roles = member.roles.cache.filter(r => r.id !== message.guild.id);
        const roleList = roles.sort((a, b) => b.position - a.position).map(r => r.name).join(', ');

        const badges = user.flags.toArray();
        const statuses = {
            'online': '<:online:765076016132653066>Online',
            'dnd': '<:dnd:765075435544510515>Do Not Disurb',
            'idle': '<:idle:765076054988685332>Idle',
            'offline': '<:invis:765075977495117838>Offline/Invisible'
        };
        let game;

        if (user.presence.activities.length && user.presence.activities[0].type !== 'CUSTOM_STATUS') {
            const act = user.presence.activities[0];
            game = `${title(act.type)} **${act.type === 'STREAMING' ? `[${act.name}](${act.url})` : act.name}**`;
        }

        const embed = this.client.util.embed()
            .setTitle(`${user.tag}${user.bot ? ' <:bot:764365628169388053>' : ''}`)
            .setURL(avatar)
            .setThumbnail(avatar)
            .setDescription(stripIndents`
                        • **Created On:** ${formatDate(user.createdAt)} (${difference(user.createdAt)} days ago)
                        • **Joined On:** ${formatDate(member.joinedAt)} (${difference(member.joinedAt)} days ago)
                        • **Status:** ${statuses[user.presence.status]}
                        • **Nickname:** ${member.nickname ? escapeMarkdown(member.nickname) : 'None'}`)
            .setFooter(`ID: ${user.id}`);

        if (member.displayColor) embed.setColor(member.displayColor);

        if (badges.length) embed.addField('Badges', badges.map(f => title(f.replaceAll('_', ' ').replace('HOUSE', 'HYPESQUAD'))).join(', '));

        embed.addField(`${roles.size ? roles.size : 'No'} Role${roles.size == 1 ? '' : 's'}`, roleList.length < 1024 ? (roleList.length ? roleList : 'No Roles to Display') : 'Too Many Roles to Display');

        if (game) embed.setDescription(game);

        return message.util.send(embed);
    }
};