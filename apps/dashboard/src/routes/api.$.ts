import { createFileRoute } from '@tanstack/react-router';

async function forward(request: Request): Promise<Response> {
  const origin = process.env.ROBOTMAN_API_ORIGIN;
  if (!origin) return Response.json({ error: 'Robotman API proxy is not configured' }, { status: 503 });
  const incoming = new URL(request.url);
  const target = new URL(`${incoming.pathname}${incoming.search}`, origin);
  const headers = new Headers();
  for (const name of ['accept', 'content-type', 'cookie', 'x-csrf-token']) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  try {
    const response = await fetch(target, {
      method: request.method,
      headers,
      body: request.method === 'GET' || request.method === 'HEAD' ? undefined : await request.arrayBuffer(),
      redirect: 'manual',
    });
    const resultHeaders = new Headers();
    for (const name of ['cache-control', 'content-type', 'location', 'set-cookie']) {
      if (name === 'set-cookie') {
        const getSetCookie = (response.headers as Headers & { getSetCookie?: () => string[] }).getSetCookie;
        if (getSetCookie) {
          for (const cookie of getSetCookie.call(response.headers)) resultHeaders.append('set-cookie', cookie);
          continue;
        }
      }
      const value = response.headers.get(name);
      if (value) resultHeaders.set(name, value);
    }
    return new Response(response.body, { status: response.status, headers: resultHeaders });
  } catch {
    return Response.json({ error: 'Robotman API is unavailable' }, { status: 502 });
  }
}

export const Route = createFileRoute('/api/$')({
  server: { handlers: { GET: ({ request }) => forward(request), HEAD: ({ request }) => forward(request), POST: ({ request }) => forward(request) } },
});
