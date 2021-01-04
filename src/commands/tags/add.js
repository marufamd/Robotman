const { Command } = require('discord-akairo');
const { Util: { cleanContent } } = require('discord.js');

module.exports = class extends Command {
    constructor() {
        super('addtag', {
            aliases: ['add-tag', 'a-tag', 'tag-add'],
            description: {
                info: 'Adds a tag.',
                usage: '<name> <content>',
                examples: ['example 123']
            },
            args: [
                {
                    id: 'name',
                    type: 'lowercase',
                    prompt: {
                        start: 'What would you like the tag to be called?'
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

    mod = true;

    async exec(message, { name, content }) {
        name = name.replaceAll(/@|,/g, '').toLowerCase();
        if (await this.client.tags.has(name, message.guild.id)) return message.util.send(`A tag with the name **${name}** already exists.`);

        content = cleanContent(content, message);
        const attachments = message.attachments.map(a => a.proxyURL);

        this.client.tags.set(name, message.guild.id, {
            content,
            attachments,
            user: {
                id: message.author.id,
                name: message.author.username
            }
        });
        
        return message.util.send(`Created a tag with the name **${name}**.`);
    }
};