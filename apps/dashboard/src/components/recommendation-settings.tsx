import { useEffect, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Icon } from './icon';
import { useAuth } from '../lib/auth-context';
import { queryGraphql, recommendationSettingsFields, type RecommendationSettings, type ManagedServer } from '../lib/graphql';
import { InlineAlert, PageHeader, fieldClass, primaryButtonClass } from './server-page';
import { VariableGuide, curatorVariables, messageVariables } from './variables';

export function RecommendationSettingsEditor({ server }: { server: ManagedServer }) {
  const { csrfToken, user, needsSignIn } = useAuth();
  const [settings, setSettings] = useState<RecommendationSettings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const draftKey = `robotman:recommendation-settings:${user?.id}:${server.id}`;
  async function load() {
    setError(null);
    try {
      const result = await queryGraphql<{ recommendationSettings: RecommendationSettings }>(`query($server: ID!) { recommendationSettings(guildId: $server) { ${recommendationSettingsFields} } }`, undefined, { server: server.id });
      let restored: RecommendationSettings | null = null;
      try {
        const value = JSON.parse(sessionStorage.getItem(draftKey) ?? 'null');
        if (value && value.lists?.tasteTest && value.lists.characters && value.lists.writers && Array.isArray(value.categories) && value.categories.length === 4) restored = value;
      } catch { /* A missing or unreadable local draft does not block server settings. */ }
      setSettings(restored ?? result.recommendationSettings);
      if (restored) setNotice('Your settings draft was restored. Review it before saving.');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not load recommendation settings.'); }
  }
  useEffect(() => { void load(); }, [server.id, draftKey]);
  useEffect(() => {
    const preserve = (event: Event) => {
      if (!settings) return;
      try { sessionStorage.setItem(draftKey, JSON.stringify(settings)); }
      catch { event.preventDefault(); setError('Your settings could not be kept for sign-in. Copy your changes before continuing.'); }
    };
    window.addEventListener('robotman:before-sign-in', preserve);
    return () => window.removeEventListener('robotman:before-sign-in', preserve);
  }, [settings, draftKey]);
  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!settings || needsSignIn || saving) return;
    setSaving(true); setError(null); setNotice(null);
    try {
      await queryGraphql(`mutation($server: ID!, $input: RecommendationSettingsInput!) { updateRecommendationSettings(guildId: $server, input: $input) { ${recommendationSettingsFields} } }`, csrfToken ?? '', { server: server.id, input: settings });
      try { sessionStorage.removeItem(draftKey); } catch { /* Settings are saved server-side. */ }
      setNotice('Recommendation settings saved.');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not save recommendation settings.'); }
    finally { setSaving(false); }
  }
  return <section className="response-editor max-w-3xl">
    <PageHeader compact title="Recommendation Settings" description="Style the three recommendation lists and set the introduction each category’s entries inherit." server={server} />
    <Link className="recommendation-back-link mb-5 inline-flex items-center gap-2 rounded text-sm font-semibold text-sunset-200 underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-sunset-400" to="/servers/$serverId/recommendations" params={{ serverId: server.id }}><Icon className="size-4 rotate-180" name="arrow" /><span>All Recommendations</span></Link>
    {error && <div className="mb-5"><InlineAlert>{error}{!settings && <button className="ml-2 underline" onClick={() => void load()}>Try again</button>}</InlineAlert></div>}
    {notice && <div className="mb-5"><InlineAlert tone="success">{notice}</InlineAlert></div>}
    {!settings ? !error && <p role="status" className="text-sm text-night-300">Loading recommendation settings…</p> : <form className="space-y-5" onSubmit={event => void save(event)}>
      <p className="text-sm leading-6 text-night-300">List titles and introductions are plain text; variables are not filled in.</p>
      {([['tasteTest', 'Taste Test', '/recs taste-test lists Mods and Boosters by name with no pages.'], ['characters', 'Characters', '/recs characters lists Character collections ten names at a time.'], ['writers', 'Writers', '/recs writers lists Writer collections ten names at a time.']] as const).map(([key, name, help]) => {
        const list = settings.lists[key];
        const update = (value: Partial<typeof settings.lists.tasteTest>) => setSettings({ ...settings, lists: { ...settings.lists, [key]: { ...list, ...value } } });
        const tasteTest = settings.lists.tasteTest;
        return <section className="rounded-xl border border-night-800 bg-night-900/60 p-4" aria-labelledby={`list-${key}`} key={key}>
          <h2 id={`list-${key}`} className="font-display text-base font-bold text-white">{name} list</h2>
          <p className="mt-1 text-sm leading-6 text-night-300">{help} Names are ordered alphabetically.</p>
          <div className="mt-4 space-y-3">
            <label className="block text-sm text-night-100">{name} title<input className={fieldClass} required maxLength={256} value={list.title} onChange={event => update({ title: event.target.value })} /></label>
            <label className="block text-sm text-night-100">{name} introduction<textarea className={fieldClass} rows={3} maxLength={2000} value={list.introduction} onChange={event => update({ introduction: event.target.value })} /></label>
            <label className="block text-sm text-night-100">{name} color<input aria-label={`${name} color`} className="mt-2 block h-10 w-20 cursor-pointer rounded border border-night-700 bg-night-950 p-1" type="color" value={`#${list.color.toString(16).padStart(6, '0')}`} onChange={event => update({ color: parseInt(event.target.value.slice(1), 16) })} /></label>
            {key === 'tasteTest' && <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm text-night-100">Mods heading<input className={fieldClass} required maxLength={200} value={tasteTest.moderatorHeading} onChange={event => update({ moderatorHeading: event.target.value })} /></label>
              <label className="block text-sm text-night-100">Boosters heading<input className={fieldClass} required maxLength={200} value={tasteTest.boosterHeading} onChange={event => update({ boosterHeading: event.target.value })} /></label>
            </div>}
          </div>
        </section>;
      })}
      <section aria-labelledby="category-defaults">
        <h2 id="category-defaults" className="font-display text-base font-bold text-white">Category defaults</h2>
        <p className="mt-1 text-sm leading-6 text-night-300">Introductions appear before individual replies; each entry can inherit, replace, or omit them. Curator placeholders insert a plain saved name.</p>
        <VariableGuide label="Variables for introductions" note="Category introductions can use these variables. The curator variables are filled in for Moderator and Booster entries only." variables={[...messageVariables, ...curatorVariables]} />
        <div className="mt-4 space-y-4">{settings.categories.map((item, index) => {
          const name = item.category[0] + item.category.slice(1).toLowerCase();
          const update = (value: Partial<typeof item>) => setSettings({ ...settings, categories: settings.categories.map((category, position) => position === index ? { ...category, ...value } : category) });
          return <fieldset className="rounded-xl border border-night-800 p-4" key={item.category}><legend className="px-1 text-sm font-semibold text-white">{name}</legend><div className="space-y-3"><label className="block text-sm text-night-100">{name} default introduction<textarea className={fieldClass} rows={4} maxLength={2000} value={item.introduction} onChange={event => update({ introduction: event.target.value })} /></label></div></fieldset>;
        })}</div>
      </section>
      <p className="text-sm leading-6 text-night-300">Changes publish when saved. If a new introduction makes an existing collection exceed Discord’s limits, the save is blocked and identifies the collection to fix.</p>
      <div className="flex flex-wrap items-center gap-3"><button className={primaryButtonClass} disabled={needsSignIn || saving} type="submit">{saving ? 'Saving…' : 'Save settings'}</button><Link className="rounded px-3 py-2 text-sm text-night-300 underline-offset-4 hover:underline" onClick={() => { try { sessionStorage.removeItem(draftKey); } catch { /* Discard remains available. */ } }} to="/servers/$serverId/recommendations" params={{ serverId: server.id }}>Cancel</Link></div>
    </form>}
  </section>;
}
