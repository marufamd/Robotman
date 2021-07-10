import { Command } from 'discord-akairo';
import { Constants, CommandInteraction, Message } from 'discord.js';
import { youtube } from '../../util';

export default class extends Command {
    public constructor() {
        super('youtube', {
            aliases: ['youtube', 'yt'],
            description: 'Searches YouTube and returns the first result.',
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
            cooldown: 5e3
        });
    }

    public interactionOptions = {
        name: 'youtube',
        description: 'Searches YouTube.',
        options: [
            {
                type: Constants.ApplicationCommandOptionTypes.STRING,
                name: 'query',
                description: 'The query to search for.',
                required: true
            }
        ]
    };

    public async exec(message: Message, { query }: { query: string }) {
        return message.util.send(await this.run(query));
    }

    public async interact(interaction: CommandInteraction, { query }: { query: string }) {
        return interaction.reply(await this.run(query));
    }

    private async run(query: string) {
        const result = await this.search(query);
        return result ? `Showing top result for **${query}**\n${result.link}` : ({ content: 'No results found.', ephemeral: true });
    }

    private async search(query: string, safe = false) {
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
}