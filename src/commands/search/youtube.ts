import { Command } from 'discord-akairo';
import { ApplicationCommandOptionType } from 'discord-api-types';
import type { Message } from 'discord.js';
import Interaction from '../../structures/Interaction';
import { youtube } from '../../util';

export default class extends Command {
    public constructor() {
        super('youtube', {
            aliases: ['youtube', 'yt'],
            description: {
                info: 'Searches YouTube and returns the first result.',
                usage: '<query>',
                examples: ['comicbooks']
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
            cooldown: 5e3
        });
    }

    public interactionOptions = {
        name: 'youtube',
        description: 'Searches YouTube.',
        options: [
            {
                type: ApplicationCommandOptionType.STRING,
                name: 'query',
                description: 'The query to search for.',
                required: true
            }
        ]
    };

    public async exec(message: Message, { query }: { query: string }) {
        return message.util.send(await this.main(query));
    }

    public async interact(interaction: Interaction) {
        const query = interaction.option('query') as string;
        return interaction.respond(await this.main(query));
    }

    private async main(query: string) {
        const result = await this.search(query);
        return result ? `Showing top result for **${query}**\n${result.link}` : ({ content: 'No results found.', type: 'message', ephemeral: true });
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