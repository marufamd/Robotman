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
  member?: { user?: { id: string } };
  user?: { id: string };
  data: { type: 1; name: string; options?: Array<{ type: number; name: string; value?: string; focused?: boolean; options?: Array<{ type: number; name: string; value?: string; focused?: boolean }> }> };
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
      {
        name: 'list', description: 'Browse the Recommendation Directory.', type: 1,
        options: [{ name: 'category', description: 'Limit the directory to a category', type: 3, required: false,
          choices: categories.map(value => ({ name: categoryLabels[value], value })) }],
      },
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

function substitute(value: string, userId: string, channelId: string) {
  return value.replaceAll('{user}', `<@${userId}>`).replaceAll('{channel}', `<#${channelId}>`);
}

function renderPlaceholders(value: unknown, userId: string, channelId: string): unknown {
  if (typeof value === 'string') return substitute(value, userId, channelId);
  if (Array.isArray(value)) return value.map(item => renderPlaceholders(item, userId, channelId));
  if (typeof value === 'object' && value !== null) {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, renderPlaceholders(item, userId, channelId)]));
  }
  return value;
}

function categoryOption(interaction: InputInteraction) {
  return stringOptions(interaction).get('category');
}

async function lookupResponse(interaction: InputInteraction, context: CommandContext) {
  const trigger = stringOptions(interaction).get('trigger')?.trim();
  if (!trigger) return response('Enter a Response trigger or alias.');
  const [found] = await context.sql<{ content: string; embeds: unknown }[]>`
    select content, embeds from robotman_responses
    where guild_id = ${interaction.guild_id!}
      and (lower(trigger) = lower(${trigger}) or case when jsonb_typeof(aliases) = 'array' then exists (
        select 1 from jsonb_array_elements_text(aliases) as alias(value) where lower(alias.value) = lower(${trigger})
      ) else false end)
    limit 1`;
  if (!found) return response(`No Response found for “${trigger}”.`);
  const userId = interaction.member?.user?.id ?? interaction.user?.id ?? '';
  const channelId = interaction.channel_id ?? '';
  const content = substitute(found.content, userId, channelId);
  const embeds = Array.isArray(found.embeds) ? renderPlaceholders(found.embeds, userId, channelId) as unknown[] : [];
  return { type: InteractionResponseType.ChannelMessageWithSource, data: {
    ...(content || !embeds.length ? { content: (content || 'This Response has no content.').slice(0, 2000) } : {}), ...(embeds.length ? { embeds: embeds.slice(0, 10) } : {}),
  } } as APIInteractionResponse;
}

async function lookupRecommendation(interaction: InputInteraction, context: CommandContext) {
  const choice = stringOptions(interaction).get('name')?.trim();
  if (!choice) return response('Select a Recommendation Entry.');
  const separator = choice.indexOf('|');
  const selectedCategory = separator > 0 ? choice.slice(0, separator) : undefined;
  const name = separator > 0 ? choice.slice(separator + 1) : choice;
  const [entry] = await context.sql<{ category: string; name: string; description: string; url: string }[]>`
    select category, name, description, url from robotman_recommendation_entries
    where guild_id = ${interaction.guild_id!} and lower(name) = lower(${name}) ${selectedCategory ? context.sql`and category = ${selectedCategory}` : context.sql``}
    order by category, name limit 1`;
  if (!entry) return response(`No Recommendation Entry found for “${name}”.`);
  const label = categoryLabels[entry.category as keyof typeof categoryLabels] ?? entry.category;
  const title = `${entry.name} · ${label}`;
  const url = /^https?:\/\//i.test(entry.url) ? entry.url : undefined;
  const embed = {
    title: title.slice(0, 256), ...(url ? { url } : {}),
    ...(entry.description ? { description: entry.description.slice(0, 4000) } : {}),
  };
  return { type: InteractionResponseType.ChannelMessageWithSource, data: { embeds: [embed] } } as APIInteractionResponse;
}

async function listRecommendations(interaction: InputInteraction, context: CommandContext) {
  const selected = categoryOption(interaction);
  const rows = selected
    ? await context.sql<{ category: string; name: string; description: string; url: string }[]>`select category, name, description, url from robotman_recommendation_entries where guild_id = ${interaction.guild_id!} and category = ${selected} order by name limit 100`
    : await context.sql<{ category: string; name: string; description: string; url: string }[]>`select category, name, description, url from robotman_recommendation_entries where guild_id = ${interaction.guild_id!} order by category, name limit 100`;
  const grouped = new Map<string, string[]>();
  for (const row of rows) {
    const label = categoryLabels[row.category as keyof typeof categoryLabels] ?? row.category;
    const items = grouped.get(label) ?? [];
    const linkedName = /^https?:\/\//i.test(row.url) ? `[${row.name}](${row.url})` : row.name;
    items.push(`${linkedName}${row.description ? ` — ${row.description}` : ''}`);
    grouped.set(label, items);
  }
  const description = [...grouped].map(([label, names]) => `**${label}**\n${names.join('\n')}`).join('\n\n');
  return { type: InteractionResponseType.ChannelMessageWithSource, data: { embeds: [{ title: 'Recommendation Directory', description: (description || 'No Recommendation Entries found.').slice(0, 4000) }] } } as APIInteractionResponse;
}

async function completeRecommendations(interaction: InputInteraction, context: CommandContext) {
  const focused = interaction.data.options?.find(option => option.type === 1)?.options?.find(option => option.type === 3 && option.focused);
  const query = focused?.type === 3 ? (focused.value ?? '').trim() : '';
  const rows = await context.sql<{ category: string; name: string }[]>`
    select category, name from robotman_recommendation_entries
    where guild_id = ${interaction.guild_id!} and lower(name) like lower(${`%${query.replace(/[\\%_]/g, '\\$&')}%`})
    order by name, category limit 25`;
  return autocomplete(rows.map(({ category, name }) => ({ name: `${name} · ${categoryLabels[category as keyof typeof categoryLabels] ?? category}`.slice(0, 100), value: `${category}|${name}` })));
}

export const requestModule: CommandModule = {
  commands: definitions,
  matches(interaction) { return command(interaction); },
  async handle(interaction, context) {
    if (!command(interaction)) return response('This command is not supported.');
    const candidate = input(interaction);
    if (!candidate.guild_id) return response('Robotman commands are only available in servers.');
    if (candidate.data.name === 'response') return lookupResponse(candidate, context);
    if (candidate.type === 4) return completeRecommendations(candidate, context);
    switch (selectedSubcommand(candidate)) {
      case 'lookup': return lookupRecommendation(candidate, context);
      case 'list': return listRecommendations(candidate, context);
      default: return response('Choose a Recommendation lookup or directory list.');
    }
  },
};
