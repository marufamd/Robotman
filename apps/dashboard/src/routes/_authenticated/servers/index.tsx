import { createFileRoute, Link } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import { Icon } from '../../../components/icon';
import { ServerAvatar } from '../../../components/server-avatar';
import { useAuth } from '../../../lib/auth-context';

export const Route = createFileRoute('/_authenticated/servers/')({ component: ServerSelectionPage });

function ServerSelectionPage() {
  const { servers, error, refresh } = useAuth();
  const [search, setSearch] = useState('');
  const filteredServers = useMemo(() => servers.filter(server => server.name.toLowerCase().includes(search.trim().toLowerCase())), [servers, search]);
  const installedServers = filteredServers.filter(server => server.installed);
  const otherServers = filteredServers.filter(server => !server.installed);

  return <section className="w-full">
    <div className="mb-8 flex flex-col items-start justify-between gap-5 md:flex-row md:items-end">
      <div><h1 className="font-display text-3xl font-extrabold tracking-tight text-white sm:text-4xl">Manage Servers</h1><p className="mt-2 max-w-2xl text-base leading-7 text-night-300">Choose a server to manage its Robotman features and settings.</p></div>
      <label className="relative block w-full md:w-72"><span className="sr-only">Search servers</span><svg aria-hidden="true" className="absolute left-3 top-1/2 size-5 -translate-y-1/2 text-night-400" fill="none" stroke="currentColor" strokeWidth="1.7" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></svg><input className="w-full rounded-xl border border-night-700 bg-night-800/60 py-2.5 pl-10 pr-4 text-white placeholder:text-night-400 focus:border-sunset-400 focus:outline-none focus:ring-1 focus:ring-sunset-400" onChange={event => setSearch(event.target.value)} placeholder="Search servers…" type="search" value={search} /></label>
    </div>

    {error && <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-400/30 bg-rose-950/30 px-4 py-3 text-sm text-rose-200" role="alert"><span>{error}</span><button className="font-semibold text-white underline underline-offset-4" onClick={() => void refresh()}>Try again</button></div>}

    {servers.length === 0 ? error ? null : <div className="rounded-2xl border border-night-800 bg-night-900/60 px-6 py-12 text-center"><h2 className="font-display text-xl font-bold text-white">No manageable servers found</h2><p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-night-300">Sign in with an account that owns a Discord server or has permission to manage one.</p></div> : filteredServers.length === 0 ? <div className="rounded-2xl border border-night-800 bg-night-900/60 px-6 py-10 text-center text-sm text-night-300">No servers match “{search}”.</div> : <>
      {installedServers.length > 0 && <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">{installedServers.map(server => <Link className="group block h-full rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-sunset-400 focus-visible:ring-offset-2 focus-visible:ring-offset-night-950" key={server.id} params={{ serverId: server.id }} to="/servers/$serverId">
        <article className="flex h-full min-h-[272px] flex-col overflow-hidden rounded-2xl border border-night-800 bg-night-900 transition-colors duration-200 group-hover:border-sunset-500/50">
          <div className="h-20 bg-gradient-to-r from-sunset-900/20 to-night-800/30" />
          <div className="flex flex-1 flex-col px-5 pb-5"><div className="relative -mt-10 mb-4 flex items-end justify-between"><ServerAvatar server={server} /><span className="mb-2 rounded-full border border-sunset-500/30 bg-sunset-500/10 px-2.5 py-1 text-xs font-semibold text-sunset-200">{server.owner ? 'Owner' : 'Moderator'}</span></div>
            <h2 className="truncate font-display text-lg font-bold text-white">{server.name}</h2><p className="mt-2 flex items-center gap-2 text-sm text-night-300"><span className="size-2 rounded-full bg-emerald-400" />Robotman installed</p>
            <span className="mt-auto flex items-center justify-between pt-5 text-sm font-semibold text-night-200"><span>Manage server</span><Icon className="size-4 transition-transform group-hover:translate-x-1" name="arrow" /></span>
          </div>
        </article>
      </Link>)}</div>}

      {otherServers.length > 0 && <section className="mt-10" aria-labelledby="available-servers-heading"><div className="mb-4 flex items-end justify-between gap-3"><div><h2 className="font-display text-xl font-bold text-white" id="available-servers-heading">Available to add</h2><p className="mt-1 text-sm text-night-300">Invite Robotman to a server to enable its dashboard.</p></div></div>
        <ul className="divide-y divide-night-800 overflow-hidden rounded-2xl border border-night-800 bg-night-900/70">{otherServers.map(server => <li className="flex flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-5" key={server.id}><div className="flex min-w-0 items-center gap-3"><ServerAvatar server={server} size="small" /><div className="min-w-0"><p className="truncate font-semibold text-white">{server.name}</p><p className="mt-1 text-xs text-night-400">Robotman not installed</p></div></div><a className="inline-flex items-center gap-2 rounded-lg border border-night-700 px-3 py-2 text-sm font-semibold text-night-200 transition-colors hover:border-sunset-400/50 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-sunset-400" href={server.inviteUrl} rel="noreferrer" target="_blank"><Icon className="size-4" name="plus" />Invite Robotman</a></li>)}</ul>
      </section>}
    </>}
  </section>;
}
