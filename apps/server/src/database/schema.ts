import { sql } from 'drizzle-orm';
import { check, index, integer, jsonb, pgTable, primaryKey, text, timestamp, date } from 'drizzle-orm/pg-core';

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
  guildId: text('guild_id').notNull(),
  releaseDate: date('release_date').notNull(),
  channelId: text('channel_id').notNull(),
  status: text('status').notNull(),
  attemptedAt: timestamp('attempted_at', { withTimezone: true }).notNull(),
  postedAt: timestamp('posted_at', { withTimezone: true }),
  errorText: text('error_text'),
}, table => [
  primaryKey({ columns: [table.guildId, table.releaseDate] }),
  check('robotman_release_list_runs_status_check', sql`${table.status} in ('running', 'posted', 'failed')`),
]);

export const moderatorSettings = pgTable('robotman_moderator_settings', {
  guildId: text('guild_id').primaryKey(),
  releaseListChannelId: text('release_list_channel_id'),
  releaseListDayOfWeek: integer('release_list_day_of_week').notNull().default(0),
  releaseListHour: integer('release_list_hour').notNull().default(0),
  releaseListMinute: integer('release_list_minute').notNull().default(0),
  releaseListTimeZone: text('release_list_time_zone').notNull().default('UTC'),
  tvmazeShowIds: jsonb('tvmaze_show_ids').$type<number[]>().notNull(),
}, table => [
  check('robotman_moderator_settings_weekday_check', sql`${table.releaseListDayOfWeek} between 0 and 6`),
  check('robotman_moderator_settings_hour_check', sql`${table.releaseListHour} between 0 and 23`),
  check('robotman_moderator_settings_minute_check', sql`${table.releaseListMinute} between 0 and 59`),
]);

export const discordUsers = pgTable('robotman_discord_users', {
  id: text('user_id').primaryKey(),
  username: text('username').notNull(),
});

export const responses = pgTable('robotman_responses', {
  id: text('response_id').primaryKey(),
  guildId: text('guild_id').notNull(),
  trigger: text('trigger').notNull(),
  aliases: jsonb('aliases').$type<string[]>().notNull().default([]),
  content: text('content').notNull().default(''),
  embeds: jsonb('embeds').$type<Record<string, unknown>[]>().notNull().default([]),
  // inherit = the server's default Response introduction, custom = this Response's own, none = no introduction.
  introductionMode: text('introduction_mode').notNull().default('inherit'),
  introduction: text('introduction').notNull().default(''),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, table => [
  check('robotman_responses_introduction_mode_check', sql`${table.introductionMode} in ('inherit', 'custom', 'none')`),
  index('robotman_responses_guild_idx').on(table.guildId, table.trigger),
]);

export const responseSettings = pgTable('robotman_response_settings', {
  guildId: text('guild_id').primaryKey(),
  introduction: text('introduction').notNull().default(''),
});

export const responseChangeHistory = pgTable('robotman_response_change_history', {
  id: text('change_id').primaryKey(),
  guildId: text('guild_id').notNull(),
  responseId: text('response_id').notNull(),
  // What changed: a Response, or the category of a Recommendation Entry. The table predates recommendation history.
  subject: text('subject').notNull().default('response'),
  action: text('action').notNull(),
  actorId: text('actor_id').notNull(),
  trigger: text('trigger').notNull(),
  occurredAt: timestamp('occurred_at', { withTimezone: true }).defaultNow().notNull(),
}, table => [
  check('robotman_response_history_subject_check', sql`${table.subject} in ('response', 'character', 'writer', 'moderator', 'booster')`),
  check('robotman_response_history_action_check', sql`${table.action} in ('created', 'updated', 'deleted')`),
  index('robotman_response_history_guild_idx').on(table.guildId, table.occurredAt),
  index('robotman_response_history_authorship_idx').on(table.guildId, table.responseId, table.action, table.occurredAt, table.id),
]);

export const recommendationEntries = pgTable('robotman_recommendation_entries', {
  id: text('recommendation_id').primaryKey(),
  guildId: text('guild_id').notNull(),
  category: text('category').notNull(),
  name: text('name').notNull(),
  aliases: jsonb('aliases').$type<string[]>().notNull().default([]),
  content: text('content').notNull().default(''),
  embeds: jsonb('embeds').$type<Record<string, unknown>[]>().notNull().default([]),
  curatorName: text('curator_name').notNull().default(''),
  curatorUserId: text('curator_user_id'),
  introductionMode: text('introduction_mode').notNull().default('inherit'),
  introduction: text('introduction').notNull().default(''),
  description: text('description').notNull().default(''),
  url: text('url').notNull().default(''),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, table => [
  check('robotman_recommendations_category_check', sql`${table.category} in ('character', 'writer', 'moderator', 'booster')`),
  index('robotman_recommendations_guild_idx').on(table.guildId, table.category, table.name),
]);

export const dashboardSessions = pgTable('robotman_dashboard_sessions', {
  tokenHash: text('token_hash').primaryKey(),
  data: jsonb('data').$type<Omit<import('../auth/index.js').UserSession, 'key'>>().notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
}, table => [index('robotman_dashboard_sessions_expiry_idx').on(table.expiresAt)]);

export const dashboardOauthStates = pgTable('robotman_dashboard_oauth_states', {
  nonceHash: text('nonce_hash').primaryKey(),
  stateHash: text('state_hash').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
}, table => [index('robotman_dashboard_oauth_states_expiry_idx').on(table.expiresAt)]);

export const recommendationSettings = pgTable('robotman_recommendation_settings', {
  guildId: text('guild_id').primaryKey(),
  data: jsonb('data').$type<import('../recommendations/model.js').Settings>().notNull(),
});
