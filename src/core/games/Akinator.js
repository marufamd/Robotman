const { Aki } = require("aki-api");
const { title, randomResponse, Embed } = require("../../util");
const { aki: akiConfig } = require("../../util/constants");

class Akinator {
    constructor(player) {
        this.player = player;
        this.aki = new Aki("en", true);
        this.failed = new Set();
    }

    async startGame(message) {
        const aki = this.aki;
        await aki.start();

        let keepGoing = true;
        let loss = false;
        let stop = false;
        let back = false;
        let answer;

        while (keepGoing) {
            if (back) back = false;
            else await aki.step(answer).catch(async () => await aki.step(answer));

            if (!aki.answers.length || aki.currentStep >= 78) stop = true;

            const answers = await this.askQuestion(message, aki);
            answers.push("yeah", "nah", "y", "n", "yep", "nope", "b", "p", "pn", "idk", "dunno", "d", "dk", "s", "ye", "probs", "prob", "probs not", "prob not");
            const filter = res => this.isPlayer(res.author.id) && answers.includes(res.content.toLowerCase().replace("’", "'").trim());
            const response = await this.getResponse(message, filter);

            switch (response) {
                case "timeout":
                    loss = "timeout";
                    break;
                case "stop":
                case "s":
                    stop = true;
                    break;
                case "back":
                case "b":
                    back = true;
                    break;
                case "yeah":
                case "y":
                case "ye":
                case "yep":
                    answer = answers.indexOf("yes");
                    break;
                case "nah":
                case "n":
                case "nope":
                    answer = answers.indexOf("no");
                    break;
                case "p":
                case "probs":
                case "prob":
                    answer = answers.indexOf("probably");
                    break;
                case "pn":
                case "probs not":
                case "prob not":
                    answer = answers.indexOf("probably not");
                    break;
                case "idk":
                case "dunno":
                case "dk":
                case "d":
                    answer = answers.indexOf("don't know");
                    break;
                default:
                    answer = answers.indexOf(response);
            }

            if (loss === "timeout") break;
            if (back) {
                await aki.back();
                continue;
            }

            if (aki.progress >= 90 || stop) {
                const guess = await this.doGuess(message, aki);
                if (guess === "loss") {
                    loss = true;
                    message.respond("I couldn't think of anyone.");
                    break;
                }

                const newFilter = resp => this.isPlayer(resp.author.id) && ["yes", "no", "y", "n", "yeah", "nah", "ye", "yep", "nope"].includes(resp.content.toLowerCase().trim());
                const newResponse = await this.getResponse(message, newFilter);

                keepGoing = false;

                switch (newResponse) {
                    case "timeout":
                        loss = "timeout";
                        break;
                    case "yes":
                    case "yeah":
                    case "yep":
                    case "ye":
                    case "y":
                        loss = false;
                        break;
                    default:
                        if (stop) {
                            loss = true;
                            break;
                        } else {
                            message.respond("Hmmm, Should I keep going then? `Yes` | `No`");
                            const resp = await this.getResponse(message, newFilter);

                            if (["n", "nah", "no", "nope", "timeout"].includes(resp)) {
                                if (resp === "timeout") message.respond("I guess that means no then.");
                                loss = true;
                            } else {
                                keepGoing = true;
                            }
                            break;
                        }
                }
            }
        }

        const end = this.finalResponse(loss);
        message.send(end, { files: [{ attachment: "https://i.imgur.com/m3nIXvs.png", name: "aki.png" }] });
    }

    askQuestion(message, aki) {
        const answers = aki.answers.map(a => a.toLowerCase());
        if (aki.currentStep > 1) answers.push("back");
        answers.push("stop");

        const embed = new Embed(akiConfig.color)
            .setTitle(`Question #${aki.currentStep}`)
            .setDescription(`${aki.question}\n\n${answers.map(a => `\`${title(a)}\``).join(" | ")}`)
            .setThumbnail(randomResponse(akiConfig.images))
            .setFooter(`Confidence Level: ${Math.round(parseInt(aki.progress, 10))}% | You have 1 minute to answer`);

        message.embed(embed);

        return answers;
    }

    async doGuess(message, aki) {
        await aki.win();

        const guess = aki.answers.filter(g => !this.failed.has(g.id))[0];
        if (!guess) return "loss";
        this.failed.add(guess.id);

        const embed = new Embed(akiConfig.color)
            .setTitle("Guess")
            .setDescription(`Is your character **${guess.name}${guess.description ? ` (${guess.description})` : ""}**?\n\n\`Yes\` | \`No\``)
            .setThumbnail(randomResponse(akiConfig.images))
            .setImage(guess.nsfw ? null : this.replaceImage(guess.absolute_picture_path) || null)
            .setFooter(`Confidence Level: ${Math.round(guess.proba * 100)}% | You have 1 minute to answer`);

        message.embed(embed);
    }

    async getResponse(message, filter) {
        const responses = await message.channel.awaitMessages(filter, { max: 1, time: 60000, errors: ["time"] }).catch(() => null);
        if (!responses) return "timeout";
        const response = responses.first().content.toLowerCase().replace("’", "'").trim();

        return response;
    }

    finalResponse(loss) {
        const { win, lost, silent } = akiConfig.responses;
        const endMessage = loss ? (loss === "timeout" ? silent : lost) : win;

        return randomResponse(endMessage);
    }

    replaceImage(link) {
        if (!link) return null;
        const base = "https://photos.clarinea.fr/BL_25_en/600/partenaire";
        const imgur = "https://i.imgur.com";
        
        for (const [from, to] of Object.entries(akiConfig.replace)) link = link.replace(`${base}/${from}`, `${imgur}/${to}`);
        return link;
    }

    isPlayer(id) {
        return id === this.player;
    }
}

module.exports = Akinator;