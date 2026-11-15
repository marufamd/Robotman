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
    // Group by what the event records, so rows from an earlier import (with different IDs) are recognised and identical repeats keep their multiplicity.
    const groups = new Map<string, typeof plan.history>();
    for (const item of plan.history) {
      const key = [item.guildId, item.responseId, item.subject, item.action, item.actorId, item.occurredAt.toISOString()].join('\u0000');
      groups.set(key, [...(groups.get(key) ?? []), item]);
    }
    for (const group of groups.values()) {
      const sample = group[0]!;
      const [existing] = await tx`select count(*)::int as total from robotman_response_change_history
        where guild_id = ${sample.guildId} and response_id = ${sample.responseId} and subject = ${sample.subject} and action = ${sample.action} and actor_id = ${sample.actorId} and occurred_at = ${sample.occurredAt}`;
      for (const item of group.slice(existing?.total ?? 0)) {
        const inserted = await tx`insert into robotman_response_change_history (change_id, guild_id, response_id, subject, action, actor_id, trigger, occurred_at)
          values (${item.id}, ${item.guildId}, ${item.responseId}, ${item.subject}, ${item.action}, ${item.actorId}, ${item.trigger}, ${item.occurredAt})
          on conflict (change_id) do nothing returning change_id`;
        history += inserted.length;
      }
    }
    return { responses, recommendations, history };
  });
}
