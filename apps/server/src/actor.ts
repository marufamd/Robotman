import { sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type { AuthExtension } from './application.js';
import { discordUsers } from './database/schema.js';

type Context = Parameters<AuthExtension['authenticatedUser']>[0];

/** Resolves the signed-in dashboard user and remembers their current username for display in change history. */
export async function rememberActor(db: PostgresJsDatabase, auth: AuthExtension | undefined, context: Context) {
  const user = await auth?.authenticatedUser(context);
  if (!user) throw new Error('Sign in required');
  await db.insert(discordUsers).values(user).onConflictDoUpdate({
    target: discordUsers.id,
    set: { username: user.username },
    setWhere: sql`${discordUsers.username} is distinct from ${user.username}`,
  });
  return user;
}
