import { Embed } from '#util/builders';
import type { Command, CommandOptions } from '#util/commands';
import { Client } from 'discord.js';
import type { ApplicationCommandOptionData, CommandInteraction, Guild, Message, User } from 'discord.js';
import { Sql } from 'postgres';
import { inject, injectable } from 'tsyringe';
import type { Rank } from '#util/ranks';
import { send } from '@skyra/editable-commands';
import { ArgumentUtil } from '#util/arguments';
import { Canvas, registerFont } from 'canvas-constructor/skia';
import { join } from 'node:path';
import { makeHex, trim } from '#util/misc';
import { Colors } from '#util/constants';

registerFont('ComfortaaBold', [
	join(__dirname, '..', '..', '..', 'fonts', 'Comfortaa-Bold.ttf'),
	join(__dirname, '..', '..', '..', 'fonts', 'NotoSans-Bold.ttf')
]);

@injectable()
export default class implements Command {
	public constructor(private readonly client: Client, @inject('sql') private readonly sql: Sql<any>) {}

	public options: CommandOptions = {
		aliases: ['top', 'lb'],
		description: 'Displays the server leaderboard rankings.',
		usage: '[page]',
		example: ['2'],
		args: [
			{
				name: 'page',
				type: ArgumentUtil.validate('integer', (_, resolved) => resolved > 0),
				default: 1
			}
		],
		cooldown: 5,
		typing: true
	};

	public interactionOptions: ApplicationCommandOptionData[] = [
		{
			name: 'page',
			description: 'The page of the leaderboard to show.',
			type: 'STRING'
		}
	];

	public async exec(message: Message, { page }: { page: number }) {
		if (message.guild.id !== process.env.SCORE_GUILD) return;
		return send(message, await this.run(page, message.author, message.guild));
	}

	public async interact(interaction: CommandInteraction, { page }: { page?: number }) {
		if (!page || page < 0) page = 1;
		return interaction.reply(await this.run(page, interaction.user, interaction.guild));
	}

	public async run(page: number, user: User, guild: Guild) {
		const num = parseInt(`${page}0`);
		const range = this.createRange(num);
		const offset = num - 10;

		const [row] = await this.sql<(Rank & { position: number })[]>`
        select * from (
            select *,
                row_number() over(
                    order by score desc
                ) as position 
            from ranks
        ) result 
        where user_id = ${user.id};
        `;

		const rows = await this.sql<Rank[]>`
        select * from ranks
        order by score desc
        limit 10 offset ${offset}
        `;

		if (rows.count === 0) return { content: 'There are no entries for that page.', ephemeral: true };

		const embed = new Embed()
			.setAuthor(`${guild.name} Leaderboard`, guild.iconURL())
			.setDescription(`You are rank **#${row.position}** with a score of **${row.score}**`)
			.setImage('attachment://lb.png')
			.setFooter(`Page ${page} • Type ${process.env.BOT_PREFIX} to go to Page ${page + 1}`);

		return { embeds: [embed], files: [{ name: 'lb.png', attachment: await this.drawLeaderboard(rows, range) }] };
	}

	private async drawLeaderboard(rows: Rank[], range: number[]) {
		const width = 600;
		const gray = makeHex(Colors.LEADERBOARD);

		const canvas = new Canvas(width, 700).setColor(gray).setTextFont('23px ComfortaaBold');

		const textX = 30;
		let y = 0;

		const scoreSpace = 116;

		const { width: rankWidth } = canvas.measureText(`#${range.at(-1)}`);

		for (const [i, row] of rows.entries()) {
			const rank = range[i];
			const user = await this.client.users.fetch(row.user_id);

			const textY = y + 40;
			const { width: scoreWidth } = canvas.measureText(row.score.toString());

			canvas
				.printRoundedRectangle(0, y, width, 61, 8)
				.setColor(makeHex(Colors.WHITE))
				.printText(`#${rank}`, textX, textY)
				.printText(`• ${trim(user.username, 30)}`, textX + rankWidth + 16, textY)
				.printText(row.score.toString(), width - scoreSpace / 2 - scoreWidth / 2, textY)
				.setColor(gray);

			y += 71;
		}

		return canvas.png();
	}

	private createRange(num: number) {
		const arr = [];
		for (let i = num - 9; i < num + 1; i++) {
			arr.push(i);
		}

		return arr;
	}
}
