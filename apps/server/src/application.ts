import { createPublicKey, verify } from 'node:crypto';
import { createServer } from 'node:http';
import { InteractionType, InteractionResponseType } from 'discord.js';
import { buildSchema, graphql } from 'graphql';
import { drizzle } from 'drizzle-orm/postgres-js';
import { sql } from 'drizzle-orm';
import postgres from 'postgres';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { APIInteractionResponse } from 'discord.js';
import type { CommandContext, CommandInteraction, CommandModule } from './commands/types.js';
import { createGuildContent } from './guild-content/index.js';
import { createModeratorSettings } from './moderator-settings/index.js';
import { discordPayload } from './discord-payload.js';
import { discordFailure } from './discord-errors.js';

export interface AuthExtension {
  handleHttp(request: IncomingMessage, response: ServerResponse): Promise<boolean>;
  schemaFields: string;
  resolvers: Record<string, unknown>;
  requireManagedGuild(context: { request?: IncomingMessage; response?: ServerResponse }, guildId: string): Promise<unknown>;
  authorizeGuildWrite(context: { request?: IncomingMessage; response?: ServerResponse }, guildId: string): Promise<unknown>;
  configureDatabase?(databaseUrl: string): void;
  authenticatedUserId(context: { request?: IncomingMessage; response?: ServerResponse }): Promise<string | undefined>;
  authenticatedUser(context: { request?: IncomingMessage; response?: ServerResponse }): Promise<{ id: string; username: string } | undefined>;
  close?(): Promise<void>;
}

export interface ApplicationConfig {
  publicKey: string;
  databaseUrl: string;
  modules?: CommandModule[];
  fetch?: typeof globalThis.fetch;
  applicationId?: string;
  botToken?: string;
  auth?: AuthExtension;
  now?: () => Date;
}

