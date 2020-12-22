const { Command } = require('discord-akairo');
const { trim, formatQuery, fetch } = require('../../util');

module.exports = class extends Command {
    constructor() {
        super('pokemon', {
            aliases: ['pokemon', 'poke', 'bulbapedia'],
            description: {
                info: 'Searches Bulbapedia for a Pokemon.',
                usage: '<query>',
                examples: ['charmander'],
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
            typing: true
        });
    }

    async exec(message, { pokemon }) {
        let query = formatQuery(pokemon).replaceAll(/(m(r(s|)|s)|jr)/gi, `$&.`);

        const num = parseInt(pokemon.split(/ +/)[0].replaceAll('#', ''));
        if (num) {
            const isDex = await this.getDexNum(num);
            if (isDex) query = isDex;
        }

        const poke = await this.search(query);
        if (!poke) return message.util.send('No results found.');

        const embed = this.client.util.embed()
            .setColor('a1cf31')
            .setTitle(poke.title)
            .setURL(poke.link)
            .setDescription(poke.description)
            .setFooter('Bulbapedia', 'https://cdn.bulbagarden.net/upload/thumb/d/d4/Bulbapedia_bulb.png/100px-Bulbapedia_bulb.png');

        if (poke.image) embed.setImage(poke.image);

        return message.util.send(embed);
    }

    async search(query) {
        const params = {
            action: 'query',
            titles: query,
            prop: 'extracts|pageimages|links',
            format: 'json',
            formatversion: 2,
            exintro: true,
            redirects: true,
            explaintext: true,
            pithumbsize: 1000,
        };

        const res = await fetch('https://bulbapedia.bulbagarden.net/w/api.php', params);
        const poke = res.query.pages[0];
        if (poke.missing) return null;

        const main = poke.title;
        const dexNum = poke.pageimage ? poke.pageimage.slice(0, 3) : null;

        const title = `${(dexNum && parseInt(dexNum)) ? `#${dexNum} - ` : ''}${main}`;
        const link = this.getLink(main);
        let description = trim(poke.extract.split('\n\n')[0].trimEnd(), 2048);
        if (/(several\s)?refer(rals)?/gi.test(description)) {
            const links = poke.links.map(l => `[${l.title}](${this.getLink(l.title)})`).join('\n');
            description += `\n${links}`;
        }
        const image = poke.thumbnail ? poke.thumbnail.source : null;

        return { title, link, description, image };
    }

    async getDexNum(num) {
        let res = await fetch(`https://pokeapi.co/api/v2/pokemon/${num}`);

        if (res.ok) {
            res = await res.json();
            let final;

            const odd = ['ho-oh', 'kommo-o', 'hakamo-o', 'jangmo-o', 'porygon-z'];

            final = res.name.replaceAll(/(mr|ms|jr|mrs)/gi, `$&.`);
            if (!odd.includes(final.toLowerCase())) final = final.replaceAll('-', ' ');

            return final;
        }

        return null;
    }

    getLink(str) {
        return `https://bulbapedia.bulbagarden.net/wiki/${encodeURIComponent(str.replaceAll(' ', '_'))}`;
    }
};