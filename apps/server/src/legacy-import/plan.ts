import { createHash } from 'node:crypto';
import { normalizeReply } from '../rich-reply.js';

export type LegacyAutoResponse = {
  id: number; name: string; type: string; guild: string; content: string; aliases: string[] | null;
  author: string; author_tag: string; editor: string | null; editor_tag: string | null;
  created: string | null; updated: string | null; wildcard: boolean; embed: boolean; embed_color: string | null;
};
export type LegacyHistory = { guild: string; user_id: string; user_tag: string; action: string; response: string; date: string | null };
export type LegacyExport = { auto_responses: LegacyAutoResponse[]; history: LegacyHistory[] };
export type Issue = { legacyId?: number; guild?: string; name?: string; reason: string; detail?: string };
export type PlannedResponse = { id: string; guildId: string; trigger: string; aliases: string[]; content: string; embeds: Record<string, unknown>[]; createdAt: Date; updatedAt: Date };
export type PlannedRecommendation = PlannedResponse & { category: string; curatorName: string };
export type PlannedHistory = { id: string; guildId: string; responseId: string; subject: string; action: 'created' | 'updated' | 'deleted'; actorId: string; trigger: string; occurredAt: Date };
export type Plan = {
  responses: PlannedResponse[]; recommendations: PlannedRecommendation[]; history: PlannedHistory[]; users: Map<string, string>;
  skipped: { recommendationHistory: number }; warnings: Issue[]; unmapped: Issue[];
};

