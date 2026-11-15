import { randomUUID } from 'node:crypto';
import { fetchSearchResults, fetchReleases, fetchPulls, fetchUser, CollectionTypes, FilterTypes, SortTypes } from 'comicgeeks';
import { readFileSync } from 'node:fs';
import TurndownService from 'turndown';
import { parseDate } from 'chrono-node';
import type {
  APIApplicationCommandInteraction,
  APIEmbed,
  APIInteractionResponse,
  RESTPostAPIChatInputApplicationCommandsJSONBody,
} from 'discord.js';
import type { CommandContext, CommandInteraction, CommandModule } from '../types.js';

const LOCG = 'https://leagueofcomicgeeks.com';
const COMIC_VINE = 'https://comicvine.gamespot.com/api';
const TVMAZE = 'https://api.tvmaze.com';
const POKEAPI = 'https://pokeapi.co/api/v2';
const YOUTUBE_API = 'https://www.googleapis.com';
const MAX_QUERY_LENGTH = 180;
const colors: Record<string, number> = JSON.parse(readFileSync(new URL('../../../assets/colors.json', import.meta.url), 'utf8'));
const DEFAULT_COLOR = colors.ROBOTMAN!;
const markdown = new TurndownService();

const publisherData: Record<string, { id: number; name: string; color: number; thumbnail: string }> = JSON.parse(readFileSync(new URL('../../../assets/publishers.json', import.meta.url), 'utf8'));
const publishers = Object.entries(publisherData).map(([code, item]) => [code, item.name, item.id] as const);

const definitions = [
  simpleQuery('character', 'Search Comic Vine for a comic character.', 'Character name'),
  simpleQuery('locg', 'Search League of Comic Geeks for a comic series.', 'Series name'),
  {
    name: 'pull', description: 'View a publisher’s League of Comic Geeks releases for a Wednesday week.',
    options: [
      { name: 'publisher', description: 'Publisher (defaults to DC Comics)', type: 3, required: false, choices: publishers.map(([value, name]) => ({ name, value })) },
      { name: 'date', description: 'A date in the release week, e.g. YYYY-MM-DD or December 2 2020', type: 3, required: false },
    ],
  },
  {
    name: 'pull-user', description: 'View a League of Comic Geeks user’s pull list for a Wednesday week.',
    options: [
      { name: 'user', description: 'League of Comic Geeks username', type: 3, required: true },
      { name: 'date', description: 'A date in the release week, e.g. YYYY-MM-DD or December 2 2020', type: 3, required: false },
    ],
  },
  {
    name: 'letterboxd', description: 'View a Letterboxd member’s recent film diary or a film review.',
    options: [
      { name: 'username', description: 'Letterboxd username', type: 3, required: true },
      { name: 'film', description: 'A film title or “latest” to show a specific review', type: 3, required: false },
    ],
  },
  simpleQuery('movie', 'Search OMDb for a movie.', 'Movie title'),
  simpleQuery('show', 'Search TVmaze for a television show.', 'Show title'),
  simpleQuery('pokemon', 'Look up a Pokémon by name or Pokédex number.', 'Pokémon name or number'),
  simpleQuery('youtube', 'Search YouTube for videos.', 'What to search for'),
] satisfies RESTPostAPIChatInputApplicationCommandsJSONBody[];

function simpleQuery(name: string, description: string, label: string): RESTPostAPIChatInputApplicationCommandsJSONBody {
  return {
    name,
    description,
    options: [{ name: 'query', description: label, type: 3, required: true, max_length: MAX_QUERY_LENGTH }],
  };
}

const names = new Set(definitions.map(({ name }) => name));

function getOptions(interaction: APIApplicationCommandInteraction): Map<string, string | number> {
  if (interaction.data.type !== 1) return new Map();
  const options = new Map<string, string | number>();
  for (const option of interaction.data.options ?? []) {
    if (option.type === 3 || option.type === 4) options.set(option.name, option.value);
  }
  return options;
}

function response(content: string, ephemeral = false): APIInteractionResponse {
  return { type: 4, data: { content: content.slice(0, 2000), ...(ephemeral ? { flags: 64 } : {}) } };
}

