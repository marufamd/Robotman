import type { ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import { useAuth } from '../lib/auth-context';
import type { ManagedServer } from '../lib/graphql';
import { ServerAvatar } from './server-avatar';

export function PageHeader({ title, description, server, compact = false }: { title: string; description: string; server?: ManagedServer; compact?: boolean }) {
  return <div className={`flex flex-col sm:flex-row sm:items-center ${compact ? 'mb-5 gap-3' : 'mb-8 gap-4'}`}>
    {server && <ServerAvatar server={server} size={compact ? 'small' : undefined} />}
    <div><h1 className={`font-display font-extrabold tracking-tight text-white ${compact ? 'text-2xl' : 'text-3xl sm:text-4xl'}`}>{title}</h1><p className={`max-w-2xl text-night-300 ${compact ? 'mt-1 text-sm leading-6' : 'mt-2 text-base leading-7'}`}>{description}</p></div>
  </div>;
}

export function RequireServer({ serverId, children }: { serverId: string; children: (server: ManagedServer) => ReactNode }) {
  const { servers } = useAuth();
  const server = servers.find(item => item.id === serverId);
  if (!server) return <ServerUnavailable title="Server not found" description="This server is no longer available to your Discord account. Choose another server to continue." />;
  if (!server.installed) return <ServerUnavailable inviteUrl={server.inviteUrl} server={server} title="Robotman is not installed" description="Invite Robotman to this server to open its dashboard." />;
  return children(server);
}

function ServerUnavailable({ title, description, server, inviteUrl }: { title: string; description: string; server?: ManagedServer; inviteUrl?: string }) {
  return <div className="mx-auto max-w-xl rounded-2xl border border-night-800 bg-night-900/70 p-6 sm:p-8">
    {server && <ServerAvatar server={server} size="small" />}
    <h1 className="mt-4 font-display text-2xl font-bold text-white">{title}</h1>
    <p className="mt-2 text-sm leading-6 text-night-300">{description}</p>
    <div className="mt-6 flex flex-wrap gap-3">
      {inviteUrl && <a className="rounded-lg bg-gradient-to-r from-sunset-400 to-sunset-500 px-4 py-2.5 text-sm font-semibold text-black transition hover:brightness-110" href={inviteUrl} rel="noreferrer" target="_blank">Invite Robotman</a>}
      <Link className="rounded-lg border border-night-700 px-4 py-2.5 text-sm font-semibold text-night-200 transition hover:border-night-500 hover:text-white" to="/servers">Manage Servers</Link>
    </div>
  </div>;
}

export function InlineAlert({ children, tone = 'error' }: { children: ReactNode; tone?: 'error' | 'success' }) {
  return <p className={tone === 'error' ? 'rounded-xl border border-rose-400/30 bg-rose-950/30 px-4 py-3 text-sm text-rose-200' : 'rounded-xl border border-emerald-400/25 bg-emerald-950/20 px-4 py-3 text-sm text-emerald-200'} role={tone === 'error' ? 'alert' : 'status'}>{children}</p>;
}

export const fieldClass = 'mt-1 w-full rounded-lg border border-night-700 bg-night-950 px-3 py-2.5 text-sm text-white outline-none transition focus:border-sunset-400 focus:ring-1 focus:ring-sunset-400';
export const primaryButtonClass = 'inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-sunset-400 to-sunset-500 px-4 py-2.5 text-sm font-semibold text-black transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sunset-200 disabled:cursor-not-allowed disabled:opacity-55';
export const compactPrimaryButtonClass = primaryButtonClass.replace('px-4 py-2.5 text-sm', 'h-9 gap-1.5 px-3 text-[13px]');
export const iconButtonClass = 'inline-flex size-8 shrink-0 items-center justify-center rounded-md border border-night-700 bg-night-900 text-night-300 transition-colors hover:border-night-500 hover:bg-night-800 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sunset-400 disabled:cursor-not-allowed disabled:opacity-40';
