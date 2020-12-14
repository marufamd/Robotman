const Command = require("../../../classes/Command");
const Trivia = require("../../../games/Trivia");
const { wait } = require("../../../../util");
const { trivia: { categories: topics, DEFAULT_NUM, MAX_UNANSWERED } } = require("../../../../util/constants");

module.exports = class extends Command {
    constructor(client) {
        super(client, {
            name: "trivia",
            description: "Starts a trivia game with the provided category",
            group: "fun",
            aliases: ["quiz", "triv"],
            usage: "<category> <amount of questions>",
            examples: [
                "dccomics 20",
                "marvelcomics"
            ],
            info: [
                "**How it Works:** A question is asked by the bot, and players have 20 seconds to answer. Whoever answers correctly first gets a point. Whoever has the most points at the end of the game wins.",
                "The amount of questions are defaulted to 30, and can be specified at the start.",
                "To view the list of available categories type `categories` after the command.",
                "To stop a trivia game, do `triviastop`.",
                "Note: You must have started the game, or have the Manage Server permission to stop the game."
            ],
            disableEdits: true
        });
    }

    async run(message, args) {
        let game = this.client.games.trivia.get(message.channel.id) || null;

        let categories = topics.join("\n");
        categories = ["```css", categories, "```"].join("\n");

        const available = [`Available Categories:`, categories];

        let param = args.length ? args[0].toLowerCase() : null;
        if (!args.length || ["topics", "categories"].includes(param)) {
            if (["topics", "categories"].includes(param)) return message.respond(available);

            available[0] = "Please type out the category you would like to play. The list of categories are below:";
            await message.respond(available);

            const filter = resp => resp.author.id === message.author.id && topics.includes(resp.content.toLowerCase());
            const response = await message.awaitMessage(filter);
            if (!response) return message.channel.send("You took too long. Game has been cancelled.");

            param = response.content;
        }

        if (game && ["scores", "scoreboard"].includes(param)) {
            const str = game.scorelist ? game.makeScoreboard(game.scorelist) : "There is no scoreboard.";
            return message.respond(str);
        }

        if (game) return message.progress("a trivia");
        if (!topics.includes(param)) return message.respond([
            `That is not a valid category. You can see the list of categories below:`,
            categories
        ]);

        try {
            const num = args[1];
            let amount = num && !isNaN(parseInt(num)) ? parseInt(num) : DEFAULT_NUM;

            game = new Trivia(message.author.id);
            this.client.util.stat("triviaGames");
            this.client.games.trivia.set(message.channel.id, game);
            message.respond(`Starting \`${param}\` trivia with ${amount} questions...`);

            const { questions, answers } = await game.getQuestions(topics.indexOf(param));

            if (amount > questions.length) {
                message.respond(`There are not enough questions written for this length of a game. Amount will be defaulted to ${DEFAULT_NUM}.`);
                amount = DEFAULT_NUM;
            }

            const stopResponses = ["triviastop", "stoptrivia", "quizstop"];

            let unanswered = 0;
            let autoStop = false;

            for (let i = 0; i < amount; i++) {
                if (unanswered >= MAX_UNANSWERED) {
                    autoStop = true;
                    break;
                }
                
                const randomQuestion = Math.floor(Math.random() * questions.length);
                await wait(1000);
                message.respond(`**Question #${i + 1}**\n\n${questions[randomQuestion]}`);

                const canStop = resp => resp.author.owner || resp.author.id === game.host || resp.member.permissions.has("MANAGE_GUILD");

                const filter = resp => {
                    return (answers[randomQuestion].some(ans => this.format(ans) === this.format(resp.content)) || 
                    (canStop(resp) && stopResponses.some(s => resp.content.toLowerCase() === message.prefix + s)));
                };

                const correct = await message.channel.awaitMessages(filter, { max: 1, time: 20000, errors: ["time"] }).catch(() => null);

                if (!correct) {
                    unanswered++;
                    message.respond(`The correct answer was **${answers[randomQuestion][0]}**`);
                    continue;
                }

                if (stopResponses.some(a => correct.first().content.toLowerCase() === message.prefix + a)) {
                    const scoreboard = game.scorelist;

                    const str = ["Game has been stopped."];
                    if (scoreboard) str.push(game.makeScoreboard(scoreboard));

                    message.respond(str);
                    return this.client.games.trivia.delete(message.channel.id);
                }

                const winner = correct.first().author.username;
                message.respond(`Correct! **+1** for **${winner}**!`);

                game.scores[winner] = game.scores[winner] ? game.scores[winner] + 1 : 1;
                if (unanswered) unanswered--;

                questions.splice(randomQuestion, 1);
                answers.splice(randomQuestion, 1);
            }

            const scoreboard = game.scorelist;
            const str = [];

            if (autoStop) str.push(`${MAX_UNANSWERED} questions in a row have not been answered. The game has been automatically stopped.`);

            if (!scoreboard) {
                str.push("Nobody won the game.");
            } else if (scoreboard[1] && scoreboard[0][1] === scoreboard[1][1]) {
                str.push(["**It's a tie!**"]);
            } else {
                str.push([`**${scoreboard[0][0]} wins!**`]);
            }

            if (scoreboard) str.push(game.makeScoreboard(scoreboard));

            message.respond(str);
        } catch (e) {
            message.error(e);
            this.client.log(`Trivia Error:\n${e.stack}`, "error");
        } finally {
            this.client.games.trivia.delete(message.channel.id);
        }
    }

    format(str) {
        return str.toLowerCase().replace(/(#|:|\.|,)/gi, "");
    }
};