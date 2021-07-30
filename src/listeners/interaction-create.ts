import { Listener, handleSlashCommand, Commands } from '#util/commands';
import { Client, CommandInteraction, Constants, Permissions, TextChannel } from 'discord.js';
import { inject, injectable } from 'tsyringe';

@injectable()
export default class implements Listener {
    public constructor(
        private readonly client: Client,
        @inject('commands') private readonly commands: Commands
    ) {}

    public event = Constants.Events.INTERACTION_CREATE;

    public async handle(interaction: CommandInteraction) {
        if (!(interaction.channel as TextChannel).permissionsFor(this.client.user.id).has(Permissions.FLAGS.SEND_MESSAGES)) return;

        const command = this.commands.get(interaction.commandName);

        await handleSlashCommand(interaction, command);
    }
}