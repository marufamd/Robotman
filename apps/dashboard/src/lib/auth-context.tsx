import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { queryGraphql } from './graphql';
import type { ManagedServer, User } from './graphql';

type AuthPayload = {
  authUser: User | null;
  authCsrfToken: string | null;
};

type AuthContextValue = {
  user: User | null;
  csrfToken: string | null;
  servers: ManagedServer[];
  loading: boolean;
  needsSignIn: boolean;
  signIn: () => void;
  error: string | null;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [csrfToken, setCsrfToken] = useState<string | null>(null);
  const [servers, setServers] = useState<ManagedServer[]>([]);
  const [loading, setLoading] = useState(true);
  const [needsSignIn, setNeedsSignIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const refreshPending = useRef<Promise<void> | null>(null);

  const refresh = useCallback(() => {
    if (refreshPending.current) return refreshPending.current;
    const pending = (async () => {
      setLoading(true);
      setError(null);
      try {
        // Identity is local to the session. A failed server-list refresh must
        // not turn a signed-in manager into an anonymous user.
        const result = await queryGraphql<AuthPayload>(
          '{ authUser { id username displayName avatarUrl } authCsrfToken }',
        );
        setNeedsSignIn(false);
        setUser(result.authUser);
        setCsrfToken(result.authCsrfToken);
        if (!result.authUser) { setServers([]); return; }
        const { managedGuilds } = await queryGraphql<{ managedGuilds: ManagedServer[] }>(
          '{ managedGuilds { id name icon owner installed inviteUrl } }',
        );
        setServers(managedGuilds);
        const returnTo = sessionStorage.getItem('robotman:sign-in-return');
        if (returnTo?.startsWith('/servers/') && !returnTo.startsWith('//')) {
          sessionStorage.removeItem('robotman:sign-in-return');
          if (window.location.pathname !== returnTo) window.location.replace(returnTo);
        }
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : 'Could not connect to Robotman. Try again.');
      } finally {
        refreshPending.current = null;
        setLoading(false);
      }
    })();
    refreshPending.current = pending;
    return pending;
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => {
    const handleError = (event: Event) => {
      const { code, message } = (event as CustomEvent<{ code: string; message: string }>).detail;
      if (code === 'UNAUTHENTICATED') {
        setNeedsSignIn(true);
        setCsrfToken(null);
      }
      setError(message);
    };
    window.addEventListener('robotman:auth-error', handleError);
    return () => window.removeEventListener('robotman:auth-error', handleError);
  }, []);

  const signIn = useCallback(() => {
    if (!window.dispatchEvent(new Event('robotman:before-sign-in', { cancelable: true }))) return;
    try {
      sessionStorage.setItem('robotman:sign-in-return', window.location.pathname);
      window.location.assign('/api/auth/login');
    } catch {
      setError('Your browser could not keep this page for sign-in. Allow tab storage, then try again.');
    }
  }, []);

  const signOut = useCallback(async () => {
    if (!csrfToken) {
      setError('Refresh the page before signing out.');
      return;
    }
    try {
      await queryGraphql<{ authLogout: boolean }>('mutation SignOut { authLogout }', csrfToken);
      setUser(null);
      setServers([]);
      setCsrfToken(null);
      window.location.assign('/login');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not sign out. Please try again.');
    }
  }, [csrfToken]);

  const value = useMemo(() => ({ user, csrfToken, servers, loading, error, refresh, signOut, needsSignIn, signIn }), [
    user, csrfToken, servers, loading, error, refresh, signOut, needsSignIn, signIn,
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider.');
  return value;
}
