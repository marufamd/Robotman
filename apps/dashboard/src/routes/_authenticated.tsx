import { createFileRoute, Navigate } from '@tanstack/react-router';
import { DashboardShell } from '../components/dashboard-shell';
import { LoadingSpinner } from '../components/icon';
import { useAuth } from '../lib/auth-context';

export const Route = createFileRoute('/_authenticated')({ component: AuthenticatedLayout });

function AuthenticatedLayout() {
  const { user, loading, error, refresh } = useAuth();
  if (loading && !user) return <div className="grid min-h-screen place-items-center bg-night-950"><LoadingSpinner label="Loading dashboard…" /></div>;
  if (!user && error) return <main className="grid min-h-screen place-items-center bg-night-950 p-6"><div className="max-w-lg text-night-200" role="alert"><p>{error}</p><button className="mt-4 rounded-lg border border-night-700 px-4 py-2 font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-sunset-400" onClick={() => void refresh()}>Try again</button></div></main>;
  if (!user) return <Navigate replace to="/login" />;
  return <DashboardShell />;
}
