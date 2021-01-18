import { Command } from 'discord-akairo';
import { Message } from 'discord.js';
import type { Tag } from '../../structures/TagsProvider';

export default class extends Command {
    public constructor() {
        super('del-tag', {
            aliases: ['delete-tag', 'tag-delete', 'tag-del', 'remove-tag', 'tag-remove', 'del-tag'],
            description: {
                info: 'Deletes a tag.',
                usage: '<tag>'
            },
            args: [
                {
                    id: 'tag',
                    type: 'tag',
                    match: 'content',
                    prompt: {
                        start: 'What tag would you like to delete?',
                        retry: (_: Message, { phrase }: { phrase: string }) => `A tag with the name **${phrase}** does not exist. Please try again.`
                    }
                }
            ]
        });
    }

    public mod = true;

    public async exec(message: Message, { tag }: { tag: Tag }) {
        const deleted = await this.client.tags.delete(tag.name, tag.guild);
        return message.util.send(`Successfully deleted the tag **${deleted.name}**`);
    }
}