function embedResponse(embed: APIEmbed, ephemeral = false): APIInteractionResponse {
  return { type: 4, data: { embeds: [embed], ...(ephemeral ? { flags: 64 } : {}) } };
}

function embed(title: string, url: string, description?: string, color = DEFAULT_COLOR): APIEmbed {
  return {
    title: title.slice(0, 256),
    url: safeUrl(url),
    color,
    ...(description?.trim() ? { description: description.trim().slice(0, 4000) } : {}),
  };
}

function safeUrl(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? parsed.toString() : undefined;
  } catch { return undefined; }
}

function field(title: string, value: string | undefined, inline = true) {
  if (!value?.trim()) return undefined;
  return { name: title.slice(0, 256), value: value.trim().slice(0, 1024), inline };
}

function inputText(input: string | number | undefined, requiredName: string): string | null {
  if (typeof input !== 'string' || !input.trim()) return null;
  const value = input.trim();
  return value.length <= MAX_QUERY_LENGTH ? value : null;
}

async function fetchResponse(context: CommandContext, url: string, timeout = 6500): Promise<Response> {
  return context.fetch(url, {
    headers: { accept: 'application/json, application/xml, text/xml, text/html;q=0.9', 'user-agent': 'Robotman/7 (Discord community bot)' },
    signal: AbortSignal.timeout(timeout),
  });
}

async function fetchJson(context: CommandContext, url: string): Promise<unknown> {
  const result = await fetchResponse(context, url);
  if (!result.ok) throw new UpstreamStatusError(result.status);
  return result.json();
}

async function fetchText(context: CommandContext, url: string): Promise<string> {
  const result = await fetchResponse(context, url);
  if (!result.ok) throw new UpstreamStatusError(result.status);
  return result.text();
}

class UpstreamStatusError extends Error {
  constructor(readonly status: number) { super(`Upstream HTTP ${status}`); }
}

class ProviderConfigurationError extends Error {}

function record(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null ? value as Record<string, unknown> : null;
}

