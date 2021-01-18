import { Command } from 'discord-akairo';
import { ApplicationCommandOptionType } from 'discord-api-types';
import { Message } from 'discord.js';
import Interaction, { InteractionMessageOptions } from '../../structures/Interaction';
import { formatQuery } from '../../util';
import { colors } from '../../util/constants';
import RobotmanEmbed from '../../util/embed';
import request from '../../util/request';

export default class extends Command {
    public constructor() {
        super('wikia', {
            aliases: ['wikia', 'fandom'],
            description: {
                info: 'Searches a specifed wikia site.',
                usage: '<fandom> <query>',
                examples: ['marvel daredevil']
            },
            args: [
                {
                    id: 'wikia',
                    type: 'string',
                    prompt: {
                        start: 'Which wikia would you like to search in?'
                    }
                },
                {
                    id: 'query',
                    match: 'rest',
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
        name: 'wikia',
        description: 'Searches a specifed wikia site.',
        options: [
            {
                type: ApplicationCommandOptionType.STRING,
                name: 'wikia',
                description: 'The wikia to search in.',
                required: true
            },
            {
                type: ApplicationCommandOptionType.STRING,
                name: 'query',
                description: 'The query to search for.',
                required: true
            }
        ]
    };

    public async exec(message: Message, { wikia, query }: { wikia: string; query: string }) {
        return message.util.send(await this.main(wikia, query));
    }

    public async interact(interaction: Interaction) {
        const [wikia, content] = interaction.findOptions('wikia', 'query');
        return interaction.respond(await this.main(wikia, content));
    }

    private async main(wikia: string, content: string): Promise<RobotmanEmbed | InteractionMessageOptions> {
        const baseURL = `https://${wikia}.fandom.com`;

        const { body: { query } } = await request
            .get(`${baseURL}/api.php`)
            .query({
                action: 'query',
                titles: formatQuery(content),
                format: 'json',
                formatversion: 2,
                redirects: true
            });

        if (!query?.pages?.length || query.pages[0].missing) return { content: 'No results found.', type: 'message', ephemeral: true };
        const { pageid } = query.pages[0];

        const result = await this.getData(baseURL, pageid);
        if (!result) return { content: 'No results found.', type: 'message', ephemeral: true };

        const embed = this.client.util.embed()
            .setColor(colors.FANDOM)
            .setAuthor('FANDOM', 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ee/Fandom_heart-logo.svg/128px-Fandom_heart-logo.svg.png', 'https://www.fandom.com/')
            .setTitle(result.title)
            .setURL(result.url)
            .setDescription(result.description)
            .setImage(result.image);

        return embed;
    }

    private async getData(baseURL: string, id: number) {
        const res = await request
            .get(`${baseURL}/api/v1/Articles/Details`)
            .query({
                ids: id,
                abstract: 500
            });

        if (!res.ok) return null;

        const { items, basepath } = res.body;
        const { title, url, abstract, thumbnail, original_dimensions } = items[id.toString()];

        const description = abstract.split(/[0-9]\s(\b[A-Z][a-z]*\s*\b)+/g)[0].trimEnd();
        let image;
        if (original_dimensions) {
            const { width, height } = original_dimensions;
            image = this.getOriginalSize(thumbnail, width, height);
        }

        return {
            title,
            description: description.endsWith('.') ? description : `${description}...`,
            image,
            url: basepath + url
        };
    }

    private getOriginalSize(url: string, width: number, height: number) {
        return url
            .replace('width/200', `width/${width}`)
            .replace('height/200', `height/${height}`);
    }
}