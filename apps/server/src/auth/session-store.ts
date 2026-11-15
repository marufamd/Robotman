import { createHash } from 'node:crypto';
import postgres from 'postgres';
import { GraphQLError } from 'graphql';
import { DiscordResponseError } from './discord-http.js';
import { drizzle } from 'drizzle-orm/postgres-js';
import { eq, gt, and, lte, inArray } from 'drizzle-orm';
import { dashboardSessions, dashboardOauthStates } from '../database/schema.js';
import type { UserSession } from './index.js';

export const signInRequired = () => new GraphQLError('Sign in required', { extensions: { code: 'UNAUTHENTICATED' } });
function storageFailure(error: unknown): never {
  if (error instanceof GraphQLError || error instanceof DiscordResponseError) throw error;
  throw new GraphQLError('Sign-in service is temporarily unavailable. Please try again.', { extensions: { code: 'SERVICE_UNAVAILABLE' } });
}

const hash = (token: string) => createHash('sha256').update(token).digest('hex');

export function createSessionStore(databaseUrl?: string) {
  let url = databaseUrl;
  let client: ReturnType<typeof postgres> | undefined;
  const database = () => {
    if (!url) return storageFailure(new Error('Session database is not configured'));
    return drizzle(client ??= postgres(url, { connect_timeout: 2 }));
  };
  return {
    configure(value: string) { url ??= value; },
    async createState(nonce: string, state: string, expiresAt: number) {
      const db = database();
      const cutoff = new Date(expiresAt - 600_000);
      await db.delete(dashboardSessions).where(inArray(dashboardSessions.tokenHash,
        db.select({ key: dashboardSessions.tokenHash }).from(dashboardSessions).where(lte(dashboardSessions.expiresAt, cutoff)).limit(100))).catch(storageFailure);
      await db.delete(dashboardOauthStates).where(inArray(dashboardOauthStates.nonceHash,
        db.select({ key: dashboardOauthStates.nonceHash }).from(dashboardOauthStates).where(lte(dashboardOauthStates.expiresAt, cutoff)).limit(100))).catch(storageFailure);
      await db.insert(dashboardOauthStates).values({ nonceHash: hash(nonce), stateHash: hash(state), expiresAt: new Date(expiresAt) }).catch(storageFailure);
    },
    async consumeState(nonce: string, state: string, now: number) {
      const [pending] = await database().delete(dashboardOauthStates).where(eq(dashboardOauthStates.nonceHash, hash(nonce))).returning().catch(storageFailure);
      return Boolean(pending && pending.stateHash === hash(state) && pending.expiresAt.getTime() > now);
    },
    async get(token: string, now: number): Promise<UserSession | undefined> {
      const key = hash(token);
      const [row] = await database().select().from(dashboardSessions).where(and(eq(dashboardSessions.tokenHash, key), gt(dashboardSessions.expiresAt, new Date(now)))).catch(storageFailure);
      return row ? { ...row.data, key } : undefined;
    },
    async create(token: string, data: Omit<UserSession, 'key'>) {
      await database().insert(dashboardSessions).values({ tokenHash: hash(token), data, expiresAt: new Date(data.expiresAt) }).catch(storageFailure);
    },
    async capture(key: string, now: number, load: (session: UserSession) => Promise<void>) {
      // Lock only during first snapshot initialization; other instances reuse the committed snapshot.
      const result = await database().transaction(async tx => {
        const [row] = await tx.select().from(dashboardSessions).where(eq(dashboardSessions.tokenHash, key)).for('update');
        if (!row || row.expiresAt.getTime() <= now) throw signInRequired();
        const session = { ...row.data, key };
        let failure: unknown;
        if (!session.managedGuilds) {
          // A successful token refresh must survive a later server-list failure.
          try { await load(session); } catch (error) { failure = error; }
          const { key: _key, ...data } = session;
          await tx.update(dashboardSessions).set({ data }).where(eq(dashboardSessions.tokenHash, key));
        }
        return { guilds: session.managedGuilds!, failure };
      }).catch(storageFailure);
      if (result.failure) throw result.failure;
      return result.guilds;
    },
    async delete(token: string) { await database().delete(dashboardSessions).where(eq(dashboardSessions.tokenHash, hash(token))).catch(storageFailure); },
    async close() { await client?.end({ timeout: 2 }); },
  };
}
