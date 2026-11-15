import { composeReply, effectiveReply, introductionFor, resolveSettings, type ListSettings, type Settings, type Entry } from '../../recommendations/model.js';
import { InteractionResponseType } from 'discord.js';
import type {
  APIInteractionResponse,
  RESTPostAPIChatInputApplicationCommandsJSONBody,
} from 'discord.js';
import type { CommandContext, CommandInteraction, CommandModule } from '../types.js';

type InputInteraction = {
  type: number;
  guild_id?: string;
  channel_id?: string;
  member?: { user?: { id: string; username?: string; avatar?: string | null; discriminator?: string } };
  user?: { id: string; username?: string; avatar?: string | null; discriminator?: string };
  data: { custom_id?: string; type: 1; name: string; options?: Array<{ type: number; name: string; value?: string; focused?: boolean; options?: Array<{ type: number; name: string; value?: string; focused?: boolean }> }> };
};

const categories = ['character', 'writer', 'moderator', 'booster'] as const;
const categoryLabels: Record<(typeof categories)[number], string> = {
  character: 'Character', writer: 'Writer', moderator: 'Moderator', booster: 'Booster',
};

const definitions = [
  {
    name: 'response', description: 'Request a saved Response by its exact trigger or alias.',
    options: [{ name: 'trigger', description: 'Response trigger or alias', type: 3, required: true, max_length: 100 }],
  },
  {
    name: 'recs', description: 'Browse Recommendations.',
    options: [
      {
        name: 'lookup', description: 'Request a Recommendation Entry.', type: 1,
        options: [{ name: 'name', description: 'Recommendation name', type: 3, required: true, autocomplete: true, max_length: 100 }],
      },
      { name: 'taste-test', description: 'Browse the Mods and Boosters personal recommendation lists.', type: 1 },
      { name: 'characters', description: 'Browse Character recommendation collections.', type: 1 },
      { name: 'writers', description: 'Browse Writer recommendation collections.', type: 1 },
    ],
  },
] satisfies RESTPostAPIChatInputApplicationCommandsJSONBody[];

const response = (content: string): APIInteractionResponse => ({ type: InteractionResponseType.ChannelMessageWithSource, data: { content: content.slice(0, 2000) } });
const autocomplete = (choices: Array<{ name: string; value: string }>): APIInteractionResponse => ({ type: InteractionResponseType.ApplicationCommandAutocompleteResult, data: { choices } });

function input(interaction: CommandInteraction): InputInteraction {
  return interaction as unknown as InputInteraction;
}

function command(interaction: CommandInteraction): boolean {
  const candidate = interaction as unknown as InputInteraction;
  if (candidate.type === 3 && candidate.data?.custom_id?.startsWith('recs-page:')) return true;
  return (candidate.type === 2 || candidate.type === 4) && candidate.data?.type === 1 && ['response', 'recs'].includes(candidate.data.name);
}

function stringOptions(interaction: InputInteraction) {
  const values = new Map<string, string>();
  for (const option of interaction.data.options ?? []) {
    if (option.type === 3 && option.value !== undefined) values.set(option.name, option.value);
    if (option.type === 1) for (const child of option.options ?? []) if (child.type === 3 && child.value !== undefined) values.set(child.name, child.value);
  }
  return values;
}

function selectedSubcommand(interaction: InputInteraction) {
  const option = interaction.data.options?.find(option => option.type === 1);
  return option?.type === 1 ? option.name : undefined;
}

const guildNameCache = new Map<string, { name: string; expiresAt: number }>();

async function guildName(guildId: string, context: CommandContext): Promise<string> {
  const cached = guildNameCache.get(guildId);
  if (cached && cached.expiresAt > Date.now()) return cached.name;
  let name = 'this server';
  if (context.botToken) {
    try {
      const response = await context.fetch(`https://discord.com/api/v10/guilds/${guildId}`, {
        headers: { authorization: `Bot ${context.botToken}` },
        signal: AbortSignal.timeout(2_000),
      });
      if (response.ok) {
        const body = await response.json() as { name?: unknown };
        if (typeof body.name === 'string' && body.name) name = body.name;
      }
    } catch { /* A server-name lookup must not prevent a Response from being delivered. */ }
  }
  guildNameCache.set(guildId, { name, expiresAt: Date.now() + (name === 'this server' ? 30_000 : 5 * 60_000) });
  return name;
}

