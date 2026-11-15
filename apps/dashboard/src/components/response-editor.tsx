import { useAuth } from '../lib/auth-context';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { toHTML } from 'discord-markdown';
import { DiscordCommand, DiscordEmbed, DiscordEmbedDescription, DiscordEmbedField, DiscordEmbedFields, DiscordEmbedFooter, DiscordMessage, DiscordMessages } from '@skyra/discord-components-react';
import { Icon, LoadingSpinner } from './icon';
import { InlineAlert, PageHeader, fieldClass, primaryButtonClass } from './server-page';
import { VariableGuide, curatorVariables, messageVariables } from './variables';
import { recommendationFields, recommendationSettingsFields, type RecommendationEntry, type RecommendationSettings, queryGraphql } from '../lib/graphql';
import type { GuildResponse, ManagedServer, User } from '../lib/graphql';

type UnknownRecord = Record<string, unknown>;
type EmbedFieldDraft = { id: string; original: UnknownRecord; name: string; value: string; inline: boolean };
type EmbedDraft = {
  id: string; original: UnknownRecord; title: string; url: string; description: string; color: string;
  authorName: string; authorUrl: string; authorIconUrl: string; fields: EmbedFieldDraft[];
  thumbnailUrl: string; imageUrl: string; footerText: string; footerIconUrl: string; timestamp: string;
};
type EditorResponse = Pick<GuildResponse, 'id' | 'trigger' | 'aliases' | 'content' | 'embedsJson'>;

const MAX_EMBEDS = 10;
const MAX_MESSAGE = 2000;
const MAX_FIELDS = 25;
const inputClass = fieldClass.replace('px-3 py-2.5', 'px-3 py-2');
const editorPrimaryButtonClass = primaryButtonClass.replace('px-4 py-2.5 text-sm', 'px-3 py-2 text-[13px]');
const labelClass = 'block text-[13px] font-medium leading-5 text-night-100';
const helperClass = 'mt-1 text-xs leading-4 text-night-400';
const sectionClass = 'rounded-xl border border-night-800 bg-night-900/60 p-3 sm:p-4';
const embedKeys = new Set(['title', 'url', 'description', 'color', 'author', 'fields', 'thumbnail', 'image', 'footer', 'timestamp']);
const authorKeys = new Set(['name', 'url', 'icon_url']);
const assetKeys = new Set(['url']);
const footerKeys = new Set(['text', 'icon_url']);
const fieldKeys = new Set(['name', 'value', 'inline']);

function record(value: unknown): UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? value as UnknownRecord : {};
}

function keptKeys(value: UnknownRecord, removed: Set<string>): UnknownRecord {
  return Object.fromEntries(Object.entries(value).filter(([key]) => !removed.has(key)));
}

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function colorHex(value: unknown): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '';
  return `#${Math.max(0, Math.min(0xffffff, value)).toString(16).padStart(6, '0')}`;
}

