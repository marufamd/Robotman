const { Command } = require('discord-akairo');
const { formatQuery, fetch } = require('../../util');

module.exports = class extends Command {
    constructor() {
        super('wikia', {
            aliases: ['wikia', 'fandom'],
            description: {
                info: 'Searches a specifed wikia site.',
                usage: '<fandom> <query>',
                examples: ['marvel daredevil'],
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
                    id: 'content',
                    match: 'rest',
                    prompt: {
                        start: 'What would you like to search for?'
                    }
                }
            ],
            typing: true,
            cooldown: 5
        });
    }

    interactionOptions = {
        name: 'wikia',
        description: 'Searches a specifed wikia site.',
        options: [
            {
                type: 'string',
                name: 'wikia',
                description: 'The wikia to search in.',
                required: true
            },
            {
                type: 'string',
                name: 'query',
                description: 'The query to search for.',
                required: true
            }
        ]
    }

    async exec(message, { wikia, content }) {
        return message.util.send(await this.main(wikia, content));
    }

    async interact(interaction) {
        const [wikia, content] = interaction.findOptions('wikia', 'query');
        return interaction.respond(await this.main(wikia, content));
    }

    async main(wikia, content) {
        const baseURL = `https://${wikia}.fandom.com`;

        const params = {
            action: 'query',
            titles: formatQuery(content),
            format: 'json',
            formatversion: 2,
            redirects: true
        };

        const { query } = await fetch(`${baseURL}/api.php`, params);
        if (!query?.pages?.length || query.pages[0].missing) return { content: 'No results found.', type: 'message', ephemeral: true };
        const { pageid } = query.pages[0];

        const result = await this.getData(`${baseURL}/api/v1/Articles/Details`, { ids: pageid, abstract: 500 }, pageid);
        if (!result) return { content: 'No results found.', type: 'message', ephemeral: true };

        const embed = this.client.util.embed()
            .setColor('08d7d7')
            .setTitle(result.title)
            .setURL(result.url)
            .setDescription(result.description)
            .setImage(result.image)
            .setFooter('FANDOM', 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ee/Fandom_heart-logo.svg/128px-Fandom_heart-logo.svg.png');

        return embed;
    }

    async getData(webURL, params, id) {
        const res = await fetch(webURL, params);
        if (res.ok === false) return null;

        const { items, basepath } = res;
        const { title, url, abstract, thumbnail, original_dimensions } = this.getItem(items, id);

        const description = abstract.split(/1 (Powers and Abilities|Physical Appearance|History|Biology)/)[0].trimEnd();
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

    getOriginalSize(url, width, height) {
        return url
            .replace('width/200', `width/${width}`)
            .replace('height/200', `height/${height}`);
    }

    getItem(items, id) {
        return items[id.toString()];
    }
};