function requesterAvatar(userId: string, avatarHash?: string | null, discriminator?: string): string {
  if (avatarHash) {
    const extension = avatarHash.startsWith('a_') ? 'gif' : 'png';
    return `https://cdn.discordapp.com/avatars/${userId}/${avatarHash}.${extension}?size=256`;
  }
  try {
    const index = discriminator && discriminator !== '0'
      ? Number.parseInt(discriminator, 10) % 5
      : Number((BigInt(userId) >> 22n) % 6n);
    return `https://cdn.discordapp.com/embed/avatars/${index}.png`;
  } catch {
    return 'https://cdn.discordapp.com/embed/avatars/0.png';
  }
}


async function lookupResponse(interaction: InputInteraction, context: CommandContext) {
  const trigger = stringOptions(interaction).get('trigger')?.trim();
  if (!trigger) return response('Enter a Response trigger or alias.');
  const [found] = await context.sql<{ trigger: string; aliases: string[]; content: string; embeds: Record<string, unknown>[]; introductionMode: string; introduction: string }[]>`
    select trigger, aliases, content, embeds, introduction_mode as "introductionMode", introduction from robotman_responses
    where guild_id = ${interaction.guild_id!}
      and (lower(trigger) = lower(${trigger}) or case when jsonb_typeof(aliases) = 'array' then exists (
        select 1 from jsonb_array_elements_text(aliases) as alias(value) where lower(alias.value) = lower(${trigger})
      ) else false end)
    limit 1`;
  if (!found) return response(`No Response found for “${trigger}”.`);
  const [defaults] = found.introductionMode === 'inherit' ? await context.sql<{ introduction: string }[]>`select introduction from robotman_response_settings where guild_id = ${interaction.guild_id!}` : [];
  const introduction = found.introductionMode === 'custom' ? found.introduction : found.introductionMode === 'inherit' ? defaults?.introduction ?? '' : '';
  const requester = interaction.member?.user ?? interaction.user;
  const userId = requester?.id ?? '';
  // Resolving a server name is only necessary when the saved reply uses it.
  const needsServerName = JSON.stringify([found.content, found.embeds, introduction]).includes('{server}');
  const values = {
    user: `<@${userId}>`,
    username: requester?.username ?? 'Unknown user',
    avatar: requesterAvatar(userId, requester?.avatar, requester?.discriminator),
    server: needsServerName && interaction.guild_id ? await guildName(interaction.guild_id, context) : 'this server',
    channel: `<#${interaction.channel_id ?? ''}>`,
    trigger,
  };
  try {
    // Unlike recommendations, Responses keep Discord's normal mention behaviour, so {user} still notifies the requester.
    const { allowed_mentions: _suppressed, ...data } = composeReply({ name: found.trigger, aliases: found.aliases, content: found.content, embeds: found.embeds }, introduction, values);
    return { type: InteractionResponseType.ChannelMessageWithSource, data } as APIInteractionResponse;
  } catch {
    return response('This Response exceeds Discord’s message limits after its variables are filled in. Ask a server manager to shorten it or the introduction.');
  }
}

async function recommendationSettings(guildId: string, context: CommandContext): Promise<Settings> {
  const [row] = await context.sql<{ data: unknown }[]>`select data from robotman_recommendation_settings where guild_id = ${guildId}`;
  return resolveSettings(row?.data);
}

