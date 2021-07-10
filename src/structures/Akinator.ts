import { Aki, Guess } from 'aki-api';
import {
    Message,
    MessageActionRow,
    MessageButton,
    MessageComponentInteraction,
    MessageEmbed,
    MessageEditOptions
} from 'discord.js';
import { disableComponents, randomResponse } from '../util';
import { aki as akiConfig, colors, emojis } from '../util/constants';

export default class Akinator {
    private readonly aki = new Aki('en', true);
    private readonly failed = new Set<`${number}`>();
    private player: string = null;

    public async run(message: Message) {
        this.player = message.author.id;
        const { aki } = this;

        let msg = await message.channel.send('Starting...');

        await aki.start();

        let activeGame = true;
        let stop = false;
        let back = false;

        let answer: number;
        let status: 'win' | 'loss' | 'timeout' = 'win';

        let response: MessageComponentInteraction;
        const filter = (i: MessageComponentInteraction) => i.user.id === this.player;

        while (activeGame) {
            if (back) {
                back = false;
            } else {
                await aki.step(answer).catch(() => aki.step(answer));
            }

            if (!aki.answers.length || aki.currentStep >= 78) stop = true;

            const embed = this.embed()
                .setAuthor(`Question #${aki.currentStep}`)
                .setTitle(aki.question)
                .setFooter(`Confidence Level: ${Math.round(parseInt(this.aki.progress as `${number}`, 10))}% | You have 1 minute to answer`);

            const options: MessageEditOptions = {
                content: null,
                embeds: [embed],
                components: this.generateButtons()
            };

            if (response) {
                await response.editReply(options);
                msg = response.message as Message;
            } else {
                msg = await msg.edit(options);
            }

            response = await msg.awaitMessageComponent({ filter, time: 60000 }).catch(() => null);

            if (!response) {
                status = 'timeout';
                break;
            }

            await response.update({
                content: 'Processing...',
                embeds: [],
                components: this.generateButtons(true)
            });

            switch (response.customId) {
                case 'Stop':
                    stop = true;
                    break;
                case 'Back':
                    back = true;
                    await aki.back();
                    continue;
                default:
                    answer = (this.aki.answers as string[]).indexOf(response.customId);
            }

            if (aki.progress >= 90 || stop) {
                await this.aki.win();

                const guesses = (this.aki.answers as Guess[]).filter(g => !this.failed.has(g.id));

                if (!guesses.length) {
                    status = 'loss';
                    break;
                }

                activeGame = false;

                const [guess] = guesses;
                this.failed.add(guess.id);

                const embed = this.embed()
                    .setTitle(`Is your character ${guess.name}${guess.description ? ` (${guess.description})` : ''}`)
                    .setImage(guess.nsfw ? null : this.replaceImage(guess.absolute_picture_path) ?? null)
                    .setFooter(`Confidence Level: ${Math.round(guess.proba * 100)}% | You have 1 minute to answer`);

                await response.editReply({
                    content: null,
                    embeds: [embed],
                    components: this.generateYesNoButtons()
                });

                const newResponse = await msg
                    .awaitMessageComponent({ filter, time: 60000 })
                    .catch(() => null);

                if (!newResponse) {
                    status = 'timeout';
                    break;
                } else {
                    await newResponse.deferUpdate();

                    if (newResponse.customId === 'yes') {
                        status = 'win';
                        break;
                    } else {
                        if (stop) {
                            status = 'loss';
                            break;
                        }

                        void response.editReply({
                            content: akiConfig.responses.keepGoing,
                            embeds: []
                        });

                        const nextResponse = await msg.awaitMessageComponent({ filter, time: 60000 }).catch(() => null);

                        if (!nextResponse || nextResponse.customId === 'no') {
                            status = 'loss';
                            break;
                        } else {
                            activeGame = true;
                        }

                        await nextResponse.deferUpdate();
                    }
                }
            }
        }

        const components = disableComponents(this.generateYesNoButtons(status === 'timeout' ? null : status === 'win' ? 'yes' : 'no'));

        await response.editReply({ components });

        return message.channel.send({
            content: randomResponse(akiConfig.responses[status]),
            files: [{ attachment: akiConfig.images.end, name: 'aki.png' }]
        });
    }

    private embed() {
        return new MessageEmbed()
            .setColor(colors.AKINATOR)
            .setThumbnail(randomResponse(akiConfig.images.random))
            .addField('Time', emojis.timer, true);
    }

    private generateButtons(disabled = false) {
        const first = [];
        const second = [
            new MessageButton()
                .setCustomId('Stop')
                .setLabel('Stop')
                .setStyle('DANGER')
                .setDisabled(disabled)
        ];

        for (const answer of (this.aki.answers as string[])) {
            first.push(
                new MessageButton()
                    .setCustomId(answer)
                    .setLabel(answer)
                    .setStyle('PRIMARY')
                    .setDisabled(disabled)
            );
        }

        if (this.aki.currentStep > 1) {
            second.unshift(
                new MessageButton()
                    .setCustomId('Back')
                    .setLabel('Back')
                    .setStyle('SECONDARY')
                    .setDisabled(disabled)
            );
        }

        return [
            new MessageActionRow().addComponents(...first),
            new MessageActionRow().addComponents(...second)
        ];
    }

    private generateYesNoButtons(clicked?: 'yes' | 'no') {
        const setSecondary = (style: 'SUCCESS' | 'DANGER') => {
            const button = style === 'SUCCESS' ? 'yes' : 'no';
            return clicked === button ? style : 'SECONDARY';
        };

        return [
            new MessageActionRow()
                .addComponents(
                    new MessageButton()
                        .setCustomId('yes')
                        .setLabel('Yes')
                        .setStyle(clicked ? setSecondary('SUCCESS') : 'SUCCESS'),
                    new MessageButton()
                        .setCustomId('no')
                        .setLabel('No')
                        .setStyle(clicked ? setSecondary('DANGER') : 'DANGER')
                )
        ];
    }

    private replaceImage(link: string): string {
        const base = 'https://photos.clarinea.fr/BL_25_en/600/partenaire';
        const imgur = 'https://i.imgur.com';

        for (const [from, to] of Object.entries(akiConfig.replace)) link = link.replace(`${base}/${from}`, `${imgur}/${to}`);
        return link;
    }
}