import { Command } from 'discord-akairo';
import type { CollectorFilter, Message } from 'discord.js';
import Hangman from '../../structures/Hangman';
import { randomResponse, plural } from '../../util';
import { words, emojis, colors } from '../../util/constants';

const MAX_TIME = 60000;

export default class extends Command {
    public constructor() {
        super('hangman', {
            aliases: ['hangman'],
            description: {
                info: 'Starts a Hangman game.',
                extended: [`Available Words: ${words.length}`]
            },
            editable: false,
            lock: 'channel'
        });
    }

    public async exec(message: Message) {
        const prefix = this.client.util.getPrefix(message);

        const game = new Hangman(randomResponse(words));
        let loss: boolean | 'timeout' = false;
        let guessWin = false;

        while (game.incorrect < 7 && game.formattedWord !== game.splitWord.join(' ')) {
            const embed = this.embed(
                game,
                [
                    `Type a letter into the chat to make a guess.`,
                    `To try and guess the full word, type \`${prefix}guess <word>\``,
                    `To stop the game, type \`${prefix}hangmanstop\``
                ]
            );

            const msg = await message.channel.send(embed);

            const filter = (resp: Message) => {
                resp.content = resp.content.toLowerCase();
                return resp.author.id === message.author.id &&
                    /[A-Z]/gi.test(resp.content) &&
                    (
                        (resp.content.length === 1 && !game.guesses.includes(resp.content)) ||
                        `${message.util.parsed.prefix}hangmanstop` === resp.content ||
                        resp.content.startsWith(`${message.util.parsed.prefix}guess`)
                    );
            };

            const response = await this.getResponse(message, filter);

            if (!response) {
                loss = 'timeout';
                await msg.delete();
                break;
            }

            if (response === `${message.util.parsed.prefix}hangmanstop`) {
                return message.channel.send('The game has been stopped.');
            } else if (response.startsWith(`${message.util.parsed.prefix}guess`)) {
                const split = response.split(/ +/);
                let final: string;

                if (split.length < 2) {
                    const embed = this.embed(
                        game,
                        [`Type out what you think the word is. If you guess incorrectly, you will lose the game.`]
                    );
                    await message.channel.send(embed);

                    const guess = await this.getResponse(message, g => g.author.id === message.author.id);

                    if (!guess) {
                        loss = 'timeout';
                        await msg.delete();
                        break;
                    }

                    final = guess.split(/ +/)[0];
                } else {
                    final = split[1];
                }

                if (final !== game.word) {
                    loss = true;
                    break;
                }

                guessWin = true;
                break;
            }

            if (!game.splitWord.includes(response)) game.incorrect++;

            game.guesses.push(response);
            await msg.delete();
        }

        const embed = this.client.util.embed();

        if (game.formattedWord === game.splitWord.join(' ') || guessWin) {
            embed
                .setTitle(guessWin ? 'You guessed the word!' : 'You won!')
                .setColor(colors.GREEN)
                .addField('Word', game.word);
        } else if (game.incorrect >= 7 || loss) {
            embed
                .setTitle(loss === 'timeout' ? 'Time\'s up!' : 'You lost!')
                .setColor(colors.RED)
                .addField('The word was', game.word);
        }

        embed
            .setDescription(game.board)
            .setFooter(`To start another game, type ${prefix}${message.util.parsed.alias}`);

        if (game.incorrectGuesses) embed.addField(`Guesses (${game.incorrectGuesses.split(' ').length}/7)`, game.incorrectGuesses);

        return message.channel.send(embed);
    }

    private embed(game: Hangman, text: string[]) {
        text.push(game.board);

        const embed = this.client.util.embed()
            .setTitle('Hangman')
            .setDescription(text)
            .addField('Word', game.formattedWord, true)
            .setFooter(`You have ${MAX_TIME / 60000} ${plural('minute', MAX_TIME / 60000)} to make a guess`, emojis.timer);

        if (game.incorrectGuesses) embed.addField(`Guesses (${game.incorrectGuesses.split(' ').length}/7)`, game.incorrectGuesses);

        return embed;
    }

    private async getResponse(message: Message, filter: CollectorFilter) {
        const collected = await message.channel
            .awaitMessages(filter, { max: 1, time: MAX_TIME, errors: ['time'] })
            .catch(() => null);

        if (!collected) return null;

        return collected.first().content.toLowerCase();
    }
}