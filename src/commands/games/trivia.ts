import { Command } from 'discord-akairo';
import type { Message } from 'discord.js';
import Trivia from '../../structures/Trivia';
import { wait } from '../../util';
import { trivia } from '../../util/constants';

const {
    categories: topics,
    DEFAULT_NUM,
    MAX_UNANSWERED,
    STOP_RESPONSE,
    SCOREBOARD_RESPONSE
} = trivia;

const list = `The available categories are:\`\`\`css\n${topics.join('\n')}\`\`\``;

export default class extends Command {
    public constructor() {
        super('trivia', {
            aliases: ['trivia', 'quiz'],
            description: 'Starts a trivia game with the specified category.',
            args: [
                {
                    id: 'category',
                    type: topics,
                    prompt: {
                        start: `What category would you like to play? ${list}`,
                        retry: `That is not a valid category. Please try again. ${list}`
                    }
                },
                {
                    id: 'amount',
                    type: 'integer',
                    default: DEFAULT_NUM
                }
            ],
            editable: false,
            lock: 'channel'
        });
    }

    public data = {
        usage: '<category> <amount of questions>',
        extended: [
            '**How it Works:**',
            'A question is asked by the bot, and players have 20 seconds to answer. Whoever answers correctly first gets a point. Whoever has the most points at the end of the game wins.',
            'The amount of questions are defaulted to 30, and can be specified at the start.',
            'To view the list of available categories type `categories` after the command.',
            'To stop a trivia game, do `triviastop`.',
            'Note: You must have started the game, or have the Manage Server permission to stop the game.'
        ],
        examples: [
            'dccomics 20',
            'marvelcomics'
        ]
    };

    public async exec(message: Message, { category, amount }: { category: string; amount: number }) {
        const game = new Trivia(message.author.id);

        await message.channel.send(`Starting \`${category}\` trivia with ${amount} questions...`);

        const { questions, answers } = await game.getQuestions(topics.indexOf(category));

        if (amount > questions.length) {
            await message.channel.send(`There are not enough questions written for this length of a game. Amount will be defaulted to ${DEFAULT_NUM}.`);
            amount = DEFAULT_NUM;
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
            await message.channel.send(`**Question #${i + 1}**\n\n${questions[randomQuestion]}`);

            const canStop = (resp: Message) => this.client.isOwner(resp.author) || resp.author.id === game.host || resp.member.permissions.has('MANAGE_GUILD');

            const filter = (resp: Message) =>
                resp.content.toLowerCase() === message.util.parsed.prefix + SCOREBOARD_RESPONSE ||
                (
                    answers[randomQuestion].some(ans => this.format(ans) === this.format(resp.content)) ||
                    (canStop(resp) && resp.content.toLowerCase() === message.util.parsed.prefix + STOP_RESPONSE)
                );

            const collected = await message.channel
                .awaitMessages({
                    filter,
                    max: 1,
                    time: 20000,
                    errors: ['time']
                })
                .catch(() => null);

            if (!collected) {
                unanswered++;
                await message.channel.send(`The correct answer was **${answers[randomQuestion][0]}**`);
                continue;
            }

            const response = collected.first();

            if (response.content.toLowerCase() === `${message.util.parsed.prefix}${STOP_RESPONSE}`) {
                const str = ['Game has been stopped.'];
                if (game.scorelist) str.push(game.renderedScoreboard);

                return message.channel.send(str.join('\n'));
            }

            const winner = response.author.username;
            await message.channel.send(`Correct! **+1** for **${winner}**!`);

            game.scores[winner] = game.scores[winner] ? game.scores[winner] + 1 : 1;
            if (unanswered) unanswered--;

            questions.splice(randomQuestion, 1);
            answers.splice(randomQuestion, 1);
        }

        const scoreboard = game.scorelist;
        const str = [];

        if (autoStop) str.push(`${MAX_UNANSWERED} questions in a row have not been answered. The game has been automatically stopped.`);

        let toPush: string;

        if (!scoreboard) {
            toPush = 'Nobody won the game.';
        } else if (scoreboard[1] && scoreboard[0][1] === scoreboard[1][1]) {
            toPush = '**It\'s a tie!**';
        } else {
            toPush = `**${scoreboard[0][0]} wins!**`;
        }

        str.push(toPush);
        if (scoreboard) str.push(game.renderedScoreboard);

        return message.channel.send(str.join('\n'));
    }

    private format(str: string) {
        return str.toLowerCase().replace(/(#|:|\.|,)/gi, '');
    }
}