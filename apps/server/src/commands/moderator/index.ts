import { fetchReleases, FilterTypes, SortTypes } from 'comicgeeks';
import { migrateDatabase } from '../../database/migrate.js';
import {
  ApplicationCommandOptionType,
  InteractionResponseType,
  PermissionFlagsBits,
} from 'discord.js';
import type {
  APIApplicationCommandInteraction,
  APIInteractionResponse,
  RESTPostAPIChatInputApplicationCommandsJSONBody,
} from 'discord.js';
import type { CommandContext, CommandInteraction, CommandModule } from '../types.js';
import { getGuildModeratorSettings } from '../../moderator-settings/index.js';

type ComicRelease = {
  name: string;
  url: string;
  description: string;
  cover: string;
  price: string;
};
type TvShow = { id: number; name: string; image?: { original?: string } | null; network?: { name?: string } | null; webChannel?: { name?: string } | null };
type TvEpisode = {
  name: string;
  season: number;
  number: number | null;
  airdate: string | null;
  airtime?: string | null;
  summary?: string | null;
  show?: TvShow;
  _embedded?: { show?: TvShow };
};
type ScheduleConfig = { timeZone: string; dayOfWeek: number; hour: number; minute: number };

const tvmazeBaseUrl = 'https://api.tvmaze.com';
const commands: RESTPostAPIChatInputApplicationCommandsJSONBody[] = [
  {
    type: 1,
    name: 'release-list',
    description: 'Post the upcoming DC Comics and Milestone release list.',
    default_member_permissions: PermissionFlagsBits.ManageGuild.toString(),
    options: [{
      type: ApplicationCommandOptionType.String,
      name: 'date',
      description: 'Tuesday release date (YYYY-MM-DD). Defaults to the next Tuesday.',
      required: false,
    }],
  },
  {
    type: 1,
    name: 'shows',
    description: 'Show this week’s scheduled DC television episodes.',
    default_member_permissions: PermissionFlagsBits.ManageGuild.toString(),
    options: [{
      type: ApplicationCommandOptionType.String,
      name: 'date',
      description: 'Any date in the week to display (YYYY-MM-DD). Defaults to this week.',
      required: false,
    }],
  },
];

function reply(content: string, ephemeral = false, embeds: unknown[] = []): APIInteractionResponse {
  return {
    type: InteractionResponseType.ChannelMessageWithSource,
    data: { content, embeds, ...(ephemeral ? { flags: 64 } : {}), allowed_mentions: { parse: [] } },
  } as APIInteractionResponse;
}

function isCommand(interaction: CommandInteraction): interaction is APIApplicationCommandInteraction {
  return interaction.type === 2;
}

function optionValue(interaction: APIApplicationCommandInteraction, name: string): string | undefined {
  if (!('options' in interaction.data)) return undefined;
  const option = interaction.data.options?.find(item => item.name === name);
  return option && 'value' in option && typeof option.value === 'string' ? option.value : undefined;
}

function hasModeratorPermission(interaction: APIApplicationCommandInteraction): boolean {
  const permissions = interaction.member?.permissions;
  if (!permissions) return false;
  try {
    const granted = BigInt(permissions);
    return (granted & (PermissionFlagsBits.ManageGuild | PermissionFlagsBits.Administrator)) !== 0n;
  } catch {
    return false;
  }
}

function validateDate(value?: string): string | undefined {
  if (!value) return undefined;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value ? undefined : value;
}

function utcDate(year: number, month: number, day: number) {
  return new Date(Date.UTC(year, month - 1, day));
}

function addDateDays(date: string, days: number) {
  const parsed = new Date(`${date}T00:00:00.000Z`);
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return parsed.toISOString().slice(0, 10);
}

function nextTuesday(date: Date, timeZone: string): string {
  const parts = zonedParts(date, timeZone);
  const days = (2 - parts.dayOfWeek + 7) % 7;
  const delta = days === 0 && (parts.hour > 0 || parts.minute > 0) ? 7 : days;
  return addDateDays(parts.date, delta);
}

function weekMonday(date: string): string {
  const parsed = new Date(`${date}T00:00:00.000Z`);
  const day = parsed.getUTCDay();
  const daysBack = day === 0 ? 6 : day - 1;
  parsed.setUTCDate(parsed.getUTCDate() - daysBack);
  return parsed.toISOString().slice(0, 10);
}

function zonedParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find(part => part.type === type)?.value ?? '';
  const weekdays: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return {
    year: Number(value('year')),
    month: Number(value('month')),
    day: Number(value('day')),
    hour: Number(value('hour')),
    minute: Number(value('minute')),
    dayOfWeek: weekdays[value('weekday')] ?? 0,
    date: `${value('year')}-${value('month')}-${value('day')}`,
  };
}

function localTimeToUtc(date: string, hour: number, minute: number, timeZone: string) {
  const [yearText, monthText, dayText] = date.split('-');
  const year = Number(yearText), month = Number(monthText), day = Number(dayText);
  const target = Date.UTC(year, month - 1, day, hour, minute);
  let candidate = target;
  for (let attempt = 0; attempt < 4; attempt++) {
    const shown = zonedParts(new Date(candidate), timeZone);
    const shownUtc = Date.UTC(shown.year, shown.month - 1, shown.day, shown.hour, shown.minute);
    const difference = target - shownUtc;
    if (difference === 0) break;
    candidate += difference;
  }
  return new Date(candidate);
}

export function nextReleaseScheduleTime(after: Date, config: Pick<ScheduleConfig, 'timeZone' | 'dayOfWeek' | 'hour' | 'minute'>): Date {
  const current = zonedParts(after, config.timeZone);
  let days = (config.dayOfWeek - current.dayOfWeek + 7) % 7;
  if (days === 0 && (current.hour > config.hour || (current.hour === config.hour && current.minute >= config.minute))) days = 7;
  const date = addDateDays(current.date, days);
  return localTimeToUtc(date, config.hour, config.minute, config.timeZone);
}

function decodeHtml(value: string) {
  return value
    .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([\da-f]+);/gi, (_, code: string) => String.fromCodePoint(Number.parseInt(code, 16)));
}

function textContent(html: string) {
  return decodeHtml(html.replace(/<br\s*\/?\s*>/gi, '\n').replace(/<\/(?:p|div|li|h\d)>/gi, '\n').replace(/<[^>]+>/g, ''))
    .replace(/[\t\r ]+/g, ' ').replace(/\n\s*\n+/g, '\n').trim();
}

export async function fetchReleaseList(date: string): Promise<ComicRelease[]> {
  const releases = await fetchReleases(date, { publishers: [1, 59], filter: [FilterTypes.Regular, FilterTypes.Digital, FilterTypes.Annual], sort: SortTypes.AlphaAsc });
  return releases.map(item => ({ name: item.name, url: item.url, description: item.description ?? '', cover: item.cover, price: item.price ?? '' }));
}

function releaseEmbeds(releases: ComicRelease[]) {
  return releases.map(release => ({
    title: release.name.slice(0, 256),
    url: release.url,
    description: release.description.slice(0, 4096) || undefined,
    color: 0x0076b9,
    ...(release.cover ? { thumbnail: { url: release.cover } } : {}),
    footer: { text: (release.price ? `Cover Price: ${release.price}` : 'League of Comic Geeks').slice(0, 1024) },
  }));
}

export function formatReleaseList(date: string, releases: ComicRelease[]) {
  return {
    content: `**__Comics Release List for ${date}__**${releases.length ? '' : '\nNo comics are listed for this week yet.'}`,
    embeds: releaseEmbeds(releases),
  };
}

function stripHtml(html: string) {
  return textContent(html).replace(/\s+/g, ' ').trim();
}

function pad(value: number) { return String(value).padStart(2, '0'); }

function cleanSummary(summary?: string | null) {
  if (!summary) return '';
  return stripHtml(summary).slice(0, 900);
}

export async function fetchShowSchedule(fetcher: typeof globalThis.fetch, weekDate: string, showIds: ReadonlySet<number>) {
  const monday = weekMonday(weekDate);
  const episodes: Array<{ episode: TvEpisode; show: TvShow; streaming: boolean }> = [];
  for (let day = 0; day < 7; day++) {
    const date = addDateDays(monday, day);
    for (const streaming of [false, true]) {
      const url = new URL(streaming ? '/schedule/web' : '/schedule', tvmazeBaseUrl);
      url.searchParams.set('date', date);
      const response = await fetcher(url, { signal: AbortSignal.timeout(15_000) });
      if (!response.ok) throw new Error(`TVmaze returned HTTP ${response.status}`);
      const items = await response.json() as TvEpisode[];
      for (const episode of items) {
        const show = streaming ? episode._embedded?.show : episode.show;
        if (show && showIds.has(show.id) && episode.number !== null && episode.number !== undefined) episodes.push({ episode, show, streaming });
      }
    }
  }
  return episodes;
}

