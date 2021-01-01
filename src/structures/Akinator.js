const { Aki } = require('aki-api');
const { title, randomResponse } = require('../util');
const { aki: akiConfig, colors } = require('../util/constants');

class Akinator {
    constructor() {
        this.aki = new Aki('en', true);
        this.failed = new Set();
        this.player = null;
    }

    async run(message) {
        this.player = message.author.id;
        const { aki } = this;
        await aki.start();

        let keepGoing = true,
            loss = false,
            stop = false,
            back = false,
            answer;

        while (keepGoing) {
            if (back) back = false;
            else await aki.step(answer).catch(async () => await aki.step(answer));

            if (!aki.answers.length || aki.currentStep >= 78) stop = true;

            const answers = await this.askQuestion(message);
            answers.push(...akiConfig.responses.all);
            const filter = resp => this.isPlayer(resp) && answers.includes(resp.content.toLowerCase().replace('’', '\''));
            const response = await this.getResponse(message, filter);

            switch (response) {
                case 'timeout':
                    loss = 'timeout';
                    break;
                case 'stop':
                case 's':
                    stop = true;
                    break;
                case 'back':
                case 'b':
                    back = true;
                    break;
                case 'yeah':
                case 'y':
                case 'ye':
                case 'yep':
                    answer = answers.indexOf('yes');
                    break;
                case 'nah':
                case 'n':
                case 'nope':
                    answer = answers.indexOf('no');
                    break;
                case 'p':
                case 'probs':
                case 'prob':
                    answer = answers.indexOf('probably');
                    break;
                case 'pn':
                case 'probs not':
                case 'prob not':
                    answer = answers.indexOf('probably not');
                    break;
                case 'idk':
                case 'dunno':
                case 'dk':
                case 'd':
                    answer = answers.indexOf('don\'t know');
                    break;
                default:
                    answer = answers.indexOf(response);
            }

            if (loss === 'timeout') break;
            if (back) {
                await aki.back();
                continue;
            }

            if (aki.progress >= 90 || stop) {
                const guess = await this.guess(message);
                if (guess === 'loss') {
                    loss = true;
                    message.channel.send('I couldn\'t think of anyone.');
                    break;
                }

                const newFilter = resp => this.isPlayer(resp) && akiConfig.responses.specific.includes(resp.content.toLowerCase());
                const newResponse = await this.getResponse(message, newFilter);

                keepGoing = false;

                switch (newResponse) {
                    case 'timeout':
                        loss = 'timeout';
                        break;
                    case 'yeah':
                    case 'yep':
                    case 'yes':
                    case 'ye':
                    case 'y':
                        loss = false;
                        break;
                    default:
                        if (stop) {
                            loss = true;
                            break;
                        } else {
                            message.channel.send('Hmmm, Should I keep going then? `Yes` | `No`');
                            const resp = await this.getResponse(message, newFilter);

                            if (['n', 'nah', 'no', 'nope', 'timeout'].includes(resp)) {
                                if (resp === 'timeout') message.channel.send('I guess that means no then.');
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
        message.channel.send(end, { files: [{ attachment: 'https://i.imgur.com/m3nIXvs.png', name: 'aki.png' }] });
    }

    askQuestion(message) {
        const answers = this.aki.answers.map(a => a.toLowerCase());
        if (this.aki.currentStep > 1) answers.push('back');
        answers.push('stop');

        const embed = message.client.util.embed()
            .setColor(colors.AKINATOR)
            .setTitle(`Question #${this.aki.currentStep}`)
            .setDescription(`${this.aki.question}\n\n${answers.map(a => `\`${title(a)}\``).join(' | ')}`)
            .setThumbnail(randomResponse(akiConfig.images))
            .setFooter(`Confidence Level: ${Math.round(parseInt(this.aki.progress, 10))}% | You have 1 minute to answer`);

        message.channel.send(embed);

        return answers;
    }

    async guess(message) {
        await this.aki.win();

        let guess = this.aki.answers.filter(g => !this.failed.has(g.id));
        if (!guess.length) return 'loss';
        guess = guess[0];
        this.failed.add(guess.id);

        const embed = message.client.util.embed()
            .setColor(colors.AKINATOR)
            .setTitle('Guess')
            .setDescription(`Is your character **${guess.name}${guess.description ? ` (${guess.description})` : ''}**?\n\n\`Yes\` | \`No\``)
            .setThumbnail(randomResponse(akiConfig.images))
            .setImage(guess.nsfw ? null : this.replaceImage(guess.absolute_picture_path) || null)
            .setFooter(`Confidence Level: ${Math.round(guess.proba * 100)}% | You have 1 minute to answer`);

        message.channel.send(embed);
    }

    async getResponse(message, filter) {
        const responses = await message.channel.awaitMessages(filter, { max: 1, time: 60000, errors: ['time'] }).catch(() => null);
        if (!responses) return 'timeout';
        const response = responses.first().content.toLowerCase().replace('’', '\'').trim();

        return response;
    }

    finalResponse(loss) {
        const { win, lost, silent } = akiConfig.responses.final;
        const endMessage = loss ? (loss === 'timeout' ? silent : lost) : win;

        return randomResponse(endMessage);
    }

    replaceImage(link) {
        if (!link) return null;
        const base = 'https://photos.clarinea.fr/BL_25_en/600/partenaire';
        const imgur = 'https://i.imgur.com';

        for (const [from, to] of Object.entries(akiConfig.replace)) link = link.replace(`${base}/${from}`, `${imgur}/${to}`);
        return link;
    }

    isPlayer(message) {
        return message.author.id === this.player;
    }
}

module.exports = Akinator;