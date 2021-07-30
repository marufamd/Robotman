import { Embed } from '#util/builders';
import type { Command, CommandOptions } from '#util/commands';
import { Colors, Links, NO_RESULTS_FOUND } from '#util/constants';
import { formatQuery, getWikiParams, trim } from '#util/misc';
import { request } from '#util/request';
import { ApplicationCommandOptionData, CommandInteraction, Message } from 'discord.js';

export default class implements Command {
    public options: CommandOptions = {
        aliases: ['bulbapedia', 'poke'],
        description: 'Searches Bulbapedia for a Pokemon.',
        usage: '<pokemon>',
        example: [
            'pikachu',
            'charmander',
            'greninja'
        ],
        args: [],
        cooldown: 4,
        typing: true
    };

    public interactionOptions: ApplicationCommandOptionData[] = [
        {
            name: 'query',
            description: 'The Pokemon to search for.',
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

    private async run(pokemon: string) {
        let query = formatQuery(pokemon).replaceAll(/(m(r(s|)|s)|jr)/gi, `$&.`);

        const num = parseInt(pokemon.replaceAll('#', ''));

        if (!isNaN(num)) {
            const isDex = await this.getDexNum(num);
            if (isDex) query = isDex;
        }

        const poke = await this.search(query);
        if (!poke) return NO_RESULTS_FOUND;

        const embed = new Embed()
            .setColor(Colors.BULBAPEDIA)
            .setAuthor(
                'Bulbapedia',
                'https://cdn.bulbagarden.net/upload/thumb/d/d4/Bulbapedia_bulb.png/100px-Bulbapedia_bulb.png',
                `${Links.BULBAPEDIA}/wiki/Main_Page`
            )
            .setTitle(poke.title)
            .setURL(poke.link)
            .setDescription(poke.description);

        if (poke.image) embed.setImage(poke.image);

        return { embeds: [embed] };
    }

    private async search(query: string) {
        const { body } = await request
            .get(`${Links.BULBAPEDIA}/w/api.php`)
            .query(getWikiParams(query));

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
        return `${Links.BULBAPEDIA}/wiki/${encodeURIComponent(str.replaceAll(' ', '_'))}`;
    }
}