function episodeTemplate(entry: { episode: TvEpisode; show: TvShow; streaming: boolean }) {
  const { episode, show, streaming } = entry;
  const date = episode.airdate ?? '';
  const aired = date ? new Date(`${date}T00:00:00.000Z`) : undefined;
  const weekday = aired ? new Intl.DateTimeFormat('en-US', { weekday: 'long', timeZone: 'UTC' }).format(aired) : 'Unknown day';
  const displayedDate = aired ? `${Number(date.slice(5, 7))}/${Number(date.slice(8, 10))}` : 'date unknown';
  const time = episode.airtime
    ? new Date(`1970-01-01T${episode.airtime}Z`).toLocaleTimeString('en-US', { timeZone: 'UTC', hour: 'numeric', minute: '2-digit' }).toUpperCase()
    : 'TBA';
  const network = show.network?.name ?? show.webChannel?.name ?? 'Unknown network/channel';
  const number = episode.number === null ? '' : `S${pad(episode.season)}E${pad(episode.number ?? 0)}`;
  const link = show.image?.original ? `(${show.image.original})` : '';
  const summary = cleanSummary(episode.summary);
  return [
    `[**${weekday}, ${displayedDate}:** ***${show.name}*** **${number}** - *${episode.name}*]${link}`,
    '',
    `Time/Date: ${date ? `${weekday}, ${date}` : 'Date not listed'}${streaming ? '' : ` ${time} ET`}`,
    '',
    `Network/Channel: ${network}`,
    ...(summary ? ['', `> ${summary}`] : []),
  ].join('\n');
}

function formatEpisodeCommentTemplates(weekDate: string, entries: Array<{ episode: TvEpisode; show: TvShow; streaming: boolean }>) {
  return `# Episode Comment Templates for the week of ${weekMonday(weekDate)}\n\n${entries.map(episodeTemplate).join('\n\n')}`;
}

async function sendTemplateFile(context: CommandContext, weekDate: string, content: string) {
  context.queueFollowup?.({
    content: 'Episode Comment Templates are attached as a text file.',
    allowed_mentions: { parse: [] },
    files: [{ name: `episode-comment-templates-${weekMonday(weekDate)}.txt`, content }],
  });
}

