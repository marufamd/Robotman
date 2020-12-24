const { Command } = require('discord-akairo');
const { Util: { cleanContent } } = require('discord.js');

module.exports = class extends Command {
    constructor() {
        super('edittag', {
            aliases: ['edit-tag', 'e-tag', 'tag-edit'],
            description: {
                info: 'Edits a tag.',
                usage: '<name> <new content>',
                examples: ['example 456'],
                mod: true
            },
            args: [
                {
                    id: 'tag',
                    type: 'tag',
                    prompt: {
                        start: 'Which tag would you like to edit?',
                        retry: (_, { phrase }) => `A tag with the name **${phrase}** does not exist.`
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

    async exec(message, { tag, content }) {
        content = cleanContent(content, message);
        const name = tag.get('name');
        const attachments = message.attachments.map(a => a.proxyURL);

        this.client.tags.set(name, message.guild.id, {
            content,
            attachments,
            editor: {
                id: message.author.id,
                name: message.author.username
            }
        });
        
        return message.util.send(`Successfully edited the tag **${name}**.`);
    }
};