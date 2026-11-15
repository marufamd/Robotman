import { randomUUID } from 'node:crypto';
import { and, asc, eq, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import type { Sql } from 'postgres';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { AuthExtension } from '../application.js';
import { rememberActor } from '../actor.js';
import { recommendationEntries, recommendationSettings, responseChangeHistory } from '../database/schema.js';
import { categories, defaultSettings, effectiveReply, introductionFor, resolveSettings, type ListSettings, type Settings } from './model.js';
import { normalizeReply } from '../rich-reply.js';

type Context = { request?: IncomingMessage; response?: ServerResponse };
type Input = { category: string; name: string; aliases?: string[]; content?: string; embedsJson?: string; curatorName?: string; curatorUserId?: string | null; introductionMode?: string; introduction?: string; description?: string; url?: string };
const present = (row: typeof recommendationEntries.$inferSelect, settings: Settings = defaultSettings) => ({ ...row, category: row.category.toUpperCase(), introductionMode: row.introductionMode.toUpperCase(), embedsJson: JSON.stringify(row.embeds), effectiveIntroduction: introductionFor(row, settings) });

export function createRecommendations(client: Sql, auth?: AuthExtension) {
  const db = drizzle(client);
  async function authorize(context: Context, guildId: string, write = false) {
    if (!auth) throw new Error('Sign in required');
    await (write ? auth.authorizeGuildWrite(context, guildId) : auth.requireManagedGuild(context, guildId));
  }
  function normalize(input: Input) {
    const category = input.category.toLowerCase();
    const legacy = input.content === undefined;
    const personal = ['moderator', 'booster'].includes(category);
    const curatorName = (input.curatorName ?? (legacy ? input.name : '')).trim();
    if (personal && !curatorName) throw new Error('A curator name is required for personal recommendation lists.');
    const legacyEmbed = { title: `${input.name.trim()} · ${category[0]!.toUpperCase() + category.slice(1)}`, ...(input.description ? { description: input.description } : {}), ...(input.url ? { url: input.url.trim() } : {}) };
    const value = normalizeReply({ trigger: personal ? curatorName : input.name, aliases: input.aliases ?? [], content: input.content ?? '', embedsJson: legacy ? JSON.stringify([legacyEmbed]) : input.embedsJson ?? '[]' });

    const curatorUserId = input.curatorUserId?.trim() || null;
    if (curatorUserId && !/^\d{17,20}$/.test(curatorUserId)) throw new Error('Enter a valid Discord user ID.');
    return { category, name: value.trigger, aliases: value.aliases, content: value.content, embeds: value.embeds, curatorName, curatorUserId, introductionMode: (input.introductionMode ?? 'INHERIT').toLowerCase(), introduction: input.introduction ?? '', description: input.description ?? '', url: input.url?.trim() ?? '' };
  }
  const settingsFor = async (database: typeof db, guildId: string) => resolveSettings((await database.select().from(recommendationSettings).where(eq(recommendationSettings.guildId, guildId)))[0]?.data);
  async function save(guildId: string, input: Input, context: Context, id?: string) {
    const { id: actorId } = await rememberActor(db, auth, context);
    return db.transaction(async tx => {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${'robotman-recommendations:' + guildId}))`);
      const settings = await settingsFor(tx as unknown as typeof db, guildId);
      const value = normalize(input);
      const rows = await tx.select().from(recommendationEntries).where(eq(recommendationEntries.guildId, guildId));
      if (rows.some(row => row.id !== id && row.category === value.category && row.name.toLocaleLowerCase('en-US') === value.name.toLocaleLowerCase('en-US'))) throw new Error('A collection with this name already exists in this category.');
      if (['moderator', 'booster'].includes(value.category) && rows.some(row => row.id !== id && ['moderator', 'booster'].includes(row.category) && (row.name.toLocaleLowerCase('en-US') === value.name.toLocaleLowerCase('en-US') || Boolean(value.curatorUserId && row.curatorUserId === value.curatorUserId)))) throw new Error('A personal list with this curator name or Discord account already exists in this server.');
      effectiveReply(value, settings);
      const [row] = id
        ? await tx.update(recommendationEntries).set({ ...value, updatedAt: new Date() }).where(and(eq(recommendationEntries.id, id), eq(recommendationEntries.guildId, guildId))).returning()
        : await tx.insert(recommendationEntries).values({ id: randomUUID(), guildId, ...value }).returning();
      if (!row) throw new Error('Recommendation Entry not found in this server.');
      await tx.insert(responseChangeHistory).values({ id: randomUUID(), guildId, responseId: row.id, subject: row.category, action: id ? 'updated' : 'created', actorId, trigger: row.name });
      return present(row, settings);
    });
  }
  return {
    schemaFields: `
      enum RecommendationCategory { CHARACTER WRITER MODERATOR BOOSTER }
      enum RecommendationIntroductionMode { INHERIT CUSTOM NONE }
      type RecommendationEntry { id: ID!, guildId: ID!, category: RecommendationCategory!, name: String!, aliases: [String!]!, content: String!, embedsJson: String!, curatorName: String!, curatorUserId: String, introductionMode: RecommendationIntroductionMode!, introduction: String!, effectiveIntroduction: String!, description: String!, url: String! }
      input RecommendationInput { category: RecommendationCategory!, name: String!, aliases: [String!], content: String, embedsJson: String, curatorName: String, curatorUserId: String, introductionMode: RecommendationIntroductionMode, introduction: String, description: String, url: String }
      type RecommendationCategorySettings { category: RecommendationCategory!, introduction: String! }
      input RecommendationCategorySettingsInput { category: RecommendationCategory!, introduction: String! }
      type RecommendationListSettings { title: String!, introduction: String!, color: Int! }
      input RecommendationListSettingsInput { title: String!, introduction: String!, color: Int! }
      type RecommendationTasteTestSettings { title: String!, introduction: String!, color: Int!, moderatorHeading: String!, boosterHeading: String! }
      input RecommendationTasteTestSettingsInput { title: String!, introduction: String!, color: Int!, moderatorHeading: String!, boosterHeading: String! }
      type RecommendationLists { tasteTest: RecommendationTasteTestSettings!, characters: RecommendationListSettings!, writers: RecommendationListSettings! }
      input RecommendationListsInput { tasteTest: RecommendationTasteTestSettingsInput!, characters: RecommendationListSettingsInput!, writers: RecommendationListSettingsInput! }
      type RecommendationSettings { lists: RecommendationLists!, categories: [RecommendationCategorySettings!]! }
      input RecommendationSettingsInput { lists: RecommendationListsInput!, categories: [RecommendationCategorySettingsInput!]! }
      extend type Query { recommendationSettings(guildId: ID!): RecommendationSettings! }
      extend type Query { recommendationEntries(guildId: ID!): [RecommendationEntry!]! }
      extend type Mutation {
        updateRecommendationSettings(guildId: ID!, input: RecommendationSettingsInput!): RecommendationSettings!
        createRecommendation(guildId: ID!, input: RecommendationInput!): RecommendationEntry!
        updateRecommendation(guildId: ID!, id: ID!, input: RecommendationInput!): RecommendationEntry!
        deleteRecommendation(guildId: ID!, id: ID!): Boolean!
      }
    `,
    resolvers: {
      async recommendationSettings({ guildId }: { guildId: string }, context: Context) {
        await authorize(context, guildId);
        return settingsFor(db, guildId);
      },
      async updateRecommendationSettings({ guildId, input }: { guildId: string; input: Settings }, context: Context) {
        await authorize(context, guildId, true);
        const validColor = (color: unknown) => Number.isInteger(color) && (color as number) >= 0 && (color as number) <= 0xffffff;
        const validList = (list: ListSettings) => list.title.trim() && list.title.length <= 256 && list.introduction.length <= 2000 && validColor(list.color);
        const { tasteTest, characters, writers } = input.lists;
        if (![tasteTest, characters, writers].every(validList) || [tasteTest.moderatorHeading, tasteTest.boosterHeading].some(heading => !heading.trim() || heading.length > 200)) throw new Error('Each list needs a title (up to 256 characters), an introduction (up to 2,000 characters), and a valid color; Taste Test headings can be up to 200 characters.');
        if (input.categories.length !== 4 || new Set(input.categories.map(item => item.category)).size !== 4 || input.categories.some(item => !categories.includes(item.category.toLowerCase() as typeof categories[number]) || item.introduction.length > 2000)) throw new Error('Configure all four categories with introductions up to 2,000 characters.');
        return db.transaction(async tx => {
          await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${'robotman-recommendations:' + guildId}))`);
          const entries = await tx.select().from(recommendationEntries).where(eq(recommendationEntries.guildId, guildId));
          for (const entry of entries) {
            try { effectiveReply(entry, input); } catch (error) { throw new Error(`${entry.name}: ${error instanceof Error ? error.message : 'Reply is invalid'}`); }
          }
          await tx.insert(recommendationSettings).values({ guildId, data: { ...input } }).onConflictDoUpdate({ target: recommendationSettings.guildId, set: { data: { ...input } } });
          return input;
        });
      },
      async recommendationEntries({ guildId }: { guildId: string }, context: Context) {
        await authorize(context, guildId);
        const settings = await settingsFor(db, guildId);
        return (await db.select().from(recommendationEntries).where(eq(recommendationEntries.guildId, guildId)).orderBy(asc(recommendationEntries.category), asc(recommendationEntries.name))).map(row => present(row, settings));
      },
      async createRecommendation({ guildId, input }: { guildId: string; input: Input }, context: Context) {
        await authorize(context, guildId, true);
        return save(guildId, input, context);
      },
      async updateRecommendation({ guildId, id, input }: { guildId: string; id: string; input: Input }, context: Context) {
        await authorize(context, guildId, true);
        return save(guildId, input, context, id);
      },
      async deleteRecommendation({ guildId, id }: { guildId: string; id: string }, context: Context) {
        await authorize(context, guildId, true);
        const actorId = await auth?.authenticatedUserId(context);
        if (!actorId) throw new Error('Sign in required');
        await db.transaction(async tx => {
          const [row] = await tx.delete(recommendationEntries).where(and(eq(recommendationEntries.id, id), eq(recommendationEntries.guildId, guildId))).returning();
          if (!row) throw new Error('Recommendation Entry not found in this server.');
          await tx.insert(responseChangeHistory).values({ id: randomUUID(), guildId, responseId: row.id, subject: row.category, action: 'deleted', actorId, trigger: row.name });
        });
        return true;
      },
    },
  };
}
