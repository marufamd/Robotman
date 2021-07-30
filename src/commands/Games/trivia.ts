import type { Command, CommandOptions } from '#util/commands';
import { Trivia } from '#util/constants';
import { TriviaGame } from '#util/games';
import { getUser, isOwner, raceResponse } from '#util/misc';
import { bold, codeBlock } from '@discordjs/builders';
import type { ApplicationCommandOptionData, CommandInteraction, Message } from 'discord.js';
import { ButtonInteraction, MessageActionRow, MessageButton } from 'discord.js';
import { setTimeout as wait } from 'node:timers/promises';

const {
    CATEGORIES,
    DEFAULT_AMOUNT,
    MAX_UNANSWERED,
    MAX_TIME
} = Trivia;

const keys = Object.keys(CATEGORIES);
const available = `The available categories are: ${codeBlock('css', keys.join('\n'))}`;

type Category = keyof typeof CATEGORIES;

export default class implements Command {
    public options: CommandOptions = {
        aliases: ['quiz'],
        description: 'Starts a trivia game with the specified category.',
        extended: [
            '**How it Works:**',
            'A question is asked by the bot, and players have 20 seconds to answer. Whoever answers correctly first gets a point. Whoever has the most points at the end of the game wins.',
            'The amount of questions are defaulted to 30, and can be specified at the start.',
            'To view the list of available categories type `categories` after the command.',
            'To stop a trivia game, do `triviastop`.',
            'Note: You must have started the game, or have the Manage Server permission to stop the game.'
        ],
        example: [
            'dccomics 20',
            'marvelcomics'
        ],
        args: [
            {
                name: 'category',
                type: keys,
                prompt: `What category would you like to play? ${available}`
            },
            {
                name: 'amount',
                type: 'integer',
                default: DEFAULT_AMOUNT
            }
        ],
        lock: true,
        disableEdits: true
    };

    public interactionOptions: ApplicationCommandOptionData[] = [
        {
            name: 'category',
            description: 'The category to play for the game.',
            type: 'STRING',
            choices: Object.entries(CATEGORIES).map(([value, name]) => ({ name, value })),
            required: true
        },
        {
            name: 'amount',
            description: 'The amount of questions to use for the game',
            type: 'INTEGER'
        }
    ];

    public async exec(message: Message, { category, amount }: { category: Category; amount: number }) {
        return this.run(message, category, amount);
    }

    public async interact(interaction: CommandInteraction, { category, amount }: { category: Category; amount: number }) {
        return this.run(interaction, category, amount ?? DEFAULT_AMOUNT);
    }

    private async run(data: Message | CommandInteraction, category: Category, amount: number) {
        const game = new TriviaGame();

        const categoryName = CATEGORIES[category];

        await data.reply(`Starting ${bold(categoryName)} trivia with ${amount} questions...`);

        const { questions, answers } = await game.getQuestions(keys.indexOf(category));

        if (amount > questions.length) {
            await data.channel.send(`There are not enough questions written for this length of a game. Amount will be defaulted to ${DEFAULT_AMOUNT}.`);

            amount = DEFAULT_AMOUNT;
        }

        let unanswered = 0;
        let autoStop = false;

        for (let i = 0; i < amount; i++) {
            if (unanswered >= MAX_UNANSWERED) {
                autoStop = true;
                break;
            }

            const randomQuestion = Math.floor(Math.random() * questions.length);

            await wait(1000);

            const row = new MessageActionRow()
                .addComponents(
                    new MessageButton()
                        .setCustomId('stop')
                        .setStyle('DANGER')
                        .setLabel('Stop')
                );

            const num = i + 1;

            const msg = await data.channel.send({
                content: `**${categoryName} Trivia: Question #${num}**\n\n${questions[randomQuestion]}`,
                components: [row]
            });

            const response = await raceResponse(msg, MAX_TIME, {
                messageFilter: m => answers[randomQuestion].some(ans => this.format(ans) === this.format(m.content)),
                buttonFilter: i => isOwner(i.user) || i.user.id === getUser(data).id
            });

            if (response instanceof ButtonInteraction) {
                const str = [`The game has been stopped by ${response.user}.`];

                if (game.scorelist) {
                    str.push(game.renderedScoreboard);
                }

                return response.reply(str.join('\n'));
            }

            if (response === null) {
                unanswered++;

                const correctAnswers = answers[randomQuestion];

                await data.channel.send(
                    correctAnswers.length === 1
                        ? `The correct answer was: ${bold(correctAnswers[0])}`
                        : `The correct answers were:\n${correctAnswers.map(bold).join('\n')}`
                );
            } else {
                const isCorrect = response.author.username;

                await data.channel.send(`Correct! **+1** for **${isCorrect}**!`);

                game.scores[isCorrect] = game.scores[isCorrect] ? game.scores[isCorrect] + 1 : 1;

                if (unanswered) {
                    unanswered--;
                }
            }

            if (num % 5 === 0) {
                await data.channel.send(game.renderedScoreboard);
            }

            questions.splice(randomQuestion, 1);
            answers.splice(randomQuestion, 1);
        }

        const scoreboard = game.scorelist;
        const str = [];

        if (autoStop) {
            str.push(`${MAX_UNANSWERED} questions in a row have not been answered. The game has been automatically stopped.`);
        }

        if (!scoreboard) {
            str.push('Nobody won the game.');
        } else if (scoreboard[1] && scoreboard[0][1] === scoreboard[1][1]) {
            str.push('**It\'s a tie!**');
        } else {
            str.push(`**${scoreboard[0][0]} wins!**`);
        }

        if (scoreboard) {
            str.push(game.renderedScoreboard);
        }

        return data.channel.send(str.join('\n'));
    }

    private format(str: string) {
        return str.toLowerCase().replace(/(#|:|\.|,)/gi, '');
    }
}