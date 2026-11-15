import { createFileRoute, Navigate } from '@tanstack/react-router';
import { LoadingSpinner } from '../components/icon';
import { useAuth } from '../lib/auth-context';

export const Route = createFileRoute('/login')({ component: LoginPage });

function LoginPage() {
  const { user, loading, error, refresh } = useAuth();
  if (user) return <Navigate replace to="/servers" />;

  return <main className="relative grid min-h-screen place-items-center overflow-hidden bg-night-950 px-4 py-12 text-night-200">
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute left-1/2 top-[-18rem] size-[38rem] -translate-x-1/2 rounded-full bg-sunset-500/10 blur-[100px]" />
      <div className="absolute bottom-[-14rem] right-[-10rem] size-[30rem] rounded-full bg-sunset-400/10 blur-[100px]" />
    </div>
    <section className="relative z-10 w-full max-w-md text-center">
      <div className="mx-auto mb-8 size-28 overflow-hidden rounded-2xl shadow-[0_16px_40px_rgba(0,0,0,0.32)]">
        <img alt="Robotman" className="size-full object-cover" src="/icon.png" />
      </div>
      <h1 className="font-display text-4xl font-extrabold tracking-tight text-white">Robotman</h1>
      <p className="mx-auto mt-3 max-w-sm text-base leading-7 text-night-300">Welcome to the Robotman Dashboard</p>
      {error && <div className="mt-8 rounded-xl border border-rose-400/30 bg-rose-950/30 px-4 py-3 text-left text-sm text-rose-200" role="alert"><p>{error}</p><button className="mt-2 font-semibold text-white underline underline-offset-4" onClick={() => void refresh()}>Try again</button></div>}
      <div className="mt-8">
        {loading ? <div className="py-3 flex justify-center"><LoadingSpinner label="Checking Discord sign-in…" /></div> : <a className="flex w-full items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-sunset-400 to-sunset-500 px-5 py-3.5 font-semibold text-black shadow-[0_8px_20px_rgba(255,140,55,0.2)] transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sunset-200" href="/api/auth/login">
          <DiscordMark />
          <span className="text-black">Login with Discord</span>
        </a>}
      </div>
    </section>
  </main>;
}

function DiscordMark() {
  return <svg aria-hidden="true" className="size-5 fill-black text-black" fill="currentColor" viewBox="0 0 24 24"><path d="M19.9 5.1a18 18 0 0 0-4.4-1.4l-.5 1a16.6 16.6 0 0 0-6 0l-.5-1a18 18 0 0 0-4.4 1.4C1.3 9.2.5 13.1.9 16.9a18 18 0 0 0 5.5 2.8l1.2-2a11 11 0 0 1-1.9-.9l.5-.4a12.8 12.8 0 0 0 11.6 0l.5.4a11 11 0 0 1-1.9.9l1.2 2a18 18 0 0 0 5.5-2.8c.5-4.4-.8-8.2-3.2-11.8ZM8.7 14.5c-1 0-1.8-.9-1.8-2s.8-2 1.8-2 1.8.9 1.8 2-.8 2-1.8 2Zm6.6 0c-1 0-1.8-.9-1.8-2s.8-2 1.8-2 1.8.9 1.8 2-.8 2-1.8 2Z" /></svg>;
}
