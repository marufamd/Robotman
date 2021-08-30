import { Embed } from '#util/builders';
import type { Command, CommandOptions } from '#util/commands';
import { Pokemon } from '#util/constants';
import { randomResponse, toTitleCase } from '#util/misc';
import { request } from '#util/request';
import { reply } from '@skyra/editable-commands';
import type { ApplicationCommandOptionData, CommandInteraction, Message } from 'discord.js';
import { Agent } from 'https';

const agent = new Agent({ rejectUnauthorized: false });

export default class implements Command {
	public options: CommandOptions = {
		aliases: ['pokemon-fuse'],
		description: 'Fuses two Pokemon together.',
		extended: ['Providing `random` as an argument will use a random Pokemon.', 'Providing no Pokemon will fuse two random Pokemon.'],
		usage: '[first pokemon] [second pokemon]',
		example: ['bulbasaur pikachu', 'squirtle charmander', '"mr. mime" alakazam'],
		args: [
			{
				name: 'first',
				type: 'lowercase'
			},
			{
				name: 'second',
				type: 'lowercase'
			}
		],
		cooldown: 4,
		typing: true
	};

	public interactionOptions: ApplicationCommandOptionData[] = [
		{
			name: 'first',
			description: 'The first Pokemon to fuse.',
			type: 'STRING'
		},
		{
			name: 'second',
			description: 'The Pokemon to fuse the first with.',
			type: 'STRING'
		}
	];

	public async exec(message: Message, { first, second }: { first: string; second: string }) {
		return reply(message, await this.run(first, second));
	}

	public async interact(interaction: CommandInteraction, { first, second }: { first: string; second: string }) {
		return interaction.reply(await this.run(first, second));
	}

	private async run(first: string, second: string) {
		let one: number;
		let two: number;

		if (!first) {
			[first, second] = this.getRandom(2);

			one = Pokemon.indexOf(first) + 1;
			two = Pokemon.indexOf(second) + 1;
		} else {
			if (first === 'random') {
				first = this.getRandom();
			}

			if (second === 'random' || !second) {
				second = this.getRandom();
			}

			[first, second] = [first, second].map((a) =>
				a
					.replaceAll('.', '')
					.replace(/nidoran-?m(ale)?/gi, 'nidoran♂️')
					.replace(/nidoran-?f(emale)?/gi, 'nidoran♀️')
			);

			one = Pokemon.includes(first) ? Pokemon.indexOf(first) + 1 : parseInt(first);
			two = Pokemon.includes(second) ? Pokemon.indexOf(second) + 1 : parseInt(second);

			if (Pokemon[one] === null) one = this.getProper(one);
			if (Pokemon[two] === null) two = this.getProper(two);

			if (!Pokemon[one] || !Pokemon[two]) {
				return {
					content: 'Invalid Pokemon.',
					ephemeral: true
				};
			}

			[first, second] = [Pokemon[one - 1], Pokemon[two - 1]];
		}

		const url = `https://japeal.prestocdn.net/wordpress/wp-content/themes/total/PKM/upload2/${one}X${two}X0.png`;

		const { buffer: image } = await request.get(url, { agent });

		return {
			embeds: [
				new Embed()
					.setColor('RANDOM')
					.setAuthor(`${toTitleCase(first)} + ${toTitleCase(second)}`)
					.setTitle(this.getName(first, second))
					.setURL(url)
					.setImage('attachment://fused.png')
			],
			files: [
				{
					name: 'fused.png',
					attachment: image
				}
			]
		};
	}

	private getName(first: string, second: string) {
		return toTitleCase(this.getPart(first) + this.getPart(second, true));
	}

	private getRandom(): string;
	private getRandom(amount: number): string[];
	private getRandom(amount = 1): string | string[] {
		const arr = [];

		for (let i = 0; i < amount; i++) {
			arr.push(randomResponse(Pokemon.filter((a) => a != null)));
		}

		return arr.length === 1 ? arr[0] : arr;
	}

	private getProper(num: number) {
		for (let i = num; i < Pokemon.length; i++) {
			if (Pokemon[i]) {
				num = i;
				break;
			}
		}

		return num;
	}

	private getPart(str: string, last = false) {
		const round = Math.round(str.length / 2);
		return last ? str.slice(round) : str.slice(0, round);
	}
}