function dateTimeLocal(value: unknown): string {
  if (typeof value !== 'string') return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function createField(index = 0, source: unknown = {}): EmbedFieldDraft {
  const original = record(source);
  return {
    id: `field-${index}-${typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)}`,
    original,
    name: stringValue(original.name),
    value: stringValue(original.value),
    inline: original.inline === true,
  };
}

function createEmbed(source: unknown = {}, index = 0): EmbedDraft {
  const original = record(source);
  const author = record(original.author);
  const thumbnail = record(original.thumbnail);
  const image = record(original.image);
  const footer = record(original.footer);
  const sourceFields = Array.isArray(original.fields) ? original.fields : [];
  return {
    id: `embed-${index}-${typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)}`,
    original,
    title: stringValue(original.title),
    url: stringValue(original.url),
    description: stringValue(original.description),
    color: colorHex(original.color),
    authorName: stringValue(author.name),
    authorUrl: stringValue(author.url),
    authorIconUrl: stringValue(author.icon_url),
    fields: sourceFields.map((field, fieldIndex) => createField(fieldIndex, field)),
    thumbnailUrl: stringValue(thumbnail.url),
    imageUrl: stringValue(image.url),
    footerText: stringValue(footer.text),
    footerIconUrl: stringValue(footer.icon_url),
    timestamp: dateTimeLocal(original.timestamp),
  };
}

function parseEmbeds(value: string): EmbedDraft[] {
  const parsed: unknown = JSON.parse(value || '[]');
  if (!Array.isArray(parsed) || parsed.some(item => !item || typeof item !== 'object' || Array.isArray(item))) {
    throw new Error('This Response contains embed data the editor could not read. Its saved content has not been changed.');
  }
  return parsed.map((item, index) => createEmbed(item, index));
}

function serializeEmbed(embed: EmbedDraft): UnknownRecord {
  const result = keptKeys(embed.original, embedKeys);
  if (embed.title.trim()) result.title = embed.title;
  if (embed.url.trim()) result.url = embed.url.trim();
  if (embed.description.trim()) result.description = embed.description;
  if (embed.color) result.color = Number.parseInt(embed.color.slice(1), 16);

  const author = keptKeys(record(embed.original.author), authorKeys);
  if (embed.authorName.trim()) author.name = embed.authorName;
  if (embed.authorUrl.trim()) author.url = embed.authorUrl.trim();
  if (embed.authorIconUrl.trim()) author.icon_url = embed.authorIconUrl.trim();
  if (Object.keys(author).length) result.author = author;

  const fields = embed.fields.filter(field => field.name.trim() || field.value.trim() || Object.keys(keptKeys(field.original, fieldKeys)).length > 0).map(field => {
    const item = keptKeys(field.original, fieldKeys);
    if (field.name.trim()) item.name = field.name;
    if (field.value.trim()) item.value = field.value;
    if (field.inline) item.inline = true;
    return item;
  });
  if (fields.length) result.fields = fields;

  const thumbnail = keptKeys(record(embed.original.thumbnail), assetKeys);
  if (embed.thumbnailUrl.trim()) thumbnail.url = embed.thumbnailUrl.trim();
  if (Object.keys(thumbnail).length) result.thumbnail = thumbnail;
  const image = keptKeys(record(embed.original.image), assetKeys);
  if (embed.imageUrl.trim()) image.url = embed.imageUrl.trim();
  if (Object.keys(image).length) result.image = image;

  const footer = keptKeys(record(embed.original.footer), footerKeys);
  if (embed.footerText.trim()) footer.text = embed.footerText;
  if (embed.footerIconUrl.trim()) footer.icon_url = embed.footerIconUrl.trim();
  if (Object.keys(footer).length) result.footer = footer;
  if (embed.timestamp) {
    const date = new Date(embed.timestamp);
    if (!Number.isNaN(date.getTime())) result.timestamp = date.toISOString();
  }
  return result;
}

function visibleEmbedContent(embed: EmbedDraft): boolean {
  return Boolean(embed.title.trim() || embed.url.trim() || embed.description.trim() || embed.color || embed.authorName.trim() || embed.authorUrl.trim() || embed.authorIconUrl.trim() || embed.fields.some(field => field.name.trim() || field.value.trim()) || embed.thumbnailUrl.trim() || embed.imageUrl.trim() || embed.footerText.trim() || embed.footerIconUrl.trim() || embed.timestamp || hasUnexposedProperties(embed.original));
}

function hasUnexposedProperties(value: UnknownRecord): boolean {
  if (Object.keys(keptKeys(value, embedKeys)).length) return true;
  const nested = [
    [record(value.author), authorKeys], [record(value.thumbnail), assetKeys], [record(value.image), assetKeys], [record(value.footer), footerKeys],
  ] as const;
  if (nested.some(([item, keys]) => Object.keys(keptKeys(item, keys)).length > 0)) return true;
  return Array.isArray(value.fields) && value.fields.some(field => Object.keys(keptKeys(record(field), fieldKeys)).length > 0);
}

function embedTextLength(embed: EmbedDraft): number {
  return embed.title.length + embed.description.length + embed.authorName.length + embed.footerText.length + embed.fields.reduce((total, field) => total + field.name.length + field.value.length, 0);
}

function validWebUrl(value: string): boolean {
  if (!value.trim()) return true;
  try { const url = new URL(value); return url.protocol === 'https:' || url.protocol === 'http:'; }
  catch { return false; }
}

function validateResponse(trigger: string, aliases: string[], content: string, embeds: EmbedDraft[]): string[] {
  const errors: string[] = [];
  if (!trigger.trim()) errors.push('Trigger is required.');
  if (trigger.length > 100) errors.push('Trigger must be 100 characters or fewer.');
  aliases.forEach((alias, index) => {
    if (!alias.trim()) errors.push(`Alias ${index + 1} cannot be empty.`);
    if (alias.length > 100) errors.push(`Alias ${index + 1} must be 100 characters or fewer.`);
  });
  const names = [trigger, ...aliases].filter(value => value.trim()).map(value => value.trim().toLocaleLowerCase('en-US'));
  if (new Set(names).size !== names.length) errors.push('The trigger and aliases must be distinct.');
  if (content.length > MAX_MESSAGE) errors.push(`Message text must be ${MAX_MESSAGE} characters or fewer.`);
  if (embeds.length > MAX_EMBEDS) errors.push(`A Response can contain at most ${MAX_EMBEDS} embeds.`);
  let total = 0;
  embeds.forEach((embed, index) => {
    const prefix = `Embed ${index + 1}`;
    if (embed.title.length > 256) errors.push(`${prefix} title must be 256 characters or fewer.`);
    if (embed.description.length > 4096) errors.push(`${prefix} description must be 4,096 characters or fewer.`);
    if (embed.authorName.length > 256) errors.push(`${prefix} author name must be 256 characters or fewer.`);
    if (embed.footerText.length > 2048) errors.push(`${prefix} footer text must be 2,048 characters or fewer.`);
    if (embed.fields.length > MAX_FIELDS) errors.push(`${prefix} can contain at most ${MAX_FIELDS} fields.`);
    embed.fields.forEach((field, fieldIndex) => {
      if (field.name.length > 256) errors.push(`${prefix}, field ${fieldIndex + 1} name must be 256 characters or fewer.`);
      if (field.value.length > 1024) errors.push(`${prefix}, field ${fieldIndex + 1} value must be 1,024 characters or fewer.`);
    });
    const urls = [
      ['title URL', embed.url], ['author URL', embed.authorUrl], ['author icon URL', embed.authorIconUrl],
      ['thumbnail URL', embed.thumbnailUrl], ['image URL', embed.imageUrl], ['footer icon URL', embed.footerIconUrl],
    ] as const;
    urls.forEach(([name, value]) => { if (!validWebUrl(value)) errors.push(`${prefix} ${name} must be a valid HTTP or HTTPS URL.`); });
    if (embed.timestamp && Number.isNaN(new Date(embed.timestamp).getTime())) errors.push(`${prefix} timestamp is invalid.`);
    total += embedTextLength(embed);
  });
  if (total > 6000) errors.push(`Embed text across this Response must be 6,000 characters or fewer (${total} entered).`);
  if (!content.trim() && !embeds.some(visibleEmbedContent)) errors.push('Add message text or at least one non-empty embed.');
  return errors;
}

function textError(errors: string[], prefix: string): string | undefined {
  return errors.find(error => error.toLowerCase().startsWith(prefix.toLowerCase()));
}

export function ResponseEditor({ server, user, csrfToken, responseId, recommendation = false, recommendationId }: { server: ManagedServer; user: User | null; csrfToken: string; responseId?: string; recommendation?: boolean; recommendationId?: string }) {
  const entityId = recommendation ? recommendationId : responseId;
  const navigate = useNavigate();
  const { needsSignIn } = useAuth();
  const draftKey = `robotman:${recommendation ? 'recommendation' : 'response'}-draft:${user?.id}:${server.id}:${entityId ?? 'new'}`;
  const [category, setCategory] = useState('CHARACTER');
  const [curatorName, setCuratorName] = useState('');
  const [curatorUserId, setCuratorUserId] = useState('');
  const [introductionMode, setIntroductionMode] = useState<'INHERIT' | 'CUSTOM' | 'NONE'>('INHERIT');
  const [introduction, setIntroduction] = useState('');
  const [settings, setSettings] = useState<RecommendationSettings | null>(null);
  const [restored, setRestored] = useState(false);
  const [trigger, setTrigger] = useState('');
  const [aliases, setAliases] = useState<string[]>([]);
  const [content, setContent] = useState('');
  const [embeds, setEmbeds] = useState<EmbedDraft[]>([]);
  const [newlyAddedEmbedId, setNewlyAddedEmbedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(Boolean(entityId));
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loaded, setLoaded] = useState(!entityId);
  const [error, setError] = useState<string | null>(null);
  const [embedParseError, setEmbedParseError] = useState<string | null>(null);
  const personalList = recommendation && ['MODERATOR', 'BOOSTER'].includes(category);
  const entryName = personalList ? curatorName : trigger;
  const effectiveIntroduction = introductionMode === 'NONE' ? '' : introductionMode === 'CUSTOM' ? introduction : settings?.categories.find(item => item.category === category)?.introduction ?? '';
  const triggerText = (value: string) => value.replace(/\{trigger\}/g, () => trigger.trim() || 'trigger');
  const curatorText = (value: string) => triggerText(value.replace(/\{curator(?:_name)?\}/g, () => curatorName));
  const composedContent = recommendation ? curatorText([effectiveIntroduction, content].filter(value => value.trim()).join('\n\n')) : triggerText(content);
  const messageRef = useRef<HTMLTextAreaElement>(null);
  function insertVariable(token: string) {
    const field = messageRef.current;
    const start = field?.selectionStart ?? content.length;
    const end = field?.selectionEnd ?? start;
    const next = `${content.slice(0, start)}${token}${content.slice(end)}`;
    if (next.length > MAX_MESSAGE) return;
    setContent(next);
    requestAnimationFrame(() => { field?.focus(); field?.setSelectionRange(start + token.length, start + token.length); });
  }
  const validationErrors = useMemo(() => {
    const errors = validateResponse(entryName, aliases, composedContent, embeds);
    if (recommendation && ['MODERATOR', 'BOOSTER'].includes(category) && !curatorName.trim()) errors.push('Curator name is required.');
    if (recommendation && curatorUserId && !/^\d{17,20}$/.test(curatorUserId)) errors.push('Enter a valid Discord user ID.');
    if (recommendation && !content.trim() && !embeds.some(visibleEmbedContent)) errors.push('Add authored message text or a non-empty embed.');
    return errors;
  }, [trigger, aliases, composedContent, content, embeds, recommendation, category, curatorName, curatorUserId]);
  const responsesUrl = recommendation ? '/servers/$serverId/recommendations' as const : '/servers/$serverId/responses' as const;

  useEffect(() => {
    if (!recommendation) return;
    let active = true;
    queryGraphql<{ recommendationSettings: RecommendationSettings }>(`query($server: ID!) { recommendationSettings(guildId: $server) { ${recommendationSettingsFields} } }`, undefined, { server: server.id })
      .then(result => { if (active) setSettings(result.recommendationSettings); })
      .catch(reason => { if (active) setError(reason instanceof Error ? reason.message : 'Could not load recommendation settings.'); });
    return () => { active = false; };
  }, [recommendation, server.id]);

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(draftKey);
      if (saved) {
        const draft = JSON.parse(saved);
        if (typeof draft.trigger === 'string' && typeof draft.content === 'string' && Array.isArray(draft.aliases) && draft.aliases.every((alias: unknown) => typeof alias === 'string') && Array.isArray(draft.embeds)) {
          if (recommendation) {
            setCategory(draft.category ?? 'CHARACTER'); setCuratorName(draft.curatorName ?? ''); setCuratorUserId(draft.curatorUserId ?? ''); setIntroductionMode(draft.introductionMode ?? 'INHERIT'); setIntroduction(draft.introduction ?? '');
          }
          setTrigger(draft.trigger); setAliases(draft.aliases); setContent(draft.content); setEmbeds(draft.embeds);
          setRestored(true); setLoaded(true); setLoading(false);
          return;
        }
      }
    } catch { setError('The saved draft could not be restored.'); }
    if (!entityId) return;
    let active = true;
    setLoading(true);
    setError(null);
    queryGraphql<{ responses?: EditorResponse[]; recommendationEntries?: RecommendationEntry[] }>(
      recommendation ? `query($server: ID!) { recommendationEntries(guildId: $server) { ${recommendationFields} } }` : 'query Responses($server: ID!) { responses(guildId: $server) { id trigger aliases content embedsJson } }',
      undefined,
      { server: server.id },
    ).then(result => {
      if (!active) return;
      const selected = (result.responses ?? result.recommendationEntries ?? []).find(item => item.id === entityId);
      if (!selected) throw new Error(`This ${recommendation ? 'Recommendation' : 'Response'} could not be found in this server.`);
      setTrigger('trigger' in selected ? selected.trigger : selected.name);
      if ('category' in selected) { setCategory(selected.category); setCuratorName(selected.curatorName); setCuratorUserId(selected.curatorUserId ?? ''); setIntroductionMode(selected.introductionMode); setIntroduction(selected.introduction); }
      setAliases(selected.aliases);
      setContent(selected.content);
      try { setEmbeds(parseEmbeds(selected.embedsJson)); }
      catch (reason) { setEmbedParseError(reason instanceof Error ? reason.message : 'The embed data could not be read.'); }
      setLoaded(true);
    }).catch(reason => {
      if (active) setError(reason instanceof Error ? reason.message : 'Could not load this Response.');
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [entityId, server.id, draftKey, recommendation]);

  useEffect(() => {
    const preserveDraft = (event: Event) => {
      if (!loaded) return;
      try { sessionStorage.setItem(draftKey, JSON.stringify({ trigger, aliases, content, embeds, category, curatorName, curatorUserId, introductionMode, introduction })); }
      catch {
        event.preventDefault();
        setError('Your draft could not be kept for sign-in. Allow tab storage or copy your changes before continuing.');
      }
    };
    window.addEventListener('robotman:before-sign-in', preserveDraft);
    return () => window.removeEventListener('robotman:before-sign-in', preserveDraft);
  }, [draftKey, loaded, trigger, aliases, content, embeds, category, curatorName, curatorUserId, introductionMode, introduction]);

  function discardDraft() {
    try { sessionStorage.removeItem(draftKey); } catch { /* Navigation still works if tab storage is unavailable. */ }
  }

  function updateEmbed(index: number, update: Partial<EmbedDraft>) {
    setEmbeds(current => current.map((item, itemIndex) => itemIndex === index ? { ...item, ...update } : item));
  }

  function addAlias() { setAliases(current => [...current, '']); }
  function addEmbed() {
    if (embeds.length < MAX_EMBEDS) {
      const next = createEmbed({}, embeds.length);
      setEmbeds(current => [...current, next]);
      setNewlyAddedEmbedId(next.id);
    }
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
    if (needsSignIn || saving || validationErrors.length || embedParseError || !loaded) return;
    setSaving(true);
    setError(null);
    const payload = {
      ...(recommendation ? { name: entryName.trim(), category, curatorName, curatorUserId: curatorUserId || null, introductionMode, introduction } : { trigger: trigger.trim() }),
      aliases: aliases.map(alias => alias.trim()).filter(Boolean),
      content,
      embedsJson: JSON.stringify(embeds.map(serializeEmbed)),
    };
    try {
      const field = recommendation ? entityId ? 'updateRecommendation' : 'createRecommendation' : entityId ? 'updateResponse' : 'createResponse';
      const inputType = recommendation ? 'RecommendationInput' : 'ResponseInput';
      const query = entityId
        ? `mutation Save($server: ID!, $id: ID!, $input: ${inputType}!) { ${field}(guildId: $server, id: $id, input: $input) { id } }`
        : `mutation Save($server: ID!, $input: ${inputType}!) { ${field}(guildId: $server, input: $input) { id } }`;
      await queryGraphql(query, csrfToken, { server: server.id, ...(entityId ? { id: entityId } : {}), input: payload });
      discardDraft();
      await navigate({ to: responsesUrl, params: { serverId: server.id }, search: {} });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not save this Response.');
    } finally { setSaving(false); }
  }

  const previewUser = user ?? { id: '', username: 'You', displayName: null, avatarUrl: null };

  return <section className="response-editor">
    <PageHeader compact description={recommendation ? 'Name a collection, then compose the reading list members will see.' : entityId ? 'Update the message members see when they request this phrase.' : 'Choose the phrase members can request, then compose the reply they will see.'} server={server} title={recommendation ? entityId ? 'Edit Recommendation' : 'New Recommendation' : entityId ? 'Edit Response' : 'New Response'} />
    <Link className="recommendation-back-link mb-4 inline-flex items-center gap-2 text-[13px] font-semibold text-night-300 underline-offset-4 transition hover:text-white hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-sunset-400" params={{ serverId: server.id }} to={responsesUrl}><Icon className="size-4 rotate-180" name="arrow" /><span>{recommendation ? 'All Recommendations' : 'All Responses'}</span></Link>
    {restored && <div className="mb-5"><InlineAlert tone="success">Your draft was restored. Review it, then save when ready.</InlineAlert></div>}
    {error && (!needsSignIn || error !== 'Sign in required') && <div className="mb-5"><InlineAlert>{error}</InlineAlert></div>}
    {embedParseError && <div className="mb-5"><InlineAlert>{embedParseError}</InlineAlert></div>}
    {(loading || recommendation && !settings && !error) ? <div aria-label="Loading Response" className="h-48 animate-pulse rounded-xl bg-night-800/70" role="status" /> : !loaded || recommendation && !settings ? null : <form onSubmit={event => void save(event)}>
      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(22rem,0.85fr)]">
        <div className="min-w-0 space-y-4">
          {recommendation && <section className={sectionClass} aria-label="Recommendation details">
            <label className={labelClass}>Category<select className={inputClass} value={category} onChange={event => setCategory(event.target.value)}>{['CHARACTER', 'WRITER', 'MODERATOR', 'BOOSTER'].map(value => <option key={value} value={value}>{value[0] + value.slice(1).toLowerCase()}</option>)}</select></label>
            {['MODERATOR', 'BOOSTER'].includes(category) && <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className={labelClass}>Curator name<input className={inputClass} aria-label="Curator name" value={curatorName} maxLength={100} required onChange={event => setCuratorName(event.target.value)} /><span className={helperClass}>Members find this personal list by this name. One list per person per server.</span></label>
              <label className={labelClass}>Discord user ID (optional)<input className={inputClass} inputMode="numeric" value={curatorUserId} onChange={event => setCuratorUserId(event.target.value)} /><span className={helperClass}>This won’t notify the curator or change their list.</span></label>
            </div>}
            <label className={`${labelClass} mt-3`}>Introduction<select className={inputClass} value={introductionMode} onChange={event => setIntroductionMode(event.target.value as typeof introductionMode)}><option value="INHERIT">Use category default</option><option value="CUSTOM">Custom introduction</option><option value="NONE">No introduction</option></select></label>
            {introductionMode === 'CUSTOM' ? <label className={`${labelClass} mt-3`}>Custom introduction<textarea className={inputClass} maxLength={2000} rows={3} value={introduction} onChange={event => setIntroduction(event.target.value)} /></label> : introductionMode === 'INHERIT' && <p className={`${helperClass} mt-2 whitespace-pre-wrap`}>{effectiveIntroduction || 'This category has no introduction.'}</p>}
          </section>}
          <section aria-labelledby="response-identity" className={sectionClass}>
            <h2 className="font-display text-base font-bold text-white" id="response-identity">{recommendation ? personalList ? 'Search aliases' : 'Collection name and aliases' : 'Trigger and aliases'}</h2>
            <p className={helperClass}>{recommendation ? 'Members find this collection by its name or search aliases in /recs lookup.' : 'Members can request the Response with any exact phrase below. Matching ignores letter case.'}</p>
            <div className="mt-3 space-y-3">
              {!personalList && <label className={labelClass} htmlFor="response-trigger">{recommendation ? 'Collection name' : 'Trigger'}<input className={inputClass} id="response-trigger" maxLength={100} onChange={event => setTrigger(event.target.value)} required value={trigger} /><span className={helperClass}>{trigger.length}/100 characters</span>{submitted && textError(validationErrors, 'Trigger') && <span className="mt-1 block text-xs text-rose-300">{textError(validationErrors, 'Trigger')}</span>}</label>}
              <div>
                <div className="flex items-center justify-between gap-3"><span className={labelClass}>Aliases</span><button className="text-[13px] font-semibold text-sunset-200 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-sunset-400" onClick={addAlias} type="button"><span aria-hidden="true">+</span> Add alias</button></div>
                <p className={helperClass}>{recommendation ? 'Alternate names that help members find this collection.' : 'Optional alternate phrases that return this same Response.'}</p>
                <div className="mt-3 space-y-2">
                  {aliases.map((alias, index) => <div className="flex items-start gap-2" key={`alias-${index}`}>
                    <div className="min-w-0 flex-1"><label className="sr-only" htmlFor={`response-alias-${index}`}>Alias {index + 1}</label><input className={inputClass} id={`response-alias-${index}`} maxLength={100} onChange={event => setAliases(current => current.map((value, aliasIndex) => aliasIndex === index ? event.target.value : value))} value={alias} />{submitted && textError(validationErrors, `Alias ${index + 1}`) && <span className="mt-1 block text-xs text-rose-300">{textError(validationErrors, `Alias ${index + 1}`)}</span>}</div>
                    <button aria-label={`Remove alias ${index + 1}`} className="mt-1 rounded-lg border border-night-700 px-2.5 py-1.5 text-[13px] text-night-200 hover:border-rose-400 hover:text-rose-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-rose-300" onClick={() => setAliases(current => current.filter((_, aliasIndex) => aliasIndex !== index))} type="button">Remove</button>
                  </div>)}
                  {aliases.length === 0 && <p className="rounded-lg border border-dashed border-night-700 px-3 py-3 text-sm text-night-400">{recommendation ? 'No aliases. Add another name members might search for.' : 'No aliases. Add an alternate phrase if members use another name for this Response.'}</p>}
                </div>
              </div>
            </div>
          </section>

          <section aria-labelledby="message-content-title" className={sectionClass}>
            <div className="flex items-start justify-between gap-4"><div><h2 className="font-display text-base font-bold text-white" id="message-content-title">Message text</h2><p className={helperClass}>Optional text that appears above any embeds.</p></div><span className="shrink-0 text-xs tabular-nums text-night-400">{content.length}/{MAX_MESSAGE}</span></div>
            <label className="sr-only" htmlFor="response-content">Message text</label><textarea className={`${inputClass} mt-3 min-h-28 resize-y`} id="response-content" ref={messageRef} maxLength={MAX_MESSAGE} onChange={event => setContent(event.target.value)} placeholder="Write the reply members will see…" value={content} />
            {submitted && textError(validationErrors, 'Message text') && <p className="mt-1 text-xs text-rose-300">{textError(validationErrors, 'Message text')}</p>}
            <VariableGuide onInsert={insertVariable} variables={personalList ? [...messageVariables, ...curatorVariables] : messageVariables} />
          </section>

          <section aria-labelledby="embeds-title" className={sectionClass}>
            <div className="flex items-start justify-between gap-4"><div><h2 className="font-display text-base font-bold text-white" id="embeds-title">Embeds</h2><p className={helperClass}>Optional rich cards that appear below the message text.</p></div><button className="shrink-0 rounded-lg border border-night-700 px-3 py-1.5 text-[13px] font-semibold text-night-100 transition hover:border-night-500 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-sunset-400 disabled:cursor-not-allowed disabled:opacity-50" disabled={embeds.length >= MAX_EMBEDS} onClick={addEmbed} type="button">Add embed <span aria-hidden="true">+</span></button></div>
            <div className="mt-3 space-y-3">
          {embeds.map((embed, index) => <EmbedCard key={embed.id} embed={embed} index={index} total={embeds.length} totalCharacters={embeds.reduce((sum, item) => sum + embedTextLength(item), 0)} initiallyExpanded={index === 0 || embed.id === newlyAddedEmbedId} errors={validationErrors} onChange={update => updateEmbed(index, update)} onRemove={() => setEmbeds(current => current.filter((_, itemIndex) => itemIndex !== index))} onMove={direction => setEmbeds(current => { const target = index + direction; if (target < 0 || target >= current.length) return current; const next = [...current]; [next[index], next[target]] = [next[target]!, next[index]!]; return next; })} />)}
              {embeds.length === 0 && <div className="rounded-lg border border-dashed border-night-700 px-4 py-5"><p className="text-sm font-semibold text-white">No embeds added</p><p className={helperClass}>Use embeds for structured announcements, links, and images.</p></div>}
            </div>
            <p className="mt-4 text-xs text-night-400">{embeds.length}/{MAX_EMBEDS} embeds · Embed text across the {recommendation ? 'recommendation' : 'Response'} is limited to 6,000 characters.</p>
          </section>

          {(submitted && validationErrors.length > 0) && <div className="rounded-xl border border-rose-400/30 bg-rose-950/30 px-4 py-3 text-sm text-rose-200" role="alert"><span className="font-semibold">Review these fields:</span><ul className="mt-2 list-disc space-y-1 pl-5">{validationErrors.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}</ul></div>}
          <div className="sticky bottom-3 z-10 flex flex-wrap justify-end gap-3 rounded-xl border border-night-800 bg-night-950/95 p-3 shadow-xl sm:static sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none">
            <Link className="rounded-lg border border-night-700 px-3 py-2 text-[13px] font-semibold text-night-200 hover:border-night-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sunset-400" params={{ serverId: server.id }} onClick={discardDraft} to={responsesUrl}>Cancel</Link>
            <button className={editorPrimaryButtonClass} disabled={needsSignIn || saving || loading || !loaded} type="submit">{saving ? <span className="inline-flex items-center gap-2"><LoadingSpinner className="size-3.5 text-black" label="Saving…" />Saving…</span> : entityId ? 'Save changes' : recommendation ? 'Create Recommendation' : 'Create Response'}</button>
          </div>
        </div>
        <aside aria-label="Live Discord preview" className="min-w-0 xl:sticky xl:top-6">
          <DiscordResponsePreview commandName={recommendation ? 'recs lookup' : undefined} content={composedContent} embeds={JSON.parse(JSON.stringify(embeds.map(serializeEmbed)), (_key, value: unknown) => typeof value === 'string' ? (recommendation ? curatorText(value) : triggerText(value)) : value)} user={previewUser} server={server} />
          <p className="mt-3 text-xs leading-5 text-night-400">Preview uses your account and this server. Members see their own details and request channel.</p>
        </aside>
      </div>
    </form>}
  </section>;
}

