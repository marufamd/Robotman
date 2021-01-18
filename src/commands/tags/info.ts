import { Command } from 'discord-akairo';
import { Message } from 'discord.js';
import type { Tag } from '../../structures/TagsProvider';
import { formatDate, paste } from '../../util';

export default class extends Command {
    public constructor() {
        super('tag-info', {
            aliases: ['tag-info'],
            description: {
                info: 'Displays information about a tag.',
                usage: '<tag>',
                examples: ['test']
            },
            args: [
                {
                    id: 'tag',
                    type: 'tag',
                    match: 'content',
                    prompt: {
                        start: 'Which tag would you like to view information about?',
                        retry: (_: Message, { phrase }: { phrase: string }) => `A tag with the name **${phrase}** does not exist. Please try again.`
                    }
                }
            ]
        });
    }

    public async exec(message: Message, { tag }: { tag: Tag }) {
        let { content } = tag;

        if (content.length > 1018) {
            const url = await paste(content, 'md');
            content = `Too long to display. Source was uploaded to hastebin. ${url}`;
        } else {
            content = `\`\`\`md\n${content}\`\`\``;
        }

        const user = this.client.users.cache.has(tag.author)
        ? `${this.client.users.cache.get(tag.author).tag} (${tag.author})`
        : `User with ID ${tag.author}`;

        const str = [
            `• **Created on:** ${formatDate(tag.created_at)}`,
            `• **Created by:** ${user}`
        ];

        if (tag.editor) {
            const editUser = this.client.users.cache.has(tag.editor)
            ? `${this.client.users.cache.get(tag.editor).tag} (${tag.editor})`
            : `User with ID ${tag.editor}`;
            str.push(
                `• **Last edited on:** ${formatDate(tag.updated_at)}`,
                `• **Last edited by:** ${editUser}`
            );
        }

        str.push(`• **Uses:** ${tag.uses}`);

        const embed = this.client.util.embed()
            .setTitle(`Information for ${tag.name}`)
            .setDescription(str);

        if (tag.aliases?.length) embed.addField('Aliases', tag.aliases.join(', '));

        embed.addField('Source', content);

        return message.util.send(embed);
    }
}