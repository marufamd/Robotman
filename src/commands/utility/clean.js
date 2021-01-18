const { Command, Argument } = require('discord-akairo');

module.exports = class extends Command {
    constructor() {
        super('clean', {
            aliases: ['clean'],
            description: {
                info: 'Cleans bot messages within specified amount.',
                usage: '<amount>',
                examples: ['30'],
            },
            ownerOnly: true,
            args: [
                {
                    id: 'amount',
                    type: Argument.range('number', 1, 100),
                    prompt: {
                        start: 'How many messages would you like to clean?'
                    },
                    unordered: true
                },
                {
                    id: 'channel',
                    type: 'clientChannel',
                    unordered: true,
                    default: message => message.channel
                }
            ],
        });
    }

    async exec(message, { amount, channel }) {
        try {
            const msgs = (await channel.messages.fetch({ limit: amount + 1 })).filter(m => m.author.id === this.client.user.id);
            if (!msgs.size) return message.util.send('No messages to clear.').then(m => m.delete({ timeout: 2000 }));
            
            const deleted = await channel.bulkDelete(msgs);
            await message.delete();
            this.client.log(`Deleted ${deleted.size} bot messages in ${channel.toString()}`);
        } catch (e) {
            this.client.log(`Error deleting messages in ${channel.toString()}\n${e.stack}`, 'error', { ping: true });
        }
    }
};