function string(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function nested(parent: unknown, key: string): Record<string, unknown> | null {
  return record(record(parent)?.[key]);
}

function escapeHtml(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll('&#39;', "'").replaceAll('&#x27;', "'");
}

async function comicVine(context: CommandContext, resource: 'characters' | 'issues', query: string): Promise<Record<string, unknown> | null> {
  const key = process.env.COMICVINE_API_KEY;
  if (!key) throw new ProviderConfigurationError('COMICVINE_API_KEY');
  const url = new URL(`${COMIC_VINE}/${resource}/`);
  url.searchParams.set('api_key', key);
  url.searchParams.set('format', 'json');
  url.searchParams.set('filter', `name:${query}`);
  url.searchParams.set('limit', '1');
  url.searchParams.set('field_list', resource === 'characters'
    ? 'name,site_detail_url,deck,real_name,aliases,origin,publisher,first_appeared_in_issue,image'
    : 'name,site_detail_url,issue_number,cover_date,description,volume,person_credits,image');
  const body = record(await fetchJson(context, url.toString()));
  if (body?.status_code !== 1) throw new Error('Comic Vine returned an invalid response.');
  const items = Array.isArray(body.results) ? body.results : [];
  return record(items[0]);
}

async function character(context: CommandContext, query: string): Promise<APIInteractionResponse> {
  const result = await comicVine(context, 'characters', query);
  if (!result) return response(`No Comic Vine character results found for “${query}”.`);
  const publisher = nested(result, 'publisher');
  const firstIssue = nested(result, 'first_appeared_in_issue');
  const origin = nested(result, 'origin');
  const image = nested(result, 'image');
  const description = [string(result.deck), '', ...[
    ['Real Name', string(result.real_name)], ['First Appearance', string(firstIssue?.name) ? `'${string(firstIssue?.name)!.split(' / ')[0]}'` : undefined],
    ['Origin', string(origin?.name)], ['Published by', string(publisher?.name)],
  ].filter(([, value]) => value).map(([label, value]) => `• **${label}:** ${value}`)].filter(value => value !== undefined).join('\n');
  const resultEmbed = embed(string(result.name) ?? query, string(result.site_detail_url) ?? 'https://comicvine.gamespot.com/', description, colors.COMICVINE);
  resultEmbed.author = { name: 'Comic Vine', icon_url: 'https://i.imgur.com/AgMseb9.png', url: 'https://comicvine.gamespot.com/' };
  const cover = safeUrl(image?.original_url) ?? safeUrl(image?.medium_url);
  if (cover) resultEmbed.thumbnail = { url: cover };
  resultEmbed.fields = [field('Aliases', string(result.aliases)?.replaceAll('\r', '').replaceAll('\n', ', '), false)].filter((item): item is NonNullable<typeof item> => Boolean(item));
  return embedResponse(resultEmbed);
}

async function comicSearch(context: CommandContext, query: string): Promise<APIInteractionResponse> {
  const cards = await fetchSearchResults(query, CollectionTypes.Series);
  if (!cards.length) return response(`No League of Comic Geeks results found for “${query}”.`);
  const resultEmbed = embed(`Top results for '${query}'`, `${LOCG}/search?keyword=${encodeURIComponent(query)}`, undefined, colors.LOCG);
  resultEmbed.author = { name: 'League of Comic Geeks', icon_url: `${LOCG}/assets/images/user-menu-logo-icon.png`, url: LOCG };
  const formatted = cards.slice(0, 8).map(item => `**[${item.name}](${item.url})**\n${item.publisher ?? ''} | [Cover](${item.cover})`);
  resultEmbed.fields = [field('Page 1', formatted.slice(0, 4).join('\n')), field('Page 2', formatted.slice(4).join('\n'))].filter((item): item is NonNullable<typeof item> => Boolean(item));
  const cover = cards[0]?.cover;
  if (cover) resultEmbed.thumbnail = { url: cover };
  return embedResponse(resultEmbed);
}

function releaseWednesday(date: string | undefined): string {
  const now = new Date();
  const parsed = date ? parseDate(date, now) : now;
  if (!parsed || Number.isNaN(parsed.getTime())) throw new Error('Date must be a recognizable date, such as YYYY-MM-DD or December 2 2020.');
  parsed.setDate(parsed.getDate() + (3 - parsed.getDay() + 7) % 7);
  return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}-${String(parsed.getDate()).padStart(2, '0')}`;
}

function completeList(context: CommandContext, base: APIEmbed, text: string): APIInteractionResponse {
  const chunks: string[] = [];
  for (const line of text.split('\n')) {
    if (!chunks.length || chunks[chunks.length - 1]!.length + line.length + 1 > 3900) chunks.push(line);
    else chunks[chunks.length - 1] += '\n' + line;
  }
  const embeds = chunks.map((description, index) => ({ ...base, ...(index ? { fields: undefined } : {}), description }));
  // Separate messages keep Discord's aggregate 6,000-character embed limit intact.
  embeds.slice(1).forEach(embed => context.queueFollowup?.({ embeds: [embed], allowed_mentions: { parse: [] } }));
  return embedResponse(embeds[0] ?? base);
}

function htmlDecode(value: string): string {
  return value.replaceAll('&amp;', '&').replaceAll('&quot;', '"').replaceAll('&#39;', "'").replaceAll('&lt;', '<').replaceAll('&gt;', '>');
}

async function pull(context: CommandContext, publisher: string | undefined, date: string | undefined): Promise<APIInteractionResponse> {
  const code = publisher?.toLowerCase().replace('dark-horse', 'darkhorse') ?? 'dc';
  const publication = publisherData[code];
  if (!publication) return response('Unknown publisher. Choose a publisher from the command options.', true);
  const week = releaseWednesday(date);
  const results = await fetchReleases(week, { publishers: [publication.id], filter: [FilterTypes.Regular, FilterTypes.Digital, FilterTypes.Annual], sort: SortTypes.AlphaAsc });
  const headingDate = new Date(`${week}T12:00:00Z`);
  if (publication.id === 1) headingDate.setUTCDate(headingDate.getUTCDate() - 1);
  const resultEmbed = embed(`${publication.name} Pull List for the Week of ${headingDate.toISOString().slice(0, 10)}`, `${LOCG}/comics/releases?date=${week}`, undefined, publication.color);
  resultEmbed.thumbnail = { url: publication.thumbnail };
  return completeList(context, resultEmbed, results.length ? results.map(item => item.name).join('\n') : 'No comics for this week (yet).');

}

async function pullUser(context: CommandContext, username: string, date: string | undefined): Promise<APIInteractionResponse> {
  if (!/^[\w.-]{1,40}$/.test(username)) return response('Enter a valid League of Comic Geeks username.', true);
  const user = await fetchUser(username.toLowerCase());
  if (!user || !Number.isInteger(user.id) || user.id <= 0) return response(`I could not find League of Comic Geeks user “${username}”.`, true);
  const profileUrl = `${user.url}/pull-list`;
  const heading = user.name || username;
  const week = releaseWednesday(date);
  const results = await fetchPulls(user.id, week, { sort: SortTypes.AlphaAsc });
  const resultEmbed = embed(`${heading.split(' - ')[0]}'s Pull List for the Week of ${week}`, profileUrl, undefined, colors.LOCG);
  const avatar = user.avatar;
  resultEmbed.author = { name: resultEmbed.title!, url: profileUrl, ...(safeUrl(avatar) ? { icon_url: safeUrl(avatar)! } : {}) };
  delete resultEmbed.title; delete resultEmbed.url;
  resultEmbed.footer = { text: 'League of Comic Geeks', icon_url: `${LOCG}/assets/images/user-menu-logo-icon.png` };
  const total = results.reduce((sum, item) => sum + (Number((item.price ?? '').replace(/[^\d.]/g, '')) || 0), 0);
  if (results.length) resultEmbed.fields = [{ name: 'Total', value: `$${total.toFixed(2)} USD` }];
  return completeList(context, resultEmbed, results.length ? results.map(item => item.name).join('\n') : 'No pulls for this week');

}

