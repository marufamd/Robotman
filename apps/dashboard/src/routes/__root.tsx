import { createRootRoute, HeadContent, Outlet, Scripts } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import stylesheet from '../styles.css?url';
import { AuthProvider } from '../lib/auth-context';

export const Route = createRootRoute({
  head: () => {
    // Link previews need absolute URLs. Vercel sets the production hostname; local development falls back to a relative path.
    const origin = process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : '';
    const image = `${origin}/icon.png`;
    return {
      meta: [
        { charSet: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { title: 'Robotman' },
        { name: 'description', content: 'Web dashboard for Robotman' },
        { property: 'og:site_name', content: 'Robotman Dashboard' },
        { property: 'og:title', content: 'Robotman Dashboard' },
        { property: 'og:description', content: 'Web dashboard for Robotman' },
        { property: 'og:type', content: 'website' },
        { property: 'og:image', content: image },
        { property: 'og:image:alt', content: 'Robotman' },
        { property: 'og:url', content: origin || '/' },
        { name: 'theme-color', content: '#f2b139' },
        { name: 'twitter:card', content: 'summary' },
        { name: 'twitter:image', content: image },
      ],
      links: [{ rel: 'stylesheet', href: stylesheet }],
    };
  },
  component: RootLayout,
  shellComponent: Document,
});

function RootLayout() {
  return <AuthProvider><Outlet /></AuthProvider>;
}

function Document({ children }: { children: ReactNode }) {
  return <html lang="en"><head><HeadContent /></head><body>{children}<Scripts /></body></html>;
}
