const { Command } = require('discord-akairo');

module.exports = class extends Command {
    constructor() {
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
            ],
        });
    }

    async exec(message, { tag }) {
        if (!tag) return;
        tag.increment('uses');
        const data = tag.get('data');
        return message.util.send(data.content, { files: data.attachments });
    }
};