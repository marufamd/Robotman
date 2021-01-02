const { Command } = require('discord-akairo');
const { youtube } = require('../../util');

module.exports = class extends Command {
    constructor() {
        super('youtube', {
            aliases: ['youtube', 'yt'],
            description: {
                info: 'Searches YouTube and returns the first result.',
                usage: '<query>',
                examples: ['comicbooks'],
            },
            args: [
                {
                    id: 'query',
                    type: 'string',
                    match: 'content',
                    prompt: {
                        start: 'What would you like to search for?'
                    }
                }
            ],
            typing: true,
            ratelimit: 5
        });
    }

    interactionOptions = {
        name: 'youtube',
        description: 'Searches YouTube.',
        options: [
            {
                type: 'string',
                name: 'query',
                description: 'The query to search for.',
                required: true
            }
        ]
    }

    async exec(message, { query }) {
        return message.util.send(await this.main(query));
    }

    async interact(interaction) {
        return interaction.respond(await this.main(interaction.option('query')));
    }

    async main(query) {
        let result = await this.search(query);
        result = result ? `Showing top result for **${query}**\n${result.link}` : 'No results found';
        return result;
    }

    async search(query, safe = false) {
        const params = {
            part: 'snippet',
            type: 'video',
            safeSearch: safe ? 'strict' : 'none',
            q: query,
            maxResults: 1
        };

        const output = await youtube(params);
        if (!output) return null;

        return {
            link: `https://www.youtube.com/watch?v=${output.id.videoId}`,
            title: output.snippet.title,
            description: output.snippet.description
        };
    }
};