import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { GraphQLError } from 'graphql';
import { createSessionStore, signInRequired } from './session-store.js';
import { createDiscordHttp, DiscordResponseError } from './discord-http.js';

const DISCORD_API = 'https://discord.com/api/v10';
const SESSION_MAX_AGE = 7 * 24 * 60 * 60;
const INSTALLATION_CACHE_MS = 60_000;
const MANAGE_GUILD = 0x20n;
const ADMINISTRATOR = 0x8n;
const INVITE_PERMISSIONS = 2_048n + 16_384n + 65_536n + 262_144n;

export interface AuthConfig {
  databaseUrl?: string;
  clientId?: string;
  clientSecret?: string;
  botToken?: string;
  /** Public server origin used in OAuth redirect_uri; optional for proxy deployments. */
  publicOrigin?: string;
  /** OAuth callback path, default /api/auth/callback. */
  callbackPath?: string;
  /** HMAC key for opaque-cookie signatures. Use a dedicated random secret in production. */
  sessionSecret?: string;
  /** Set false only for local HTTP development. Defaults to true. */
  secureCookies?: boolean;
  fetch?: typeof fetch;
  installationCacheMs?: number;
  now?: () => number;
}

export interface ManagedGuild {
  id: string;
  name: string;
  icon: string | null;
  owner: boolean;
  permissions: string;
  installed: boolean;
  inviteUrl: string;
}

export interface AuthContext {
  request?: IncomingMessage;
  response?: ServerResponse;
}

export interface UserSession {
  key: string;
  id: string;
  username: string;
  global_name?: string | null;
  avatar?: string | null;
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: number;
  csrfToken: string;
  expiresAt: number;
  managedGuilds?: DiscordGuild[];

}

export interface DiscordGuild {
  id: string;
  name: string;
  icon: string | null;
  owner: boolean;
  permissions: string;
}

/** True when a Discord guild owner, Manage Server holder, or Administrator can manage it. */
export function canManageGuild(guild: Pick<DiscordGuild, 'owner' | 'permissions'>): boolean {
  if (guild.owner) return true;
  try {
    const permissions = BigInt(guild.permissions);
    return (permissions & MANAGE_GUILD) !== 0n || (permissions & ADMINISTRATOR) !== 0n;
  } catch {
    return false;
  }
}

/** Enforce access using the server permissions captured for the signed-in session. */
export function requireManagedGuild(guilds: readonly DiscordGuild[], guildId: string): DiscordGuild {
  const guild = guilds.find(candidate => candidate.id === guildId);
  if (!guild || !canManageGuild(guild)) throw new Error('Managed Guild access required');
  return guild;
}

