import type { Message, Snowflake } from 'discord.js';
import type { Sql } from 'postgres';
import { container } from 'tsyringe';

export interface Rank {
	score: number;
	user_id: Snowflake;
}

const timestamps = new Map<Snowflake, number>();

export async function handleScores(message: Message) {
	if (message.guild.id !== process.env.SCORE_GUILD) return;

	const lastMessage = timestamps.get(message.author.id) ?? 0;

	if (message.createdTimestamp - lastMessage > 120000) {
		const sql = container.resolve<Sql<any>>('sql');

		const xp = Math.floor(Math.random() * (20 - 10 + 1) + 10);

		const obj = {
			user_id: message.author.id,
			score: xp
		};

		await sql`
        insert into ranks
        ${sql(obj as any, ...Object.keys(obj))}
        on conflict (user_id) do update
            set score = ranks.score + excluded.score
        `;

		timestamps.set(message.author.id, message.createdTimestamp);
	}
}
