const Command = require("../../classes/Command");
const { Embed, title, randomResponse } = require("../../../util");
const { pokemon } = require("../../../util/constants");

module.exports = class extends Command {
    constructor(client) {
        super(client, {
            name: "fuse",
            description: "Fuses two Generation One Pokemon",
            group: "fun",
            aliases: ["pokefuse", "pokemonfuse", "fusepoke", "fusepokemon"],
            usage: "<first pokemon> <second pokemon>",
            args: { quotes: true, min: 0 },
            examples: ["bulbasaur pikachu", "squirtle charmander", "\"mr. mime\" alakazam"]
        });
    }

    run(message, args) {
        let first, second, poke1, poke2;

        if (!args.length || args[0] === "random") {
            [poke1, poke2] = this.getRandom(2);
            first = pokemon.indexOf(poke1) + 1;
            second = pokemon.indexOf(poke2) + 1;
        } else {
            if (args.length < 2) return message.usage(this.usage);

            [first, second] = args.map(a => a
                .toLowerCase()
                .replace(".", "")
                .replace(/nidoran(-)?m(ale)?/gi, "nidoran♂️")
                .replace(/nidoran(-)?f(emale)?/gi, "nidoran♀️"));

            first = pokemon.includes(first) ? pokemon.indexOf(first) + 1 : parseInt(first);
            second = pokemon.includes(second) ? pokemon.indexOf(second) + 1 : parseInt(second);

            if (pokemon[first] === null) first = this.getProper(first);
            if (pokemon[second] === null) second = this.getProper(second);

            if (!pokemon[first] || !pokemon[second]) return message.respond("Invalid pokemon.");

            [poke1, poke2] = [pokemon[first - 1], pokemon[second - 1]];
        }

        const url = `https://japeal.prestocdn.net/wordpress/wp-content/themes/total/PKM/upload2/${first}X${second}X0.png`;

        const embed = new Embed("f04037")
            .setAuthor(`${title(poke1)} + ${title(poke2)}`)
            .setTitle(title(this.getPart(poke1) + this.getPart(poke2, true)))
            .setImage(url)
            .setFooter("Pokemon Fusion Generator", "https://i.imgur.com/AnH8uO6.png");

        return message.embed(embed);
    }

    getRandom(amount = 1) {
        const arr = [];
        for (let i = 0; i < amount; i++) arr.push(randomResponse(pokemon.filter(a => a !== null)));
        return arr;
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