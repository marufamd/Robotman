import type { Sql } from 'postgres';
import type { Plan } from './plan.js';

/** Writes a plan in one transaction. Existing rows with the same deterministic ID are left untouched. */
export async function applyPlan(sql: Sql, plan: Plan) {
  return sql.begin(async tx => {
    let responses = 0;
    for (const item of plan.responses) {
      const inserted = await tx`insert into robotman_responses (response_id, guild_id, trigger, aliases, content, embeds, created_at, updated_at)
        values (${item.id}, ${item.guildId}, ${item.trigger}, ${tx.json(item.aliases)}, ${item.content}, ${tx.json(item.embeds as never)}, ${item.createdAt}, ${item.updatedAt})
        on conflict (response_id) do nothing returning response_id`;
      responses += inserted.length;
    }
    let recommendations = 0;
    for (const item of plan.recommendations) {
      const inserted = await tx`insert into robotman_recommendation_entries (recommendation_id, guild_id, category, name, aliases, content, embeds, curator_name, introduction_mode, created_at, updated_at)
        values (${item.id}, ${item.guildId}, ${item.category}, ${item.trigger}, ${tx.json(item.aliases)}, ${item.content}, ${tx.json(item.embeds as never)}, ${item.curatorName}, 'none', ${item.createdAt}, ${item.updatedAt})
        on conflict (recommendation_id) do nothing returning recommendation_id`;
      recommendations += inserted.length;
    }
    let history = 0;
    for (const [userId, name] of plan.users) await tx`insert into robotman_discord_users (user_id, username) values (${userId}, ${name}) on conflict (user_id) do nothing`;
    for (const item of plan.history) {
      const inserted = await tx`insert into robotman_response_change_history (change_id, guild_id, response_id, action, actor_id, trigger, occurred_at)
        values (${item.id}, ${item.guildId}, ${item.responseId}, ${item.action}, ${item.actorId}, ${item.trigger}, ${item.occurredAt})
        on conflict (change_id) do nothing returning change_id`;
      history += inserted.length;
    }
    return { responses, recommendations, history };
  });
}
