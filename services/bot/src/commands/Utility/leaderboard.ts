import { Embed } from '#util/builders';
import type { Command, CommandOptions } from '#util/commands';
import { Client } from 'discord.js';
import type { ApplicationCommandOptionData, CommandInteraction, Guild, Message, User } from 'discord.js';
import { Sql } from 'postgres';
import { inject, injectable } from 'tsyringe';
import type { Rank } from '#util/ranks';
import { send } from '@skyra/editable-commands';
import { ArgumentUtil } from '#util/arguments';

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

		const entries = await Promise.all(
			rows.map(async (r, i) => {
				const member = await this.client.users.fetch(r.user_id);
				return `**${range[i]}. ${member.username} - ${r.score}**`;
			})
		);

		const embed = new Embed()
			.setAuthor(`${guild.name} Leaderboard`, guild.iconURL())
			.setDescription(`You are rank **#${row.position}** with a score of **${row.score}**\n\n${entries.join('\n')}`);

		return { embeds: [embed] };
	}

	private createRange(num: number) {
		const arr = [];
		for (let i = num - 9; i < num + 1; i++) {
			arr.push(i);
		}

		return arr;
	}
}
