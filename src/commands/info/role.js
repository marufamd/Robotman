const { stripIndents } = require('common-tags');
const { Command } = require('discord-akairo');
const { Permissions, escapeMarkdown } = require('discord.js');
const { formatDate, difference, title } = require('../../util');

module.exports = class extends Command {
    constructor() {
        super('roleinfo', {
            aliases: ['role-info', 'role', 'r-info'],
            description: {
                info: 'Displays info about a role',
                usage: '<role>',
                examples: ['everyone'],
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
            ],
        });
    }

    async exec(message, { role }) {
        const image = `http://www.beautycolorcode.com/${role.color === 0 ? 'B9BBBE' : role.hexColor.slice(1)}-256x256.png`;
        const members = role.members;

        let memberList = members.map(m => m.toString()).join(' ');
        if (memberList.length > 1024) memberList = 'Too many members to display';

        const permissions = role.permissions;
        let permList;
        if (permissions.has(Permissions.FLAGS.ADMINISTRATOR)) permList = 'All Permissions (Administrator)';
        else permList = permissions.toArray().map(a => title(a.replace(/_/gi, ' ')).replace(/(tts|vad)/gi, (a) => a.toUpperCase()).replace(/guild/gi, 'Server')).sort().map(b => `\`${b}\``).join(', ');

        const embed = this.client.util.embed()
            .setColor(role.color === 0 ? 'b9bbbe' : role.color)
            .setTitle(`${escapeMarkdown(role.name)}`)
            .setThumbnail(image)
            .setDescription(stripIndents`
                • **Created On:** ${formatDate(role.createdAt)} UTC (${difference(role.createdAt)} years ago)
                • **Mentionable:** ${role.mentionable ? 'Yes' : 'No'}
                • **Hoisted:** ${role.hoist ? 'Yes' : 'No'}
                • **Integration:** ${role.managed ? 'Yes' : 'No'}
                • **Position:** ${role.position}/${message.guild.roles.cache.size - 1}
                • **Hex Color:** ${role.hexColor === `#000000` ? 'None' : role.hexColor}`)
            .addField('Permissions', permissions.toArray().length ? permList : 'None')
            .addField(`${members.size} Member${members.size === 1 ? ' Has' : 's Have'} This Role`, members.size > 0 ? memberList : 'No members to display')
            .setFooter(`ID: ${role.id}`);

        return message.util.send(embed);
    }
};