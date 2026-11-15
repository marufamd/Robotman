import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Sql } from 'postgres';
import { moderatorSettings } from '../database/schema.js';
import type { AuthExtension } from '../application.js';

export const defaultTvmazeShowIds = [
  13, 689, 706, 1850, 1851, 1859, 20683, 27557, 33452, 36745, 36774, 37776,
  37809, 39764, 40884, 42668, 42827, 44751, 44776, 44777, 45844, 47261, 50603,
  51042, 52243, 55414, 55415, 57400, 59492, 60920, 61066, 66738, 73090,
] as const;

export type GuildModeratorSettings = {
  guildId: string;
  releaseListChannelId: string | null;
  releaseListDayOfWeek: number;
  releaseListHour: number;
  releaseListMinute: number;
  releaseListTimeZone: string;
  tvmazeShowIds: number[];
};

export const defaultGuildModeratorSettings = (guildId: string): GuildModeratorSettings => ({
  guildId,
  releaseListChannelId: null,
  releaseListDayOfWeek: 0,
  releaseListHour: 0,
  releaseListMinute: 0,
  releaseListTimeZone: 'UTC',
  tvmazeShowIds: [...defaultTvmazeShowIds],
});

export async function getGuildModeratorSettings(client: Sql, guildId: string): Promise<GuildModeratorSettings> {
  const db = drizzle(client);
  const [row] = await db.select().from(moderatorSettings).where(eq(moderatorSettings.guildId, guildId)).limit(1);
  return row ? {
    guildId: row.guildId,
    releaseListChannelId: row.releaseListChannelId,
    releaseListDayOfWeek: row.releaseListDayOfWeek,
    releaseListHour: row.releaseListHour,
    releaseListMinute: row.releaseListMinute,
    releaseListTimeZone: row.releaseListTimeZone,
    tvmazeShowIds: row.tvmazeShowIds,
  } : defaultGuildModeratorSettings(guildId);
}

interface GraphqlContext { request?: IncomingMessage; response?: ServerResponse; }
interface ModeratorSettingsInput {
  releaseListChannelId: string | null;
  releaseListDayOfWeek: number;
  releaseListHour: number;
  releaseListMinute: number;
  releaseListTimeZone: string;
  tvmazeShowIds: number[];
}

function normalizeInput(input: ModeratorSettingsInput): ModeratorSettingsInput {
  const channelId = input.releaseListChannelId?.trim() || null;
  if (channelId !== null && !/^\d{17,20}$/.test(channelId)) {
    throw new Error('Choose a valid Discord channel or leave the release-list channel unset.');
  }
  if (!Number.isInteger(input.releaseListDayOfWeek) || input.releaseListDayOfWeek < 0 || input.releaseListDayOfWeek > 6) {
    throw new Error('Release-list weekday must be between 0 (Sunday) and 6 (Saturday).');
  }
  if (!Number.isInteger(input.releaseListHour) || input.releaseListHour < 0 || input.releaseListHour > 23) throw new Error('Release-list hour must be between 0 and 23.');
  if (!Number.isInteger(input.releaseListMinute) || input.releaseListMinute < 0 || input.releaseListMinute > 59) throw new Error('Release-list minute must be between 0 and 59.');
  const timeZone = input.releaseListTimeZone.trim();
  try { new Intl.DateTimeFormat('en-US', { timeZone }).format(new Date(0)); }
  catch { throw new Error('Release-list time zone must be a valid IANA time zone.'); }
  if (!Array.isArray(input.tvmazeShowIds) || input.tvmazeShowIds.some(id => !Number.isSafeInteger(id) || id < 1) || new Set(input.tvmazeShowIds).size !== input.tvmazeShowIds.length) {
    throw new Error('TVmaze show IDs must be distinct positive integers.');
  }
  return { ...input, releaseListChannelId: channelId, releaseListTimeZone: timeZone };
}

export function createModeratorSettings(client: Sql, ormClient: Sql, auth?: AuthExtension) {
  const db = drizzle(ormClient);
  const schemaFields = `
    type ModeratorSettings {
      guildId: ID!
      releaseListChannelId: String
      releaseListDayOfWeek: Int!
      releaseListHour: Int!
      releaseListMinute: Int!
      releaseListTimeZone: String!
      tvmazeShowIds: [Int!]!
    }
    input ModeratorSettingsInput {
      releaseListChannelId: String
      releaseListDayOfWeek: Int!
      releaseListHour: Int!
      releaseListMinute: Int!
      releaseListTimeZone: String!
      tvmazeShowIds: [Int!]!
    }
    extend type Query { moderatorSettings(guildId: ID!): ModeratorSettings! }
    extend type Mutation { updateModeratorSettings(guildId: ID!, input: ModeratorSettingsInput!): ModeratorSettings! }
  `;
  async function authorizeRead(context: GraphqlContext, guildId: string) {
    if (!auth) throw new Error('Sign in required');
    await auth.requireManagedGuild(context, guildId);
  }
  async function authorizeWrite(context: GraphqlContext, guildId: string) {
    if (!auth) throw new Error('Sign in required');
    await auth.authorizeGuildWrite(context, guildId);
  }
  return {
    schemaFields,
    resolvers: {
      async moderatorSettings({ guildId }: { guildId: string }, context: GraphqlContext) {
        await authorizeRead(context, guildId);
        return getGuildModeratorSettings(client, guildId);
      },
      async updateModeratorSettings({ guildId, input }: { guildId: string; input: ModeratorSettingsInput }, context: GraphqlContext) {
        await authorizeWrite(context, guildId);
        const value = normalizeInput(input);
        await db.insert(moderatorSettings).values({ guildId, ...value }).onConflictDoUpdate({
          target: moderatorSettings.guildId,
          set: value,
        });
        return getGuildModeratorSettings(client, guildId);
      },
    },
  };
}
