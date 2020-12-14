const Command = require("../../../classes/Command");

module.exports = class extends Command {
    constructor(client) {
        super(client, {
            name: "clean",
            description: "Cleans bot messages",
            group: "owner",
            aliases: ["clear", "clearbot"],
            usage: "<amount> -channel=<channel id>",
            args: {
                flags: {
                    channel: { matches: ["channel", "c"], option: true }
                }
            },
            disableEdits: true
        });
    }

    async run(message, { args, flags }) {
        if (isNaN(parseInt(args[0]))) return message.usage(this.usage);
        const channel = this.client.channels.cache.has(flags.channel) ? this.client.channels.cache.get(flags.channel) : message.channel;

        try {
            const msgs = (await channel.messages.fetch({ limit: parseInt(args[0]) + 1 })).filter(m => m.author.id === this.client.user.id);
            if (!msgs.size) return message.respond("No messages to clear.").then(m => m.delete({ timeout: 2000 }));
            
            const deleted = await channel.bulkDelete(msgs);
            this.client.log(`Deleted ${deleted.size} bot messages in ${channel.toString()}`);
        } catch (e) {
            this.client.log(`Error deleting messages in ${channel.toString()}\n${e.stack}`, "error");
        }
    }
};