import { fileURLToPath } from 'node:url';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import type { Sql } from 'postgres';

export async function migrateDatabase(sql: Sql): Promise<void> {
  const parsers = { ...sql.options.parsers };
  const serializers = { ...sql.options.serializers };
  const connection = await sql.reserve();
  try {
    await connection`SELECT pg_advisory_lock(hashtext('robotman-v7-schema-migrations'))`;
    await migrate(drizzle(sql), { migrationsFolder: fileURLToPath(new URL('../../migrations/', import.meta.url)) });
  } finally {
    Object.assign(sql.options.parsers, parsers);
    Object.assign(sql.options.serializers, serializers);
    try { await connection`SELECT pg_advisory_unlock(hashtext('robotman-v7-schema-migrations'))`; }
    finally { connection.release(); }
  }
}