export function createApplication(config: ApplicationConfig) {
  if (!/^[a-f\d]{64}$/i.test(config.publicKey)) throw new Error('DISCORD_PUBLIC_KEY must be 64 hexadecimal characters');
  const key = createPublicKey({
    key: Buffer.concat([Buffer.from('302a300506032b6570032100', 'hex'), Buffer.from(config.publicKey, 'hex')]),
    type: 'spki', format: 'der',
  });
  config.auth?.configureDatabase?.(config.databaseUrl);
  const client = postgres(config.databaseUrl, { connect_timeout: 2 });
  const ormClient = postgres(config.databaseUrl, { connect_timeout: 2 });
  const database = drizzle(ormClient);
  const modules = config.modules ?? [];
  const context: CommandContext = { sql: client, fetch: config.fetch ?? globalThis.fetch, startedAt: Date.now(), applicationId: config.applicationId, botToken: config.botToken, now: config.now };
  const guildContent = createGuildContent(client, ormClient, config.auth);
  const moderatorSettings = createModeratorSettings(client, ormClient, config.auth);
  const schema = buildSchema(`type Query { ready: Boolean! } type Mutation { _foundation: Boolean } ${config.auth?.schemaFields ?? ''} ${guildContent.schemaFields} ${moderatorSettings.schemaFields}`);
  const server = createServer((request, response) => {
    const receivedAt = performance.now();
    void (async () => {
      if (request.url?.startsWith('/api/')) request.url = request.url.slice(4);
      if (config.auth && await config.auth.handleHttp(request, response)) return;
      if (request.method !== 'POST' || !['/interactions', '/graphql'].includes(request.url ?? '')) {
        response.writeHead(404).end();
        return;
      }
      const chunks: Buffer[] = [];
      let bytes = 0;
      for await (const chunk of request) {
        const buffer = Buffer.from(chunk);
        bytes += buffer.length;
        if (bytes <= 1024 * 1024) chunks.push(buffer);
      }
      if (bytes > 1024 * 1024) { response.writeHead(413).end(); return; }
      const body = Buffer.concat(chunks);
      if (request.url === '/graphql') {
        const input = JSON.parse(body.toString('utf8'));
        if (typeof input?.query !== 'string') { response.writeHead(400).end(); return; }
        const result = await graphql({
          schema, source: input.query, variableValues: input.variables, operationName: input.operationName,
          contextValue: { request, response },
          rootValue: {
            ...config.auth?.resolvers,
            ...guildContent.resolvers,
            ...moderatorSettings.resolvers,
            async ready() {
              try {
                await database.execute(sql`select 1`);
                return true;
              } catch {
                throw new Error('Database unavailable');
              }
            },
          },
        });
        response.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify(result));
        return;
      }
      const signature = request.headers['x-signature-ed25519'];
      const timestamp = request.headers['x-signature-timestamp'];
      if (typeof signature !== 'string' || !/^[a-f\d]{128}$/i.test(signature) || typeof timestamp !== 'string' ||
          !verify(null, Buffer.concat([Buffer.from(timestamp), body]), key, Buffer.from(signature, 'hex'))) {
        response.writeHead(401).end();
        return;
      }
      const interaction = JSON.parse(body.toString('utf8'));
      if (interaction?.type === InteractionType.Ping) {
        response.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify({ type: InteractionResponseType.Pong }));
        return;
      }
      const module = modules.find(candidate => candidate.matches(interaction as CommandInteraction));
      if (!module) {
        response.writeHead(400).end();
        return;
      }
      if (!interaction.guild_id) {
        response.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify({ type: 4, data: { content: 'Robotman commands are only available in servers.', flags: 64 } }));
        return;
      }
      const queued: Record<string, unknown>[] = [];
      const sendQueued = async () => {
        for (const data of queued) {
          const { body, headers } = discordPayload(data);
          const sent = await context.fetch(`https://discord.com/api/v10/webhooks/${interaction.application_id}/${interaction.token}`, {
            method: 'POST', headers, body, signal: AbortSignal.timeout(10000),
          });
          if (!sent.ok) throw new Error(await discordFailure(sent, [interaction.token, config.botToken]));
        }
      };
      const pending = module.handle(interaction as CommandInteraction, { ...context, queueFollowup: data => queued.push(data) }).catch((): APIInteractionResponse => ({ type: 4, data: { content: 'The command could not be completed. Please try again.', flags: 64 } }));
      let timer: ReturnType<typeof setTimeout> | undefined;
      const deferred = Symbol('deferred');
      const result = await Promise.race([pending, new Promise<typeof deferred>(resolve => { timer = setTimeout(() => resolve(deferred), 2000); })]);
      if (timer) clearTimeout(timer);
      if (result !== deferred) {
        if ('data' in result && result.data && 'files' in result.data) {
          response.once('finish', () => { void (async () => {
            const sent = await context.fetch(`https://discord.com/api/v10/webhooks/${interaction.application_id}/${interaction.token}/messages/@original`, { method: 'PATCH', ...discordPayload(result.data as Record<string, unknown>), signal: AbortSignal.timeout(10000) });
            if (!sent.ok) throw new Error(await discordFailure(sent, [interaction.token, config.botToken]));
            await sendQueued();
          })().catch(() => console.error('Discord attachment upload failed')); });
          response.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify({ type: 5 }));
          return;
        }
        response.once('finish', () => { void sendQueued().catch(error => console.error('Discord follow-up failed', {
          operation: 'send follow-up',
          error: error instanceof Error && error.message.startsWith('HTTP ') ? error.message : 'Network or upload failure',
        })); });
        response.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify(result));
        return;
      }
      const update = interaction.type === InteractionType.MessageComponent;
      const deferEphemeral = module.deferEphemeral?.(interaction) ?? false;
      const acknowledgementMs = Math.round(performance.now() - receivedAt);
      response.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify({ type: update ? 6 : 5, ...(deferEphemeral ? { data: { flags: 64 } } : {}) }));
      void pending.then(async result => {
        if (!('data' in result)) return;
        if (result.type === InteractionResponseType.Modal) {
          queued.push({ content: 'The form could not be opened in time. Please try the command again.', flags: 64 });
          await sendQueued();
          return;
        }
        const edit = { ...result.data } as Record<string, unknown>;
        const followup = await context.fetch(`https://discord.com/api/v10/webhooks/${interaction.application_id}/${interaction.token}/messages/@original`, {
          method: 'PATCH', ...discordPayload(edit),
          signal: AbortSignal.timeout(10000),
        });
        if (!followup.ok) console.error('Discord follow-up failed', {
          operation: 'edit deferred response',
          error: await discordFailure(followup, [interaction.token, config.botToken]),
          acknowledgementMs,
          completionMs: Math.round(performance.now() - receivedAt),
        });
        else await sendQueued();
      }).catch(error => console.error('Discord follow-up failed', {
        operation: 'complete deferred response',
        error: error instanceof Error && error.message.startsWith('HTTP ') ? error.message : 'Network or upload failure',
        acknowledgementMs,
        completionMs: Math.round(performance.now() - receivedAt),
      }));
    })().catch(() => { if (!response.destroyed) response.writeHead(400).end(); });
  });
  return {
    server,
    async initialize() { await guildContent.start(); for (const module of modules) await module.start?.(context); },
    async close() {
      if (server.listening) await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
      for (const module of modules) await module.close?.(context);
      await guildContent.close();
      await config.auth?.close?.();
      await client.end({ timeout: 2 });
      await ormClient.end({ timeout: 2 });
    },
  };
}
