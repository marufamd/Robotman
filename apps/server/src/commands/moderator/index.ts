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
type ScheduleConfig = { channelId: string; timeZone: string; dayOfWeek: number; hour: number; minute: number };

const locgBaseUrl = 'https://leagueofcomicgeeks.com';
const tvmazeBaseUrl = 'https://api.tvmaze.com';
const defaultShows = [
  13, 689, 706, 1850, 1851, 1859, 20683, 27557, 33452, 36745, 36774, 37776,
  37809, 39764, 40884, 42668, 42827, 44751, 44776, 44777, 45844, 47261, 50603,
  51042, 52243, 55414, 55415, 57400, 59492, 60920, 61066, 66738, 73090,
];
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

function scheduleConfig(): ScheduleConfig | undefined {
  const channelId = process.env.RELEASE_LIST_CHANNEL_ID?.trim();
  if (!channelId) return undefined;
  const timeZone = process.env.RELEASE_LIST_TIMEZONE?.trim() || 'UTC';
  const numberFromEnv = (key: string, fallback: number, min: number, max: number) => {
    const value = process.env[key];
    if (!value) return fallback;
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < min || parsed > max) throw new Error(`${key} must be an integer between ${min} and ${max}`);
    return parsed;
  };
  const config = {
    channelId,
    timeZone,
    dayOfWeek: numberFromEnv('RELEASE_LIST_DAY_OF_WEEK', 0, 0, 6),
    hour: numberFromEnv('RELEASE_LIST_HOUR', 0, 0, 23),
    minute: numberFromEnv('RELEASE_LIST_MINUTE', 0, 0, 59),
  };
  // Validate the IANA time zone before creating a timer that would otherwise fail later.
  zonedParts(new Date(), config.timeZone);
  return config;
}

