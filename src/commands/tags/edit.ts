import { Command } from 'discord-akairo';
import { Message, Util } from 'discord.js';
import type { Tag } from '../../structures/TagsProvider';

export default class extends Command {
    public constructor() {
        super('edittag', {
            aliases: ['edit-tag', 'e-tag', 'tag-edit'],
            description: {
                info: 'Edits a tag.',
                usage: '<name> <new content>',
                examples: ['example 456']
            },
            args: [
                {
                    id: 'tag',
                    type: 'tag',
                    prompt: {
                        start: 'Which tag would you like to edit?',
                        retry: (_: Message, { phrase }: { phrase: string }) => `A tag with the name **${phrase}** does not exist. Please try again.`
                    }
                },
                {
                    id: 'content',
                    match: 'rest',
                    prompt: {
                        start: 'What would you like the new content of the tag to be?'
                    }
                }
            ]
        });
    }

    public mod = true;

    public async exec(message: Message, { tag, content }: { tag: Tag; content: string }) {
        const edited = await this.client.tags.edit(tag.name, Util.cleanContent(content, message), message);
        return message.util.send(`Successfully edited the tag **${edited.name}**.`);
    }
}