function EmbedCard({ embed, index, total, totalCharacters, initiallyExpanded, errors, onChange, onRemove, onMove }: { embed: EmbedDraft; index: number; total: number; totalCharacters: number; initiallyExpanded: boolean; errors: string[]; onChange: (update: Partial<EmbedDraft>) => void; onRemove: () => void; onMove: (direction: -1 | 1) => void }) {
  const [expanded, setExpanded] = useState(initiallyExpanded);
  const titlePrefix = `Embed ${index + 1}`;
  const specificError = (field: string) => errors.find(error => error.toLowerCase().startsWith(`${titlePrefix.toLowerCase()} ${field.toLowerCase()}`));
  const remainingTotal = Math.max(0, 6000 - totalCharacters);
  const unexposed = hasUnexposedProperties(embed.original);
  const updateField = (fieldIndex: number, update: Partial<EmbedFieldDraft>) => onChange({ fields: embed.fields.map((field, itemIndex) => itemIndex === fieldIndex ? { ...field, ...update } : field) });

  return <div className="overflow-hidden rounded-lg border border-night-700 bg-night-950/70">
    <div className="flex items-center justify-between gap-3 px-3 py-2">
      <button aria-expanded={expanded} aria-label={`${expanded ? 'Collapse' : 'Expand'} embed ${index + 1}`} className="flex min-w-0 items-center gap-2 text-left text-[13px] font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-sunset-400" onClick={() => setExpanded(value => !value)} type="button"><Icon className={`size-4 transition-transform ${expanded ? 'rotate-90' : ''}`} name="arrow" /><span className="truncate">{embed.title || `Embed ${index + 1}`}</span></button>
      <div className="flex shrink-0 items-center gap-1"><button aria-label={`Move embed ${index + 1} up`} className="rounded-md px-2 py-1 text-xs text-night-300 hover:bg-night-800 hover:text-white disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sunset-400" disabled={index === 0} onClick={() => onMove(-1)} type="button"><Icon className="size-4 -rotate-90" name="arrow" /></button><button aria-label={`Move embed ${index + 1} down`} className="rounded-md px-2 py-1 text-xs text-night-300 hover:bg-night-800 hover:text-white disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sunset-400" disabled={index === total - 1} onClick={() => onMove(1)} type="button"><Icon className="size-4 rotate-90" name="arrow" /></button><button aria-label={`Remove embed ${index + 1}`} className="rounded-md px-2 py-1 text-xs font-semibold text-rose-300 hover:bg-rose-950/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-rose-300" onClick={onRemove} type="button">Remove</button></div>
    </div>
    {expanded && <div className="space-y-3 border-t border-night-800 p-3">
      {unexposed && <p className="rounded-lg border border-sunset-400/20 bg-sunset-400/5 px-3 py-2 text-xs leading-5 text-night-300">This embed has additional imported properties. They will be kept when you save.</p>}
      <div className="grid gap-3 sm:grid-cols-2">
        <FieldInput label="Title" max={256} value={embed.title} onChange={title => onChange({ title })} error={specificError('title')} />
        <FieldInput label="Title URL" value={embed.url} onChange={url => onChange({ url })} error={specificError('title URL')} placeholder="https://example.com" />
      </div>
      <FieldTextarea label="Description" max={4096} rows={3} value={embed.description} onChange={description => onChange({ description })} error={specificError('description')} />
      <div className="grid gap-3 sm:grid-cols-2">
        <label className={labelClass}>Color<div className="mt-1 flex h-9 items-center gap-2 rounded-lg border border-night-700 bg-night-950 px-2.5"><input aria-label={`Embed ${index + 1} color`} className="size-6 cursor-pointer rounded border-0 bg-transparent" onChange={event => onChange({ color: event.target.value })} type="color" value={embed.color || '#5865f2'} /><span className="text-xs text-night-300">{embed.color || 'Default'}</span>{embed.color && <button className="ml-auto text-xs text-night-300 underline" onClick={() => onChange({ color: '' })} type="button">Clear</button>}</div></label>
        <FieldInput label="Timestamp" type="datetime-local" value={embed.timestamp} onChange={timestamp => onChange({ timestamp })} />
      </div>
      <div className="border-t border-night-800 pt-3"><p className="mb-2 text-xs font-bold uppercase tracking-wide text-night-400">Author</p><div className="grid gap-3 sm:grid-cols-2"><FieldInput label="Name" max={256} value={embed.authorName} onChange={authorName => onChange({ authorName })} /><FieldInput label="Link" value={embed.authorUrl} onChange={authorUrl => onChange({ authorUrl })} placeholder="https://example.com" /><FieldInput label="Icon URL" value={embed.authorIconUrl} onChange={authorIconUrl => onChange({ authorIconUrl })} placeholder="https://example.com/avatar.png" /></div></div>
      <div className="border-t border-night-800 pt-3"><div className="mb-2 flex items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wide text-night-400">Fields</p><p className={helperClass}>Up to {MAX_FIELDS} name/value pairs. Inline fields can share a row.</p></div><button className="text-xs font-semibold text-sunset-200 hover:underline disabled:opacity-40" disabled={embed.fields.length >= MAX_FIELDS} onClick={() => onChange({ fields: [...embed.fields, createField(embed.fields.length)] })} type="button">Add field +</button></div>
        {embed.fields.length > 0 && <div className="space-y-2">{embed.fields.map((field, fieldIndex) => <div className="rounded-lg border border-night-800 p-2.5" key={field.id}><div className="grid gap-3 sm:grid-cols-2"><FieldInput label={`Field ${fieldIndex + 1} name`} max={256} value={field.name} onChange={name => updateField(fieldIndex, { name })} /><FieldTextarea label={`Field ${fieldIndex + 1} value`} max={1024} rows={2} value={field.value} onChange={value => updateField(fieldIndex, { value })} /></div><div className="mt-2 flex items-center justify-between"><label className="inline-flex items-center gap-2 text-xs text-night-300"><input checked={field.inline} className="accent-orange-400" onChange={event => updateField(fieldIndex, { inline: event.target.checked })} type="checkbox" />Display inline</label><button className="text-xs text-rose-300 hover:underline" onClick={() => onChange({ fields: embed.fields.filter((_, itemIndex) => itemIndex !== fieldIndex) })} type="button">Remove field</button></div></div>)}</div>}
      </div>
      <div className="grid gap-3 sm:grid-cols-2"><FieldInput label="Thumbnail URL" value={embed.thumbnailUrl} onChange={thumbnailUrl => onChange({ thumbnailUrl })} placeholder="https://example.com/image.png" /><FieldInput label="Image URL" value={embed.imageUrl} onChange={imageUrl => onChange({ imageUrl })} placeholder="https://example.com/image.png" /></div>
      <div className="grid gap-3 sm:grid-cols-2"><FieldInput label="Footer" max={2048} value={embed.footerText} onChange={footerText => onChange({ footerText })} /><FieldInput label="Footer icon URL" value={embed.footerIconUrl} onChange={footerIconUrl => onChange({ footerIconUrl })} placeholder="https://example.com/icon.png" /></div>
      <p className="text-right text-xs tabular-nums text-night-400">{embedTextLength(embed).toLocaleString()} characters · {remainingTotal.toLocaleString()} of 6,000 total remain</p>
    </div>}
  </div>;
}

