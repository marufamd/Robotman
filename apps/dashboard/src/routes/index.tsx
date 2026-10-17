import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';

type User = { id: string; username: string; displayName: string | null; avatarUrl: string | null };
type Guild = { id: string; name: string; icon: string | null; owner: boolean; installed: boolean; inviteUrl: string };
type AuthQuery = { authUser: User | null; authCsrfToken: string | null; managedGuilds: Guild[] };
type GuildResponse = { id: string; trigger: string; aliases: string[]; content: string; embedsJson: string };
type RecommendationEntry = { id: string; category: string; name: string; description: string; url: string };
type ResponseChange = { action: string; actorId: string; responseId: string; occurredAt: string; trigger: string };
type GraphqlResult<T> = { data?: T; errors?: Array<{ message: string }> };

export const Route = createFileRoute('/')({
  validateSearch: (search: Record<string, unknown>) => ({ guild: typeof search.guild === 'string' ? search.guild : undefined }),
  component: Home,
});

async function queryGraphql<T>(query: string, csrfToken?: string, variables?: Record<string, unknown>): Promise<T> {
  const response = await fetch('/api/graphql', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'content-type': 'application/json', ...(csrfToken ? { 'x-csrf-token': csrfToken } : {}) },
    body: JSON.stringify({ query, variables }),
  });
  const result = await response.json() as GraphqlResult<T>;
  if (!response.ok || result.errors?.length || !result.data) {
    throw new Error(result.errors?.[0]?.message ?? 'Robotman could not complete the request. Please try again.');
  }
  return result.data;
}