function nextScheduleDate(now: Date, config: ScheduleConfig) {
  return nextReleaseScheduleTime(now, config);
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

function findByClass(html: string, classNames: string) {
  const names = classNames.split(/\s+/).map(name => name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const requiredClasses = names.map(name => `(?=[^"']*\\b${name}\\b)`).join('');
  const match = new RegExp(`<([a-z][a-z0-9]*)\\b[^>]*class=["']${requiredClasses}[^"']*["'][^>]*>([\\s\\S]*?)<\\/\\1>`, 'i').exec(html);
  return match?.[2] ?? '';
}

function attributes(tag: string) {
  const result: Record<string, string> = {};
  for (const match of tag.matchAll(/([\w-]+)\s*=\s*(["'])(.*?)\2/g)) result[match[1] ?? ''] = decodeHtml(match[3] ?? '');
  return result;
}

export function parseLocgReleaseList(html: string): ComicRelease[] {
  const releases: ComicRelease[] = [];
  const listItems = html.match(/<li\b[^>]*>[\s\S]*?<\/li>/gi) ?? [];
  for (const item of listItems) {
    const titleMarkup = findByClass(item, 'title color-primary');
    if (!titleMarkup) continue;
    const descriptionMarkup = findByClass(item, 'comic-description col-feed-max');
    const anchor = /<a\b[^>]*href=["']([^"']+)["'][^>]*>/i.exec(descriptionMarkup)?.[0] ?? '';
    const href = attributes(anchor).href ?? '';
    const coverTag = /<img\b[^>]*>/i.exec(findByClass(item, 'comic-cover-art'))?.[0] ?? '';
    const coverAttributes = attributes(coverTag);
    const details = findByClass(item, 'comic-details');
    const publisher = textContent(details).split('·')[0]?.trim() ?? '';
    const price = textContent(findByClass(item, 'price'));
    const cover = coverAttributes['data-src'] ?? coverAttributes.src ?? '';
    const title = textContent(titleMarkup);
    if (!title || !href) continue;
    releases.push({
      name: title,
      url: new URL(href, locgBaseUrl).toString(),
      description: textContent(descriptionMarkup.replace(/<a\b[^>]*>[\s\S]*?<\/a>/gi, '')),
      cover: cover ? new URL(cover.replace('medium', 'large'), locgBaseUrl).toString() : '',
      price,
    });
  }
  return releases.sort((left, right) => left.name.localeCompare(right.name));
}

export async function fetchReleaseList(fetcher: typeof globalThis.fetch, date: string): Promise<ComicRelease[]> {
  const url = new URL('/comic/get_comics', locgBaseUrl);
  for (const [key, value] of Object.entries({ list: 'releases', list_option: 'thumbs', view: 'list', date, date_type: 'week' })) url.searchParams.set(key, value);
  for (const publisher of [1, 59]) url.searchParams.append('publisher[]', String(publisher));
  for (const format of [1, 5, 6]) url.searchParams.append('format[]', String(format));
  const response = await fetcher(url, { headers: { 'user-agent': 'Robotman/7.0 (weekly release list)' }, signal: AbortSignal.timeout(15_000) });
  if (!response.ok) throw new Error(`League of Comic Geeks returned HTTP ${response.status}`);
  const payload = await response.json() as { list?: unknown };
  if (typeof payload.list !== 'string') throw new Error('League of Comic Geeks returned an unexpected release list response');
  return parseLocgReleaseList(payload.list);
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

function showEmbeds(weekDate: string, entries: Array<{ episode: TvEpisode; show: TvShow; streaming: boolean }>) {
  const templates = entries.map(episodeTemplate);
  const embeds: Array<Record<string, unknown>> = [];
  let current: string[] = [];
  let length = 0;
  for (const template of templates) {
    if (template.length > 3900) throw new Error('An episode summary exceeds the Discord embed limit');
    if (length + template.length + (current.length ? 2 : 0) > 3900 && current.length) {
      embeds.push({ title: 'Scheduled DC episodes', description: current.join('\n\n'), color: 0x438fcb, footer: { text: 'Episode data provided by TVmaze' } });
      current = [];
      length = 0;
    }
    current.push(template);
    length += template.length + (current.length > 1 ? 2 : 0);
  }
  if (current.length) embeds.push({ title: 'Scheduled DC episodes', description: current.join('\n\n'), color: 0x438fcb, footer: { text: 'Episode data provided by TVmaze' } });
  return {
    content: `Episode comments for the week of ${weekMonday(weekDate)}`,
    pages: releaseEmbedPages(embeds),
  };
}

function showIdsFromEnvironment(): ReadonlySet<number> {
  const input = process.env.TVMAZE_SHOW_IDS?.trim();
  if (!input) return new Set(defaultShows);
  const ids = input.split(',').map(value => Number(value.trim()));
  if (!ids.length || ids.some(value => !Number.isSafeInteger(value) || value < 1)) throw new Error('TVMAZE_SHOW_IDS must be a comma-separated list of positive integers');
  return new Set(ids);
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
  input: { channelId: string; releaseDate: string; now?: Date },
): Promise<'posted' | 'already-posted' | 'in-progress'> {
  const date = validateDate(input.releaseDate);
  if (!date) throw new Error('Release date must be a valid YYYY-MM-DD date');
  const claimed = await context.sql.begin(async tx => {
    await tx`SELECT pg_advisory_xact_lock(hashtext(${'robotman-release-list:' + date}))`;
    const [inserted] = await tx<{ release_date: string }[]>`
      INSERT INTO robotman_release_list_runs (release_date, channel_id, status, attempted_at)
      VALUES (${date}, ${input.channelId}, 'running', ${input.now ?? new Date()})
      ON CONFLICT (release_date) DO NOTHING
      RETURNING release_date`;
    if (inserted) return 'claimed' as const;
    const [existing] = await tx<{ status: string; attempted_at: Date | string }[]>`
      SELECT status, attempted_at FROM robotman_release_list_runs WHERE release_date = ${date} FOR UPDATE`;
    if (!existing) return 'claimed' as const;
    if (existing.status === 'posted') return 'already-posted' as const;
    const age = (input.now ?? new Date()).getTime() - new Date(existing.attempted_at).getTime();
    if (existing.status === 'running' && age < 15 * 60 * 1000) return 'in-progress' as const;
    await tx`UPDATE robotman_release_list_runs SET channel_id = ${input.channelId}, status = 'running', attempted_at = ${input.now ?? new Date()}, error_text = NULL WHERE release_date = ${date}`;
    return 'claimed' as const;
  });
  if (claimed === 'already-posted') return claimed;
  if (claimed === 'in-progress') return claimed;
  try {
    const releases = await fetchReleaseList(context.fetch, date);
    await deliverReleaseList(context, input.channelId, date, releases);
    await context.sql`UPDATE robotman_release_list_runs SET status = 'posted', posted_at = ${input.now ?? new Date()}, error_text = NULL WHERE release_date = ${date}`;
    return 'posted';
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown scheduled release-list error';
    await context.sql`UPDATE robotman_release_list_runs SET status = 'failed', error_text = ${message.slice(0, 1000)} WHERE release_date = ${date}`;
    throw error;
  }
}

function makeScheduler(context: CommandContext, config: ScheduleConfig) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let stopped = false;
  const schedule = () => {
    if (stopped) return;
    const when = nextScheduleDate(new Date(), config);
    const delay = Math.min(Math.max(when.getTime() - Date.now(), 0), 2_147_000_000);
    timer = setTimeout(() => {
      const releaseDate = nextTuesday(when, config.timeZone);
      activeScheduleRun = runScheduledReleaseList(context, { channelId: config.channelId, releaseDate })
        .then(() => undefined)
        .catch(error => console.error('[moderator] Weekly release-list posting failed:', error))
        .finally(() => { activeScheduleRun = undefined; schedule(); });
    }, delay);
    timer.unref?.();
  };
  schedule();
  return () => {
    stopped = true;
    if (timer) clearTimeout(timer);
  };
}

export const moderatorModule: CommandModule = {
  commands,
  matches(interaction) {
    return isCommand(interaction) && (interaction.data.name === 'release-list' || interaction.data.name === 'shows');
  },
  async start(context) {
    await migrateDatabase(context.sql);
    const channelId = process.env.RELEASE_LIST_CHANNEL_ID?.trim();
    if (!channelId) {
      console.warn('[moderator] RELEASE_LIST_CHANNEL_ID is unset; weekly release-list posting is disabled.');
      return;
    }
    if (!context.botToken) {
      console.warn('[moderator] Bot token is unset; weekly release-list posting is disabled.');
      return;
    }
    try {
      const config = scheduleConfig();
      if (config) closeScheduler = makeScheduler(context, config);
    } catch (error) {
      console.warn('[moderator] Invalid release-list schedule configuration; weekly posting is disabled:', error);
    }
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
    const configuredTimeZone = process.env.RELEASE_LIST_TIMEZONE?.trim() || 'UTC';
    if (dateInput && !validateDate(dateInput)) return reply('Enter a valid date in YYYY-MM-DD format.', true);

    if (interaction.data.name === 'release-list') {
      const date = dateInput ?? nextTuesday(new Date(), configuredTimeZone);
      try {
        const releases = await fetchReleaseList(context.fetch, date);
        const formatted = formatReleaseList(date, releases);
        const pages = releaseEmbedPages(formatted.embeds as Array<Record<string, unknown>>);
        if (pages.length > 1 && !context.queueFollowup) return reply('This release list needs follow-up messages, but follow-ups are unavailable right now.', true);
        for (const page of pages.slice(1)) context.queueFollowup?.({ embeds: page, allowed_mentions: { parse: [] } });
        return {
          type: InteractionResponseType.ChannelMessageWithSource,
          data: { content: formatted.content, ...(pages[0] ? { embeds: pages[0] } : {}), allowed_mentions: { parse: [] } },
        } as APIInteractionResponse;
      } catch {
        return reply('The League of Comic Geeks release list is unavailable right now. Try again later.', true);
      }
    }

    const date = dateInput ?? zonedParts(new Date(), configuredTimeZone).date;
    try {
      const episodes = await fetchShowSchedule(context.fetch, date, showIdsFromEnvironment());
      if (!episodes.length) return reply(`There are no episodes scheduled for the week of ${weekMonday(date)}.`);
      const formatted = showEmbeds(date, episodes);
      if (formatted.pages.length > 1 && !context.queueFollowup) return reply('This schedule needs follow-up messages, but follow-ups are unavailable right now.', true);
      for (const page of formatted.pages.slice(1)) context.queueFollowup?.({ embeds: page, allowed_mentions: { parse: [] } });
      return {
        type: InteractionResponseType.ChannelMessageWithSource,
        data: { content: formatted.content, ...(formatted.pages[0] ? { embeds: formatted.pages[0] } : {}), allowed_mentions: { parse: [] } },
      } as APIInteractionResponse;
    } catch {
      return reply('TVmaze schedules are unavailable right now. Try again later.', true);
    }
  },
};

let closeScheduler: (() => void) | undefined;
let activeScheduleRun: Promise<void> | undefined;