async function lookupRecommendation(interaction: InputInteraction, context: CommandContext) {
  const choice = stringOptions(interaction).get('name')?.trim();
  if (!choice) return response('Select a Recommendation Entry.');
  // Autocomplete values are "Name · Category" so Discord echoes something readable; long names fall back to the entry ID.
  const suffix = /^(.*) · (Character|Writer|Moderator|Booster)$/s.exec(choice);
  const name = suffix ? suffix[1]! : choice;
  const selectedCategory = suffix?.[2]!.toLowerCase();
  const entries = await context.sql<(Entry & { id: string; description: string; url: string })[]>`
    select recommendation_id as id, category, name, content, embeds, aliases, curator_name as "curatorName", introduction_mode as "introductionMode", introduction, description, url
    from robotman_recommendation_entries
    where guild_id = ${interaction.guild_id!} and (recommendation_id = ${choice} or
      ((lower(name) = lower(${name}) or exists (select 1 from jsonb_array_elements_text(aliases) as alias(value) where lower(alias.value) = lower(${name})))
        ${selectedCategory ? context.sql`and category = ${selectedCategory}` : context.sql``}))
    order by (recommendation_id = ${choice}) desc, category, name limit 2`;
  if (!entries.length) return response(`No Recommendation Entry found for “${name}”.`);
  if (entries.length > 1 && entries[0]?.id !== choice) return response('More than one collection matches. Select a collection from autocomplete, including its category.');
  const entry = entries[0]!;
  // Transitional rows written through the old API retain their original authored embed.
  if (!entry.content && !entry.embeds.length) entry.embeds = [{ title: `${entry.name} · ${categoryLabels[entry.category as keyof typeof categoryLabels]}`, ...(entry.description ? { description: entry.description } : {}), ...(/^https?:\/\//i.test(entry.url) ? { url: entry.url } : {}) }];
  const requester = interaction.member?.user ?? interaction.user;
  const settings = await recommendationSettings(interaction.guild_id!, context);
  const needsServer = JSON.stringify(entry).includes('{server}') || introductionFor(entry, settings).includes('{server}');
  const values = { user: `<@${requester?.id ?? ''}>`, username: requester?.username ?? 'Unknown user', avatar: requesterAvatar(requester?.id ?? '', requester?.avatar, requester?.discriminator), server: needsServer ? await guildName(interaction.guild_id!, context) : 'this server', channel: `<#${interaction.channel_id ?? ''}>`, trigger: suffix || choice !== entry.id ? name : entry.name };
  try {
    return { type: InteractionResponseType.ChannelMessageWithSource, data: effectiveReply(entry, settings, values) } as APIInteractionResponse;
  } catch {
    return response('This collection exceeds Discord’s message limits after its placeholders are filled. Ask a server manager to shorten the reply or introduction.');
  }
}

const escapeName = (name: string) => name.replace(/([\\*_~`|<>])/g, '\\$1').replace(/^([#-])/, '\\$1');
const EMBED_BUDGET = 5800;
type Embed = { title?: string; description?: string; color: number; fields?: Array<{ name: string; value: string }>; footer?: { text: string } };
const embedSize = (embed: Embed) => (embed.title?.length ?? 0) + (embed.description?.length ?? 0) + (embed.footer?.text.length ?? 0) + (embed.fields ?? []).reduce((sum, field) => sum + field.name.length + field.value.length, 0);

/** Capitalizes the first letter of each word for display, leaving other letters (e.g. "DC") as authored. */
const titleCase = (name: string) => name.replace(/(^|[\s\-/(])(\p{Ll})/gu, (_, boundary: string, letter: string) => boundary + letter.toUpperCase());

async function listedNames(guildId: string, categories: string[], context: CommandContext, display: (name: string) => string = name => name) {
  const rows = await context.sql<{ name: string }[]>`select name from robotman_recommendation_entries where guild_id = ${guildId} and category in ${context.sql(categories)} order by lower(name), name, recommendation_id`;
  return rows.map(row => escapeName(display(row.name)));
}

/** Splits names into field values that fit Discord's 1,024-character limit without breaking a name. */
function fieldValues(names: string[]) {
  const values: string[] = [];
  for (const name of names) {
    const last = values.at(-1);
    if (last !== undefined && last.length + name.length + 1 <= 1024) values[values.length - 1] = `${last}\n${name}`;
    else values.push(name);
  }
  return values;
}

async function tasteTest(interaction: InputInteraction, context: CommandContext) {
  const guildId = interaction.guild_id!;
  const { tasteTest: list } = (await recommendationSettings(guildId, context)).lists;
  const [mods, boosters] = [await listedNames(guildId, ['moderator'], context), await listedNames(guildId, ['booster'], context)];
  const first: Embed = { title: list.title, color: list.color };
  if (!mods.length && !boosters.length) {
    first.description = [list.introduction, 'No personal lists have been added yet.'].filter(Boolean).join('\n\n');
    return { type: InteractionResponseType.ChannelMessageWithSource, data: { embeds: [first], allowed_mentions: { parse: [] } } } as APIInteractionResponse;
  }
  if (list.introduction) first.description = list.introduction;
  first.fields = [];
  const embeds: Embed[] = [first];
  for (const [heading, names] of [[list.moderatorHeading, mods], [list.boosterHeading, boosters]] as const) {
    const values = names.length ? fieldValues(names) : ['None yet'];
    values.forEach((value, index) => {
      const field = { name: index ? `${heading} (continued)` : heading, value };
      let target = embeds.at(-1)!;
      if (embedSize(target) + field.name.length + field.value.length > EMBED_BUDGET || (target.fields?.length ?? 0) >= 25) {
        target = { color: list.color, fields: [] };
        embeds.push(target);
      }
      target.fields!.push(field);
    });
  }
  embeds.slice(1).forEach(embed => context.queueFollowup?.({ embeds: [embed], allowed_mentions: { parse: [] } }));
  return { type: InteractionResponseType.ChannelMessageWithSource, data: { embeds: [first], allowed_mentions: { parse: [] } } } as APIInteractionResponse;
}

type PagedList = 'characters' | 'writers';
const pagedCategory: Record<PagedList, string> = { characters: 'character', writers: 'writer' };

async function pagedList(kind: PagedList, requestedPage: number, update: boolean, interaction: InputInteraction, context: CommandContext) {
  const guildId = interaction.guild_id!;
  const list: ListSettings = (await recommendationSettings(guildId, context)).lists[kind];
  const names = await listedNames(guildId, [pagedCategory[kind]], context, titleCase);
  const frame: Embed = { title: list.title, color: list.color };
  const pages: string[][] = [];
  let current: string[] = [];
  const room = (items: string[]) => 4096 - (list.introduction ? list.introduction.length + 2 : 0) - items.join('\n').length;
  for (const name of names) {
    if (current.length && (current.length >= 10 || room(current) < name.length + 1)) { pages.push(current); current = []; }
    current.push(name);
  }
  if (current.length) pages.push(current);
  const total = Math.max(pages.length, 1);
  const page = Math.min(Math.max(Number.isSafeInteger(requestedPage) ? requestedPage : 0, 0), total - 1);
  const body = pages[page]?.join('\n') ?? `No ${kind === 'characters' ? 'Character' : 'Writer'} recommendations have been added yet.`;
  const embed: Embed = { ...frame, description: [list.introduction, body].filter(Boolean).join('\n\n'), footer: { text: `Page ${page + 1} of ${total}` } };
  const components = total > 1 ? [{ type: 1, components: [
    { type: 2, style: 2, label: 'Previous', custom_id: `recs-page:${kind}:${Math.max(0, page - 1)}`, disabled: page === 0 },
    { type: 2, style: 2, label: 'Next', custom_id: `recs-page:${kind}:${page + 1}`, disabled: page === total - 1 },
  ] }] : [];
  return { type: update ? InteractionResponseType.UpdateMessage : InteractionResponseType.ChannelMessageWithSource, data: { embeds: [embed], components, allowed_mentions: { parse: [] } } } as APIInteractionResponse;
}

async function pageButton(interaction: InputInteraction, context: CommandContext) {
  const [, kind, page] = interaction.data.custom_id!.split(':');
  if (kind !== 'characters' && kind !== 'writers') return response('This list is no longer available.');
  return pagedList(kind, Number(page), true, interaction, context);
}

async function completeRecommendations(interaction: InputInteraction, context: CommandContext) {
  const focused = interaction.data.options?.find(option => option.type === 1)?.options?.find(option => option.type === 3 && option.focused);
  const query = focused?.type === 3 ? (focused.value ?? '').trim() : '';
  const rows = await context.sql<{ id: string; category: string; name: string }[]>`
    select recommendation_id as id, category, name from robotman_recommendation_entries
    where guild_id = ${interaction.guild_id!} and (lower(name) like lower(${`%${query.replace(/[\\%_]/g, '\\$&')}%`}) or exists (
      select 1 from jsonb_array_elements_text(aliases) as alias(value) where lower(alias.value) like lower(${`%${query.replace(/[\\%_]/g, '\\$&')}%`})
    )) order by lower(name), category limit 25`;
  return autocomplete(rows.map(({ id, category, name }) => {
    const suffix = ` · ${categoryLabels[category as keyof typeof categoryLabels] ?? category}`;
    const label = name.length + suffix.length > 100 ? `${name.slice(0, 99 - suffix.length)}…${suffix}` : `${name}${suffix}`;
    return { name: label, value: name.length + suffix.length > 100 ? id : `${name}${suffix}` };
  }));
}

export const requestModule: CommandModule = {
  commands: definitions,
  matches(interaction) { return command(interaction); },
  async handle(interaction, context) {
    if (!command(interaction)) return response('This command is not supported.');
    const candidate = input(interaction);
    if (!candidate.guild_id) return response('Robotman commands are only available in servers.');
    if (candidate.type === 3) return pageButton(candidate, context);
    if (candidate.data.name === 'response') return lookupResponse(candidate, context);
    if (candidate.type === 4) return completeRecommendations(candidate, context);
    switch (selectedSubcommand(candidate)) {
      case 'lookup': return lookupRecommendation(candidate, context);
      case 'taste-test': return tasteTest(candidate, context);
      case 'characters': return pagedList('characters', 0, false, candidate, context);
      case 'writers': return pagedList('writers', 0, false, candidate, context);
      default: return response('Choose a Recommendation lookup or list.');
    }
  },
};