function FieldInput({ label, value, onChange, max, error, type = 'text', placeholder }: { label: string; value: string; onChange: (value: string) => void; max?: number; error?: string; type?: string; placeholder?: string }) {
  return <label className={labelClass}>{label}<input className={inputClass} maxLength={max} onChange={event => onChange(event.target.value)} placeholder={placeholder} type={type} value={value} />{max !== undefined && <span className={helperClass}>{value.length}/{max} characters</span>}{error && <span className="mt-1 block text-xs text-rose-300">{error}</span>}</label>;
}

function FieldTextarea({ label, value, onChange, max, rows = 3, error }: { label: string; value: string; onChange: (value: string) => void; max: number; rows?: number; error?: string }) {
  return <label className={labelClass}>{label}<textarea className={`${inputClass} resize-y`} maxLength={max} onChange={event => onChange(event.target.value)} rows={rows} value={value} /><span className={helperClass}>{value.length}/{max} characters</span>{error && <span className="mt-1 block text-xs text-rose-300">{error}</span>}</label>;
}

function substitutePreview(value: string, user: User, server: ManagedServer, channelId = '0'): string {
  const replacements = {
    user: `<@${user.id || '0'}>`,
    username: user.username,
    avatar: user.avatarUrl ?? 'https://cdn.discordapp.com/embed/avatars/0.png',
    server: server.name,
    channel: `<#${channelId}>`,
  };
  return value.replace(/\{(user|username|avatar|server|channel)\}/g, placeholder => replacements[placeholder.slice(1, -1) as keyof typeof replacements]);
}