function xmlTag(text: string, tag: string): string {
  const escaped = tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = new RegExp(`<${escaped}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${escaped}>`, 'i').exec(text);
  return htmlDecode(match?.[1]?.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() ?? '');
}

function rawXmlTag(text: string, tag: string): string {
  const escaped = tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = new RegExp(`<${escaped}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${escaped}>`, 'i').exec(text);
  return match?.[1]?.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1') ?? '';
}

interface DiaryItem { published?: string; watched?: string; spoiler?: boolean; title: string; year?: string; filmUrl: string; url: string; rating?: string; summary?: string; image?: string }

function parseLetterboxdFeed(xml: string): { title: string; url: string; items: DiaryItem[] } | null {
  const channel = /<channel\b[^>]*>([\s\S]*?)<\/channel>/i.exec(xml)?.[1];
  if (!channel) return null;
  const items = (channel.match(/<item\b[^>]*>[\s\S]*?<\/item>/gi) ?? []).map((raw) => {
    const filmUrl = xmlTag(raw, 'link');
    const match = /letterboxd:filmTitle>([\s\S]*?)<\/letterboxd:filmTitle>/i.exec(raw);
    const title = htmlDecode(match?.[1]?.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim() ?? xmlTag(raw, 'title'));
    const year = /<letterboxd:filmYear>(\d{4})<\/letterboxd:filmYear>/i.exec(raw)?.[1];
    const ratingRaw = /<letterboxd:memberRating>([\d.]+)<\/letterboxd:memberRating>/i.exec(raw)?.[1];
    const rawDescription = rawXmlTag(raw, 'description');
    const image = /<img\b[^>]*src=["']([^"']+)["']/i.exec(rawDescription)?.[1];
    return { title, year, filmUrl, url: safeUrl(xmlTag(raw, 'guid')) ?? filmUrl, rating: ratingRaw ? '★'.repeat(Math.floor(Number(ratingRaw))) + (Number(ratingRaw) % 1 ? '½' : '') : undefined, summary: markdown.turndown(rawDescription.replace(/<p>\s*<img[^>]*>\s*<\/p>/gi, '').replace(/<p>\s*<em>This review may contain spoilers\.<\/em>\s*<\/p>/gi, '')), published: xmlTag(raw, 'pubDate'), watched: xmlTag(raw, 'letterboxd:watchedDate'), spoiler: /may contain spoilers/i.test(rawDescription) || /\(contains spoilers\)/i.test(xmlTag(raw, 'title')), image };
  }).filter((item) => item.title && item.filmUrl && !item.filmUrl.includes('/list/'));
  return { title: xmlTag(channel, 'title'), url: xmlTag(channel, 'link'), items };
}

