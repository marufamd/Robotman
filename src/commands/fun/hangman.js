const { Command } = require('discord-akairo');
const Hangman = require('../../games/Hangman');
const { randomResponse, getPrefix } = require('../../util');
const { words } = require('../../util/constants');

module.exports = class extends Command {
    constructor() {
        super('hangman', {
            aliases: ['hangman'],
            description: {
                info: 'Starts a Hangman game.',
                extended: [`Available Words: ${words.length}`]
            }
        });
    }

    async exec(message) {
        if (this.client.hangman.has(message.channel.id)) return message.util.send('There is already a Hangman game in progress in this channel.');

        const prefix = getPrefix(message);

        try {
            this.client.config.stat('hangman');
            this.client.hangman.add(message.channel.id);

            const word = randomResponse(words);
            const game = new Hangman(word);
            let timeout = false;
            let guessWin = false;

            while (game.incorrect < 7 && game.formattedWord !== game.splitWord.join(' ')) {
                const embed = this.client.util.embed()
                    .setTitle('Hangman')
                    .setDescription([
                        `To stop the game, type \`${prefix}hangmanstop\``,
                        `You can guess one letter, or try guessing the entire word.`,
                        game.board
                    ])
                    .addField('Word', game.formattedWord)
                    .setFooter('You have 1 minute to make a guess');

                if (game.incorrectGuesses) embed.addField(`Guesses (${game.incorrectGuesses.split(' ').length}/7)`, game.incorrectGuesses);

                const msg = await message.channel.send(embed);

                const filter = resp => {
                    resp.content = resp.content.toLowerCase();
                    return resp.author.id === message.author.id &&
                        /[A-Z]/gi.test(resp.content) &&
                        ((resp.content.length === 1 && !game.guesses.includes(resp.content)) || [`${message.util.parsed.prefix}hangmanstop`, word].includes(resp.content));
                };

                const guess = await message.channel.awaitMessages(filter, { max: 1, time: 60000, errors: ['time'] }).catch(() => null);

                if (!guess) {
                    timeout = true;
                    msg.delete();
                    break;
                }

                const letter = guess.first().content.toLowerCase();

                if (letter === `${message.util.parsed.prefix}hangmanstop`) {
                    this.client.hangman.delete(message.channel.id);
                    return message.channel.send('Game has been stopped.');
                } else if (letter === word) {
                    guessWin = true;
                    msg.delete();
                    break;
                }

                if (!game.splitWord.includes(letter)) game.incorrect++;

                game.guesses.push(letter);
                msg.delete();
            }

            const embed = this.client.util.embed();

            if (game.formattedWord === game.splitWord.join(' ') || guessWin) {
                embed
                    .setTitle(guessWin ? 'You guessed the word!' : 'You won!')
                    .setColor('GREEN')
                    .addField('Word', word);
            } else if (game.incorrect >= 7 || timeout) {
                embed
                    .setTitle(timeout ? 'Time\'s up!' : 'You lost!')
                    .setColor('RED')
                    .addField('The word was', word);
            }

            embed
                .setDescription(game.board)
                .setFooter(`To start another game, type ${prefix}${message.command}`);
            if (game.incorrectGuesses) embed.addField(`Guesses (${game.incorrectGuesses.split(' ').length}/7)`, game.incorrectGuesses);

            message.channel.send(embed);
        } catch (e) {
            message.util.send('An error occurred.');
            this.client.log(`Hangman Error\n${e.stack}`, 'error', { ping: true });
        } finally {
            this.client.hangman.delete(message.channel.id);
        }
    }
};