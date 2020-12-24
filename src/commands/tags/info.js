const { Command } = require('discord-akairo');
const { paste, formatDate } = require('../../util');

module.exports = class extends Command {
    constructor() {
        super('taginfo', {
            aliases: ['tag-info'],
            description: {
                info: 'Displays information about a tag.',
                usage: '<tag>',
                examples: ['test'],
            },
            args: [
                {
                    id: 'tag',
                    type: 'tag',
                    match: 'content',
                    prompt: {
                        start: 'Which tag would you like to view information about?',
                        retry: (_, { phrase }) => `A tag with the name **${phrase}** does not exist.`
                    }
                }
            ]
        });
    }

    async exec(message, { tag }) {
        const data = tag.get('data');
        let { content } = data;

        if (content.length > 1018) {
            const url = await paste(content, 'md');
            content = `Too long to display. Source was uploaded to hastebin. ${url}`;
        } else {
            content = `\`\`\`md\n${content}\`\`\``;
        }

        const user = this.client.users.cache.has(data.user.id) ? this.client.users.cache.get(data.user.id).tag : data.user.name;
        const str = [
            `• **Created on:** ${formatDate(tag.createdAt)}`,
            `• **Created by:** ${user} (${data.user.id})`
        ];

        if (data.editor?.name) {
            const editUser = this.client.users.cache.has(data.editor.id) ? this.client.users.cache.get(data.editor.name).tag : data.editor.name;
            str.push(
                `• **Last edited on:** ${formatDate(tag.updatedAt)}`,
                `• **Last edited by:** ${editUser} (${data.editor.id})`
            );
        }

        str.push(`• **Uses:** ${tag.get('uses')}`);

        const embed = this.client.util.embed()
            .setTitle(`Information for ${tag.get('name')}`)
            .setDescription(str);
        if (tag.aliases?.length) embed.addField('Aliases', tag.aliases.join(', '));
        if (tag.attachments?.length) embed.addField('Attachments', tag.attachments.map((a, i) => `[${i}](${a})`).join(', '));

        embed.addField('Source', content);

        return message.util.send(embed);
    }
};