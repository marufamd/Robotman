import { stripIndents } from 'common-tags';
import { Command } from 'discord-akairo';
import { Message, Permissions, Role, Util } from 'discord.js';
import { difference, formatDate, title } from '../../util';

export default class extends Command {
    public constructor() {
        super('roleinfo', {
            aliases: ['role-info', 'role', 'r-info'],
            description: {
                info: 'Displays info about a role',
                usage: '<role>',
                examples: ['everyone']
            },
            args: [
                {
                    id: 'role',
                    type: 'role',
                    prompt: {
                        start: 'What role would you like to see information for?',
                        retry: 'Invalid role. Try again.'
                    }
                }
            ]
        });
    }

    public async exec(message: Message, { role }: { role: Role }) {
        const image = `http://www.beautycolorcode.com/${role.color === 0 ? 'B9BBBE' : role.hexColor.slice(1)}-256x256.png`;
        const members = role.members;

        let memberList = members.map(m => m.toString()).join(' ');
        if (memberList.length > 1024) memberList = 'Too many members to display';

        const permissions = role.permissions;
        const permList = permissions.has(Permissions.FLAGS.ADMINISTRATOR)
            ? 'All Permissions'
            : permissions
                .toArray()
                .map(a => title(a.replace(/_/gi, ' '))
                    .replace(/(tts|vad)/gi, a => a.toUpperCase())
                    .replace(/guild/gi, 'Server'))
                .sort()
                .map(b => `\`${b}\``)
                .join(', ');

        const embed = this.client.util
            .embed()
            .setColor(role.color === 0 ? 'b9bbbe' : role.color)
            .setTitle(Util.escapeMarkdown(role.name))
            .setThumbnail(image)
            .setDescription(stripIndents`
                • **Created On:** ${formatDate(role.createdAt)} (${difference(role.createdAt)} days ago)
                • **Mentionable:** ${role.mentionable ? 'Yes' : 'No'}
                • **Hoisted:** ${role.hoist ? 'Yes' : 'No'}
                • **Integration:** ${role.managed ? 'Yes' : 'No'}
                • **Position:** ${role.position}/${message.guild.roles.cache.size - 1}
                • **Hex Color:** ${role.hexColor === `#000000` ? 'None' : role.hexColor}`)
            .addField('Permissions', permList.length ? permList : 'None')
            .addField(`${members.size} Member${members.size === 1 ? ' Has' : 's Have'} This Role`, members.size > 0 ? memberList : 'No members to display')
            .setFooter(`ID: ${role.id}`);

        return message.util.send(embed);
    }
}