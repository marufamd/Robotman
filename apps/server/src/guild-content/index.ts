import { randomUUID } from 'node:crypto';
import { and, asc, eq, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Sql } from 'postgres';
import { migrateDatabase } from '../database/migrate.js';
import { recommendationEntries, responseChangeHistory, responses } from '../database/schema.js';
import type { AuthExtension } from '../application.js';

interface GraphqlContext { request?: IncomingMessage; response?: ServerResponse; }
interface ResponseInput { trigger: string; aliases: string[]; content: string; embedsJson: string; }
type Category = 'character' | 'writer' | 'moderator' | 'booster';
interface RecommendationInput { category: Category; name: string; description: string; url: string; }

function normalizedInput(input: ResponseInput) {
  const trigger = input.trigger.trim();
  const aliases = input.aliases.map(alias => alias.trim());
  if (!trigger || aliases.some(alias => !alias) || new Set([trigger, ...aliases].map(value => value.toLocaleLowerCase('en-US'))).size !== aliases.length + 1) {
    throw new Error('Trigger and aliases must be non-empty and distinct.');
  }
  let embeds: Record<string, unknown>[];
  try {
    const parsed: unknown = JSON.parse(input.embedsJson || '[]');
    if (!Array.isArray(parsed) || parsed.some(embed => !embed || typeof embed !== 'object' || Array.isArray(embed))) throw new Error();
    embeds = parsed as Record<string, unknown>[];
  } catch {
    throw new Error('Embeds must be a JSON array of embed objects.');
  }
  if (embeds.length > 10) throw new Error('A Response can contain at most 10 embeds.');
  return { trigger, aliases, content: input.content, embeds };
}

