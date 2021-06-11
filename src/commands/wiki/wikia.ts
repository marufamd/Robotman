import { Command } from 'discord-akairo';
import { Constants, CommandInteraction, Message } from 'discord.js';
import { formatQuery } from '../../util';
import { colors } from '../../util/constants';
import request from '../../util/request';

export default class extends Command {
    public constructor() {
        super('wikia', {
            aliases: ['wikia', 'fandom'],
            description: 'Searches a specifed wikia site.',
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

    public data = {
        usage: '<fandom> <query>',
        examples: ['marvel daredevil']
    };

    public interactionOptions = {
        name: 'wikia',
        description: 'Searches a specifed wikia site.',
        options: [
            {
                type: Constants.ApplicationCommandOptionTypes.STRING,
                name: 'wikia',
                description: 'The wikia to search in.',
                required: true
            },
            {
                type: Constants.ApplicationCommandOptionTypes.STRING,
                name: 'query',
                description: 'The query to search for.',
                required: true
            }
        ]
    };

    public async exec(message: Message, { wikia, query }: { wikia: string; query: string }) {
        return message.util.send(await this.run(wikia, query));
    }

    public async interact(interaction: CommandInteraction, { wikia, query }: { wikia: string; query: string }) {
        const data = this.client.util.checkEmbed(await this.run(wikia, query));
        return interaction.reply(data);
    }

    private async run(wikia: string, content: string) {
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

        if (!query?.pages?.length || query.pages[0].missing) return { content: 'No results found.', ephemeral: true };
        const { pageid } = query.pages[0];

        const result = await this.getData(baseURL, pageid);
        if (!result) return { content: 'No results found.', ephemeral: true };

        const embed = this.client.util
            .embed()
            .setColor(colors.FANDOM)
            .setAuthor('FANDOM', 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ee/Fandom_heart-logo.svg/128px-Fandom_heart-logo.svg.png', 'https://www.fandom.com/')
            .setTitle(result.title)
            .setURL(result.url)
            .setDescription(result.description)
            .setImage(result.image);

        return { embed };
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