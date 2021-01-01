const { Command } = require('discord-akairo');
const { randomResponse, title } = require('../../util');
const { pokemon, colors } = require('../../util/constants');

module.exports = class extends Command {
    constructor() {
        super('fuse', {
            aliases: ['fuse', 'poke-fuse', 'pokemon-fuse', 'fuse-poke', 'fuse-pokemon'],
            description: {
                info: 'Fuses two Pokemon together.',
                usage: '<first pokemon> <second pokemon>',
                extended: [
                    'Providing `random` as an argument will use a random Pokemon.',
                    'Providing no Pokemon will fuse two random Pokemon.'
                ],
                examples: ['bulbasaur pikachu', 'squirtle charmander', '"mr. mime" alakazam']
            }
        });
    }

    *args() {
        const first = yield { type: 'lowercase' };
        let second;
        if (first) second = yield {
            type: 'lowercase',
            prompt: {
                start: `Which Pokemon would you like to fuse **${first}** with? Respond with \`random\` to fuse it with a random Pokemon.`
            }
        };

        return { first, second };
    }

    interactionOptions = {
        name: 'fuse',
        description: 'Fuses two Pokemon together.',
        options: [
            {
                type: 'string',
                name: 'first',
                description: 'The first Pokemon to fuse.'
            },
            {
                type: 'string',
                name: 'second',
                description: 'The Pokemon to fuse the first with.'
            },
        ]
    }

    async exec(message, { first, second }) {
        return message.util.send(this.main(first, second));
    }

    interact(interaction) {
        const [first, second] = interaction.findOptions('first', 'second');
        return interaction.respond(this.main(first, second));
    }

    main(first, second) {
        let poke1, poke2;

        if (!first) {
            [poke1, poke2] = this.getRandom(2);
            first = pokemon.indexOf(poke1) + 1;
            second = pokemon.indexOf(poke2) + 1;
        } else {
            if (first === 'random') {
                poke1 = this.getRandom();
                first = pokemon[pokemon.indexOf(poke1) + 1];
            }

            if (second === 'random' || !second) {
                poke2 = this.getRandom();
                second = pokemon[pokemon.indexOf(poke2) + 1];
            }

            [first, second] = [first, second].map(a => a
                .replace('.', '')
                .replace(/nidoran-?m(ale)?/gi, 'nidoran♂️')
                .replace(/nidoran-?f(emale)?/gi, 'nidoran♀️'));

            first = pokemon.includes(first) ? pokemon.indexOf(first) + 1 : parseInt(first);
            second = pokemon.includes(second) ? pokemon.indexOf(second) + 1 : parseInt(second);

            if (pokemon[first] === null) first = this.getProper(first);
            if (pokemon[second] === null) second = this.getProper(second);

            if (!pokemon[first] || !pokemon[second]) return 'Invalid Pokemon.';

            [poke1, poke2] = [pokemon[first - 1], pokemon[second - 1]];
        }

        const url = `https://japeal.prestocdn.net/wordpress/wp-content/themes/total/PKM/upload2/${first}X${second}X0.png`;

        const embed = this.client.util.embed()
            .setColor(colors.POKEMON)
            .setAuthor(`${title(poke1)} + ${title(poke2)}`)
            .setTitle(title(this.getPart(poke1) + this.getPart(poke2, true)))
            .setImage(url)
            .setFooter('Pokemon Fusion Generator');

        return embed;
    }

    getRandom(amount = 1) {
        const arr = [];
        for (let i = 0; i < amount; i++) arr.push(randomResponse(pokemon.filter(a => a !== null)));
        return arr.length === 1 ? arr[0] : arr;
    }

    getProper(num) {
        for (let i = num; i < pokemon.length; i++) {
            if (pokemon[i]) {
                num = i;
                break;
            }
        }

        return num;
    }

    getPart(str, last = false) {
        const round = Math.round(str.length / 2);
        return last ? str.slice(round) : str.slice(0, round);
    }
};