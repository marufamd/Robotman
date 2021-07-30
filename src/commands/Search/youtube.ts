import type { Command, CommandOptions } from '#util/commands';
import { NO_RESULTS_FOUND } from '#util/constants';
import { youtube } from '#util/wrappers';
import type { ApplicationCommandOptionData, CommandInteraction, Message } from 'discord.js';

export default class implements Command {
    public options: CommandOptions = {
        aliases: ['yt'],
        description: 'Searches YouTube for a video.',
        usage: '<query>',
        example: [
            'daredevil'
        ],
        args: [
            {
                name: 'query',
                type: 'string',
                match: 'content',
                prompt: 'What would you like to search for?'
            }
        ],
        cooldown: 4,
        typing: true
    };

    public interactionOptions: ApplicationCommandOptionData[] = [
        {
            name: 'query',
            description: 'The query to search for.',
            type: 'STRING',
            required: true
        }
    ];

    public async exec(message: Message, { query }: { query: string }) {
        return message.send(await this.run(query));
    }

    public async interact(interaction: CommandInteraction, { query }: { query: string }) {
        return interaction.reply(await this.run(query));
    }

    private async run(query: string) {
        const result = await this.search(query);
        return result ? `Showing top result for **${query}**\n${result.link}` : NO_RESULTS_FOUND;
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