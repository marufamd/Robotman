import { Command } from 'discord-akairo';
import type { CommandInteraction, Message } from 'discord.js';

export default class extends Command {
    public constructor() {
        super('ping', {
            aliases: ['ping'],
            description: 'Checks the bot\'s connection.'
        });
    }

    public interactionOptions = {
        name: 'ping',
        description: 'Checks the bot\'s connection.'
    };

    public async exec(message: Message) {
        const msg = await message.util.send('Getting Ping...');

        const embed = this.client.util
            .embed()
            .setTitle('🏓 Pong!')
            .addFields({
                name: 'Roundtrip',
                value: `⏱️ ${(msg.editedTimestamp || msg.createdTimestamp) - (message.editedTimestamp || message.createdTimestamp)}ms`,
                inline: true
            }, {
                name: 'Heartbeat',
                value: `<a:a_heartbeat:759165128448016492>  ${this.client.ws.ping}ms`,
                inline: true
            });

        return msg.edit({ content: null, embeds: [embed] });
    }

    public interact(interaction: CommandInteraction) {
        return interaction.reply({
            content: `🏓 **Pong!** Took ${Date.now() - interaction.createdTimestamp}ms`,
            ephemeral: true
        });
    }
}