const Command = require("../../../classes/Command");
const Hangman = require("../../../games/Hangman");
const { randomResponse, Embed } = require("../../../../util");
const { words } = require("../../../../util/constants");

module.exports = class extends Command {
    constructor(client) {
        super(client, {
            name: "hangman",
            description: "Starts a Hangman game",
            group: "fun",
            aliases: ["hang"],
            info: [`Available Words: ${words.length}`],
            disableEdits: true
        });
    }

    async run(message) {
        if (this.client.games.hangman.has(message.channel.id)) return message.progress("a Hangman");

        try {
            this.client.util.stat("hangmanGames");
            this.client.games.hangman.add(message.channel.id);
            const word = randomResponse(words);
            const game = new Hangman(word);
            let timeout = false;
            let guessWin = false;

            while (game.incorrect < 7 && game.formattedWord !== game.splitWord.join(" ")) {
                const embed = new Embed()
                    .setTitle("Hangman")
                    .setDescription([
                        `To stop the game, type \`${message.parsedPrefix}hangmanstop\``,
                        `You can guess one letter, or try guessing the entire word.`,
                        game.board
                    ])
                    .addField("Word", game.formattedWord)
                    .setFooter("You have 1 minute to make a guess");
                if (game.incorrectGuesses) embed.addField(`Guesses (${game.incorrectGuesses.split(" ").length}/7)`, game.incorrectGuesses);

                const msg = await message.embed(embed);

                const filter = resp => {
                    resp.content = resp.content.toLowerCase();
                    return resp.author.id === message.author.id && 
                    /[A-Z]/gi.test(resp.content) &&
                    ((resp.content.length === 1 && !game.guesses.includes(resp.content)) || [`${message.prefix}hangmanstop`, word].includes(resp.content));
                };

                const guess = await message.awaitMessage(filter, 60000);

                if (!guess) {
                    timeout = true;
                    msg.delete();
                    break;
                }

                const letter = guess.content.toLowerCase();

                if (letter === `${message.prefix}hangmanstop`) {
                    this.client.games.hangman.delete(message.channel.id);
                    return message.respond("Game has been stopped.");
                } else if (letter === word) {
                    guessWin = true;
                    msg.delete();
                    break;
                }

                if (!game.splitWord.includes(letter)) game.incorrect++;

                game.guesses.push(letter);
                msg.delete();
            }

            const embed = new Embed();

            if (game.formattedWord === game.splitWord.join(" ") || guessWin) {
                embed
                    .setTitle(guessWin ? "You guessed the word!" : "You won!")
                    .setColor("GREEN")
                    .addField("Word", word);
            } else if (game.incorrect >= 7 || timeout) {
                embed
                    .setTitle(timeout ? "Time's up!" : "You lost!")
                    .setColor("RED")
                    .addField("The word was", word);
            }

            embed
                .setDescription(game.board)
                .setFooter(`To start another game, type ${message.parsedPrefix}${message.command}`);
            if (game.incorrectGuesses) embed.addField(`Guesses (${game.incorrectGuesses.split(" ").length}/7)`, game.incorrectGuesses);

            message.embed(embed);
        } catch (e) {
            message.error(e);
            this.client.log(`Hangman Error\n${e.stack}`, "error");
        } finally {
            this.client.games.hangman.delete(message.channel.id);
        }
    }
};