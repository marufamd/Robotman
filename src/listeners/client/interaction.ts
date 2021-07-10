import { Listener } from 'discord-akairo';
import type { Interaction } from 'discord.js';

export default class extends Listener {
    public constructor() {
        super('interaction', {
            event: 'interactionCreate',
            emitter: 'client'
        });
    }

    public async exec(interaction: Interaction) {
        if (!interaction.isCommand()) return;

        const command = this.client.commandHandler.findCommand(interaction.commandName);

        if (!command?.interact) return;
        if (this.client.commandHandler.runCooldowns(interaction, command)) return;

        try {
            const args = Object.fromEntries(interaction.options.mapValues(o => o.value));
            await command.interact(interaction, args);
        } catch (e) {
            this.client.commandHandler.emit('error', e, interaction, command);
        } finally {
            void this.client.config.stat('commands_run');
        }
    }
}