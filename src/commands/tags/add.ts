import { Command } from 'discord-akairo';
import { Message, Util } from 'discord.js';

export default class extends Command {
    public constructor() {
        super('add-tag', {
            aliases: ['add-tag', 'a-tag', 'tag-add'],
            description: {
                info: 'Adds a tag.',
                usage: '<name> <content>',
                examples: ['example 123']
            },
            args: [
                {
                    id: 'name',
                    type: async (message, phrase) => {
                        if (!phrase) return null;
                        phrase = phrase
                            .toLowerCase()
                            .replaceAll(/@|,/g, '');

                        const tag = await message.client.tags.get(phrase, message.guild);
                        if (tag) return null;

                        return phrase;
                    },
                    prompt: {
                        start: 'What would you like the tag to be called?',
                        retry: 'A tag with that name already exists. Please try again.'
                    }
                },
                {
                    id: 'content',
                    match: 'rest',
                    prompt: {
                        start: 'What would you like the content of the tag to be?'
                    }
                }
            ]
        });
    }

    public mod = true;

    public async exec(message: Message, { name, content }: { name: string; content: string }) {
        const tag = await this.client.tags.create(name, Util.cleanContent(content, message), message);
        return message.util.send(`Created a tag with the name **${tag.name}**.`);
    }
}