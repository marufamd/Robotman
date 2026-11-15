import { useEffect, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { recommendationFields, queryGraphql } from '../lib/graphql';
import type { GuildResponse, ManagedServer, RecommendationEntry, ResponseChange } from '../lib/graphql';
import { Icon } from './icon';
import { InlineAlert, PageHeader, compactPrimaryButtonClass, fieldClass } from './server-page';
import { ResponseTable } from './response-table';

type ContentProps = { server: ManagedServer; csrfToken: string };

export function ResponseManager({ server, csrfToken }: ContentProps) {
  const [responses, setResponses] = useState<GuildResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function load() {
    setError(null);
    try {
      const data = await queryGraphql<{ responses: GuildResponse[] }>(
        'query Responses($server: ID!) { responses(guildId: $server) { id trigger aliases content embedsJson createdBy { id username } lastEditedBy { id username } } }',
        undefined,
        { server: server.id },
      );
      setResponses(data.responses);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not load Responses for this server.');
    } finally { setLoading(false); }
  }

  useEffect(() => { setResponses([]); setLoading(true); void load(); }, [server.id]);

  async function remove(id: string, trigger: string) {
    if (deletingId || !window.confirm(`Delete the Response “${trigger}”?`)) return;
    setDeletingId(id); setError(null); setNotice(null);
    try {
      await queryGraphql('mutation Delete($server: ID!, $id: ID!) { deleteResponse(guildId: $server, id: $id) }', csrfToken, { server: server.id, id });
      setResponses(current => current.filter(item => item.id !== id));
      setNotice('Response deleted.');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not delete the Response.'); }
    finally { setDeletingId(null); }
  }

  return <section className="response-manager">
    <PageHeader compact description="Create and maintain the phrases members can request in Discord." server={server} title="Responses" />
    {error && <div className="mb-4"><InlineAlert>{error} <button className="ml-2 font-semibold text-white underline underline-offset-4" onClick={() => { setLoading(true); void load(); }} type="button">Try again</button></InlineAlert></div>}
    {notice && <div className="mb-4"><InlineAlert tone="success">{notice}</InlineAlert></div>}
    <div className="flex items-center justify-between gap-4">
      <h2 className="font-display text-sm font-bold text-white">Saved Responses</h2>
      <Link className={compactPrimaryButtonClass} params={{ serverId: server.id }} to="/servers/$serverId/responses/new"><Icon className="size-4" name="plus" />New Response</Link>
    </div>
    {(!error || responses.length > 0 || loading) && <ResponseTable deletingId={deletingId} key={server.id} loading={loading} onDelete={(id, trigger) => void remove(id, trigger)} responses={responses} serverId={server.id} />}
  </section>;
}

export function RecommendationManager({ server, csrfToken }: ContentProps) {
  const [entries, setEntries] = useState<RecommendationEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(0);
  async function load() {
    setLoading(true); setError(null);
    try {
      const data = await queryGraphql<{ recommendationEntries: RecommendationEntry[] }>(`query($server: ID!) { recommendationEntries(guildId: $server) { ${recommendationFields} } }`, undefined, { server: server.id });
      setEntries(data.recommendationEntries);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not load recommendations.'); }
    finally { setLoading(false); }
  }
  useEffect(() => { setEntries([]); void load(); }, [server.id]);
  async function remove(entry: RecommendationEntry) {
    if (deleting || !window.confirm(`Delete the collection “${entry.name}”?`)) return;
    setDeleting(entry.id); setError(null);
    try {
      await queryGraphql('mutation($server: ID!, $id: ID!) { deleteRecommendation(guildId: $server, id: $id) }', csrfToken, { server: server.id, id: entry.id });
      setEntries(current => current.filter(item => item.id !== entry.id));
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not delete this collection.'); }
    finally { setDeleting(null); }
  }
  const found = entries.filter(item => (!category || item.category === category) && [item.name, item.curatorName, ...item.aliases].join(' ').toLowerCase().includes(search.toLowerCase()));
  const currentPage = Math.min(page, Math.max(0, Math.ceil(found.length / 10) - 1));
  return <section>
    <PageHeader compact server={server} title="Recommendations" description="Create reading collections with text, embeds, and personal curator attribution." />
    {error && <div className="mb-4"><InlineAlert>{error} <button className="ml-2 underline underline-offset-4" onClick={() => void load()}>Try again</button></InlineAlert></div>}
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><Link className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-night-600 bg-night-800 px-4 py-2 text-sm font-semibold text-white transition hover:border-night-400 hover:bg-night-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sunset-400" to="/servers/$serverId/recommendations/settings" params={{ serverId: server.id }} aria-describedby="recommendation-settings-description"><Icon className="size-4" name="settings" />Recommendation Settings</Link><p className="mt-2 text-xs text-night-300" id="recommendation-settings-description">Customize the /recs taste-test, characters and writers lists and default introduction text.</p></div>
      <Link className={compactPrimaryButtonClass} to="/servers/$serverId/recommendations/new" params={{ serverId: server.id }}><Icon className="size-4" name="plus" />New Recommendation</Link>
    </div>
    <div className="my-4 flex flex-wrap gap-3">
      <label className="min-w-0 flex-1 text-xs text-night-300">Search collections<input className={fieldClass} type="search" value={search} onChange={event => { setSearch(event.target.value); setPage(0); }} placeholder="Name, alias, or curator…" /></label>
      <label className="text-xs text-night-300">Category<select className={fieldClass} value={category} onChange={event => { setCategory(event.target.value); setPage(0); }}><option value="">All categories</option>{['CHARACTER', 'WRITER', 'MODERATOR', 'BOOSTER'].map(value => <option key={value} value={value}>{value[0] + value.slice(1).toLowerCase()}</option>)}</select></label>
    </div>
    {loading ? <RowsSkeleton /> : <div className="overflow-x-auto rounded-xl border border-night-800"><table className="w-full min-w-[640px] text-left text-[13px]"><caption className="sr-only">Saved recommendation collections</caption><thead className="bg-night-900 text-night-300"><tr>{['Collection', 'Category', 'Curator', 'Aliases', 'Actions'].map(label => <th key={label} className="px-4 py-3 font-medium">{label}</th>)}</tr></thead><tbody className="divide-y divide-night-800">
      {found.slice(currentPage * 10, currentPage * 10 + 10).map(entry => <tr key={entry.id} className="bg-night-900/40"><td className="max-w-72 break-words px-4 py-3 font-semibold text-white">{entry.name}</td><td className="px-4 py-3 capitalize text-night-300">{entry.category.toLowerCase()}</td><td className="px-4 py-3 text-night-300">{entry.curatorName || '—'}</td><td className="max-w-48 break-words px-4 py-3 text-night-300">{entry.aliases.join(', ') || '—'}</td><td className="px-4 py-3"><div className="flex gap-3"><Link className="rounded font-semibold text-sunset-200 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-sunset-400" to="/servers/$serverId/recommendations/$recommendationId/edit" params={{ serverId: server.id, recommendationId: entry.id }} aria-label={`Edit ${entry.name}`}>Edit</Link><button className="rounded font-semibold text-rose-300 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-rose-300 disabled:opacity-50" disabled={deleting !== null} onClick={() => void remove(entry)} aria-label={`Delete ${entry.name}`}>{deleting === entry.id ? 'Deleting…' : 'Delete'}</button></div></td></tr>)}
      {!found.length && <tr><td colSpan={5} className="px-4 py-10 text-center text-night-300">{entries.length ? 'No matching collections. Try another name or category.' : 'No collections yet. Create a recommendation to get started.'}</td></tr>}
    </tbody></table></div>}
    {found.length > 10 && <nav aria-label="Collection pages" className="mt-4 flex items-center justify-between gap-3 text-sm text-night-300"><span>Page {currentPage + 1} of {Math.ceil(found.length / 10)}</span><div className="flex gap-3"><button className="rounded border border-night-700 px-3 py-2 disabled:opacity-40" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>Previous</button><button className="rounded border border-night-700 px-3 py-2 disabled:opacity-40" disabled={(currentPage + 1) * 10 >= found.length} onClick={() => setPage(currentPage + 1)}>Next</button></div></nav>}
  </section>;
}

export function ResponseHistory({ server }: { server: ManagedServer }) {
  const [changes, setChanges] = useState<ResponseChange[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null);
    try {
      const data = await queryGraphql<{ responseChangeHistory: ResponseChange[] }>(
        'query ResponseHistory($server: ID!) { responseChangeHistory(guildId: $server) { action actorId responseId occurredAt trigger } }',
        undefined,
        { server: server.id },
      );
      setChanges(data.responseChangeHistory);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not load Response History.'); }
    finally { setLoading(false); }
  }

  useEffect(() => { setChanges([]); setLoading(true); void load(); }, [server.id]);

  return <section>
    <PageHeader description="Review recent changes made to this server’s Responses." server={server} title="Response History" />
    {error && <div className="mb-5"><InlineAlert>{error} <button className="ml-2 font-semibold text-white underline underline-offset-4" onClick={() => { setLoading(true); void load(); }}>Try again</button></InlineAlert></div>}
    {loading ? <RowsSkeleton /> : error ? null : changes.length === 0 ? <div className="rounded-xl border border-night-800 bg-night-900/50 px-5 py-8"><p className="font-semibold text-white">No Response changes yet</p><p className="mt-1 text-sm leading-6 text-night-300">When a manager creates, edits, or deletes a Response, it will appear here.</p></div> : <ol className="divide-y divide-night-800 rounded-xl border border-night-800 bg-night-900/50">{changes.map((change, index) => <li className="flex flex-col justify-between gap-2 px-4 py-4 sm:flex-row sm:items-center" key={`${change.responseId}-${change.occurredAt}-${change.action}-${index}`}><span className="min-w-0 text-sm text-night-100"><strong className="text-sunset-200">{change.action.toLowerCase()}</strong> Response “{change.trigger}” <span className="text-night-400">by user {change.actorId}</span></span><time className="shrink-0 text-xs text-night-400" dateTime={change.occurredAt}>{new Date(change.occurredAt).toLocaleString()}</time></li>)}</ol>}
  </section>;
}

function RowsSkeleton() {
  return <div aria-label="Loading content" className="space-y-3" role="status"><div className="h-16 animate-pulse rounded-xl bg-night-800/70" /><div className="h-16 animate-pulse rounded-xl bg-night-800/70" /><div className="h-16 animate-pulse rounded-xl bg-night-800/70" /><span className="sr-only">Loading…</span></div>;
}
