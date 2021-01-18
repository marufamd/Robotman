import { Command } from 'discord-akairo';
import { Message } from 'discord.js';
import type { Tag } from '../../structures/TagsProvider';

export default class extends Command {
    public constructor() {
        super('tag', {
            aliases: ['tag', 'tag-show'],
            description: {
                info: 'Shows a tag.',
                usage: '<tag>'
            },
            args: [
                {
                    id: 'tag',
                    type: 'tag',
                    match: 'content'
                }
            ]
        });
    }

    public exec(message: Message, { tag }: { tag: Tag }) {
        if (!tag) return;
        void this.client.tags.increment(tag.name, tag.guild);
        return message.util.send(tag.content);
    }
}