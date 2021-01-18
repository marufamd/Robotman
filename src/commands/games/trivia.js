const { Command } = require('discord-akairo');
const Trivia = require('../../structures/Trivia');
const { wait } = require('../../util');
const { trivia: { categories: topics, DEFAULT_NUM, MAX_UNANSWERED, STOP_RESPONSE, SCOREBOARD_RESPONSE } } = require('../../util/constants');
const list = `The available categories are:\`\`\`css\n${topics.join('\n')}\`\`\``;

module.exports = class extends Command {
    constructor() {
        super('trivia', {
            aliases: ['trivia'],
            description: {
                info: 'Starts a trivia game with the specified category.',
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
                ],
            },
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
                    type: 'integer'
                }
            ],
            editable: false
        });
    }

    async exec(message, { category, amount }) {
        if (this.client.trivia.has(message.channel.id)) return message.util.send('There is already a game of trivia in progress in this channel.');

        try {
            amount = amount == null ? DEFAULT_NUM : amount;
            const game = new Trivia(message.author.id);

            this.client.config.stat('trivia');
            this.client.trivia.add(message.channel.id);

            message.channel.send(`Starting \`${category}\` trivia with ${amount} questions...`);

            const { questions, answers } = await game.getQuestions(topics.indexOf(category));

            if (amount > questions.length) {
                message.channel.send(`There are not enough questions written for this length of a game. Amount will be defaulted to ${DEFAULT_NUM}.`);
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
                message.channel.send(`**Question #${i + 1}**\n\n${questions[randomQuestion]}`);

                const canStop = resp => resp.author.owner || resp.author.id === game.host || resp.member.permissions.has('MANAGE_GUILD');

                const filter = resp => {
                    return (answers[randomQuestion].some(ans => this.format(ans) === this.format(resp.content)) ||
                        (canStop(resp) && resp.content.toLowerCase() === message.util.parsed.prefix + STOP_RESPONSE)) ||
                        resp.content.toLowerCase() === message.util.parsed.prefix + SCOREBOARD_RESPONSE;
                };

                const correct = await message.channel.awaitMessages(filter, { max: 1, time: 20000, errors: ['time'] }).catch(() => null);

                if (!correct) {
                    unanswered++;
                    message.channel.send(`The correct answer was **${answers[randomQuestion][0]}**`);
                    continue;
                }

                if (correct.first().content.toLowerCase() === message.util.parsed.prefix + STOP_RESPONSE) {
                    const scoreboard = game.scorelist;

                    const str = ['Game has been stopped.'];
                    if (scoreboard) str.push(game.makeScoreboard(scoreboard));

                    message.channel.send(str);
                    return this.client.trivia.delete(message.channel.id);
                }

                const winner = correct.first().author.username;
                message.channel.send(`Correct! **+1** for **${winner}**!`);

                game.scores[winner] = game.scores[winner] ? game.scores[winner] + 1 : 1;
                if (unanswered) unanswered--;

                questions.splice(randomQuestion, 1);
                answers.splice(randomQuestion, 1);
            }

            const scoreboard = game.scorelist;
            const str = [];

            if (autoStop) str.push(`${MAX_UNANSWERED} questions in a row have not been answered. The game has been automatically stopped.`);

            let toPush;

            if (!scoreboard) toPush = 'Nobody won the game.';
            else if (scoreboard[1] && scoreboard[0][1] === scoreboard[1][1]) toPush = '**It\'s a tie!**';
            else toPush = `**${scoreboard[0][0]} wins!**`;

            str.push(toPush);
            if (scoreboard) str.push(game.makeScoreboard(scoreboard));

            message.channel.send(str);
        } catch (e) {
            message.channel.send('An error occurred.');
            this.client.log(`Trivia Error:\n${e.stack}`, 'error', { ping: true });
        } finally {
            this.client.trivia.delete(message.channel.id);
        }
    }

    format(str) {
        return str.toLowerCase().replace(/(#|:|\.|,)/gi, '');
    }
};