export function createAuth(config: AuthConfig) {
  const now = config.now ?? Date.now;
  const discord = createDiscordHttp(config.fetch ?? fetch, now);
  const store = createSessionStore(config.databaseUrl);
  const requestSessions = new WeakMap<IncomingMessage, Promise<UserSession | undefined>>();
  const snapshotLoads = new Map<string, Promise<DiscordGuild[]>>();
  let installations: { expiresAt: number; guildIds: Set<string> } | undefined;
  let installationsPending: Promise<Set<string>> | undefined;
  const callbackPath = config.callbackPath ?? '/api/auth/callback';
  const secret = config.sessionSecret;
  const secure = config.secureCookies !== false;

  const configured = () => Boolean(config.clientId && config.clientSecret && config.botToken && secret);
  const cookie = (name: string, value: string, options: { httpOnly?: boolean; maxAge?: number; clear?: boolean } = {}) => {
    const parts = [`${name}=${options.clear ? '' : encodeURIComponent(value)}`, 'Path=/', 'SameSite=Lax'];
    if (options.httpOnly !== false) parts.push('HttpOnly');
    if (secure) parts.push('Secure');
    if (options.clear) parts.push('Max-Age=0');
    else if (options.maxAge !== undefined) parts.push(`Max-Age=${options.maxAge}`);
    return parts.join('; ');
  };
  const sign = (token: string) => createHmac('sha256', secret ?? 'unconfigured').update(token).digest('base64url');
  const setCookie = (response: ServerResponse, value: string[]) => response.setHeader('set-cookie', value);
  const tokenFrom = (request?: IncomingMessage): string | undefined => {
    const header = request?.headers.cookie;
    if (!header) return undefined;
    const match = header.split(';').map(part => part.trim()).find(part => part.startsWith('robotman_session='));
    if (!match) return undefined;
    const [rawToken, signature] = match.slice('robotman_session='.length).split('.');
    if (!rawToken || !signature) return undefined;
    const expected = sign(rawToken);
    const providedBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expected);
    if (providedBuffer.length !== expectedBuffer.length || !timingSafeEqual(providedBuffer, expectedBuffer)) return undefined;
    return rawToken;
  };
  const sessionFor = (request?: IncomingMessage): Promise<UserSession | undefined> => {
    if (!request) return Promise.resolve(undefined);
    let pending = requestSessions.get(request);
    if (!pending) {
      const token = tokenFrom(request);
      pending = token ? store.get(token, now()) : Promise.resolve(undefined);
      requestSessions.set(request, pending);
    }
    return pending;
  };
  const json = (response: ServerResponse, status: number, body: unknown) => {
    response.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
    response.end(JSON.stringify(body));
  };
  const redirectUri = (request: IncomingMessage) => {
    // Production deployments must pass DASHBOARD_ORIGIN; this fallback is for local development only.
    const origin = config.publicOrigin ?? 'http://localhost:3000';
    void request;
    return new URL(callbackPath, origin).toString();
  };
  const discordJson = discord.json;
  const fetchGuilds = async (authorization: string): Promise<DiscordGuild[]> => {
    const guilds: DiscordGuild[] = [];
    let before: string | undefined;
    // Discord caps guild pages at 200; continue with the last id until the final short page.
    for (let page = 0; page < 100; page += 1) {
      const url = new URL(`${DISCORD_API}/users/@me/guilds`);
      url.searchParams.set('limit', '200');
      if (before) url.searchParams.set('before', before);
      const result = await discordJson<DiscordGuild[]>(url.toString(), { headers: { authorization } });
      guilds.push(...result);
      if (result.length < 200) break;
      const next = result[result.length - 1]?.id;
      if (!next || next === before) break;
      before = next;
    }
    return guilds;
  };
  const listManagedGuilds = async (session: UserSession): Promise<DiscordGuild[]> => {
    if (session.managedGuilds) return session.managedGuilds;
    const pending = snapshotLoads.get(session.key);
    if (pending) return pending;
    const load = async (session: UserSession) => {
      if (session.accessTokenExpiresAt <= now() + 30_000) {
        const form = new URLSearchParams({ client_id: config.clientId!, client_secret: config.clientSecret!, grant_type: 'refresh_token', refresh_token: session.refreshToken });
        const refreshed = await discordJson<{ access_token: string; refresh_token: string; expires_in: number }>(`${DISCORD_API}/oauth2/token`, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: form });
        session.accessToken = refreshed.access_token;
        session.refreshToken = refreshed.refresh_token;
        session.accessTokenExpiresAt = now() + refreshed.expires_in * 1000;
      }
      const guilds = (await fetchGuilds(`Bearer ${session.accessToken}`)).filter(canManageGuild);
      session.managedGuilds = guilds;

      return guilds;
    };
    const loading = store.capture(session.key, now(), async current => {
      try { await load(current); }
      catch (error) {
        if (error instanceof DiscordResponseError) throw error;
        throw new GraphQLError('Could not load servers from Discord. Please try again.', { extensions: { code: 'UPSTREAM_UNAVAILABLE' } });
      }
    });
    snapshotLoads.set(session.key, loading);
    try { return await loading; }
    finally { snapshotLoads.delete(session.key); }
  };
  const installedGuildIds = async (): Promise<Set<string>> => {
    if (installations && installations.expiresAt > now()) return installations.guildIds;
    if (installationsPending) return installationsPending;
    if (!config.botToken) throw new Error('Discord bot token is not configured');
    installationsPending = fetchGuilds(`Bot ${config.botToken}`).then(guilds => {
      const guildIds = new Set(guilds.map(guild => guild.id));
      installations = { guildIds, expiresAt: now() + (config.installationCacheMs ?? INSTALLATION_CACHE_MS) };
      return guildIds;
    });
    try { return await installationsPending; }
    finally { installationsPending = undefined; }
  };
  const toManagedGuild = (guild: DiscordGuild, installed: boolean): ManagedGuild => ({
    id: guild.id,
    name: guild.name,
    icon: guild.icon,
    owner: guild.owner,
    permissions: guild.permissions,
    installed,
    inviteUrl: `https://discord.com/oauth2/authorize?client_id=${encodeURIComponent(config.clientId ?? '')}&scope=bot%20applications.commands&permissions=${INVITE_PERMISSIONS.toString()}&guild_id=${encodeURIComponent(guild.id)}&disable_guild_select=true`,
  });
  const managedGuildsFor = async (session: UserSession) => {
    const guilds = await listManagedGuilds(session);
    if (guilds.length === 0) return [];
    const installed = await installedGuildIds();
    return guilds.map(guild => toManagedGuild(guild, installed.has(guild.id)));
  };
  const ensureCsrf = (session: UserSession, request: IncomingMessage): boolean => {
    const csrfCookie = request.headers.cookie?.split(';').map(part => part.trim()).find(part => part.startsWith('robotman_csrf='))?.slice('robotman_csrf='.length);
    const csrfHeader = request.headers['x-csrf-token'];
    return Boolean(csrfCookie && typeof csrfHeader === 'string' && csrfHeader === session.csrfToken && decodeURIComponent(csrfCookie) === session.csrfToken);
  };
  const fields = `
    type AuthUser { id: ID!, username: String!, displayName: String, avatarUrl: String }
    type ManagedGuild { id: ID!, name: String!, icon: String, owner: Boolean!, permissions: String!, installed: Boolean!, inviteUrl: String! }
    extend type Query {
      authUser: AuthUser
      managedGuilds: [ManagedGuild!]!
      authCsrfToken: String
    }
    extend type Mutation { authLogout: Boolean! }
  `;
  const resolvers = {
    authUser: async (args: unknown, context: AuthContext) => {
      const session = await sessionFor(context.request);
      return session ? { id: session.id, username: session.username, displayName: session.global_name ?? null, avatarUrl: session.avatar ? `https://cdn.discordapp.com/avatars/${session.id}/${session.avatar}.png` : null } : null;
    },
    managedGuilds: async (args: unknown, context: AuthContext) => {
      const session = await sessionFor(context.request);
      if (!session) return [];
      return managedGuildsFor(session);
    },
    authCsrfToken: async (args: unknown, context: AuthContext) => (await sessionFor(context.request))?.csrfToken ?? null,
    authLogout: async (args: unknown, context: AuthContext) => {
      const request = context.request;
      const response = context.response;
      if (!request || !response || request.method !== 'POST') throw new Error('POST required');
      const session = await sessionFor(request);
      if (session && !ensureCsrf(session, request)) throw new Error('CSRF validation failed');
      const token = tokenFrom(request);
      if (token) await store.delete(token);
      requestSessions.set(request, Promise.resolve(undefined));
      setCookie(response, [cookie('robotman_session', '', { clear: true }), cookie('robotman_csrf', '', { httpOnly: false, clear: true })]);
      return true;
    },
  };

  async function handleHttpRequest(request: IncomingMessage, response: ServerResponse): Promise<boolean> {
    const path = new URL(request.url ?? '/', 'http://localhost').pathname;
    if (!['/auth/login', '/auth/callback', '/auth/logout', '/auth/session', '/auth/guilds', '/api/auth/login', '/api/auth/callback', '/api/auth/logout', '/api/auth/session', '/api/auth/guilds'].includes(path)) return false;
    if (path.endsWith('/login')) {
      if (request.method !== 'GET') { json(response, 405, { error: 'Method not allowed' }); return true; }
      if (!configured()) { json(response, 503, { error: 'Discord OAuth is not configured' }); return true; }
      const state = randomBytes(24).toString('base64url');
      const cookieNonce = randomBytes(24).toString('base64url');
      await store.createState(cookieNonce, state, now() + 10 * 60_000);
      const url = new URL('https://discord.com/oauth2/authorize');
      url.searchParams.set('client_id', config.clientId!);
      url.searchParams.set('redirect_uri', redirectUri(request));
      url.searchParams.set('response_type', 'code');
      url.searchParams.set('scope', 'identify guilds');
      url.searchParams.set('state', state);
      setCookie(response, [cookie('robotman_oauth_state', cookieNonce, { maxAge: 600 })]);
      response.writeHead(302, { location: url.toString(), 'cache-control': 'no-store' }).end();
      return true;
    }
    if (path.endsWith('/callback')) {
      if (request.method !== 'GET') { json(response, 405, { error: 'Method not allowed' }); return true; }
      if (!configured()) { json(response, 503, { error: 'Discord OAuth is not configured' }); return true; }
      const url = new URL(request.url ?? '/', 'http://localhost');
      const code = url.searchParams.get('code');
      const state = url.searchParams.get('state');
      const oauthCookie = request.headers.cookie?.split(';').map(part => part.trim()).find(part => part.startsWith('robotman_oauth_state='))?.slice('robotman_oauth_state='.length);
      const nonce = oauthCookie ? decodeURIComponent(oauthCookie) : '';
      const validState = await store.consumeState(nonce, state ?? '', now());
      if (!code || !state || !validState) {
        setCookie(response, [cookie('robotman_oauth_state', '', { clear: true })]);
        json(response, 400, { error: 'Invalid or expired OAuth state' });
        return true;
      }
      try {
        const form = new URLSearchParams({ client_id: config.clientId!, client_secret: config.clientSecret!, grant_type: 'authorization_code', code, redirect_uri: redirectUri(request) });
        const token = await discordJson<{ access_token: string; refresh_token: string; expires_in?: number }>(`${DISCORD_API}/oauth2/token`, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: form });
        const user = await discordJson<{ id: string; username: string; global_name?: string | null; avatar?: string | null }>(`${DISCORD_API}/users/@me`, { headers: { authorization: `Bearer ${token.access_token}` } });
        const sessionToken = randomBytes(32).toString('base64url');
        const csrfToken = randomBytes(32).toString('base64url');
        await store.create(sessionToken, { ...user, accessToken: token.access_token, refreshToken: token.refresh_token, accessTokenExpiresAt: now() + (token.expires_in ?? 3600) * 1000, csrfToken, expiresAt: now() + SESSION_MAX_AGE * 1000 });
        setCookie(response, [cookie('robotman_oauth_state', '', { clear: true }), cookie('robotman_session', `${sessionToken}.${sign(sessionToken)}`, { maxAge: SESSION_MAX_AGE }), cookie('robotman_csrf', csrfToken, { httpOnly: false, maxAge: SESSION_MAX_AGE })]);
        response.writeHead(302, { location: '/', 'cache-control': 'no-store' }).end();
      } catch (error) {
        if (error instanceof GraphQLError && error.extensions.code === 'SERVICE_UNAVAILABLE') throw error;
        if (error instanceof DiscordResponseError && error.status === 429) {
          response.setHeader('retry-after', String(Math.ceil(error.retryAfterMs / 1000)));
          json(response, 429, { error: `Discord sign-in is temporarily limited. Try again in ${Math.ceil(error.retryAfterMs / 1000)} seconds.` });
        } else json(response, 502, { error: 'Discord sign-in failed' });
      }
      return true;
    }
    if (path.endsWith('/logout')) {
      if (request.method !== 'POST') { json(response, 405, { error: 'POST required' }); return true; }
      const session = await sessionFor(request);
      if (session && !ensureCsrf(session, request)) { json(response, 403, { error: 'CSRF validation failed' }); return true; }
      const token = tokenFrom(request);
      if (token) await store.delete(token);
      requestSessions.set(request, Promise.resolve(undefined));
      setCookie(response, [cookie('robotman_session', '', { clear: true }), cookie('robotman_csrf', '', { httpOnly: false, clear: true })]);
      json(response, 200, { ok: true });
      return true;
    }
    if (request.method !== 'GET') { json(response, 405, { error: 'Method not allowed' }); return true; }
    const session = await sessionFor(request);
    if (path.endsWith('/session')) {
      json(response, 200, { user: session ? { id: session.id, username: session.username, displayName: session.global_name ?? null, avatarUrl: session.avatar ? `https://cdn.discordapp.com/avatars/${session.id}/${session.avatar}.png` : null } : null, csrfToken: session?.csrfToken ?? null });
      return true;
    }
    if (!session) { json(response, 401, { error: 'Sign in required' }); return true; }
    try { json(response, 200, { guilds: await managedGuildsFor(session) }); }
    catch (error) {
      if (error instanceof GraphQLError) throw error;
      if (error instanceof DiscordResponseError && error.status === 429) {
        response.setHeader('retry-after', String(Math.ceil(error.retryAfterMs / 1000)));
        json(response, 429, { error: error.message });
      } else json(response, 502, { error: 'Could not load servers from Discord' });
    }
    return true;
  }

  return {
    configureDatabase: store.configure,
    async handleHttp(request: IncomingMessage, response: ServerResponse) {
      try { return await handleHttpRequest(request, response); }
      catch (error) {
        if (error instanceof GraphQLError && ['SERVICE_UNAVAILABLE', 'UNAUTHENTICATED'].includes(String(error.extensions.code))) {
          json(response, error.extensions.code === 'UNAUTHENTICATED' ? 401 : 503, { error: error.message, code: error.extensions.code });
          return true;
        }
        throw error;
      }
    },
    schemaFields: fields,
    resolvers,
    /** Check server access against the permission snapshot for this session. */
    async requireManagedGuild(context: AuthContext, guildId: string) {
      const session = await sessionFor(context.request);
      if (!session) throw signInRequired();
      return requireManagedGuild(await listManagedGuilds(session), guildId);
    },
    async authorizeGuildWrite(context: AuthContext, guildId: string) {
      const session = await sessionFor(context.request);
      if (!session) throw signInRequired();
      if (!context.request || !ensureCsrf(session, context.request)) throw new Error('CSRF validation failed');
      return requireManagedGuild(await listManagedGuilds(session), guildId);
    },
    async authenticatedUserId(context: AuthContext) { return (await sessionFor(context.request))?.id; },
    async authenticatedUser(context: AuthContext) {
      const session = await sessionFor(context.request);
      return session ? { id: session.id, username: session.username } : undefined;
    },
    close: async () => { await store.close(); snapshotLoads.clear(); installations = undefined; installationsPending = undefined; discord.close(); },
  };
}
