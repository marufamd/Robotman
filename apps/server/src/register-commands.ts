import { REST, Routes } from 'discord.js';
import { commandDefinitions } from './commands/registry.js';

const applicationId = process.env.DISCORD_CLIENT_ID ?? process.env.DISCORD_APPLICATION_ID;
const token = process.env.DISCORD_BOT_TOKEN;
if (!applicationId || !token) throw new Error('Set DISCORD_CLIENT_ID and DISCORD_BOT_TOKEN before registering commands');
const rest = new REST({ version: '10' }).setToken(token);
const guildId = process.env.DISCORD_TEST_GUILD_ID;
const definitions = commandDefinitions();
const body = guildId ? definitions.map(({ contexts, integration_types, ...command }) => command) : definitions;
await rest.put(guildId ? Routes.applicationGuildCommands(applicationId, guildId) : Routes.applicationCommands(applicationId), { body });
console.log(`Registered ${definitions.length} server-only commands${guildId ? ' in the test guild' : ' globally'}.`);
