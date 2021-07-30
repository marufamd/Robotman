import { Embed } from '#util/builders';
import type { Command, CommandOptions } from '#util/commands';
import { Colors, Emojis, Hangman, Words } from '#util/constants';
import { HangmanGame } from '#util/games';
import { getUser, isInteraction, pluralize, raceResponse, randomResponse } from '#util/misc';
import { stripIndents } from 'common-tags';
import type { CommandInteraction, Message } from 'discord.js';
import { ButtonInteraction, MessageActionRow, MessageButton } from 'discord.js';

export default class implements Command {
    public options: CommandOptions = {
        description: `Starts a Hangman game.`,
        extended: `There are currently ${Words.length} available words.`,
        lock: true,
        disableEdits: true
    };

    public async exec(message: Message) {
        return this.run(message);
    }

    public async interact(interaction: CommandInteraction) {
        return this.run(interaction);
    }

    private async run(data: Message | CommandInteraction) {
        const game = new HangmanGame(randomResponse(Words));

        let loss: boolean | 'timeout' = false;

        let guessWin = false;

        while (game.incorrect < 7 && game.formattedWord !== game.splitWord.join(' ')) {
            const msg = await data.channel.send({
                embeds: [
                    this.embed(
                        game,
                        'Type a letter into the chat to make a guess.'
                    )
                ],
                components: [
                    new MessageActionRow()
                        .addComponents(
                            new MessageButton()
                                .setCustomId('guess')
                                .setStyle('PRIMARY')
                                .setLabel('Guess Word'),
                            new MessageButton()
                                .setCustomId('stop')
                                .setStyle('DANGER')
                                .setLabel('Stop')
                        )
                ]
            });

            const response = await raceResponse(msg, Hangman.WAIT_TIME, {
                messageFilter: m => m.author.id === getUser(data).id && /[A-Z]/i.test(m.content) && m.content.length === 1 && !game.guesses.includes(m.content.toLowerCase()),
                buttonFilter: i => i.user.id === getUser(data).id
            });

            if (response instanceof ButtonInteraction) {
                if (response.customId === 'stop') {
                    return response.reply('The game has been stopped');
                }

                await msg.delete();

                const m = await data.channel.send({
                    embeds: [
                        this.embed(
                            game,
                            'Type out what you think the word is. If you guess incorrectly, you will lose the game.'
                        )
                    ],
                    components: [
                        new MessageActionRow()
                            .addComponents(
                                new MessageButton()
                                    .setCustomId('cancel')
                                    .setStyle('SECONDARY')
                                    .setLabel('Cancel Guess')
                            )
                    ]
                });

                const collected = await raceResponse(m, Hangman.WAIT_TIME, {
                    messageFilter: m => m.author.id === getUser(data).id && /[A-Z]/gi.test(m.content),
                    buttonFilter: i => i.user.id === getUser(data).id
                });

                if (collected instanceof ButtonInteraction) {
                    await m.delete();

                    continue;
                }

                if (collected === null) {
                    loss = 'timeout';

                    await m.delete();

                    break;
                }

                const [final] = collected.content.split(/ +/);

                await m.delete();

                if (final !== game.word) {
                    loss = true;
                } else {
                    guessWin = true;
                }

                break;
            }

            if (response === null) {
                loss = 'timeout';

                await msg.delete();

                break;
            }

            if (!game.splitWord.includes(response.content)) {
                game.incorrect++;
            }

            game.guesses.push(response.content);

            await msg.delete();
        }

        const embed = new Embed();

        if (game.formattedWord === game.splitWord.join(' ') || guessWin) {
            embed
                .setTitle(guessWin ? 'You guessed the word!' : 'You won!')
                .setColor(Colors.GREEN)
                .addField('Word', game.word);
        } else if (game.incorrect >= 7 || loss) {
            embed
                .setTitle(loss === 'timeout' ? 'Time\'s up!' : 'You lost!')
                .setColor(Colors.RED)
                .addField('The word was', game.word);
        }

        embed
            .setDescription(game.board)
            .setFooter(`To start another game, type ${isInteraction(data) ? '/' : process.env.BOT_PREFIX}${this.options.name}`);

        if (game.incorrectGuesses.length) {
            this.addGuesses(game, embed);
        }

        return data.channel.send({ embeds: [embed] });
    }

    private embed(game: HangmanGame, text: string) {
        const embed = new Embed()
            .setTitle('Hangman')
            .setDescription(
                stripIndents`
                ${text}
                ${game.board}
                `
            )
            .addField('Word', game.formattedWord, true)
            .addField('Time', Emojis.TIMER, true)
            .setFooter(`You have ${pluralize('minute', Hangman.WAIT_TIME / 60000)} to make a guess`);

        if (game.incorrectGuesses.length) {
            this.addGuesses(game, embed);
        }

        return embed;
    }

    private addGuesses(game: HangmanGame, embed: Embed) {
        embed.addField(`Guesses (${game.incorrectGuesses.length}/7)`, game.incorrectGuesses.join(' '));
    }
}