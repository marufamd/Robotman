import { Command } from 'discord-akairo';
import { ApplicationCommandOptionType } from 'discord-api-types';
import { Message } from 'discord.js';
import Interaction from '../../structures/Interaction';
import { formatQuery, trim } from '../../util';
import { colors, wikiParams } from '../../util/constants';
import request from '../../util/request';

const BASE_URL = 'https://bulbapedia.bulbagarden.net';

export default class extends Command {
    public constructor() {
        super('pokemon', {
            aliases: ['pokemon', 'bulbapedia', 'poke'],
            description: {
                info: 'Searches Bulbapedia for a Pokemon.',
                usage: '<query>',
                examples: ['charmander']
            },
            args: [
                {
                    id: 'pokemon',
                    type: 'string',
                    match: 'content',
                    prompt: {
                        start: 'What Pokemon would you like to search for?'
                    }
                }
            ],
            cooldown: 4e3,
            typing: true
        });
    }

    public interactionOptions = {
        name: 'pokemon',
        description: 'Searches Bulbapedia for a Pokemon.',
        options: [
            {
                type: ApplicationCommandOptionType.STRING,
                name: 'query',
                description: 'The Pokemon to search for.',
                required: true
            }
        ]
    };

    public async exec(message: Message, { pokemon }: { pokemon: string }) {
        return message.util.send(await this.main(pokemon));
    }

    public async interact(interaction: Interaction) {
        const query = interaction.option('query') as string;
        return interaction.respond(await this.main(query));
    }

    private async main(pokemon: string) {
        let query = formatQuery(pokemon).replaceAll(/(m(r(s|)|s)|jr)/gi, `$&.`);

        const num = parseInt(pokemon.replaceAll('#', ''));
        if (!isNaN(num)) {
            const isDex = await this.getDexNum(num);
            if (isDex) query = isDex;
        }

        const poke = await this.search(query);
        if (!poke) return { content: 'No results found.', type: 'message', ephemeral: true };

        const embed = this.client.util.embed()
            .setColor(colors.BULBAPEDIA)
            .setAuthor('Bulbapedia', 'https://cdn.bulbagarden.net/upload/thumb/d/d4/Bulbapedia_bulb.png/100px-Bulbapedia_bulb.png', `${BASE_URL}/wiki/Main_Page`)
            .setTitle(poke.title)
            .setURL(poke.link)
            .setDescription(poke.description);

        if (poke.image) embed.setImage(poke.image);

        return embed;
    }

    private async search(query: string) {
        const { body } = await request
            .get(`${BASE_URL}/w/api.php`)
            .query(wikiParams(query));

        const poke = body.query.pages[0];
        if (poke.missing) return null;

        const main = poke.title;
        const dexNum = poke.pageimage ? poke.pageimage.slice(0, 3) : null;

        const title = `${(dexNum && !isNaN(parseInt(dexNum))) ? `#${dexNum} - ` : ''}${main}`;
        const link = this.getLink(main);
        let description = trim(poke.extract.split('\n\n')[0].trimEnd(), 2048);

        if (/(several\s)?refer(rals)?/gi.test(description)) {
            const links = poke.links.map((l: { title: string }) => `[${l.title}](${this.getLink(l.title)})`).join('\n');
            description += `\n${links}`;
        }

        const image = poke.thumbnail ? poke.thumbnail.source : null;

        return { title, link, description, image };
    }

    private async getDexNum(num: number) {
        let res = await request.get(`https://pokeapi.co/api/v2/pokemon/${num}`).catch(() => null);

        if (res) {
            res = res.body;
            const odd = ['ho-oh', 'kommo-o', 'hakamo-o', 'jangmo-o', 'porygon-z'];

            let final = res.name.replaceAll(/(mr|ms|jr|mrs)/gi, `$&.`);
            if (!odd.includes(final.toLowerCase())) final = final.replaceAll('-', ' ');

            return final as string;
        }

        return null;
    }

    private getLink(str: string) {
        return `${BASE_URL}/wiki/${encodeURIComponent(str.replaceAll(' ', '_'))}`;
    }
}