function substituteEmbedLabel(value: string, user: User, server: ManagedServer): string {
  const replacements = {
    user: user.displayName || user.username || 'You',
    username: user.username,
    avatar: user.avatarUrl ?? 'https://cdn.discordapp.com/embed/avatars/0.png',
    server: server.name,
    channel: '#general',
  };
  return value.replace(/\{(user|username|avatar|server|channel)\}/g, placeholder => replacements[placeholder.slice(1, -1) as keyof typeof replacements]);
}

function escapeText(value: string): string {
  return value.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character] ?? character);
}

function safePreviewUrl(value: string): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:' ? value : undefined;
  } catch { return undefined; }
}

function markdownHtml(value: string, user: User, server: ManagedServer): string {
  const source = substitutePreview(value, user, server);
  return toHTML(source, { embed: true, escapeHTML: true, discordCallback: { user: () => escapeText(user.displayName || user.username || 'you'), channel: () => 'general', role: id => `role ${escapeText(String(id))}`, everyone: () => '@everyone', here: () => '@here' }, cssModuleNames: {} });
}

function EmbedPreview({ value, user, server }: { value: UnknownRecord; user: User; server: ManagedServer }) {
  const author = record(value.author);
  const footer = record(value.footer);
  const thumbnail = record(value.thumbnail);
  const image = record(value.image);
  const fields = Array.isArray(value.fields) ? value.fields.map(record) : [];
  const timestamp = stringValue(value.timestamp);
  const date = timestamp && !Number.isNaN(new Date(timestamp).getTime()) ? new Date(timestamp) : null;
  const color = colorHex(value.color);
  const isValidColor = Boolean(color);
  return <DiscordEmbed slot="embeds" authorName={substituteEmbedLabel(stringValue(author.name), user, server)} authorUrl={safePreviewUrl(stringValue(author.url))} authorImage={safePreviewUrl(stringValue(author.icon_url))} color={isValidColor ? color : undefined} embedTitle={substituteEmbedLabel(stringValue(value.title), user, server)} url={safePreviewUrl(stringValue(value.url))} thumbnail={safePreviewUrl(stringValue(thumbnail.url))} image={safePreviewUrl(stringValue(image.url))}>
    {typeof value.description === 'string' && value.description && <DiscordEmbedDescription slot="description"><span dangerouslySetInnerHTML={{ __html: markdownHtml(value.description, user, server) }} /></DiscordEmbedDescription>}
    {fields.length > 0 && <DiscordEmbedFields slot="fields">{fields.map((field, index) => <DiscordEmbedField fieldTitle={substituteEmbedLabel(stringValue(field.name), user, server)} inline={field.inline === true} key={`preview-field-${index}`}><span dangerouslySetInnerHTML={{ __html: markdownHtml(stringValue(field.value), user, server) }} /></DiscordEmbedField>)}</DiscordEmbedFields>}
    {(typeof footer.text === 'string' && footer.text || date) && <DiscordEmbedFooter slot="footer" footerImage={safePreviewUrl(stringValue(footer.icon_url))} timestamp={date ?? null}>{substituteEmbedLabel(stringValue(footer.text), user, server)}</DiscordEmbedFooter>}
  </DiscordEmbed>;
}

function DiscordResponsePreview({ content, embeds, user, server, commandName }: { commandName?: string; content: string; embeds: UnknownRecord[]; user: User; server: ManagedServer }) {
  const avatar = user.avatarUrl ?? 'https://cdn.discordapp.com/embed/avatars/0.png';
  const author = user.displayName || user.username || 'You';
  const nonEmptyEmbeds = embeds.filter(embed => Object.keys(embed).some(key => !['type'].includes(key)));
  const command = commandName ?? 'response';
  return <DiscordMessages aria-label="Discord preview" channelName="general" channelType="text" className="response-discord-messages">
    <DiscordMessage author="Robotman" avatar="/icon.png" bot>
      <DiscordCommand slot="reply" author={author} avatar={avatar} command={command} type="slash_command" />
      {content.trim() && <div dangerouslySetInnerHTML={{ __html: markdownHtml(content, user, server) }} />}
      {nonEmptyEmbeds.map((embed, index) => <EmbedPreview key={`preview-embed-${index}`} value={embed} user={user} server={server} />)}
      {!content.trim() && nonEmptyEmbeds.length === 0 && <span className="text-night-400">Your reply will appear here as you write.</span>}
    </DiscordMessage>
  </DiscordMessages>;
}
