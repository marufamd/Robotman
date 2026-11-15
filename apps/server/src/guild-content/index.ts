import { randomUUID } from 'node:crypto';
import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Sql } from 'postgres';
import { normalizeReply as normalizedInput } from '../rich-reply.js';
import { createRecommendations } from '../recommendations/index.js';
import { migrateDatabase } from '../database/migrate.js';
import { rememberActor as rememberActorFor } from '../actor.js';
import { discordUsers, responseChangeHistory, responseSettings, responses } from '../database/schema.js';
import { composeReply } from '../recommendations/model.js';
import type { AuthExtension } from '../application.js';

interface GraphqlContext { request?: IncomingMessage; response?: ServerResponse; }
interface ResponseInput { trigger: string; aliases: string[]; content: string; embedsJson: string; introductionMode?: string; introduction?: string; }

export function createGuildContent(client: Sql, ormClient: Sql, auth?: AuthExtension) {
  const db = drizzle(ormClient);
  const recommendations = createRecommendations(ormClient, auth);
  const fields = `
    type ResponseAuthor { id: ID!, username: String }
    enum IntroductionMode { INHERIT CUSTOM NONE }
    type GuildResponse { id: ID!, guildId: ID!, trigger: String!, aliases: [String!]!, content: String!, embedsJson: String!, introductionMode: IntroductionMode!, introduction: String!, effectiveIntroduction: String!, createdBy: ResponseAuthor, lastEditedBy: ResponseAuthor }
    type ResponseSettings { introduction: String! }
    input ResponseSettingsInput { introduction: String! }
    extend type Query { responseSettings(guildId: ID!): ResponseSettings! }
    extend type Mutation { updateResponseSettings(guildId: ID!, input: ResponseSettingsInput!): ResponseSettings! }
    enum ResponseChangeAction { CREATED UPDATED DELETED }
    enum ChangeSubject { RESPONSE CHARACTER WRITER MODERATOR BOOSTER }
    enum HistoryOrder { NEWEST OLDEST }
    type ChangeHistoryItem { action: ResponseChangeAction!, subject: ChangeSubject!, actorId: ID!, actorName: String, guildId: ID!, entryId: ID!, occurredAt: String!, trigger: String! }
    type ChangeHistoryPage { items: [ChangeHistoryItem!]!, total: Int!, page: Int!, pageCount: Int!, pageSize: Int! }
    extend type Query { changeHistory(guildId: ID!, page: Int = 1, pageSize: Int = 25, order: HistoryOrder = NEWEST): ChangeHistoryPage! }
    type ResponseChange { action: ResponseChangeAction!, actorId: ID!, guildId: ID!, responseId: ID!, occurredAt: String!, trigger: String! }
    input ResponseInput { trigger: String!, aliases: [String!]!, content: String!, embedsJson: String!, introductionMode: IntroductionMode, introduction: String }
    extend type Query { responses(guildId: ID!): [GuildResponse!]! }
    extend type Query { responseChangeHistory(guildId: ID!): [ResponseChange!]! }
    extend type Mutation {
      createResponse(guildId: ID!, input: ResponseInput!): GuildResponse!
      updateResponse(guildId: ID!, id: ID!, input: ResponseInput!): GuildResponse!
      deleteResponse(guildId: ID!, id: ID!): Boolean!
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
  const rememberActor = (context: GraphqlContext) => rememberActorFor(db, auth, context);
  const defaultIntroductionFor = async (database: Pick<typeof db, 'select'>, guildId: string) => (await database.select().from(responseSettings).where(eq(responseSettings.guildId, guildId)))[0]?.introduction ?? '';
  const introductionFor = (row: { introductionMode: string; introduction: string }, defaultIntroduction: string) => row.introductionMode === 'none' ? '' : row.introductionMode === 'custom' ? row.introduction : defaultIntroduction;
  /** The introduction fields of a saved Response, checked together with its text against Discord's limits. */
  async function storedIntroduction(database: Pick<typeof db, 'select'>, guildId: string, input: ResponseInput, value: ReturnType<typeof normalizedInput>) {
    const mode = (input.introductionMode ?? 'INHERIT').toLowerCase();
    const introduction = mode === 'custom' ? input.introduction ?? '' : '';
    composeReply({ name: value.trigger, aliases: value.aliases, content: value.content, embeds: value.embeds }, introductionFor({ introductionMode: mode, introduction }, await defaultIntroductionFor(database, guildId)));
    return { introductionMode: mode, introduction };
  }
  async function withAuthors(rows: Array<typeof responses.$inferSelect>, guildId: string) {
    if (!rows.length) return [];
    const ids = rows.map(row => row.id);
    const authors = (action: 'created' | 'updated') => db.selectDistinctOn([responseChangeHistory.responseId], {
      responseId: responseChangeHistory.responseId, id: responseChangeHistory.actorId, username: discordUsers.username,
    }).from(responseChangeHistory).leftJoin(discordUsers, eq(discordUsers.id, responseChangeHistory.actorId))
      .where(and(eq(responseChangeHistory.guildId, guildId), inArray(responseChangeHistory.responseId, ids), eq(responseChangeHistory.action, action)))
      .orderBy(asc(responseChangeHistory.responseId), action === 'created' ? asc(responseChangeHistory.occurredAt) : desc(responseChangeHistory.occurredAt), action === 'created' ? asc(responseChangeHistory.id) : desc(responseChangeHistory.id));
    const [creators, editors] = await Promise.all([authors('created'), authors('updated')]);
    const createdBy = new Map(creators.map(({ responseId, ...author }) => [responseId, author]));
    const lastEditedBy = new Map(editors.map(({ responseId, ...author }) => [responseId, author]));
    const defaultIntroduction = await defaultIntroductionFor(db, guildId);
    return rows.map(row => ({ ...row, introductionMode: row.introductionMode.toUpperCase(), effectiveIntroduction: introductionFor(row, defaultIntroduction), embedsJson: JSON.stringify(row.embeds), createdBy: createdBy.get(row.id) ?? null, lastEditedBy: lastEditedBy.get(row.id) ?? null }));
  }
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
    schemaFields: fields + recommendations.schemaFields,
    resolvers: {
      async responses({ guildId }: { guildId: string }, context: GraphqlContext) {
        await authorizeRead(context, guildId);
        await rememberActor(context);
        const rows = await db.select().from(responses).where(eq(responses.guildId, guildId)).orderBy(asc(responses.trigger));
        return withAuthors(rows, guildId);
      },
      async responseSettings({ guildId }: { guildId: string }, context: GraphqlContext) {
        await authorizeRead(context, guildId);
        return { introduction: await defaultIntroductionFor(db, guildId) };
      },
      async updateResponseSettings({ guildId, input }: { guildId: string; input: { introduction: string } }, context: GraphqlContext) {
        await authorizeWrite(context, guildId);
        if (input.introduction.length > 2000) throw new Error('The introduction must be 2,000 characters or fewer.');
        await db.transaction(async tx => {
          await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${'robotman-response-triggers:' + guildId}))`);
          for (const row of await tx.select().from(responses).where(eq(responses.guildId, guildId))) {
            try { composeReply({ name: row.trigger, aliases: row.aliases, content: row.content, embeds: row.embeds }, introductionFor(row, input.introduction)); }
            catch (error) { throw new Error(`${row.trigger}: ${error instanceof Error ? error.message : 'Reply is invalid'}`); }
          }
          await tx.insert(responseSettings).values({ guildId, introduction: input.introduction }).onConflictDoUpdate({ target: responseSettings.guildId, set: { introduction: input.introduction } });
        });
        return { introduction: input.introduction };
      },
      async changeHistory({ guildId, page, pageSize, order }: { guildId: string; page: number; pageSize: number; order: 'NEWEST' | 'OLDEST' }, context: GraphqlContext) {
        await authorizeRead(context, guildId);
        const size = Math.min(Math.max(Math.trunc(pageSize) || 25, 1), 100);
        const [counted] = await db.select({ total: sql<number>`count(*)::int` }).from(responseChangeHistory).where(eq(responseChangeHistory.guildId, guildId));
        const total = counted?.total ?? 0;
        const pageCount = Math.max(1, Math.ceil(total / size));
        const current = Math.min(Math.max(Math.trunc(page) || 1, 1), pageCount);
        const direction = order === 'OLDEST' ? asc : desc;
        const rows = await db.select({ change: responseChangeHistory, actorName: discordUsers.username }).from(responseChangeHistory)
          .leftJoin(discordUsers, eq(discordUsers.id, responseChangeHistory.actorId))
          .where(eq(responseChangeHistory.guildId, guildId))
          .orderBy(direction(responseChangeHistory.occurredAt), direction(responseChangeHistory.id))
          .limit(size).offset((current - 1) * size);
        return { total, page: current, pageCount, pageSize: size, items: rows.map(({ change, actorName }) => ({
          action: change.action.toUpperCase(), subject: change.subject.toUpperCase(), actorId: change.actorId, actorName, guildId: change.guildId,
          entryId: change.responseId, occurredAt: change.occurredAt.toISOString(), trigger: change.trigger,
        })) };
      },
      async responseChangeHistory({ guildId }: { guildId: string }, context: GraphqlContext) {
        await authorizeRead(context, guildId);
        const rows = await db.select().from(responseChangeHistory).where(and(eq(responseChangeHistory.guildId, guildId), eq(responseChangeHistory.subject, 'response')))
          .orderBy(sql`${responseChangeHistory.occurredAt} desc`, sql`${responseChangeHistory.id} desc`);
        return rows.map(row => ({ ...row, action: row.action.toUpperCase(), occurredAt: row.occurredAt.toISOString() }));
      },
      async createResponse({ guildId, input }: { guildId: string; input: ResponseInput }, context: GraphqlContext) {
        await authorizeWrite(context, guildId);
        const value = normalizedInput(input);
        const { id: actorId } = await rememberActor(context);
        const [row] = await db.transaction(async tx => {
          await assertTriggersAvailable(tx, guildId, value);
          const stored = await storedIntroduction(tx, guildId, input, value);
          const [created] = await tx.insert(responses).values({ id: randomUUID(), guildId, ...value, ...stored }).returning();
          if (created) await tx.insert(responseChangeHistory).values({ id: randomUUID(), guildId, responseId: created.id, action: 'created', actorId, trigger: created.trigger });
          return created ? [created] : [];
        });
        if (!row) throw new Error('Could not save Response.');
        return (await withAuthors([row], guildId))[0];
      },
      async updateResponse({ guildId, id, input }: { guildId: string; id: string; input: ResponseInput }, context: GraphqlContext) {
        await authorizeWrite(context, guildId);
        const value = normalizedInput(input);
        const { id: actorId } = await rememberActor(context);
        const [row] = await db.transaction(async tx => {
          await assertTriggersAvailable(tx, guildId, value, id);
          const stored = await storedIntroduction(tx, guildId, input, value);
          const [updated] = await tx.update(responses).set({ ...value, ...stored, updatedAt: new Date() })
            .where(and(eq(responses.id, id), eq(responses.guildId, guildId))).returning();
          if (updated) await tx.insert(responseChangeHistory).values({ id: randomUUID(), guildId, responseId: updated.id, action: 'updated', actorId, trigger: updated.trigger });
          return updated ? [updated] : [];
        });
        if (!row) throw new Error('Response not found in this Managed Guild.');
        return (await withAuthors([row], guildId))[0];
      },
      async deleteResponse({ guildId, id }: { guildId: string; id: string }, context: GraphqlContext) {
        await authorizeWrite(context, guildId);
        const actorId = await auth?.authenticatedUserId(context);
        if (!actorId) throw new Error('Sign in required');
        const [row] = await db.transaction(async tx => {
          const [deleted] = await tx.delete(responses).where(and(eq(responses.id, id), eq(responses.guildId, guildId))).returning({ id: responses.id, trigger: responses.trigger });
          if (deleted) await tx.insert(responseChangeHistory).values({ id: randomUUID(), guildId, responseId: deleted.id, action: 'deleted', actorId, trigger: deleted.trigger });
          return deleted ? [deleted] : [];
        });
        if (!row) throw new Error('Response not found in this Managed Guild.');
        return true;
      },
      ...recommendations.resolvers,
    },
    start: () => migrateDatabase(client),
    close: async () => undefined,
  };
}
