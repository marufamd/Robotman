const { Command } = require('discord-akairo');

module.exports = class extends Command {
    constructor() {
        super('ping', {
            aliases: ['ping'],
            description: 'Checks the bot\'s connection.'
        });
    }

    interactionOptions = {
        name: 'ping',
        description: 'Checks the bot\'s connection.',
    }

    async exec(message) {
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

    interact(interaction) {
        const embed = this.client.util.embed()
            .setTitle('🏓 Pong!')
            .addFields({
                name: 'Roundtrip',
                value: `⏱️ ${Date.now() - interaction.createdTimestamp}ms`,
                inline: true
            }, {
                name: 'Heartbeat',
                value: `💓 ${this.client.ws.ping}ms`,
                inline: true
            });

        return interaction.respond({
            type: 4,
            embed
        });
    }
};