import { Command } from 'discord-akairo';
import { ApplicationCommandOptionType } from 'discord-api-types';
import type { Message } from 'discord.js';
import Interaction from '../../structures/Interaction';
import { randomResponse, title } from '../../util';
import { colors, pokemon } from '../../util/constants';

export default class extends Command {
    public constructor() {
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

    public *args() {
        const first = yield { type: 'lowercase' };

        let second;
        if (first) {
            second = yield {
                type: 'lowercase',
                prompt: {
                    start: `Which Pokemon would you like to fuse **${first}** with? Respond with \`random\` to fuse it with a random Pokemon.`
                }
            };
        }

        return { first, second };
    }

    public interactionOptions = {
        name: 'fuse',
        description: 'Fuses two Pokemon together.',
        options: [
            {
                type: ApplicationCommandOptionType.STRING,
                name: 'first',
                description: 'The first Pokemon to fuse.'
            },
            {
                type: ApplicationCommandOptionType.STRING,
                name: 'second',
                description: 'The Pokemon to fuse the first with.'
            }
        ]
    };

    public exec(message: Message, { first, second }: { first: string; second: string }) {
        return message.util.send(this.main(first, second));
    }

    public interact(interaction: Interaction) {
        const [first, second] = interaction.findOptions('first', 'second');
        return interaction.respond(this.main(first, second));
    }

    private main(first: string, second: string) {
        let one: number;
        let two: number;

        if (!first) {
            [first, second] = this.getRandom(2);
            one = pokemon.indexOf(first) + 1;
            two = pokemon.indexOf(second) + 1;
        } else {
            if (first === 'random') first = pokemon[pokemon.indexOf(this.getRandom()) + 1];
            if (second === 'random' || !second) second = pokemon[pokemon.indexOf(this.getRandom()) + 1];

            [first, second] = [first, second].map(a => a
                .replaceAll('.', '')
                .replace(/nidoran-?m(ale)?/gi, 'nidoran♂️')
                .replace(/nidoran-?f(emale)?/gi, 'nidoran♀️'));

            one = pokemon.includes(first) ? pokemon.indexOf(first) + 1 : parseInt(first);
            two = pokemon.includes(second) ? pokemon.indexOf(second) + 1 : parseInt(second);

            if (pokemon[one] === null) one = this.getProper(one);
            if (pokemon[two] === null) two = this.getProper(two);

            if (!pokemon[one] || !pokemon[two]) return { content: 'Invalid Pokemon.', type: 'message', ephemeral: true };

            [first, second] = [pokemon[one - 1], pokemon[two - 1]];
        }

        const url = `https://japeal.prestocdn.net/wordpress/wp-content/themes/total/PKM/upload2/${one}X${two}X0.png`;

        const embed = this.client.util.embed()
            .setColor(colors.POKEMON)
            .setAuthor(`${title(first)} + ${title(second)}`)
            .setTitle(title(this.getPart(first) + this.getPart(second, true)))
            .setURL(url)
            .setImage(url)
            .setFooter('Pokemon Fusion Generator');

        return embed;
    }

    private getRandom(amount = 1) {
        const arr = [];
        for (let i = 0; i < amount; i++) arr.push(randomResponse(pokemon.filter(a => a !== null)));
        return arr.length === 1 ? arr[0] : arr;
    }

    private getProper(num: number) {
        for (let i = num; i < pokemon.length; i++) {
            if (pokemon[i]) {
                num = i;
                break;
            }
        }

        return num;
    }

    private getPart(str: string, last = false) {
        const round = Math.round(str.length / 2);
        return last ? str.slice(round) : str.slice(0, round);
    }
}