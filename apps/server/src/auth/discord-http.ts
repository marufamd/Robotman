export class DiscordResponseError extends Error {
  constructor(readonly status: number, readonly route: string, readonly retryAfterMs = 0) {
    super(`Discord API request failed at ${route} (HTTP ${status})${retryAfterMs > 0 ? `; retry after ${Math.ceil(retryAfterMs / 1000)} seconds` : ''}`);
  }
}

/** Coalesce identical GETs and stop requests during Discord's retry window. */
export function createDiscordHttp(fetcher: typeof fetch, now: () => number) {
  const pending = new Map<string, Promise<unknown>>();
  const cooldowns = new Map<string, number>();

  async function json<T>(url: string, init?: RequestInit): Promise<T> {
    const method = init?.method ?? 'GET';
    const route = new URL(url).pathname;
    const credential = new Headers(init?.headers).get('authorization') ?? 'oauth';
    const routeKey = `${credential}:${method}:${route}`;
    const globalKey = `${credential}:global`;
    const requestKey = `${routeKey}:${url}`;
    const active = method === 'GET' ? pending.get(requestKey) : undefined;
    if (active) return active as Promise<T>;

    const execute = async (): Promise<T> => {
      const until = Math.max(cooldowns.get(routeKey) ?? 0, cooldowns.get(globalKey) ?? 0);
      if (until > now()) throw new DiscordResponseError(429, route, until - now());
      cooldowns.delete(routeKey);
      cooldowns.delete(globalKey);
      const response = await fetcher(url, { ...init, signal: init?.signal ?? AbortSignal.timeout(8_000) });
      if (response.status === 429) {
        const body = await response.json().catch(() => ({})) as { retry_after?: number; global?: boolean };
        const seconds = Math.max(
          Number(response.headers.get('retry-after')) || 0,
          Number(response.headers.get('x-ratelimit-reset-after')) || 0,
          Number(body.retry_after) || 0,
        );
        const retryAfterMs = Number.isFinite(seconds) && seconds > 0 ? Math.ceil(seconds * 1000) : 1000;
        const global = body.global === true || response.headers.get('x-ratelimit-global') === 'true';
        cooldowns.set(global ? globalKey : routeKey, now() + retryAfterMs);
        throw new DiscordResponseError(429, route, retryAfterMs);
      }
      if (!response.ok) throw new DiscordResponseError(response.status, route);
      return response.json() as Promise<T>;
    };

    const request = execute();
    if (method === 'GET') pending.set(requestKey, request);
    try { return await request; }
    finally { if (method === 'GET') pending.delete(requestKey); }
  }

  return { json, close() { pending.clear(); cooldowns.clear(); } };
}
