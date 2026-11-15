import { createRootRoute, HeadContent, Outlet, Scripts } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import stylesheet from '../styles.css?url';
import { AuthProvider } from '../lib/auth-context';

export const Route = createRootRoute({
  head: () => ({ meta: [{ charSet: 'utf-8' }, { name: 'viewport', content: 'width=device-width, initial-scale=1' }, { title: 'Robotman' }], links: [{ rel: 'stylesheet', href: stylesheet }] }),
  component: RootLayout,
  shellComponent: Document,
});

function RootLayout() {
  return <AuthProvider><Outlet /></AuthProvider>;
}

function Document({ children }: { children: ReactNode }) {
  return <html lang="en"><head><HeadContent /></head><body>{children}<Scripts /></body></html>;
}