function Home() {
  const navigate = useNavigate({ from: '/' });
  const search = Route.useSearch();
  const selectedGuildId = search.guild ?? null;
  const [user, setUser] = useState<User | null>(null);
  const [guilds, setGuilds] = useState<Guild[]>([]);
  const [csrfToken, setCsrfToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void queryGraphql<AuthQuery>('{ authUser { id username displayName avatarUrl } authCsrfToken managedGuilds { id name icon owner installed inviteUrl } }')
      .then(result => {
        if (!active) return;
        setUser(result.authUser);
        setCsrfToken(result.authCsrfToken);
        setGuilds(result.managedGuilds);
      })
      .catch(reason => { if (active) setError(reason instanceof Error ? reason.message : 'Something went wrong.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function signOut() {
    if (!csrfToken) { setError('Refresh the page before signing out.'); return; }
    try {
      await queryGraphql<{ authLogout: boolean }>('mutation SignOut { authLogout }', csrfToken);
      setUser(null);
      setGuilds([]);
      setCsrfToken(null);
      await navigate({ search: { guild: undefined } });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not sign out. Please try again.');
    }
  }

  function selectGuild(guildId: string) {
    void navigate({ search: previous => ({ ...previous, guild: guildId }) });
  }

  const selectedGuild = guilds.find(guild => guild.id === selectedGuildId && guild.installed);

  return <main className="relative min-h-screen overflow-hidden bg-night-950 px-5 py-10 text-night-200 sm:py-14">
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute left-1/2 top-[-18rem] size-[44rem] -translate-x-1/2 rounded-full bg-sunset-400/10 blur-[110px]" />
      <div className="absolute bottom-[-20rem] right-[-8rem] size-[38rem] rounded-full bg-sunset-500/10 blur-[100px]" />
    </div>
    <div className="relative mx-auto max-w-5xl">
      <header className="mb-14 flex items-center gap-3">
        <div className="size-11 overflow-hidden rounded-2xl border border-sunset-400/20 bg-night-850 shadow-sunset"><img src="/icon.png" alt="Robotman" className="size-full object-cover" /></div>
        <div><p className="font-display text-xl font-extrabold tracking-tight text-white">Robotman</p><p className="text-sm text-night-200/60">Server dashboard</p></div>
      </header>
      {loading ? <section className="glass-panel rounded-3xl p-8 text-night-200/70">Checking your Discord sign-in…</section> : error ? <section role="alert" className="rounded-2xl border border-rose-400/20 bg-night-900 p-6 text-rose-200">{error}</section> : !user ? <section className="glass-panel max-w-2xl rounded-3xl p-8 sm:p-12">
        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.22em] text-sunset-200/80">Welcome</p>
        <h1 className="font-display text-4xl font-extrabold tracking-tight text-white sm:text-5xl">Manage your Discord servers</h1>
        <p className="mt-5 max-w-xl text-base leading-7 text-night-200/70">Sign in with Discord to choose a server you own or help manage. Robotman only shows servers where you have management access.</p>
        <a href="/api/auth/login" className="mt-8 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sunset-400 to-sunset-500 px-5 py-3.5 font-semibold text-night-950 shadow-[0_8px_20px_rgba(255,140,55,0.25)] transition hover:-translate-y-0.5 hover:from-[#fcd06a] hover:to-[#ffa666] hover:shadow-[0_12px_24px_rgba(255,140,55,0.4)]">Continue with Discord</a>
      </section> : <>
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div><p className="mb-2 text-sm font-semibold uppercase tracking-[0.22em] text-sunset-200/75">Your servers</p><h1 className="font-display text-3xl font-extrabold tracking-tight text-white sm:text-4xl">Choose a Managed Guild</h1><p className="mt-2 text-night-200/65">Signed in as {user.displayName || user.username}</p></div>
          <button onClick={() => void signOut()} className="rounded-xl border border-night-700 bg-night-900/70 px-4 py-2.5 text-sm font-semibold text-night-200 transition hover:border-sunset-400/40 hover:text-white">Sign out</button>
        </div>
        {selectedGuild && <div role="status" className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-sunset-400/20 bg-sunset-500/10 px-5 py-4 text-sm text-night-100"><span>Selected server: <strong className="text-white">{selectedGuild.name}</strong></span><span className="text-sunset-200/75">Your selection is saved in this page URL.</span></div>}
        {guilds.length === 0 ? <section className="glass-panel rounded-3xl p-8 text-night-200/70">No Managed Guilds were found on this Discord account.</section> : <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {guilds.map(guild => <article key={guild.id} className={`group relative overflow-hidden rounded-2xl border bg-night-900 transition ${guild.installed ? 'border-night-800 hover:-translate-y-1 hover:border-sunset-500/30 hover:shadow-[0_8px_30px_rgba(255,140,55,0.12)]' : 'border-night-800/80 opacity-75'}`}>
            <div className="h-1 bg-gradient-to-r from-sunset-400 to-sunset-500" />
            <div className="h-16 bg-gradient-to-r from-sunset-900/10 to-sunset-800/10" />
            <div className="px-5 pb-5">
              <div className="-mt-9 mb-4 flex items-end justify-between">
                {guild.icon ? <img src={`https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=96`} alt={`${guild.name} icon`} className="size-[4.5rem] rounded-2xl border-4 border-night-900 bg-night-950 object-cover shadow-xl" /> : <div className="grid size-[4.5rem] place-items-center rounded-2xl border-4 border-night-900 bg-night-800 font-display text-lg font-bold text-white shadow-xl">{guild.name.split(' ').map(part => part[0]).join('').slice(0, 2).toUpperCase()}</div>}
                <span className="mb-2 rounded-full border border-sunset-500/20 bg-sunset-500/10 px-2.5 py-1 text-xs font-semibold text-sunset-300">{guild.owner ? 'Owner' : 'Moderator'}</span>
              </div>
              <h2 className="truncate font-display text-lg font-bold text-white">{guild.name}</h2>
              <p className="mt-2 flex items-center gap-2 text-sm text-night-200/60"><span className={`size-2 rounded-full ${guild.installed ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-night-600'}`} />{guild.installed ? 'Robotman installed' : 'Robotman not installed'}</p>
              {guild.installed ? <button onClick={() => selectGuild(guild.id)} className="mt-5 flex w-full items-center justify-center rounded-xl border border-night-800 bg-night-950 py-2.5 text-sm font-semibold text-night-200 transition group-hover:border-transparent group-hover:bg-gradient-to-r group-hover:from-sunset-400 group-hover:to-sunset-500 group-hover:text-night-950">{selectedGuildId === guild.id ? 'Selected' : 'Select server'}</button> : <a href={guild.inviteUrl} target="_blank" rel="noreferrer" className="mt-5 flex w-full items-center justify-center rounded-xl border border-night-700 bg-night-950/60 py-2.5 text-sm font-semibold text-night-200 transition hover:border-sunset-400/40 hover:text-white">Invite Robotman</a>}
            </div>
          </article>)}
        </div>}
        {selectedGuild && csrfToken && <GuildContentManager guildId={selectedGuild.id} csrfToken={csrfToken} />}
      </>}
      <footer className="mt-12 text-xs text-night-200/40">Access follows your current Discord server permissions.</footer>
    </div>
  </main>;
}

function GuildContentManager({ guildId, csrfToken }: { guildId: string; csrfToken: string }) {
  const [section, setSection] = useState<'responses' | 'recommendations'>('responses');
  const [responses, setResponses] = useState<GuildResponse[]>([]);
  const [recommendations, setRecommendations] = useState<RecommendationEntry[]>([]);
  const [history, setHistory] = useState<ResponseChange[]>([]);
  const [responseDraft, setResponseDraft] = useState<GuildResponse | null>(null);
  const [recommendationDraft, setRecommendationDraft] = useState<RecommendationEntry | null>(null);
  const [responseFormVersion, setResponseFormVersion] = useState(0);
  const [recommendationFormVersion, setRecommendationFormVersion] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await queryGraphql<{ responses: GuildResponse[]; recommendationEntries: RecommendationEntry[]; responseChangeHistory: ResponseChange[] }>(
        'query GuildContent($guild: ID!) { responses(guildId: $guild) { id trigger aliases content embedsJson } recommendationEntries(guildId: $guild) { id category name description url } responseChangeHistory(guildId: $guild) { action actorId responseId occurredAt trigger } }',
        undefined,
        { guild: guildId },
      );
      setResponses(data.responses);
      setRecommendations(data.recommendationEntries);
      setHistory(data.responseChangeHistory);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not load this guild’s content.');
    } finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, [guildId]);

  async function saveResponse(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const input = { trigger: String(form.get('trigger')), aliases: String(form.get('aliases')).split(',').map(value => value.trim()).filter(Boolean), content: String(form.get('content')), embedsJson: String(form.get('embedsJson')) };
    setSaving(true); setError(null);
    try {
      const field = responseDraft ? 'updateResponse' : 'createResponse';
      const query = responseDraft
        ? `mutation Save($guild: ID!, $id: ID!, $input: ResponseInput!) { ${field}(guildId: $guild, id: $id, input: $input) { id } }`
        : `mutation Save($guild: ID!, $input: ResponseInput!) { ${field}(guildId: $guild, input: $input) { id } }`;
      await queryGraphql(query, csrfToken, { guild: guildId, ...(responseDraft ? { id: responseDraft.id } : {}), input });
      setResponseDraft(null); setNotice('Response saved.'); await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not save Response.'); }
    finally { setSaving(false); }
  }

  async function removeResponse(id: string) {
    setError(null);
    try {
      await queryGraphql('mutation Delete($guild: ID!, $id: ID!) { deleteResponse(guildId: $guild, id: $id) }', csrfToken, { guild: guildId, id });
      setNotice('Response deleted.'); await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not delete Response.'); }
  }

  async function saveRecommendation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const input = { category: String(form.get('category')), name: String(form.get('name')), description: String(form.get('description')), url: String(form.get('url')) };
    setSaving(true); setError(null);
    try {
      const field = recommendationDraft ? 'updateRecommendation' : 'createRecommendation';
      const query = recommendationDraft
        ? `mutation Save($guild: ID!, $id: ID!, $input: RecommendationInput!) { ${field}(guildId: $guild, id: $id, input: $input) { id } }`
        : `mutation Save($guild: ID!, $input: RecommendationInput!) { ${field}(guildId: $guild, input: $input) { id } }`;
      await queryGraphql(query, csrfToken, { guild: guildId, ...(recommendationDraft ? { id: recommendationDraft.id } : {}), input });
      setRecommendationDraft(null); setNotice('Recommendation Entry saved.'); await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not save Recommendation Entry.'); }
    finally { setSaving(false); }
  }

  async function removeRecommendation(id: string) {
    setError(null);
    try {
      await queryGraphql('mutation Delete($guild: ID!, $id: ID!) { deleteRecommendation(guildId: $guild, id: $id) }', csrfToken, { guild: guildId, id });
      setNotice('Recommendation Entry deleted.'); await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not delete Recommendation Entry.'); }
  }

  const fieldClass = 'mt-1 w-full rounded-xl border border-night-700 bg-night-950 px-3 py-2.5 text-sm text-white outline-none focus:border-sunset-400';
  const buttonClass = 'rounded-xl bg-sunset-400 px-4 py-2.5 text-sm font-semibold text-night-950 disabled:opacity-50';

  return <section className="glass-panel mt-10 rounded-3xl p-6 sm:p-8">
    <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
      <div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-sunset-200/75">Guild settings</p><h2 className="mt-1 font-display text-2xl font-bold text-white">Responses & recommendations</h2></div>
      <div className="flex gap-2" role="tablist" aria-label="Guild content">
        <button role="tab" aria-selected={section === 'responses'} onClick={() => setSection('responses')} className="rounded-xl border border-night-700 px-4 py-2 text-sm">Responses</button>
        <button role="tab" aria-selected={section === 'recommendations'} onClick={() => setSection('recommendations')} className="rounded-xl border border-night-700 px-4 py-2 text-sm">Recommendations</button>
      </div>
    </div>
    {error && <p role="alert" className="mb-4 rounded-xl border border-rose-400/20 bg-night-950 p-3 text-sm text-rose-200">{error}</p>}
    {notice && <p role="status" className="mb-4 text-sm text-emerald-200">{notice}</p>}
    {loading ? <p className="text-sm text-night-200/70">Loading guild content…</p> : section === 'responses' ? <div className="grid gap-8 lg:grid-cols-[1fr_1fr]">
      <div><div className="mb-3 flex items-center justify-between"><h3 className="font-semibold text-white">Saved Responses</h3><button className={buttonClass} onClick={() => { setResponseDraft(null); setResponseFormVersion(value => value + 1); }}>New Response</button></div>
        {responses.length === 0 ? <p className="text-sm text-night-200/60">No Responses yet.</p> : <ul className="space-y-2">{responses.map(item => <li key={item.id} className="flex items-center justify-between gap-3 rounded-xl border border-night-800 bg-night-950/70 p-3"><div className="min-w-0"><p className="truncate font-medium text-white">{item.trigger}</p><p className="truncate text-xs text-night-200/55">{item.aliases.join(', ') || 'No aliases'}</p></div><div className="flex shrink-0 gap-2"><button className="text-sm text-sunset-200" onClick={() => setResponseDraft(item)}>Edit</button><button className="text-sm text-rose-200" onClick={() => void removeResponse(item.id)}>Delete</button></div></li>)}</ul>}
      </div>
      <form key={`${responseDraft?.id ?? 'new'}-${responseFormVersion}`} onSubmit={event => void saveResponse(event)} className="space-y-3 rounded-2xl border border-night-800 bg-night-950/50 p-4"><h3 className="font-semibold text-white">{responseDraft ? 'Edit Response' : 'Create Response'}</h3>
        <label className="block text-sm">Trigger<input required name="trigger" defaultValue={responseDraft?.trigger ?? ''} className={fieldClass} /></label>
        <label className="block text-sm">Aliases, separated by commas<input name="aliases" defaultValue={responseDraft?.aliases.join(', ') ?? ''} className={fieldClass} /></label>
        <label className="block text-sm">Message content<textarea name="content" rows={3} defaultValue={responseDraft?.content ?? ''} className={fieldClass} /><span className="mt-1 block text-xs text-night-200/55">Placeholders such as {'{user}'} and {'{channel}'} are preserved.</span></label>
        <label className="block text-sm">Embeds as JSON<textarea required name="embedsJson" rows={4} defaultValue={responseDraft?.embedsJson ?? '[]'} className={`${fieldClass} font-mono text-xs`} /><span className="mt-1 block text-xs text-night-200/55">Enter a JSON array of Discord embed objects (up to 10).</span></label>
        <button disabled={saving} className={buttonClass}>{saving ? 'Saving…' : responseDraft ? 'Save changes' : 'Create Response'}</button>
      </form>
    </div> : <div className="grid gap-8 lg:grid-cols-[1fr_1fr]">
      <div><div className="mb-3 flex items-center justify-between"><h3 className="font-semibold text-white">Recommendation Directory</h3><button className={buttonClass} onClick={() => { setRecommendationDraft(null); setRecommendationFormVersion(value => value + 1); }}>New Entry</button></div>
        {recommendations.length === 0 ? <p className="text-sm text-night-200/60">No Recommendation Entries yet.</p> : <ul className="space-y-2">{recommendations.map(item => <li key={item.id} className="flex items-center justify-between gap-3 rounded-xl border border-night-800 bg-night-950/70 p-3"><div className="min-w-0"><p className="truncate font-medium text-white">{item.name}</p><p className="text-xs capitalize text-night-200/55">{item.category.toLowerCase()}</p></div><div className="flex shrink-0 gap-2"><button className="text-sm text-sunset-200" onClick={() => setRecommendationDraft(item)}>Edit</button><button className="text-sm text-rose-200" onClick={() => void removeRecommendation(item.id)}>Delete</button></div></li>)}</ul>}
      </div>
      <form key={`${recommendationDraft?.id ?? 'new'}-${recommendationFormVersion}`} onSubmit={event => void saveRecommendation(event)} className="space-y-3 rounded-2xl border border-night-800 bg-night-950/50 p-4"><h3 className="font-semibold text-white">{recommendationDraft ? 'Edit Recommendation Entry' : 'Create Recommendation Entry'}</h3>
        <label className="block text-sm">Category<select name="category" defaultValue={recommendationDraft?.category ?? 'CHARACTER'} className={fieldClass}><option value="CHARACTER">Character</option><option value="WRITER">Writer</option><option value="MODERATOR">Moderator</option><option value="BOOSTER">Booster</option></select></label>
        <label className="block text-sm">Name<input required name="name" defaultValue={recommendationDraft?.name ?? ''} className={fieldClass} /></label>
        <label className="block text-sm">Details<textarea name="description" rows={3} defaultValue={recommendationDraft?.description ?? ''} className={fieldClass} /></label>
        <label className="block text-sm">Link<input type="url" name="url" defaultValue={recommendationDraft?.url ?? ''} className={fieldClass} /></label>
        <button disabled={saving} className={buttonClass}>{saving ? 'Saving…' : recommendationDraft ? 'Save changes' : 'Create Entry'}</button>
      </form>
    </div>}
    {!loading && <section aria-labelledby="response-history-heading" className="mt-8 border-t border-night-800 pt-6">
      <h3 id="response-history-heading" className="font-semibold text-white">Response change history</h3>
      {history.length === 0 ? <p className="mt-3 text-sm text-night-200/60">No Response changes yet.</p> : <ol className="mt-3 space-y-2">
        {history.map(change => <li key={`${change.responseId}-${change.occurredAt}-${change.action}`} className="flex flex-wrap justify-between gap-2 rounded-xl border border-night-800 bg-night-950/70 p-3 text-sm">
          <span className="text-night-100"><strong className="text-sunset-200">{change.action.toLowerCase()}</strong> Response “{change.trigger}” <span className="text-night-200/55">by {change.actorId}</span></span>
          <time dateTime={change.occurredAt} className="text-night-200/55">{new Date(change.occurredAt).toLocaleString()}</time>
        </li>)}
      </ol>}
    </section>}
  </section>;
}
