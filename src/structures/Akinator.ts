import { Aki, Guess } from 'aki-api';
import { Message, CollectorFilter } from 'discord.js';
import { title, randomResponse } from '../util';
import { aki as akiConfig, colors, emojis } from '../util/constants';

export default class Akinator {
    private readonly aki: Aki;
    private readonly failed: Set<`${number}`>;
    private player: string;

    public constructor() {
        this.aki = new Aki('en', true);
        this.failed = new Set();
        this.player = null;
    }

    public async run(message: Message) {
        this.player = message.author.id;
        const { aki } = this;
        await aki.start();

        let keepGoing = true;
        let loss: boolean | string = false;
        let stop = false;
        let back = false;
        let answer: number;

        while (keepGoing) {
            if (back) {
                back = false;
            } else {
                await aki.step(answer).catch(() => aki.step(answer));
            }

            if (!aki.answers.length || aki.currentStep >= 78) stop = true;

            const answers = await this.question(message);
            answers.push(...akiConfig.responses.all);
            const filter = (resp: Message) => this.isPlayer(resp) && answers.includes(resp.content.toLowerCase().replaceAll('’', '\''));
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
                case 'yep':
                case 'ye':
                case 'y':
                    answer = answers.indexOf('yes');
                    break;
                case 'nope':
                case 'nah':
                case 'n':
                    answer = answers.indexOf('no');
                    break;
                case 'probs':
                case 'prob':
                case 'p':
                    answer = answers.indexOf('probably');
                    break;
                case 'probs not':
                case 'prob not':
                case 'pn':
                    answer = answers.indexOf('probably not');
                    break;
                case 'dont know':
                case 'dunno':
                case 'idk':
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
                    void message.channel.send('I couldn\'t think of anyone.');
                    break;
                }

                const newFilter = (resp: Message) => this.isPlayer(resp) && akiConfig.responses.specific.includes(resp.content.toLowerCase());
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
                            void message.channel.send('Hmmm, Should I keep going then? `Yes` | `No`');
                            const resp = await this.getResponse(message, newFilter);

                            if (['n', 'nah', 'no', 'nope', 'timeout'].includes(resp)) {
                                if (resp === 'timeout') void message.channel.send('I guess that means no then.');
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
        void message.channel.send(end, { files: [{ attachment: 'https://i.imgur.com/m3nIXvs.png', name: 'aki.png' }] });
    }

    private question(message: Message) {
        const answers = (this.aki.answers as string[]).map(a => a.toLowerCase());
        if (this.aki.currentStep > 1) answers.push('back');
        answers.push('stop');

        const embed = message.client.util.embed()
            .setColor(colors.AKINATOR)
            .setTitle(`Question #${this.aki.currentStep}`)
            .setDescription(`${this.aki.question}\n\n${answers.map(a => `\`${title(a)}\``).join(' | ')}`)
            .setThumbnail(randomResponse(akiConfig.images))
            .setFooter(`Confidence Level: ${Math.round(parseInt(this.aki.progress as `${number}`, 10))}% | You have 1 minute to answer`, emojis.timer);

        void message.channel.send(embed);

        return answers;
    }

    private async guess(message: Message) {
        await this.aki.win();

        const guesses = (this.aki.answers as Guess[]).filter(g => !this.failed.has(g.id));
        if (!guesses.length) return 'loss';
        const [guess] = guesses;
        this.failed.add(guess.id);

        const embed = message.client.util.embed()
            .setColor(colors.AKINATOR)
            .setTitle('Guess')
            .setDescription(`Is your character **${guess.name}${guess.description ? ` (${guess.description})` : ''}**?\n\n\`Yes\` | \`No\``)
            .setThumbnail(randomResponse(akiConfig.images))
            .setImage(guess.nsfw ? null : this.replaceImage(guess.absolute_picture_path) || null)
            .setFooter(`Confidence Level: ${Math.round(guess.proba * 100)}% | You have 1 minute to answer`, emojis.timer);

        void message.channel.send(embed);
    }

    private async getResponse(message: Message, filter: CollectorFilter) {
        const responses = await message.channel.awaitMessages(filter, { max: 1, time: 60000, errors: ['time'] }).catch(() => null);
        if (!responses) return 'timeout';
        const response = responses.first().content.toLowerCase().replace('’', '\'').trim();

        return response;
    }

    private finalResponse(loss: boolean | string) {
        const { win, lost, silent } = akiConfig.responses.final;
        const endMessage = loss ? (loss === 'timeout' ? silent : lost) : win;

        return randomResponse(endMessage);
    }

    private replaceImage(link: string) {
        const base = 'https://photos.clarinea.fr/BL_25_en/600/partenaire';
        const imgur = 'https://i.imgur.com';

        for (const [from, to] of Object.entries(akiConfig.replace)) link = link.replace(`${base}/${from}`, `${imgur}/${to}`);
        return link;
    }

    private isPlayer(message: Message) {
        return message.author.id === this.player;
    }
}