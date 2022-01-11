import type { Command, CommandOptions } from '#util/commands';
import type { Message } from 'discord.js';
import { Sql } from 'postgres';
import { send } from '@skyra/editable-commands';
import { inject, injectable } from 'tsyringe';
import { Embed } from '#util/builders';
import { makeHex } from '#util/misc';

@injectable()
export default class implements Command {
	public constructor(@inject('sql') private readonly sql: Sql<any>) {}

	public options: CommandOptions = {
		aliases: ['set-colour'],
		description: "Set's the user's leaderboard color.",
		usage: '<color>',
		example: ['#e67E22', '0xE67E22', 'dark orange', '3447003', '(230, 126, 34)', '230 126 34'],
		args: [
			{
				name: 'color',
				type: 'color',
				match: 'content',
				prompt: 'What color would you like to set your leaderboard entry to?'
			}
		],
		cooldown: 2
	};

	public async exec(message: Message, { color }: { color: number }) {
		await this.sql`
        update ranks
        set color = ${color}
        where user_id = ${message.author.id}
        `;

		const embed = new Embed()
			.setColor(color)
			.setAuthor(message.author.tag, message.author.avatarURL())
			.setDescription(`✅ Updated your leaderboard colour to ${makeHex(color)}`);

		return send(message, { embeds: [embed] });
	}
}