async function publishTemplates(context: CommandContext, weekDate: string, content: string) {
  const key = process.env.PASTEE_KEY?.trim();
  if (!key) {
    await sendTemplateFile(context, weekDate, content);
    return reply('Episode Comment Templates are attached as a text file.');
  }
  try {
    const response = await context.fetch('https://api.paste.ee/v1/pastes', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'X-Auth-Token': key },
      body: JSON.stringify({
        description: `Episode Comment Templates for the week of ${weekMonday(weekDate)}`,
        expiration: 'never',
        sections: [{ name: 'Comment Templates', syntax: 'markdown', contents: content }],
      }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) throw new Error(`Paste.ee returned HTTP ${response.status}`);
    const payload = await response.json() as { link?: unknown };
    if (typeof payload.link !== 'string' || !/^https:\/\/paste\.ee\//.test(payload.link)) throw new Error('Paste.ee did not return a valid paste link');
    return {
      type: InteractionResponseType.ChannelMessageWithSource,
      data: {
        content: 'Episode Comment Templates are ready.',
        components: [{ type: 1, components: [{ type: 2, style: 5, label: 'Comment Templates', url: payload.link }] }],
        allowed_mentions: { parse: [] },
      },
    } as APIInteractionResponse;
  } catch {
    await sendTemplateFile(context, weekDate, content);
    return reply('Episode Comment Templates are attached as a text file.');
  }
}

function apiUrl(path: string) { return `https://discord.com/api/v10${path}`; }

async function postDiscordMessage(context: CommandContext, channelId: string, body: Record<string, unknown>) {
  if (!context.botToken) throw new Error('Discord bot token is not configured');
  const response = await context.fetch(apiUrl(`/channels/${channelId}/messages`), {
    method: 'POST',
    headers: { authorization: `Bot ${context.botToken}`, 'content-type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`Discord returned HTTP ${response.status} when posting the release list`);
  return await response.json() as { id?: string };
}

function releaseNonce(channelId: string, date: string, index: number) {
  const input = `${channelId}:${date}:${index}`;
  let hash = 2_166_136_261;
  for (let position = 0; position < input.length; position++) hash = Math.imul(hash ^ input.charCodeAt(position), 16_777_619);
  return `rl-${(hash >>> 0).toString(36)}`;
}

function embedCharacters(embed: Record<string, unknown>) {
  const footer = embed.footer as { text?: string } | undefined;
  const author = embed.author as { name?: string } | undefined;
  const fields = embed.fields as Array<{ name?: string; value?: string }> | undefined;
  return String(embed.title ?? '').length + String(embed.description ?? '').length
    + String(footer?.text ?? '').length + String(author?.name ?? '').length
    + (fields ?? []).reduce((length, field) => length + String(field.name ?? '').length + String(field.value ?? '').length, 0);
}

export function releaseEmbedPages(embeds: Array<Record<string, unknown>>) {
  const pages: Array<Array<Record<string, unknown>>> = [];
  let page: Array<Record<string, unknown>> = [];
  let characters = 0;
  for (const embed of embeds) {
    const size = embedCharacters(embed);
    if (size > 6000) throw new Error('An embed exceeds Discord’s aggregate character limit');
    if (page.length && (page.length >= 10 || characters + size > 6000)) {
      pages.push(page);
      page = [];
      characters = 0;
    }
    page.push(embed);
    characters += size;
  }
  if (page.length) pages.push(page);
  return pages;
}

async function deliverReleaseList(context: CommandContext, channelId: string, date: string, releases: ComicRelease[]) {
  const formatted = formatReleaseList(date, releases);
  const header = await postDiscordMessage(context, channelId, {
    content: formatted.content,
    nonce: releaseNonce(channelId, date, 0),
    enforce_nonce: true,
  });
  const embeds = formatted.embeds as Array<Record<string, unknown>>;
  for (const [index, page] of releaseEmbedPages(embeds).entries()) {
    await postDiscordMessage(context, channelId, {
      embeds: page,
      nonce: releaseNonce(channelId, date, index + 1),
      enforce_nonce: true,
    });
  }
  if (header.id) {
    await context.fetch(apiUrl(`/channels/${channelId}/pins/${header.id}`), {
      method: 'PUT',
      headers: { authorization: `Bot ${context.botToken}` },
      signal: AbortSignal.timeout(10_000),
    }).catch(() => undefined);
  }
}

export async function runScheduledReleaseList(
  context: CommandContext,
  input: { guildId: string; channelId: string; releaseDate: string; now?: Date },
): Promise<'posted' | 'already-posted' | 'in-progress'> {
  const date = validateDate(input.releaseDate);
  if (!date) throw new Error('Release date must be a valid YYYY-MM-DD date');
  const attemptedAt = (input.now ?? new Date()).toISOString();
  const claimed = await context.sql.begin(async tx => {
    await tx`SELECT pg_advisory_xact_lock(hashtext(${'robotman-release-list:' + input.guildId + ':' + date}))`;
    const [inserted] = await tx<{ release_date: string }[]>`
      INSERT INTO robotman_release_list_runs (guild_id, release_date, channel_id, status, attempted_at)
      VALUES (${input.guildId}, ${date}, ${input.channelId}, 'running', ${attemptedAt}::timestamptz)
      ON CONFLICT (guild_id, release_date) DO NOTHING
      RETURNING release_date`;
    if (inserted) return 'claimed' as const;
    const [existing] = await tx<{ status: string; attempted_at: Date | string }[]>`
      SELECT status, attempted_at FROM robotman_release_list_runs WHERE guild_id = ${input.guildId} AND release_date = ${date} FOR UPDATE`;
    if (!existing) return 'claimed' as const;
    if (existing.status === 'posted') return 'already-posted' as const;
    const age = new Date(attemptedAt).getTime() - new Date(existing.attempted_at).getTime();
    if (existing.status === 'running' && age < 15 * 60 * 1000) return 'in-progress' as const;
    await tx`UPDATE robotman_release_list_runs SET channel_id = ${input.channelId}, status = 'running', attempted_at = ${attemptedAt}::timestamptz, error_text = NULL WHERE guild_id = ${input.guildId} AND release_date = ${date}`;
    return 'claimed' as const;
  });
  if (claimed === 'already-posted') return claimed;
  if (claimed === 'in-progress') return claimed;
  try {
    const releases = await fetchReleaseList(date);
    await deliverReleaseList(context, input.channelId, date, releases);
    await context.sql`UPDATE robotman_release_list_runs SET status = 'posted', posted_at = ${attemptedAt}::timestamptz, error_text = NULL WHERE guild_id = ${input.guildId} AND release_date = ${date}`;
    return 'posted';
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown scheduled release-list error';
    await context.sql`UPDATE robotman_release_list_runs SET status = 'failed', error_text = ${message.slice(0, 1000)} WHERE guild_id = ${input.guildId} AND release_date = ${date}`;
    throw error;
  }
}

export async function runScheduledReleaseLists(context: CommandContext, now = new Date()) {
  if (!context.botToken) return [];
  const settings = await context.sql<{
    guild_id: string; release_list_channel_id: string | null; release_list_day_of_week: number;
    release_list_hour: number; release_list_minute: number; release_list_time_zone: string;
  }[]>`SELECT guild_id, release_list_channel_id, release_list_day_of_week, release_list_hour, release_list_minute, release_list_time_zone
      FROM robotman_moderator_settings WHERE release_list_channel_id IS NOT NULL`;
  const due = settings.flatMap(setting => {
    const local = zonedParts(now, setting.release_list_time_zone);
    const matches = local.dayOfWeek === setting.release_list_day_of_week
      && local.hour * 60 + local.minute === setting.release_list_hour * 60 + setting.release_list_minute;
    return matches && setting.release_list_channel_id
      ? [{ guildId: setting.guild_id, channelId: setting.release_list_channel_id, releaseDate: nextTuesday(now, setting.release_list_time_zone) }]
      : [];
  });
  return Promise.all(due.map(async input => ({ ...input, result: await runScheduledReleaseList(context, { ...input, now }) })));
}

function makeScheduler(context: CommandContext) {
  let stopped = false;
  let timer: ReturnType<typeof setInterval> | undefined;
  const tick = () => {
    if (stopped || activeScheduleRun) return;
    activeScheduleRun = runScheduledReleaseLists(context)
      .then(() => undefined)
      .catch(error => console.error('[moderator] Weekly release-list posting failed:', error))
      .finally(() => { activeScheduleRun = undefined; });
  };
  tick();
  timer = setInterval(tick, 30_000);
  timer.unref?.();
  return () => { stopped = true; if (timer) clearInterval(timer); };
}

export const moderatorModule: CommandModule = {
  commands,
  matches(interaction) {
    return isCommand(interaction) && (interaction.data.name === 'release-list' || interaction.data.name === 'shows');
  },
  deferEphemeral(interaction) {
    return isCommand(interaction) && interaction.data.name === 'release-list';
  },
  async start(context) {
    await migrateDatabase(context.sql);
    if (!context.botToken) {
      console.warn('[moderator] Bot token is unset; weekly release-list posting is disabled.');
      return;
    }
    closeScheduler = makeScheduler(context);
  },
  async close() {
    closeScheduler?.();
    closeScheduler = undefined;
    await activeScheduleRun;
  },
  async handle(interaction, context) {
    if (!isCommand(interaction)) return reply('This moderator interaction is not supported.', true);
    if (!interaction.guild_id) return reply('Moderator commands can only be used in a server.', true);
    if (!hasModeratorPermission(interaction)) return reply('You need Manage Server permission to use this command.', true);
    const dateInput = optionValue(interaction, 'date');
    if (dateInput && !validateDate(dateInput)) return reply('Enter a valid date in YYYY-MM-DD format.', true);
    const settings = await getGuildModeratorSettings(context.sql, interaction.guild_id);

    if (interaction.data.name === 'release-list') {
      if (!settings.releaseListChannelId) return reply('Configure a release-list channel in the dashboard before requesting a Release List.', true);
      const date = dateInput ?? nextTuesday(context.now?.() ?? new Date(), settings.releaseListTimeZone);
      try {
        const releases = await fetchReleaseList(date);
        await deliverReleaseList(context, settings.releaseListChannelId, date, releases);
        return reply(`The Release List for ${date} was sent to <#${settings.releaseListChannelId}>.`, true);
      } catch {
        return reply('The Release List could not be delivered. Try again later.', true);
      }
    }

    const date = dateInput ?? zonedParts(context.now?.() ?? new Date(), settings.releaseListTimeZone).date;
    try {
      const episodes = await fetchShowSchedule(context.fetch, date, new Set(settings.tvmazeShowIds));
      if (!episodes.length) return reply(`There are no episodes scheduled for the week of ${weekMonday(date)}.`);
      return await publishTemplates(context, date, formatEpisodeCommentTemplates(date, episodes));
    } catch {
      return reply('TVmaze schedules are unavailable right now. Try again later.', true);
    }
  },
};

let closeScheduler: (() => void) | undefined;
let activeScheduleRun: Promise<void> | undefined;
