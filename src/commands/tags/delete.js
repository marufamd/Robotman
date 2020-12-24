const { Command } = require('discord-akairo');

module.exports = class extends Command {
    constructor() {
        super('deletetag', {
            aliases: ['delete-tag', 'tag-delete', 'tag-del', 'remove-tag', 'tag-remove', 'del-tag'],
            description: {
                info: 'Deletes a tag.',
                usage: '<tag>',
                mod: true
            },
            args: [
                {
                    id: 'tag',
                    type: 'lowercase',
                    match: 'content',
                    prompt: {
                        start: 'What tag would you like to delete?'
                    }
                }
            ],
        });
    }

    async exec(message, { tag }) {
        const deleted = await this.client.tags.delete(tag, message.guild.id);
        const response = deleted ? `Successfully deleted the tag **${tag}**` : `A tag with the name **${tag}** does not exist.`;
        return message.util.send(response);
    }
};