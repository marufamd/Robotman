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

    async exec(message, { query }) {
        const result = await this.search(query);
        let response;

        if (result) response = `Showing top result for **${query}**\n${result.link}`;
        else response = 'No results found';

        return message.util.send(response);
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