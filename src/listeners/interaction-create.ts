import type { Listener } from '#util/commands';
import { Commands, handleListenerError, handleSlashCommand } from '#util/commands';
import type { CommandInteraction, TextChannel } from 'discord.js';
import { Client, Constants, Permissions } from 'discord.js';
import { inject, injectable } from 'tsyringe';

@injectable()
export default class implements Listener {
	public constructor(private readonly client: Client, @inject('commands') private readonly commands: Commands) {}

	public event = Constants.Events.INTERACTION_CREATE;

	public async handle(interaction: CommandInteraction) {
		if (!interaction.isCommand()) return;

		try {
			if (interaction.channel.type === 'DM') {
				return interaction.reply({
					content: 'Slash commands are not available in Direct Messages.',
					ephemeral: true
				});
			}

			if (!(interaction.channel as TextChannel).permissionsFor(this.client.user.id).has(Permissions.FLAGS.SEND_MESSAGES)) return;

			const command = this.commands.get(interaction.commandName);

			await handleSlashCommand(interaction, command);
		} catch (e) {
			handleListenerError(this, e);
		}
	}
}
