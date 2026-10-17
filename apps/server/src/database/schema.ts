import { sql } from 'drizzle-orm';
import { check, index, jsonb, pgTable, text, timestamp, date } from 'drizzle-orm/pg-core';

export const gameSessions = pgTable('robotman_game_sessions', {
  sessionId: text('session_id').primaryKey(),
  game: text('game').notNull(),
  guildId: text('guild_id').notNull(),
  channelId: text('channel_id').notNull(),
  players: jsonb('players').$type<string[]>().notNull(),
  state: jsonb('state').$type<Record<string, unknown>>().notNull(),
  status: text('status').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, table => [
  check('robotman_game_sessions_game_check', sql`${table.game} in ('connect-four', 'hangman', 'tic-tac-toe')`),
  check('robotman_game_sessions_status_check', sql`${table.status} in ('setting', 'active', 'finished', 'expired')`),
  index('robotman_game_sessions_expiry_idx').on(table.expiresAt).where(sql`${table.status} in ('setting', 'active')`),
]);

export const releaseListRuns = pgTable('robotman_release_list_runs', {
  releaseDate: date('release_date').primaryKey(),
  channelId: text('channel_id').notNull(),
  status: text('status').notNull(),
  attemptedAt: timestamp('attempted_at', { withTimezone: true }).notNull(),
  postedAt: timestamp('posted_at', { withTimezone: true }),
  errorText: text('error_text'),
}, table => [check('robotman_release_list_runs_status_check', sql`${table.status} in ('running', 'posted', 'failed')`)]);

export const responses = pgTable('robotman_responses', {
  id: text('response_id').primaryKey(),
  guildId: text('guild_id').notNull(),
  trigger: text('trigger').notNull(),
  aliases: jsonb('aliases').$type<string[]>().notNull().default([]),
  content: text('content').notNull().default(''),
  embeds: jsonb('embeds').$type<Record<string, unknown>[]>().notNull().default([]),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, table => [index('robotman_responses_guild_idx').on(table.guildId, table.trigger)]);

export const responseChangeHistory = pgTable('robotman_response_change_history', {
  id: text('change_id').primaryKey(),
  guildId: text('guild_id').notNull(),
  responseId: text('response_id').notNull(),
  action: text('action').notNull(),
  actorId: text('actor_id').notNull(),
  trigger: text('trigger').notNull(),
  occurredAt: timestamp('occurred_at', { withTimezone: true }).defaultNow().notNull(),
}, table => [
  check('robotman_response_history_action_check', sql`${table.action} in ('created', 'updated', 'deleted')`),
  index('robotman_response_history_guild_idx').on(table.guildId, table.occurredAt),
]);

export const recommendationEntries = pgTable('robotman_recommendation_entries', {
  id: text('recommendation_id').primaryKey(),
  guildId: text('guild_id').notNull(),
  category: text('category').notNull(),
  name: text('name').notNull(),
  description: text('description').notNull().default(''),
  url: text('url').notNull().default(''),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, table => [
  check('robotman_recommendations_category_check', sql`${table.category} in ('character', 'writer', 'moderator', 'booster')`),
  index('robotman_recommendations_guild_idx').on(table.guildId, table.category, table.name),
]);