function similarity(a: string, b: string) {
  a = a.toLowerCase(); b = b.toLowerCase();
  if (a === b) return 1;
  const pairs = (text: string) => Array.from({ length: Math.max(0, text.length - 1) }, (_, i) => text.slice(i, i + 2));
  const left = pairs(a), right = pairs(b); let common = 0;
  for (const pair of left) { const i = right.indexOf(pair); if (i >= 0) { common++; right.splice(i, 1); } }
  return 2 * common / Math.max(1, a.length + b.length - 2);
}
type LetterboxdSnapshot = { requester: string; guildId: string; channelId: string; expiresAt: number; embed: APIEmbed; pages: string[] };
const letterboxdSnapshots = new Map<string, LetterboxdSnapshot>();
const snapshotLifetime = 5 * 60_000;
function letterboxdPage(id: string, snapshot: LetterboxdSnapshot, page: number, update: boolean): APIInteractionResponse {
  const last = snapshot.pages.length - 1;
  return { type: update ? 7 : 4, data: {
    embeds: [{ ...snapshot.embed, description: snapshot.pages[page], footer: { text: `Page ${page + 1} of ${snapshot.pages.length}` } }],
    components: last ? [{ type: 1, components: [
      { type: 2, style: 2, label: 'Previous', custom_id: `letterboxd:${id}:${Math.max(0, page - 1)}`, disabled: page === 0 },
      { type: 2, style: 2, label: 'Next', custom_id: `letterboxd:${id}:${Math.min(last, page + 1)}`, disabled: page === last },
    ] }] : [], allowed_mentions: { parse: [] },
  } } as APIInteractionResponse;
}
function makeLetterboxdPages(items: DiaryItem[]): string[] {
  const pages: string[] = []; let lines: string[] = [];
  for (const item of items) {
    const target = safeUrl(item.url);
    if (!target) throw new Error('Letterboxd provided an invalid review link.');
    const suffix = `](${target})${item.rating ? ` ${item.rating}` : ''}`;
    const available = 4000 - suffix.length - 1;
    if (available < 1) throw new Error('A Letterboxd review link is too long to display.');
    const label = `${item.title}${item.year ? ` (${item.year})` : ''}`.replace(/[\[\]\\]/g, '\\$&').replace(/[\r\n]+/g, ' ');
    const shown = label.length > available ? `${label.slice(0, Math.max(0, available - 1))}…` : label;
    const line = `[${shown}${suffix}`;
    if (lines.length === 10 || lines.join('\n').length + line.length + (lines.length ? 1 : 0) > 4000) { pages.push(lines.join('\n')); lines = []; }
    lines.push(line);
  }
  if (lines.length) pages.push(lines.join('\n'));
  return pages;
}
async function letterboxd(context: CommandContext, username: string, film: string | undefined, interaction: APIApplicationCommandInteraction): Promise<APIInteractionResponse> {
  if (!/^[\w-]{1,40}$/.test(username)) return response('Enter a valid Letterboxd username.', true);
  const feed = parseLetterboxdFeed(await fetchText(context, `https://letterboxd.com/${encodeURIComponent(username)}/rss/`));
  if (!feed?.items.length) return response('That user does not have any recent reviews.', true);
  const resultEmbed: APIEmbed = { color: [colors.LETTERBOXD_BLUE!, colors.LETTERBOXD_GREEN!, colors.LETTERBOXD_ORANGE!][Math.floor(Math.random() * 3)]!, author: { name: 'Letterboxd', icon_url: 'https://i.imgur.com/2nQftA2.png', url: 'https://letterboxd.com/' } };
  const user = feed.title.replace(/^Letterboxd - /, '').replace(/['’]s.*$/, '') || username;
  if (!film || film.toLowerCase() === 'all') {
    resultEmbed.title = `${user}'s Latest Reviews`; resultEmbed.url = `https://letterboxd.com/${username}/films/reviews/`;
    const requester = interaction.member?.user?.id ?? interaction.user?.id;
    if (!requester || !interaction.guild_id || !interaction.channel_id) return response('Could not identify the requester or channel.', true);
    const pages = makeLetterboxdPages(feed.items);
    const id = randomUUID();
    const snapshot: LetterboxdSnapshot = { requester, guildId: interaction.guild_id, channelId: interaction.channel_id, expiresAt: (context.now?.().getTime() ?? Date.now()) + snapshotLifetime, embed: resultEmbed, pages };
    if (pages.length > 1) {
      letterboxdSnapshots.set(id, snapshot);
      const timer = setTimeout(() => letterboxdSnapshots.delete(id), snapshotLifetime); timer.unref();
    }
    return letterboxdPage(id, snapshot, 0, false);
  }
  const item = ['latest', 'recent'].includes(film.toLowerCase()) ? feed.items[0]! : [...feed.items].sort((a, b) => similarity(film, b.title) - similarity(film, a.title))[0]!;
  resultEmbed.title = `${item.title}${item.year ? ` (${item.year})` : ''}`; resultEmbed.url = item.url;
  let review = item.summary ?? '';
  if (item.spoiler) review = review.split(/\n+/).filter(Boolean).map(line => `||${line.replaceAll('||', '')}||`).join('\n');
  if (review) resultEmbed.description = review.slice(0, 3800);
  resultEmbed.footer = { text: `Review by ${user}` };
  if (item.published && Number.isFinite(Date.parse(item.published))) resultEmbed.timestamp = new Date(item.published).toISOString();
  resultEmbed.fields = [];
  if (item.watched && Number.isFinite(Date.parse(item.watched))) { const unix = Math.floor(Date.parse(item.watched) / 1000); resultEmbed.fields.push({ name: 'Watched On', value: `<t:${unix}:f> (<t:${unix}:R>)` }); }
  if (item.rating) resultEmbed.fields.push({ name: 'Rating', value: item.rating });
  if (safeUrl(item.image)) resultEmbed.thumbnail = { url: safeUrl(item.image)! };
  return embedResponse(resultEmbed);
}

async function movie(context: CommandContext, query: string): Promise<APIInteractionResponse> {
  const key = process.env.OMDB_API_KEY;
  if (!key) throw new ProviderConfigurationError('OMDB_API_KEY');
  const url = new URL('https://www.omdbapi.com/');
  url.searchParams.set('apikey', key);
  url.searchParams.set('type', 'movie');
  url.searchParams.set('t', query.replace(/spider[ -]man/gi, 'Spider-Man'));
  const result = record(await fetchJson(context, url.toString()));
  if (result?.Response === 'False') return response(`No movie results found for “${query}”.`);
  if (!result || typeof result.Title !== 'string') throw new Error('The movie provider returned an invalid response.');
  const resultEmbed = embed(`${result.Title}${string(result.Year) ? ` (${result.Year})` : ''}`, typeof result.imdbID === 'string' ? `https://www.imdb.com/title/${result.imdbID}/` : 'https://www.omdbapi.com/', string(result.Plot), 0x428bca);
  resultEmbed.color = colors.OPEN_MOVIE_DB;
  resultEmbed.description = [string(result.Plot), '', ...[['Genres', 'Genre'], ['Age Rating', 'Rated'], ['Country', 'Country'], ['Runtime', 'Runtime'], ['', ''], ['Directed by', 'Director'], ['Credits', 'Writer'], ['Starring', 'Actors'], ['Production Companies', 'Production']].map(([label, key]) => label ? `**${label}:** ${(string(result[key!]) ?? 'N/A').replace(key === 'Writer' ? / by/g : /$^/, '')}` : '')].join('\n');
  resultEmbed.footer = { text: 'Open Movie Database' };
  resultEmbed.fields = Array.isArray(result.Ratings) && result.Ratings.length ? [{ name: 'Ratings', value: result.Ratings.map(item => { const rating = record(item); return `**${string(rating?.Source)}:** ${string(rating?.Value)}`; }).join('\n') }] : [];
  if (typeof result.Poster === 'string' && result.Poster !== 'N/A' && safeUrl(result.Poster)) resultEmbed.thumbnail = { url: safeUrl(result.Poster)! };
  return embedResponse(resultEmbed);
}

async function show(context: CommandContext, query: string): Promise<APIInteractionResponse> {
  const url = new URL(`${TVMAZE}/search/shows`);
  url.searchParams.set('q', query);
  const results: unknown = await fetchJson(context, url.toString());
  if (!Array.isArray(results) || results.length === 0) return response(`No TVmaze show results found for “${query}”.`);
  const match = record(results[0]);
  const show = record(match?.show);
  if (!show) throw new Error('TVmaze returned an invalid response.');
  const image = nested(show, 'image');
  const network = nested(show, 'network') ?? nested(show, 'webChannel');
  const resultEmbed = embed(string(show.name) ?? query, string(show.url) ?? 'https://www.tvmaze.com/', markdown.turndown(string(show.summary) ?? ''), colors.TV_MAZE);
  resultEmbed.author = { name: 'TVmaze', url: 'https://www.tvmaze.com/', icon_url: 'https://i.imgur.com/ExggnTB.png' };
  const fields = [
    field('Language', string(show.language)), field('Premiered', string(show.premiered)), field('Status', string(show.status)),
    field('Genres', Array.isArray(show.genres) ? show.genres.filter((item): item is string => typeof item === 'string').join(', ') : undefined),
    field('Network', string(network?.name)), field('Website', safeUrl(show.officialSite) ? `[Click Here](${safeUrl(show.officialSite)})` : undefined),
  ].filter((item): item is NonNullable<typeof item> => Boolean(item));
  resultEmbed.fields = fields;
  if (safeUrl(image?.original) ?? safeUrl(image?.medium)) resultEmbed.thumbnail = { url: safeUrl(image?.original) ?? safeUrl(image?.medium)! };
  return embedResponse(resultEmbed);
}

async function pokemon(context: CommandContext, query: string): Promise<APIInteractionResponse> {
  let title = query.trim();
  if (/^#?\d+$/.test(title)) {
    try { const dex = record(await fetchJson(context, `${POKEAPI}/pokemon/${Number(title.replace('#', ''))}`)); if (string(dex?.name)) title = string(dex?.name)!; } catch { /* Try the original article query if the dex lookup fails. */ }
  }
  title = title.replace(/\b(mr|mrs|ms|jr)\.?(?=[ -]|$)/gi, '$1.');
  if (!['ho-oh', 'kommo-o', 'hakamo-o', 'jangmo-o', 'porygon-z'].includes(title.toLowerCase())) title = title.replaceAll('-', ' ');
  title = title.replace(/\b\w/g, value => value.toUpperCase());
  const url = new URL('https://bulbapedia.bulbagarden.net/w/api.php');
  for (const [key, value] of Object.entries({ action: 'query', titles: title, prop: 'extracts|pageimages|links', format: 'json', formatversion: '2', exintro: 'true', redirects: 'true', explaintext: 'true', pithumbsize: '1000' })) url.searchParams.set(key, value);
  const body = record(await fetchJson(context, url.toString()));
  const pages = nested(body, 'query')?.pages;
  const page = Array.isArray(pages) ? record(pages[0]) : null;
  if (!page || page.missing || !string(page.title)) return response(`No Pokémon found for “${query}”.`, true);
  const linkFor = (name: string) => `https://bulbapedia.bulbagarden.net/wiki/${encodeURIComponent(name.replaceAll(' ', '_'))}`;
  let description = (string(page.extract) ?? '').split('\n\n')[0]!.trimEnd().slice(0, 2048);
  if (/(several\s)?refer(rals)?/i.test(description) && Array.isArray(page.links)) description += '\n' + page.links.map(record).filter(Boolean).map(link => `[${string(link?.title)}](${linkFor(string(link?.title) ?? '')})`).join('\n');
  const dex = /^(\d{3})/.exec(string(page.pageimage) ?? '')?.[1];
  const result = embed(`${dex ? `#${dex} - ` : ''}${page.title}`, linkFor(page.title as string), description, colors.BULBAPEDIA);
  result.author = { name: 'Bulbapedia', icon_url: 'https://www.google.com/s2/favicons?domain=bulbapedia.bulbagarden.net&sz=128', url: 'https://bulbapedia.bulbagarden.net/wiki/Main_Page' };
  const image = safeUrl(nested(page, 'thumbnail')?.source);
  if (image) result.image = { url: image };
  return embedResponse(result);
}

async function youtube(context: CommandContext, query: string): Promise<APIInteractionResponse> {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) throw new ProviderConfigurationError('YOUTUBE_API_KEY');
  const url = new URL(`${YOUTUBE_API}/youtube/v3/search`);
  url.searchParams.set('part', 'snippet');
  url.searchParams.set('type', 'video');
  url.searchParams.set('maxResults', '1');
  url.searchParams.set('safeSearch', 'none');
  url.searchParams.set('q', query);
  url.searchParams.set('key', key);
  const result = record(await fetchJson(context, url.toString()));
  const items = Array.isArray(result?.items) ? result.items : [];
  const first = record(items[0]);
  const id = nested(first, 'id');
  const snippet = nested(first, 'snippet');
  const videoId = string(id?.videoId);
  if (!videoId || !snippet) return response(`No YouTube videos found for “${query}”.`);
  return response(`Showing top result for **${query}**\nhttps://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`);
}

export const lookupModule: CommandModule = {
  commands: definitions,
  matches(interaction: CommandInteraction): boolean {
    return interaction.type === 3 ? interaction.data.custom_id.startsWith('letterboxd:') : interaction.type === 2 && interaction.data.type === 1 && names.has(interaction.data.name);
  },
  async handle(interaction: CommandInteraction, context: CommandContext): Promise<APIInteractionResponse> {
    if (!this.matches(interaction)) return response('This command is not supported.');
    if (interaction.type === 3) {
      const match = /^letterboxd:([\da-f-]{36}):(\d+)$/.exec(interaction.data.custom_id);
      const snapshot = match ? letterboxdSnapshots.get(match[1]!) : undefined;
      const time = context.now?.().getTime() ?? Date.now();
      if (snapshot && snapshot.expiresAt <= time) letterboxdSnapshots.delete(match![1]!);
      const requester = interaction.member?.user?.id ?? interaction.user?.id;
      if (!match || !snapshot || snapshot.expiresAt <= time || requester !== snapshot.requester || interaction.guild_id !== snapshot.guildId || interaction.channel_id !== snapshot.channelId) return { type: 6 } as APIInteractionResponse;
      const page = Number(match[2]);
      if (!Number.isSafeInteger(page) || page < 0 || page >= snapshot.pages.length) return { type: 6 } as APIInteractionResponse;
      return letterboxdPage(match[1]!, snapshot, page, true);
    }
    const command = interaction as APIApplicationCommandInteraction;
    const options = getOptions(command);
    try {
      switch (command.data.name) {
        case 'character': {
          const query = inputText(options.get('query'), 'character');
          return query ? await character(context, query) : response('Enter a character name to search for.');
        }
        case 'locg': {
          const query = inputText(options.get('query'), 'comic');
          return query ? await comicSearch(context, query) : response('Enter a comic title to search for.');
        }
        case 'pull': return await pull(context, options.get('publisher') as string | undefined, options.get('date') as string | undefined);
        case 'pull-user': {
          const username = inputText(options.get('user'), 'user');
          return username ? await pullUser(context, username, options.get('date') as string | undefined) : response('Enter a League of Comic Geeks username.');
        }
        case 'letterboxd': {
          const username = inputText(options.get('username'), 'username');
          return username ? await letterboxd(context, username, options.get('film') as string | undefined, command) : response('Enter a Letterboxd username.');
        }
        case 'movie': {
          const query = inputText(options.get('query'), 'movie');
          return query ? await movie(context, query) : response('Enter a movie title to search for.');
        }
        case 'show': {
          const query = inputText(options.get('query'), 'show');
          return query ? await show(context, query) : response('Enter a TV show title to search for.');
        }
        case 'pokemon': {
          const query = inputText(options.get('query'), 'pokemon');
          return query ? await pokemon(context, query) : response('Enter a Pokémon name or Pokédex number.');
        }
        case 'youtube': {
          const query = inputText(options.get('query'), 'query');
          return query ? await youtube(context, query) : response('Enter something to search for.');
        }
        default: return response('This command is not supported.');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      if (error instanceof ProviderConfigurationError) return response('This lookup is not available right now.');
      if (message.includes('Date must')) return response(message);
      if (message.startsWith('A Letterboxd review link') || message.startsWith('Letterboxd provided an invalid')) return response(message, true);
      return response('The lookup provider is unavailable right now. Please try again shortly.');
    }
  },
};
