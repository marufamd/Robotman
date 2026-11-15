import { normalizeReply } from '../rich-reply.js';

export const categories = ['character', 'writer', 'moderator', 'booster'] as const;
export type Category = typeof categories[number];
export const categoryLabels: Record<Category, string> = { character: 'Character', writer: 'Writer', moderator: 'Moderator', booster: 'Booster' };
export type ListSettings = { title: string; introduction: string; color: number };
export type TasteTestSettings = ListSettings & { moderatorHeading: string; boosterHeading: string };
export type Settings = {
  lists: { tasteTest: TasteTestSettings; characters: ListSettings; writers: ListSettings };
  categories: Array<{ category: string; introduction: string }>;
};
const categoryIntroductions: Record<Category, string> = {
  character: '',
  writer: '',
  moderator: "Welcome to **Taste Test**, where you can sample our mods' personal recommendations and personal taste! Feel free to engage us on a discussion, and please, have fun discovering what we love.",
  booster: "Welcome to a special **Taste Test**, where you can sample our **Boosters'** personal recommendations and personal taste! Feel free to engage us on a discussion, and please, have fun discovering what we love.",
};
export const defaultSettings: Settings = {
  lists: {
    tasteTest: { title: 'Taste Test', color: 3447003, moderatorHeading: 'Mods', boosterHeading: 'Boosters',
      introduction: "Welcome to **Taste Test**, where you can sample our mods' and boosters' personal recommendations and personal taste! Feel free to engage us on a discussion, and please, have fun discovering what we love." },
    characters: { title: 'Character Recommendations', color: 3447003, introduction: 'Browse our Character collections below. Use `/recs lookup` and start typing a name or alias to see a collection.' },
    writers: { title: 'Writer Recommendations', color: 3447003, introduction: 'Browse our Writer collections below. Use `/recs lookup` and start typing a name or alias to see a collection.' },
  },
  categories: categories.map(category => ({ category: category.toUpperCase(), introduction: categoryIntroductions[category] })),
};
/** Reads saved settings JSON, filling anything missing (including rows saved before the separate lists existed) with defaults. */
export function resolveSettings(stored: unknown): Settings {
  const data = (stored && typeof stored === 'object' ? stored : {}) as Partial<Settings>;
  const merge = <T extends object>(base: T, value: unknown): T => ({ ...base, ...Object.fromEntries(Object.entries((value && typeof value === 'object' ? value : {}) as Record<string, unknown>).filter(([key, item]) => key in base && typeof item === typeof (base as Record<string, unknown>)[key])) });
  const lists = (data.lists ?? {}) as Partial<Settings['lists']>;
  return {
    lists: { tasteTest: merge(defaultSettings.lists.tasteTest, lists.tasteTest), characters: merge(defaultSettings.lists.characters, lists.characters), writers: merge(defaultSettings.lists.writers, lists.writers) },
    categories: defaultSettings.categories.map(base => {
      const saved = Array.isArray(data.categories) ? data.categories.find(item => item?.category === base.category) : undefined;
      return { category: base.category, introduction: typeof saved?.introduction === 'string' ? saved.introduction : base.introduction };
    }),
  };
}
export type Entry = { name: string; category: string; content: string; embeds: Record<string, unknown>[]; aliases: string[]; curatorName: string; introductionMode: string; introduction: string };
export function introductionFor(entry: Pick<Entry, 'category' | 'introductionMode' | 'introduction'>, settings: Settings) {
  if (entry.introductionMode === 'none') return '';
  if (entry.introductionMode === 'custom') return entry.introduction;
  return settings.categories.find(item => item.category.toLowerCase() === entry.category)?.introduction ?? '';
}
export function substituteReply(value: unknown, replacements: Record<string, string>): any {
  if (typeof value === 'string') return value.replace(/\{(user|username|avatar|server|channel|trigger|curator_name|curator)\}/g, (token, key: string) => replacements[key] ?? token);
  if (Array.isArray(value)) return value.map(item => substituteReply(item, replacements));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, substituteReply(item, replacements)]));
  return value;
}
export function effectiveReply(entry: Entry, settings: Settings, replacements: Record<string, string> = {}) {
  const values = { ...replacements, curator: entry.curatorName, curator_name: entry.curatorName };
  const content = substituteReply([introductionFor(entry, settings), entry.content].filter(value => value.trim()).join('\n\n'), values) as string;
  const embeds = substituteReply(entry.embeds, values) as Record<string, unknown>[];
  normalizeReply({ trigger: entry.name, aliases: entry.aliases, content, embedsJson: JSON.stringify(embeds) });
  return { ...(content ? { content } : {}), ...(embeds.length ? { embeds } : {}), allowed_mentions: { parse: [] } };
}