export function createGuildContent(client: Sql, ormClient: Sql, auth?: AuthExtension) {
  const db = drizzle(ormClient);
  const fields = `
    type GuildResponse { id: ID!, guildId: ID!, trigger: String!, aliases: [String!]!, content: String!, embedsJson: String! }
    enum ResponseChangeAction { CREATED UPDATED DELETED }
    type ResponseChange { action: ResponseChangeAction!, actorId: ID!, guildId: ID!, responseId: ID!, occurredAt: String!, trigger: String! }
    input ResponseInput { trigger: String!, aliases: [String!]!, content: String!, embedsJson: String! }
    enum RecommendationCategory { CHARACTER WRITER MODERATOR BOOSTER }
    type RecommendationEntry { id: ID!, guildId: ID!, category: RecommendationCategory!, name: String!, description: String!, url: String! }
    input RecommendationInput { category: RecommendationCategory!, name: String!, description: String!, url: String! }
    extend type Query { responses(guildId: ID!): [GuildResponse!]! }
    extend type Query { responseChangeHistory(guildId: ID!): [ResponseChange!]! }
    extend type Query { recommendationEntries(guildId: ID!): [RecommendationEntry!]! }
    extend type Mutation {
      createResponse(guildId: ID!, input: ResponseInput!): GuildResponse!
      updateResponse(guildId: ID!, id: ID!, input: ResponseInput!): GuildResponse!
      deleteResponse(guildId: ID!, id: ID!): Boolean!
      createRecommendation(guildId: ID!, input: RecommendationInput!): RecommendationEntry!
      updateRecommendation(guildId: ID!, id: ID!, input: RecommendationInput!): RecommendationEntry!
      deleteRecommendation(guildId: ID!, id: ID!): Boolean!
    }
  `;
  const authorizeRead = async (context: GraphqlContext, guildId: string) => {
    if (!auth) throw new Error('Sign in required');
    await auth.requireManagedGuild(context, guildId);
  };
  const authorizeWrite = async (context: GraphqlContext, guildId: string) => {
    if (!auth) throw new Error('Sign in required');
    await auth.authorizeGuildWrite(context, guildId);
  };
  async function assertTriggersAvailable(tx: Parameters<Parameters<typeof db.transaction>[0]>[0], guildId: string, input: ReturnType<typeof normalizedInput>, exceptId?: string) {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${'robotman-response-triggers:' + guildId}))`);
    const rows = await tx.select({ id: responses.id, trigger: responses.trigger, aliases: responses.aliases })
      .from(responses).where(eq(responses.guildId, guildId));
    const used = new Set(rows.filter(row => row.id !== exceptId).flatMap(row => [row.trigger, ...row.aliases]).map(value => value.toLocaleLowerCase('en-US')));
    if ([input.trigger, ...input.aliases].some(value => used.has(value.toLocaleLowerCase('en-US')))) {
      throw new Error('Response trigger or alias is already in use in this Managed Guild.');
    }
  }
  return {
    schemaFields: fields,
    resolvers: {
      async responses({ guildId }: { guildId: string }, context: GraphqlContext) {
        await authorizeRead(context, guildId);
        const rows = await db.select().from(responses).where(eq(responses.guildId, guildId)).orderBy(asc(responses.trigger));
        return rows.map(row => ({ ...row, embedsJson: JSON.stringify(row.embeds) }));
      },
      async responseChangeHistory({ guildId }: { guildId: string }, context: GraphqlContext) {
        await authorizeRead(context, guildId);
        const rows = await db.select().from(responseChangeHistory).where(eq(responseChangeHistory.guildId, guildId))
          .orderBy(sql`${responseChangeHistory.occurredAt} desc`, sql`${responseChangeHistory.id} desc`);
        return rows.map(row => ({ ...row, action: row.action.toUpperCase(), occurredAt: row.occurredAt.toISOString() }));
      },
      async createResponse({ guildId, input }: { guildId: string; input: ResponseInput }, context: GraphqlContext) {
        await authorizeWrite(context, guildId);
        const value = normalizedInput(input);
        const actorId = auth?.authenticatedUserId(context);
        if (!actorId) throw new Error('Sign in required');
        const [row] = await db.transaction(async tx => {
          await assertTriggersAvailable(tx, guildId, value);
          const [created] = await tx.insert(responses).values({ id: randomUUID(), guildId, ...value }).returning();
          if (created) await tx.insert(responseChangeHistory).values({ id: randomUUID(), guildId, responseId: created.id, action: 'created', actorId, trigger: created.trigger });
          return created ? [created] : [];
        });
        if (!row) throw new Error('Could not save Response.');
        return { ...row, embedsJson: JSON.stringify(row.embeds) };
      },
      async updateResponse({ guildId, id, input }: { guildId: string; id: string; input: ResponseInput }, context: GraphqlContext) {
        await authorizeWrite(context, guildId);
        const value = normalizedInput(input);
        const actorId = auth?.authenticatedUserId(context);
        if (!actorId) throw new Error('Sign in required');
        const [row] = await db.transaction(async tx => {
          await assertTriggersAvailable(tx, guildId, value, id);
          const [updated] = await tx.update(responses).set({ ...value, updatedAt: new Date() })
            .where(and(eq(responses.id, id), eq(responses.guildId, guildId))).returning();
          if (updated) await tx.insert(responseChangeHistory).values({ id: randomUUID(), guildId, responseId: updated.id, action: 'updated', actorId, trigger: updated.trigger });
          return updated ? [updated] : [];
        });
        if (!row) throw new Error('Response not found in this Managed Guild.');
        return { ...row, embedsJson: JSON.stringify(row.embeds) };
      },
      async deleteResponse({ guildId, id }: { guildId: string; id: string }, context: GraphqlContext) {
        await authorizeWrite(context, guildId);
        const actorId = auth?.authenticatedUserId(context);
        if (!actorId) throw new Error('Sign in required');
        const [row] = await db.transaction(async tx => {
          const [deleted] = await tx.delete(responses).where(and(eq(responses.id, id), eq(responses.guildId, guildId))).returning({ id: responses.id, trigger: responses.trigger });
          if (deleted) await tx.insert(responseChangeHistory).values({ id: randomUUID(), guildId, responseId: deleted.id, action: 'deleted', actorId, trigger: deleted.trigger });
          return deleted ? [deleted] : [];
        });
        if (!row) throw new Error('Response not found in this Managed Guild.');
        return true;
      },
      async recommendationEntries({ guildId }: { guildId: string }, context: GraphqlContext) {
        await authorizeRead(context, guildId);
        const rows = await db.select().from(recommendationEntries).where(eq(recommendationEntries.guildId, guildId))
          .orderBy(asc(recommendationEntries.category), asc(recommendationEntries.name));
        return rows.map(row => ({ ...row, category: row.category.toUpperCase() }));
      },
      async createRecommendation({ guildId, input }: { guildId: string; input: RecommendationInput }, context: GraphqlContext) {
        await authorizeWrite(context, guildId);
        const name = input.name.trim();
        if (!name) throw new Error('Recommendation Entry name is required.');
        const [row] = await db.insert(recommendationEntries).values({ id: randomUUID(), guildId, ...input, category: input.category.toLowerCase(), name, url: input.url.trim() }).returning();
        if (!row) throw new Error('Could not save Recommendation Entry.');
        return { ...row, category: row.category.toUpperCase() };
      },
      async updateRecommendation({ guildId, id, input }: { guildId: string; id: string; input: RecommendationInput }, context: GraphqlContext) {
        await authorizeWrite(context, guildId);
        const name = input.name.trim();
        if (!name) throw new Error('Recommendation Entry name is required.');
        const [row] = await db.update(recommendationEntries).set({ ...input, category: input.category.toLowerCase(), name, url: input.url.trim(), updatedAt: new Date() })
          .where(and(eq(recommendationEntries.id, id), eq(recommendationEntries.guildId, guildId))).returning();
        if (!row) throw new Error('Recommendation Entry not found in this Managed Guild.');
        return { ...row, category: row.category.toUpperCase() };
      },
      async deleteRecommendation({ guildId, id }: { guildId: string; id: string }, context: GraphqlContext) {
        await authorizeWrite(context, guildId);
        const [row] = await db.delete(recommendationEntries).where(and(eq(recommendationEntries.id, id), eq(recommendationEntries.guildId, guildId))).returning({ id: recommendationEntries.id });
        if (!row) throw new Error('Recommendation Entry not found in this Managed Guild.');
        return true;
      },
    },
    start: () => migrateDatabase(client),
    close: async () => undefined,
  };
}
