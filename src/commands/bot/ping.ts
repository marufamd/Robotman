import { Command } from 'discord-akairo';
import { Message } from 'discord.js';
import Interaction from '../../structures/Interaction';

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

        const embed = this.client.util.embed()
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

        return msg.edit(null, { embed });
    }

    public interact(interaction: Interaction) {
        return interaction.respond(`🏓 **Pong!** Took ${Date.now() - interaction.createdTimestamp}ms`, { type: 'message', ephemeral: true });
    }
}