/** A stable ID derived from the legacy record, so re-running an import never duplicates anything. */
export const legacyId = (...parts: Array<string | number>) => {
  const hex = createHash('sha256').update(['robotman-legacy', ...parts].join('\u0000')).digest('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
};
/** The legacy database stored timestamps without a time zone; they are interpreted as UTC. */
export function parseLegacyTime(value: string | null | undefined, fallback: Date): Date {
  if (!value) return fallback;
  const date = new Date(/(?:Z|[+-]\d{2}(?::?\d{2})?)$/.test(value) ? value : `${value.replace(' ', 'T')}Z`);
  return Number.isNaN(date.getTime()) ? fallback : date;
}
const recommendationCategories = ['character', 'writer', 'moderator', 'booster'];
/** Old recommendation names and aliases were message triggers ending in "recs"; v7 stores the plain collection name. */
const stripRecs = (value: string) => value.trim().replace(/\s+recs$/i, '').trim();
const dedupe = (trigger: string, aliases: string[]) => {
  const seen = new Set([trigger.toLocaleLowerCase('en-US')]);
  return aliases.map(alias => alias.trim()).filter(alias => alias && !seen.has(alias.toLocaleLowerCase('en-US')) && seen.add(alias.toLocaleLowerCase('en-US')));
};
function reply(row: LegacyAutoResponse) {
  if (!row.embed) return { content: row.content, embeds: [] as Record<string, unknown>[] };
  const color = /^#?[0-9a-f]{6}$/i.test(row.embed_color ?? '') ? parseInt(row.embed_color!.replace('#', ''), 16) : undefined;
  return { content: '', embeds: [{ description: row.content, ...(color === undefined ? {} : { color }) }] };
}

export function planImport(data: LegacyExport): Plan {
  const plan: Plan = { responses: [], recommendations: [], history: [], users: new Map(), skipped: { recommendationHistory: 0 }, warnings: [], unmapped: [] };
  const used = new Set<string>();
  const usedCurators = new Set<string>();
  for (const row of data.auto_responses) {
    const where = { legacyId: row.id, guild: row.guild, name: row.name };
    if (recommendationCategories.includes(row.type)) {
      try {
        const personal = row.type === 'moderator' || row.type === 'booster';
        const name = stripRecs(row.name);
        const aliases = dedupe(name, (row.aliases ?? []).map(stripRecs));
        const { content, embeds } = reply(row);
        normalizeReply({ trigger: name, aliases, content, embedsJson: JSON.stringify(embeds) });
        const lowered = name.toLocaleLowerCase('en-US');
        if (used.has(`${row.guild}\u0000${row.type}\u0000${lowered}`)) { plan.unmapped.push({ ...where, reason: 'duplicate-name' }); continue; }
        if (personal && usedCurators.has(`${row.guild}\u0000${lowered}`)) { plan.unmapped.push({ ...where, reason: 'duplicate-curator' }); continue; }
        used.add(`${row.guild}\u0000${row.type}\u0000${lowered}`);
        if (personal) usedCurators.add(`${row.guild}\u0000${lowered}`);
        const createdAt = parseLegacyTime(row.created, new Date(0));
        plan.recommendations.push({ id: legacyId('recommendation', row.id), guildId: row.guild, trigger: name, aliases, content, embeds, createdAt, updatedAt: parseLegacyTime(row.updated, createdAt), category: row.type, curatorName: personal ? name : '' });
      } catch (error) {
        plan.unmapped.push({ ...where, reason: 'invalid-reply', detail: error instanceof Error ? error.message : String(error) });
      }
      continue;
    }
    if (row.type !== 'regular') { plan.unmapped.push({ ...where, reason: 'unknown-type', detail: row.type }); continue; }
    try {
      const trigger = row.name.trim();
      const aliases = dedupe(trigger, row.aliases ?? []);
      const { content, embeds } = reply(row);
      normalizeReply({ trigger, aliases, content, embedsJson: JSON.stringify(embeds) });
      const key = `${row.guild}\u0000${trigger.toLocaleLowerCase('en-US')}`;
      if (used.has(key)) { plan.unmapped.push({ ...where, reason: 'duplicate-trigger' }); continue; }
      used.add(key);
      const createdAt = parseLegacyTime(row.created, new Date(0));
      plan.responses.push({ id: legacyId('response', row.id), guildId: row.guild, trigger, aliases, content, embeds, createdAt, updatedAt: parseLegacyTime(row.updated, createdAt) });
    } catch (error) {
      plan.unmapped.push({ ...where, reason: 'invalid-reply', detail: error instanceof Error ? error.message : String(error) });
    }
  }
  planHistory(data, plan);
  return plan;
}

/** Legacy tags were "name#1234" (or "name#0" after the username migration); v7 shows the plain username. */
const username = (tag: string) => tag.replace(/#\d{1,4}$/, '').trim();
const actions: Record<string, PlannedHistory['action']> = { add: 'created', edit: 'updated', delete: 'deleted' };

function planHistory(data: LegacyExport, plan: Plan) {
  const remember = (id: string | null, tag: string | null) => { if (id && tag && username(tag)) plan.users.set(id, username(tag)); };
  const lowered = (value: string) => value.trim().toLocaleLowerCase('en-US');
  const responseByName = new Map(plan.responses.map(item => [`${item.guildId}\u0000${lowered(item.trigger)}`, item]));
  const entryByName = new Map(plan.recommendations.map(item => [`${item.guildId}\u0000${lowered(item.trigger)}`, item]));
  const recommendationNames = new Set(data.auto_responses.filter(row => row.type !== 'regular').map(row => `${row.guild}\u0000${lowered(stripRecs(row.name))}`));
  const withHistory = new Set<string>();
  // IDs come from an event's content (plus a counter for identical repeats), not its position, so a later export re-matches known events.
  const seen = new Map<string, number>();
  data.history.forEach(event => {
    const where = { guild: event.guild, name: event.response };
    const action = actions[event.action];
    if (!action) { plan.unmapped.push({ ...where, reason: 'unknown-history-action', detail: event.action }); return; }
    const key = `${event.guild}\u0000${lowered(event.response)}`;
    const fingerprint = [event.guild, event.user_id, event.action, event.response, event.date ?? ''].join('\u0000');
    const occurrence = seen.get(fingerprint) ?? 0;
    seen.set(fingerprint, occurrence + 1);
    const response = responseByName.get(key);
    const entry = response ? undefined : entryByName.get(`${event.guild}\u0000${lowered(stripRecs(event.response))}`);
    // A recommendation whose entry no longer exists has no known category, so its history cannot be placed.
    if (!response && !entry && (recommendationNames.has(`${event.guild}\u0000${lowered(stripRecs(event.response))}`) || /\srecs$/i.test(event.response.trim()))) { plan.skipped.recommendationHistory += 1; return; }
    const subject = entry?.category ?? 'response';
    const target = response ?? entry;
    withHistory.add(target ? target.id : key);
    remember(event.user_id, event.user_tag);
    plan.history.push({
      id: legacyId('history', occurrence, event.guild, event.user_id, event.action, event.response, event.date ?? ''), guildId: event.guild,
      responseId: target?.id ?? legacyId('response-name', event.guild, lowered(event.response)), subject, action, actorId: event.user_id,
      trigger: target?.trigger ?? event.response.trim(), occurredAt: parseLegacyTime(event.date, target?.createdAt ?? new Date(0)),
    });
  });
  // Entries with no recorded events still show who made them, using the author columns of the old table.
  for (const row of data.auto_responses) {
    const item = row.type === 'regular' ? plan.responses.find(candidate => candidate.id === legacyId('response', row.id)) : plan.recommendations.find(candidate => candidate.id === legacyId('recommendation', row.id));
    if (!item || withHistory.has(item.id)) continue;
    const subject = row.type === 'regular' ? 'response' : row.type;
    remember(row.author, row.author_tag); remember(row.editor, row.editor_tag);
    plan.history.push({ id: legacyId('history-created', row.id), guildId: item.guildId, responseId: item.id, subject, action: 'created', actorId: row.author, trigger: item.trigger, occurredAt: item.createdAt });
    if (row.updated && row.editor) plan.history.push({ id: legacyId('history-updated', row.id), guildId: item.guildId, responseId: item.id, subject, action: 'updated', actorId: row.editor, trigger: item.trigger, occurredAt: item.updatedAt });
  }
}
