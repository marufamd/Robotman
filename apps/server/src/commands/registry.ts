import { utilityModule } from './utility/index.js';
import { gamesModule } from './games/index.js';
import { lookupModule } from './lookups/index.js';
import { moderatorModule } from './moderator/index.js';
import { requestModule } from './requests/index.js';
import type { CommandModule } from './types.js';

export const commandModules: CommandModule[] = [utilityModule, gamesModule, lookupModule, moderatorModule, requestModule];

export function commandDefinitions() {
  return commandModules.flatMap(module => module.commands).map(command => ({ ...command, contexts: [0], integration_types: [0] }));
}
