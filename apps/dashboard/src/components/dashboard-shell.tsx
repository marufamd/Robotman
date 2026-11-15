import { useState } from 'react';
import { Link, Outlet, useLocation, useParams } from '@tanstack/react-router';
import { useAuth } from '../lib/auth-context';
import { Icon } from './icon';
import type { IconName } from './icon';

type NavigationItem = { label: string; to: '/servers/$serverId' | '/servers/$serverId/responses' | '/servers/$serverId/recommendations' | '/servers/$serverId/history' | '/servers/$serverId/settings'; suffix?: string; icon: IconName };
const serverNavigation: NavigationItem[] = [
  { label: 'Overview', to: '/servers/$serverId', icon: 'overview' },
  { label: 'Responses', to: '/servers/$serverId/responses', suffix: '/responses', icon: 'responses' },
  { label: 'Recommendations', to: '/servers/$serverId/recommendations', suffix: '/recommendations', icon: 'recommendations' },
  { label: 'Response History', to: '/servers/$serverId/history', suffix: '/history', icon: 'history' },
  { label: 'Server Settings', to: '/servers/$serverId/settings', suffix: '/settings', icon: 'settings' },
];

export function DashboardShell() {
  const { user, servers, signOut, error, needsSignIn, signIn, refresh } = useAuth();
  const location = useLocation();
  const { serverId } = useParams({ strict: false }) as { serverId?: string };
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const currentServer = servers.find(server => server.id === serverId);
  const closeSidebar = () => setSidebarOpen(false);

  return <div className="min-h-screen w-full text-night-200 antialiased">
    {sidebarOpen && <button aria-label="Close navigation" className="fixed inset-0 z-10 bg-black/60 lg:hidden" onClick={closeSidebar} />}

    <aside className={`fixed inset-y-0 left-0 z-20 flex w-64 flex-col border-r border-night-900 bg-[#020617] py-7 text-sm font-semibold tracking-tight shadow-2xl transition-transform duration-200 ease-out lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
      <Link aria-label="Robotman home" className="mb-8 flex items-center gap-3 px-6" onClick={closeSidebar} to="/servers">
        <span className="flex size-10 items-center justify-center overflow-hidden rounded-lg bg-white shadow-lg"><img alt="" className="size-full object-cover" src="/icon.png" /></span>
        <span className="bg-gradient-to-r from-[#FFB700] to-[#FF8C00] bg-clip-text font-display text-2xl font-black leading-tight text-transparent">Robotman</span>
      </Link>

      <nav aria-label="Dashboard navigation" className="flex min-h-0 flex-1 flex-col">
        <ul className="flex flex-col gap-1 overflow-y-auto px-2">
          <li><Link aria-current={location.pathname === '/servers' ? 'page' : undefined} className={`flex items-center gap-3 rounded-r-lg border-l-4 px-4 py-3 transition-colors ${location.pathname === '/servers' ? 'border-sunset-500 bg-night-900/60 text-sunset-300' : 'border-transparent text-night-400 hover:bg-night-900/60 hover:text-white'}`} onClick={closeSidebar} to="/servers"><Icon name="dashboard" />Manage Servers</Link></li>
          {currentServer && <li className="mb-2 mt-5 px-4 text-xs font-semibold uppercase tracking-[0.16em] text-night-400">{currentServer.name}</li>}
          {currentServer && serverNavigation.map(item => {
            const active = item.suffix ? location.pathname === `/servers/${currentServer.id}${item.suffix}` : location.pathname === `/servers/${currentServer.id}` || location.pathname === `/servers/${currentServer.id}/`;
            return <li key={item.label}>
              <Link aria-current={active ? 'page' : undefined} className={`flex items-center gap-3 rounded-r-lg border-l-4 px-4 py-3 transition-colors ${active ? 'border-sunset-500 bg-night-900/60 text-sunset-300' : 'border-transparent text-night-400 hover:bg-night-900/60 hover:text-white'}`} onClick={closeSidebar} params={{ serverId: currentServer.id }} to={item.to}>
                <Icon name={item.icon} />{item.label}
              </Link>
            </li>;
          })}
        </ul>
      </nav>
    </aside>

    <div className="min-h-screen lg:ml-64">
      <header className="fixed right-0 top-0 z-10 flex h-16 w-full items-center justify-between border-b border-night-900 bg-[#03091a]/95 px-4 text-sm backdrop-blur-xl lg:w-[calc(100%-16rem)] lg:px-8">
        <div className="flex min-w-0 items-center gap-4 lg:gap-6">
          <button aria-expanded={sidebarOpen} aria-label={sidebarOpen ? 'Close navigation' : 'Open navigation'} className="grid size-11 shrink-0 place-items-center rounded-md text-night-300 transition-colors hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-sunset-400 lg:hidden" onClick={() => setSidebarOpen(!sidebarOpen)}><Icon className="size-6" name={sidebarOpen ? 'close' : 'menu'} /></button>
          <h1 className="truncate font-display text-lg font-bold text-white">{currentServer?.name ?? 'Select a Server'}</h1>
        </div>
        <div className="flex shrink-0 items-center gap-2 sm:gap-4">
          <button aria-label="Sign out" className="grid size-10 place-items-center rounded-lg text-night-300 transition-colors hover:text-rose-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sunset-400" onClick={() => void signOut()} title="Sign out"><Icon name="logout" /></button>
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden text-right md:block"><p className="max-w-36 truncate text-sm font-bold text-white">{user?.displayName || user?.username}</p><p className="max-w-36 truncate text-xs font-medium text-night-400">{user?.username}</p></div>
            {user?.avatarUrl ? <img alt="" className="size-10 rounded-full border border-night-700 object-cover" src={user.avatarUrl} /> : <span className="grid size-10 place-items-center rounded-full bg-gradient-to-br from-[#FDBB2D] to-[#FF8C37] text-sm font-bold text-night-950">{(user?.displayName || user?.username || 'U').slice(0, 1).toUpperCase()}</span>}
          </div>
        </div>
      </header>
      <main className="mx-auto mt-16 min-h-[calc(100vh-4rem)] w-full max-w-[1440px] p-5 sm:p-7 lg:p-10">{error && <div className="mb-5 rounded-xl border border-rose-400/30 bg-rose-950/30 px-4 py-3 text-sm text-rose-200" role="alert"><p>{needsSignIn ? 'Your sign-in expired. Sign in again to continue.' : error}</p><button className="mt-2 rounded px-2 py-1 font-semibold text-white underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sunset-400" onClick={needsSignIn ? signIn : () => void refresh()}>{needsSignIn ? 'Sign in again' : 'Try again'}</button></div>}<Outlet /></main>
    </div>
  </div>;
}
