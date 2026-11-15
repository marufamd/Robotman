import { createApplication } from './application.js';
import { createAuth } from './auth/index.js';
import { commandModules } from './commands/registry.js';

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}
const port = Number(process.env.SERVER_PORT ?? 3001);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid SERVER_PORT');
const application = createApplication({
  publicKey: required('DISCORD_PUBLIC_KEY'), databaseUrl: required('DATABASE_URL'),
  modules: commandModules,
  applicationId: process.env.DISCORD_CLIENT_ID ?? process.env.DISCORD_APPLICATION_ID,
  botToken: process.env.DISCORD_BOT_TOKEN,
  auth: createAuth({
    clientId: process.env.DISCORD_CLIENT_ID,
    clientSecret: process.env.DISCORD_CLIENT_SECRET,
    botToken: process.env.DISCORD_BOT_TOKEN,
    publicOrigin: process.env.DASHBOARD_ORIGIN,
    sessionSecret: process.env.SESSION_SECRET,
    secureCookies: process.env.NODE_ENV !== 'development',
  }),
});
await application.initialize();
application.server.on('error', error => { console.error(error.message); process.exitCode = 1; void application.close(); });
application.server.listen(port, '0.0.0.0', () => console.log(`Robotman HTTP server listening on ${port}`));
for (const signal of ['SIGTERM', 'SIGINT'] as const) process.once(signal, () => { void application.close(); });
