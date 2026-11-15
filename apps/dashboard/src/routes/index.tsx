import { createFileRoute, Navigate } from '@tanstack/react-router';
import { LoadingSpinner } from '../components/icon';
import { useAuth } from '../lib/auth-context';

export const Route = createFileRoute('/')({ component: IndexPage });

function IndexPage() {
  const { loading, user } = useAuth();
  if (loading) return <div className="grid min-h-screen place-items-center bg-night-950"><LoadingSpinner label="Checking Discord sign-in…" /></div>;
  return <Navigate replace to={user ? '/servers' : '/login'} />;
}
