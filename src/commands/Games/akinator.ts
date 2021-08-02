import { Embed } from '#util/builders';
import type { Command, CommandOptions } from '#util/commands';
import { Akinator, Colors, Emojis } from '#util/constants';
import { getUser, isInteraction, randomResponse } from '#util/misc';
import { Aki } from 'aki-api';
import type { guess } from 'aki-api/typings/functions';
import type { ButtonInteraction, CommandInteraction, Message, MessageEditOptions } from 'discord.js';
import { MessageActionRow, MessageButton } from 'discord.js';

const enum GameStatus {
	WIN = 'WIN',
	LOSS = 'LOSS',
	TIMEOUT = 'TIMEOUT'
}

type Answer = 0 | 1 | 2 | 3 | 4;

export default class implements Command {
	public options: CommandOptions = {
		name: 'aki',
		aliases: ['akinator'],
		description: 'Starts an Akinator game.',
		disableEdits: true
	};

	public async exec(message: Message) {
		return this.run(message);
	}

	public async interact(interaction: CommandInteraction) {
		return this.run(interaction);
	}

	private async run(data: Message | CommandInteraction) {
		const player = getUser(data);

		const aki = new Aki({ region: 'en', childMode: true });
		const failed = new Set<string>();

		let msg = (await (isInteraction(data) ? data.reply.bind(data) : data.channel.send.bind(data.channel))('Starting...')) as Message;

		await aki.start();

		let activeGame = true;
		let stop = false;
		let back = false;

		let answer: Answer;
		let status = GameStatus.WIN;

		let response: ButtonInteraction;
		const filter = (i: ButtonInteraction) => i.user.id === player.id;

		let guessEmbed: Embed;

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
				.setFooter(`Confidence Level: ${Math.round(parseInt(aki.progress.toString(), 10))}% | You have 1 minute to answer`);

			const options: MessageEditOptions = {
				content: null,
				embeds: [embed],
				components: this.generateButtons(aki)
			};

			if (response) {
				msg = (await response.editReply(options)) as Message;
			} else {
				msg = (await (isInteraction(data) ? data.editReply.bind(data) : msg.edit.bind(msg))(options)) as Message;
			}

			response = await msg.awaitMessageComponent({ filter, time: Akinator.MAX_TIME }).catch(() => null);

			if (!response) {
				status = GameStatus.TIMEOUT;
				break;
			}

			await response.update({
				content: 'Processing...',
				embeds: [],
				components: this.generateButtons(aki, true)
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
					answer = (aki.answers as string[]).indexOf(response.customId) as Answer;
					break;
			}

			if (aki.progress >= 90 || stop) {
				await aki.win();

				const guesses = (aki.answers as guess[]).filter((g) => !failed.has(g.id));

				if (!guesses.length) {
					status = GameStatus.TIMEOUT;
					break;
				}

				activeGame = false;

				const [guess] = guesses;
				failed.add(guess.id);

				guessEmbed = this.embed()
					.setTitle(`Is your character ${guess.name}${guess.description ? ` (${guess.description})` : ''}?`)
					.setImage(guess.nsfw ? null : this.replaceImage(guess.absolute_picture_path) ?? null)
					.setFooter(`Confidence Level: ${Math.round(Number(guess.proba) * 100)}% | You have 1 minute to answer`);

				await response.editReply({
					content: null,
					embeds: [guessEmbed],
					components: this.generateYesNoButtons()
				});

				const newResponse = await msg.awaitMessageComponent<ButtonInteraction>({ filter, time: Akinator.MAX_TIME }).catch(() => null);

				if (!newResponse) {
					status = GameStatus.TIMEOUT;
					break;
				} else {
					await newResponse.deferUpdate();

					if (newResponse.customId === 'yes') {
						status = GameStatus.WIN;
						break;
					} else {
						if (stop) {
							status = GameStatus.LOSS;
							break;
						}

						void response.editReply({
							content: Akinator.RESPONSES.KEEP_GOING,
							embeds: []
						});

						const nextResponse = await msg
							.awaitMessageComponent<ButtonInteraction>({ filter, time: Akinator.MAX_TIME })
							.catch(() => null);

						if (!nextResponse || nextResponse.customId === 'no') {
							status = GameStatus.LOSS;

							await nextResponse.update({
								content: null,
								embeds: [guessEmbed]
							});

							response = nextResponse;

							break;
						} else {
							activeGame = true;
						}

						await nextResponse.deferUpdate();
					}
				}
			}
		}

		guessEmbed.fields = [];

		await response.editReply({
			components: this.generateYesNoButtons(status === GameStatus.LOSS ? null : status === GameStatus.WIN ? 'yes' : 'no', true),
			embeds: [guessEmbed]
		});

		return data.channel.send({
			content: randomResponse(Akinator.RESPONSES[status]),
			files: [{ attachment: Akinator.IMAGES.END, name: 'aki.png' }]
		});
	}

	public embed() {
		return new Embed().setColor(Colors.AKINATOR).setThumbnail(randomResponse(Akinator.IMAGES.RANDOM)).addField('Time', Emojis.TIMER, true);
	}

	public generateButtons(aki: Aki, disabled = false) {
		const first = [];
		const second = [new MessageButton().setCustomId('Stop').setLabel('Stop').setStyle('DANGER').setDisabled(disabled)];

		for (const answer of aki.answers as string[]) {
			first.push(new MessageButton().setCustomId(answer).setLabel(answer).setStyle('PRIMARY').setDisabled(disabled));
		}

		if (aki.currentStep > 1) {
			second.unshift(new MessageButton().setCustomId('Back').setLabel('Back').setStyle('SECONDARY').setDisabled(disabled));
		}

		return [new MessageActionRow().addComponents(...first), new MessageActionRow().addComponents(...second)];
	}

	public generateYesNoButtons(clicked?: 'yes' | 'no', disabled = false) {
		const setSecondary = (style: 'SUCCESS' | 'DANGER') => {
			const button = style === 'SUCCESS' ? 'yes' : 'no';
			return clicked === button ? style : 'SECONDARY';
		};

		return [
			new MessageActionRow().addComponents(
				new MessageButton()
					.setCustomId('yes')
					.setLabel('Yes')
					.setStyle(clicked ? setSecondary('SUCCESS') : 'SUCCESS')
					.setDisabled(disabled),
				new MessageButton()
					.setCustomId('no')
					.setLabel('No')
					.setStyle(clicked ? setSecondary('DANGER') : 'DANGER')
					.setDisabled(disabled)
			)
		];
	}

	private replaceImage(link: string): string {
		const base = 'https://photos.clarinea.fr/BL_25_en/600/partenaire';
		const imgur = 'https://i.imgur.com';

		for (const [from, to] of Object.entries(Akinator.replace)) {
			link = link.replace(`${base}/${from}`, `${imgur}/${to}`);
		}

		return link;
	}
}
