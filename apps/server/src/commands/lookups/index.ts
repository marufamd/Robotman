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
const GOOGLE_API = 'https://www.googleapis.com';
const MAX_QUERY_LENGTH = 180;
const DEFAULT_COLOR = 0x5865f2;

const publishers = [
  ['dc', 'DC Comics', 1], ['marvel', 'Marvel Comics', 2], ['dark-horse', 'Dark Horse Comics', 5],
  ['image', 'Image Comics', 7], ['idw', 'IDW Publishing', 6], ['boom', 'BOOM! Studios', 13],
  ['archie', 'Archie Comics', 21], ['dynamite', 'Dynamite', 12], ['valiant', 'Valiant', 34], ['oni', 'Oni Press', 29],
] as const;

const definitions = [
  simpleQuery('character', 'Search Comic Vine for a comic character.', 'Character name'),
  simpleQuery('comic', 'Search League of Comic Geeks for a comic or series.', 'Comic title'),
  simpleQuery('locg', 'Search League of Comic Geeks for a comic series.', 'Series name'),
  {
    name: 'pull', description: 'View a publisher’s League of Comic Geeks releases for a Wednesday week.',
    options: [
      { name: 'publisher', description: 'Publisher (defaults to DC Comics)', type: 3, required: false, choices: publishers.map(([value, name]) => ({ name, value })) },
      { name: 'date', description: 'A date in the release week, YYYY-MM-DD (defaults to the next Wednesday)', type: 3, required: false },
    ],
  },
  {
    name: 'pull-user', description: 'View a League of Comic Geeks user’s pull list for a Wednesday week.',
    options: [
      { name: 'user', description: 'League of Comic Geeks username', type: 3, required: true },
      { name: 'date', description: 'A date in the release week, YYYY-MM-DD (defaults to the next Wednesday)', type: 3, required: false },
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
  {
    name: 'google', description: 'Search Google for web pages.',
    options: [
      { name: 'query', description: 'What to search for', type: 3, required: true, max_length: MAX_QUERY_LENGTH },
      { name: 'amount', description: 'Number of results (1–5, defaults to 3)', type: 4, required: false, min_value: 1, max_value: 5 },
    ],
  },
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

function plainText(value: string): string {
  return escapeHtml(value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim())
    .replaceAll('&amp;', '&').replaceAll('&lt;', '<').replaceAll('&gt;', '>').replaceAll('&quot;', '"');
}

function tagContent(html: string, tag: string, className?: string): string {
  const safeTag = tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const classPattern = className ? `(?=[^>]*class=["'][^"']*\\b${className}\\b[^"']*["'])` : '';
  const match = new RegExp(`<${safeTag}\\b${classPattern}[^>]*>([\\s\\S]*?)<\\/${safeTag}>`, 'i').exec(html);
  return match ? plainText(match[1] ?? '') : '';
}

function attribute(html: string, name: string): string | undefined {
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = new RegExp(`\\b${escapedName}=["']([^"']*)["']`, 'i').exec(html);
  return match?.[1]?.replaceAll('&amp;', '&');
}

function locgCards(html: string): Array<{ name: string; publisher?: string; url?: string; cover?: string; description?: string; price?: string }> {
  const cards = html.match(/<li\b[\s\S]*?<\/li>/gi) ?? [];
  return cards.map((card) => {
    const titleLink = /<a\b[^>]*class=["'][^"']*\btitle\b[^"']*["'][^>]*>[\s\S]*?<\/a>/i.exec(card)?.[0];
    const anchor = titleLink ?? /<a\b[^>]*href=["'][^"']+["'][^>]*>/i.exec(card)?.[0] ?? '';
    const name = tagContent(card, 'a', 'title') || tagContent(card, 'div', 'title');
    const image = /<img\b[^>]*>/i.exec(card)?.[0] ?? '';
    const cover = attribute(image, 'data-src') ?? attribute(image, 'src');
    const details = tagContent(card, 'div', 'comic-details').split('·')[0]?.trim();
    const description = tagContent(card, 'div', 'comic-description');
    const rawUrl = attribute(anchor, 'href') ?? attribute(card, 'data-href');
    const rawCover = cover?.replace('medium', 'large');
    return {
      name,
      publisher: details || undefined,
      url: rawUrl ? safeUrl(rawUrl.startsWith('http') ? rawUrl : `${LOCG}${rawUrl}`) : undefined,
      cover: rawCover ? safeUrl(rawCover.startsWith('http') ? rawCover : `${LOCG}${rawCover}`) : undefined,
      description: description || undefined,
      price: tagContent(card, 'span', 'price') || undefined,
    };
  }).filter(({ name }) => name.length > 0);
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
  const resultEmbed = embed(string(result.name) ?? query, string(result.site_detail_url) ?? 'https://comicvine.gamespot.com/', string(result.deck), 0x2b4b75);
  resultEmbed.thumbnail = safeUrl(image?.medium_url) ? { url: safeUrl(image?.medium_url)! } : undefined;
  resultEmbed.fields = [
    field('Real name', string(result.real_name)),
    field('First appearance', string(firstIssue?.name)),
    field('Origin', string(origin?.name)),
    field('Publisher', string(publisher?.name)),
    field('Aliases', string(result.aliases)?.replaceAll('\r', '').replaceAll('\n', ', '), false),
  ].filter((item): item is NonNullable<typeof item> => Boolean(item));
  return embedResponse(resultEmbed);
}

async function comicSearch(context: CommandContext, query: string, seriesOnly = false): Promise<APIInteractionResponse> {
  const url = new URL(`${LOCG}/comic/get_comics`);
  url.searchParams.set('list', 'search');
  url.searchParams.set('title', query);
  url.searchParams.set('list_option', seriesOnly ? 'series' : 'issue');
  const payload = record(await fetchJson(context, url.toString()));
  const cards = typeof payload?.list === 'string' ? locgCards(payload.list) : [];
  if (!cards.length) return response(`No League of Comic Geeks results found for “${query}”.`);
  const resultEmbed = embed(`League of Comic Geeks results for ${query}`, `${LOCG}/search?keyword=${encodeURIComponent(query)}`);
  resultEmbed.description = cards.slice(0, 5).map((item) => {
    const title = item.url ? `[${item.name}](${item.url})` : item.name;
    return `**${title}**${item.publisher ? ` · ${item.publisher}` : ''}${item.description ? `\n${item.description}` : ''}`;
  }).join('\n\n').slice(0, 4000);
  const cover = cards.find((item) => item.cover)?.cover;
  if (cover) resultEmbed.thumbnail = { url: cover };
  return embedResponse(resultEmbed);
}

function releaseWednesday(date: string | undefined): string {
  const now = new Date();
  const parsed = date ? new Date(`${date}T12:00:00Z`) : new Date(now);
  if (date && (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date)) {
    throw new Error('Date must be a valid YYYY-MM-DD date.');
  }
  if (!date) {
    const daysUntilWednesday = (3 - parsed.getUTCDay() + 7) % 7 || 7;
    parsed.setUTCDate(parsed.getUTCDate() + daysUntilWednesday);
  }
  parsed.setUTCDate(parsed.getUTCDate() + ((3 - parsed.getUTCDay() + 7) % 7));
  return parsed.toISOString().slice(0, 10);
}

function htmlDecode(value: string): string {
  return value.replaceAll('&amp;', '&').replaceAll('&quot;', '"').replaceAll('&#39;', "'").replaceAll('&lt;', '<').replaceAll('&gt;', '>');
}

async function locgPulls(context: CommandContext, date: string, publisherId?: number, userId?: number): Promise<Array<{ name: string; publisher?: string; url?: string; cover?: string; price?: string }>> {
  const url = new URL(`${LOCG}/comic/get_comics`);
  url.searchParams.set('list', userId ? '1' : 'releases');
  url.searchParams.set('list_option', 'thumbs');
  url.searchParams.set('view', 'list');
  url.searchParams.set('date', date);
  url.searchParams.set('date_type', 'week');
  if (userId) url.searchParams.set('user_id', String(userId));
  if (publisherId) url.searchParams.set('publisher[]', String(publisherId));
  const body = record(await fetchJson(context, url.toString()));
  return typeof body?.list === 'string' ? locgCards(body.list) : [];
}

async function pull(context: CommandContext, publisher: string | undefined, date: string | undefined): Promise<APIInteractionResponse> {
  const publication = publishers.find(([code]) => code === publisher?.toLowerCase()) ?? publishers[0];
  if (publisher && !publishers.some(([code]) => code === publisher.toLowerCase())) {
    return response(`Unknown publisher “${publisher}”. Choose DC, Marvel, Dark Horse, Image, IDW, BOOM!, Archie, Dynamite, Valiant, or Oni.`);
  }
  const week = releaseWednesday(date);
  const id = publication[2];
  const results = await locgPulls(context, week, id);
  const resultEmbed = embed(`${publication[1]} pull list · week of ${week}`, `${LOCG}/comics/releases?date=${week}`);
  resultEmbed.color = 0x366596;
  resultEmbed.description = results.length ? results.slice(0, 35).map(({ name }) => name).join('\n').slice(0, 4000) : 'No releases found for this publisher and week.';
  const shown = Math.min(results.length, 35);
  resultEmbed.footer = { text: `${shown} issue${shown === 1 ? '' : 's'} shown · Data from League of Comic Geeks` };
  return embedResponse(resultEmbed);
}

async function pullUser(context: CommandContext, username: string, date: string | undefined): Promise<APIInteractionResponse> {
  if (!/^[\w.-]{1,40}$/.test(username)) return response('Enter a valid League of Comic Geeks username.', true);
  const profileUrl = `${LOCG}/profile/${encodeURIComponent(username.toLowerCase())}/pull-list`;
  const html = await fetchText(context, profileUrl);
  const id = Number(/id=["']comic-list-block["'][^>]*data-user=["'](\d+)/i.exec(html)?.[1]
    ?? /data-user=["'](\d+)["'][^>]*id=["']comic-list-block["']/i.exec(html)?.[1]);
  if (!Number.isInteger(id) || id <= 0) return response(`I could not find League of Comic Geeks user “${username}”.`, true);
  const heading = plainText(/<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1] ?? '') || username;
  const week = releaseWednesday(date);
  const results = await locgPulls(context, week, undefined, id);
  const resultEmbed = embed(`${heading}’s pull list · week of ${week}`, `${LOCG}/profile/${encodeURIComponent(username.toLowerCase())}/pull-list`);
  resultEmbed.description = results.length ? results.slice(0, 35).map(({ name, price }) => price ? `${name} · ${price}` : name).join('\n').slice(0, 4000) : 'No comics on this pull list for the selected week.';
  resultEmbed.footer = { text: 'Data from League of Comic Geeks' };
  return embedResponse(resultEmbed);
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

interface DiaryItem { title: string; year?: string; filmUrl: string; url: string; rating?: string; summary?: string; image?: string }

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
    return { title, year, filmUrl, url: safeUrl(xmlTag(raw, 'guid')) ?? filmUrl, rating: ratingRaw ? `${ratingRaw} / 5` : undefined, summary: xmlTag(raw, 'description'), image };
  }).filter((item) => item.title && item.filmUrl);
  return { title: xmlTag(channel, 'title'), url: xmlTag(channel, 'link'), items };
}

async function letterboxd(context: CommandContext, username: string, film: string | undefined): Promise<APIInteractionResponse> {
  if (!/^[\w-]{1,40}$/.test(username)) return response('Enter a valid Letterboxd username.', true);
  const feed = parseLetterboxdFeed(await fetchText(context, `https://letterboxd.com/${encodeURIComponent(username)}/rss/`));
  if (!feed) return response('Letterboxd returned an unreadable diary feed. Try again shortly.');
  if (!feed.items.length) return response(`No recent film diary entries found for ${username}.`);
  const title = film?.trim();
  if (title) {
    const item = ['latest', 'recent'].includes(title.toLowerCase())
      ? feed.items.at(0)
      : feed.items.find((entry) => entry.title.toLowerCase() === title.toLowerCase())
        ?? feed.items.find((entry) => entry.title.toLowerCase().includes(title.toLowerCase()));
    if (!item) return response(`No recent Letterboxd entry found for “${title}” on ${username}’s diary.`);
    const resultEmbed = embed(`${item.title}${item.year ? ` (${item.year})` : ''}`, item.url, item.summary?.slice(0, 3500), 0x00d735);
    resultEmbed.author = { name: `${username} on Letterboxd`, url: feed.url || `https://letterboxd.com/${username}/` };
    if (item.rating) resultEmbed.fields = [field('Rating', item.rating)].filter((value): value is NonNullable<typeof value> => Boolean(value));
    if (item.image && safeUrl(item.image)) resultEmbed.thumbnail = { url: safeUrl(item.image)! };
    return embedResponse(resultEmbed);
  }
  const resultEmbed = embed(`${username}’s recent Letterboxd diary`, feed.url || `https://letterboxd.com/${username}/`, undefined, 0x00d735);
  resultEmbed.description = feed.items.slice(0, 10).map((item) => {
    const label = `${item.title}${item.year ? ` (${item.year})` : ''}`;
    return `${item.url ? `[${label}](${item.url})` : label}${item.rating ? ` · ${item.rating}` : ''}`;
  }).join('\n').slice(0, 4000);
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
  const fields = [
    field('Genres', string(result.Genre)), field('Rated', string(result.Rated)), field('Runtime', string(result.Runtime)),
    field('Directed by', string(result.Director), false), field('Written by', string(result.Writer), false), field('Starring', string(result.Actors), false),
    field('Ratings', Array.isArray(result.Ratings) ? result.Ratings.flatMap((rating) => {
      const item = record(rating);
      return item && string(item.Source) && string(item.Value) ? [`${string(item.Source)}: ${string(item.Value)}`] : [];
    }).join('\n') : undefined, false),
  ].filter((item): item is NonNullable<typeof item> => Boolean(item));
  resultEmbed.fields = fields;
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
  const resultEmbed = embed(string(show.name) ?? query, string(show.url) ?? 'https://www.tvmaze.com/', string(show.summary)?.replace(/<[^>]+>/g, ' '), 0xe6a83c);
  resultEmbed.author = { name: 'TVmaze', url: 'https://www.tvmaze.com/' };
  const fields = [
    field('Language', string(show.language)), field('Premiered', string(show.premiered)), field('Status', string(show.status)),
    field('Genres', Array.isArray(show.genres) ? show.genres.filter((item): item is string => typeof item === 'string').join(', ') : undefined, false),
    field('Network', string(network?.name)), field('Official site', string(show.officialSite), false),
  ].filter((item): item is NonNullable<typeof item> => Boolean(item));
  resultEmbed.fields = fields;
  if (safeUrl(image?.original) ?? safeUrl(image?.medium)) resultEmbed.thumbnail = { url: safeUrl(image?.original) ?? safeUrl(image?.medium)! };
  return embedResponse(resultEmbed);
}

async function pokemon(context: CommandContext, query: string): Promise<APIInteractionResponse> {
  const normalized = query.toLowerCase().replace(/^#/, '').replaceAll(' ', '-');
  let pokemonResponse: unknown;
  try { pokemonResponse = await fetchJson(context, `${POKEAPI}/pokemon/${encodeURIComponent(normalized)}`); }
  catch (error) {
    if (error instanceof UpstreamStatusError && error.status === 404) return response(`No Pokémon found for “${query}”.`);
    throw error;
  }
  const entry = record(pokemonResponse);
  if (!entry || typeof entry.id !== 'number' || typeof entry.name !== 'string') return response(`No Pokémon found for “${query}”.`);
  const speciesUrl = string(nested(entry, 'species')?.url);
  let species: Record<string, unknown> | null = null;
  if (speciesUrl) {
    try { species = record(await fetchJson(context, speciesUrl)); } catch { species = null; }
  }
  const flavor = Array.isArray(species?.flavor_text_entries)
    ? species.flavor_text_entries.map(record).find((item) => string(record(item?.language)?.name) === 'en')
    : undefined;
  const dex = String(entry.id).padStart(4, '0');
  const title = `#${dex} · ${entry.name.replaceAll('-', ' ')}`;
  const resultEmbed = embed(title, `${POKEAPI}/pokemon/${encodeURIComponent(normalized)}`, string(flavor?.flavor_text)?.replace(/[\n\f]+/g, ' '), 0xef5350);
  const types = Array.isArray(entry.types) ? entry.types.flatMap((item) => {
    const type = string(nested(item, 'type')?.name);
    return type ? [type] : [];
  }).join(', ') : '';
  const abilities = Array.isArray(entry.abilities) ? entry.abilities.flatMap((item) => {
    const ability = string(nested(item, 'ability')?.name);
    return ability ? [ability] : [];
  }).join(', ') : '';
  const stats = Array.isArray(entry.stats) ? entry.stats.flatMap((item) => {
    const detail = record(item);
    const stat = string(nested(item, 'stat')?.name);
    return stat && typeof detail?.base_stat === 'number' ? [`${stat.replaceAll('-', ' ')}: ${detail.base_stat}`] : [];
  }).join(' · ') : '';
  const genus = Array.isArray(species?.genera) ? species.genera.map(record).find((item) => string(record(item?.language)?.name) === 'en') : undefined;
  resultEmbed.fields = [
    field('Type', types), field('Abilities', abilities, false), field('Height', typeof entry.height === 'number' ? `${entry.height / 10} m` : undefined),
    field('Weight', typeof entry.weight === 'number' ? `${entry.weight / 10} kg` : undefined), field('Category', string(genus?.genus)), field('Base stats', stats, false),
  ].filter((item): item is NonNullable<typeof item> => Boolean(item));
  const sprite = nested(entry, 'sprites');
  if (safeUrl(sprite?.front_default)) resultEmbed.thumbnail = { url: safeUrl(sprite?.front_default)! };
  return embedResponse(resultEmbed);
}

async function google(context: CommandContext, query: string, count: number): Promise<APIInteractionResponse> {
  const key = process.env.GOOGLE_CSE_API_KEY;
  const engine = process.env.GOOGLE_CSE_ENGINE_ID;
  if (!key || !engine) throw new ProviderConfigurationError('GOOGLE_CSE_API_KEY and GOOGLE_CSE_ENGINE_ID');
  const url = new URL(`${GOOGLE_API}/customsearch/v1`);
  url.searchParams.set('key', key);
  url.searchParams.set('cx', engine);
  url.searchParams.set('q', query);
  url.searchParams.set('num', String(Math.min(5, Math.max(1, count))));
  url.searchParams.set('safe', 'active');
  const result = record(await fetchJson(context, url.toString()));
  const items = Array.isArray(result?.items) ? result.items.map(record).filter((item): item is Record<string, unknown> => Boolean(item)) : [];
  if (!items.length) return response(`No Google results found for “${query}”.`);
  const resultEmbed = embed(`Google results for ${query}`, `https://www.google.com/search?q=${encodeURIComponent(query)}`);
  resultEmbed.description = items.slice(0, 5).flatMap((item) => {
    const title = string(item.title);
    const link = safeUrl(item.link);
    if (!title || !link) return [];
    return [`[${title}](${link})${string(item.snippet) ? `\n${string(item.snippet)}` : ''}`];
  }).join('\n\n').slice(0, 4000);
  if (!resultEmbed.description) return response(`No usable Google results found for “${query}”.`);
  const total = string(nested(result, 'searchInformation')?.formattedTotalResults);
  if (total) resultEmbed.footer = { text: `About ${total} results · Google Custom Search` };
  return embedResponse(resultEmbed);
}

async function youtube(context: CommandContext, query: string): Promise<APIInteractionResponse> {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) throw new ProviderConfigurationError('YOUTUBE_API_KEY');
  const url = new URL(`${GOOGLE_API}/youtube/v3/search`);
  url.searchParams.set('part', 'snippet');
  url.searchParams.set('type', 'video');
  url.searchParams.set('maxResults', '1');
  url.searchParams.set('safeSearch', 'strict');
  url.searchParams.set('q', query);
  url.searchParams.set('key', key);
  const result = record(await fetchJson(context, url.toString()));
  const items = Array.isArray(result?.items) ? result.items : [];
  const first = record(items[0]);
  const id = nested(first, 'id');
  const snippet = nested(first, 'snippet');
  const videoId = string(id?.videoId);
  if (!videoId || !snippet) return response(`No YouTube videos found for “${query}”.`);
  const resultEmbed = embed(string(snippet.title) ?? query, `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`, string(snippet.description), 0xff0000);
  resultEmbed.author = { name: string(snippet.channelTitle) ?? 'YouTube', url: string(snippet.channelId) ? `https://www.youtube.com/channel/${encodeURIComponent(string(snippet.channelId)!)}` : undefined };
  const thumbnails = nested(snippet, 'thumbnails');
  for (const size of ['high', 'medium', 'default']) {
    const thumb = nested(thumbnails, size);
    const thumbUrl = safeUrl(thumb?.url);
    if (thumbUrl) { resultEmbed.thumbnail = { url: thumbUrl }; break; }
  }
  return embedResponse(resultEmbed);
}

export const lookupModule: CommandModule = {
  commands: definitions,
  matches(interaction: CommandInteraction): boolean {
    return interaction.type === 2 && interaction.data.type === 1 && names.has(interaction.data.name);
  },
  async handle(interaction: CommandInteraction, context: CommandContext): Promise<APIInteractionResponse> {
    if (!this.matches(interaction)) return response('This command is not supported.');
    const command = interaction as APIApplicationCommandInteraction;
    const options = getOptions(command);
    try {
      switch (command.data.name) {
        case 'character': {
          const query = inputText(options.get('query'), 'character');
          return query ? await character(context, query) : response('Enter a character name to search for.');
        }
        case 'comic':
        case 'locg': {
          const query = inputText(options.get('query'), 'comic');
          return query ? await comicSearch(context, query, command.data.name === 'locg') : response('Enter a comic title to search for.');
        }
        case 'pull': return await pull(context, options.get('publisher') as string | undefined, options.get('date') as string | undefined);
        case 'pull-user': {
          const username = inputText(options.get('user'), 'user');
          return username ? await pullUser(context, username, options.get('date') as string | undefined) : response('Enter a League of Comic Geeks username.');
        }
        case 'letterboxd': {
          const username = inputText(options.get('username'), 'username');
          return username ? await letterboxd(context, username, options.get('film') as string | undefined) : response('Enter a Letterboxd username.');
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
        case 'google': {
          const query = inputText(options.get('query'), 'query');
          const amount = options.get('amount');
          return query ? await google(context, query, typeof amount === 'number' ? amount : 3) : response('Enter something to search for.');
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
      return response('The lookup provider is unavailable right now. Please try again shortly.');
    }
  },
};
