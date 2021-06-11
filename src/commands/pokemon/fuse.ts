import { Command } from 'discord-akairo';
import { CommandInteraction, Constants, Message } from 'discord.js';
import { imgur, randomResponse, title } from '../../util';
import { colors, pokemon } from '../../util/constants';

export default class extends Command {
    public constructor() {
        super('fuse', {
            aliases: ['fuse', 'poke-fuse', 'pokemon-fuse', 'fuse-poke', 'fuse-pokemon'],
            description: 'Fuses two Pokemon together.',
            cooldown: 3500,
            typing: true
        });
    }

    public *args(): unknown {
        const first = yield {
            type: 'lowercase'
        };

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

    public data = {
        usage: '<first pokemon> <second pokemon>',
        extended: [
            'Providing `random` as an argument will use a random Pokemon.',
            'Providing no Pokemon will fuse two random Pokemon.'
        ],
        examples: ['bulbasaur pikachu', 'squirtle charmander', '"mr. mime" alakazam']
    };

    public interactionOptions = {
        name: 'fuse',
        description: 'Fuses two Pokemon together.',
        options: [
            {
                type: Constants.ApplicationCommandOptionTypes.STRING,
                name: 'first',
                description: 'The first Pokemon to fuse.'
            },
            {
                type: Constants.ApplicationCommandOptionTypes.STRING,
                name: 'second',
                description: 'The Pokemon to fuse the first with.'
            }
        ]
    };

    public async exec(message: Message, { first, second }: { first: string; second: string }) {
        return message.util.send(await this.run(first, second));
    }

    public async interact(interaction: CommandInteraction, { first, second }: { first: string; second: string }) {
        const data = this.client.util.checkEmbed(await this.run(first, second));
        return interaction.reply(data);
    }

    private async run(first: string, second: string) {
        let one: number;
        let two: number;

        if (!first) {
            [first, second] = this.getRandom(2);
            one = pokemon.indexOf(first) + 1;
            two = pokemon.indexOf(second) + 1;
        } else {
            if (first === 'random') first = pokemon[pokemon.indexOf(this.getRandom() as string) + 1];
            if (second === 'random' || !second) second = pokemon[pokemon.indexOf(this.getRandom() as string) + 1];

            [first, second] = [first, second].map(a => a
                .replaceAll('.', '')
                .replace(/nidoran-?m(ale)?/gi, 'nidoran♂️')
                .replace(/nidoran-?f(emale)?/gi, 'nidoran♀️'));

            one = pokemon.includes(first) ? pokemon.indexOf(first) + 1 : parseInt(first);
            two = pokemon.includes(second) ? pokemon.indexOf(second) + 1 : parseInt(second);

            if (pokemon[one] === null) one = this.getProper(one);
            if (pokemon[two] === null) two = this.getProper(two);

            if (!pokemon[one] || !pokemon[two]) return { content: 'Invalid Pokemon.', ephemeral: true };

            [first, second] = [pokemon[one - 1], pokemon[two - 1]];
        }

        const url = `https://japeal.prestocdn.net/wordpress/wp-content/themes/total/PKM/upload2/${one}X${two}X0.png`;
        const image = await imgur(url).catch(() => null);

        const embed = this.client.util
            .embed()
            .setColor(colors.POKEMON)
            .setAuthor(`${title(first)} + ${title(second)}`)
            .setTitle(title(this.getPart(first) + this.getPart(second, true)))
            .setURL(image)
            .setImage(image)
            .setFooter('Pokemon Fusion Generator');

        return { embed };
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