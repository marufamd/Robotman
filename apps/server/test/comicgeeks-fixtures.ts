import { createRequire } from 'node:module';
import { mock } from 'node:test';

const require = createRequire(import.meta.url);
const { Impit } = createRequire(require.resolve('comicgeeks'))('impit');

/** Stub the external package's HTTP transport; retain its real parsing and sorting. */
export function mockComicGeeks(fetcher: typeof fetch) {
  const mocked = mock.method(Impit.prototype, 'fetch', (url: string, init?: RequestInit) => fetcher(url, init));
  return { restore: () => mocked.mock.restore() };
}
