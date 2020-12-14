const Command = require("../../../classes/Command");
const { beautify } = require("../../../../util");

module.exports = class extends Command {
    constructor(client) {
        super(client, {
            name: "beautify",
            description: "Beautifies code",
            group: "owner",
            disableEdits: true
        });
    }

    async run(message, args) {
        let code;
        const reg = /```(?:js|json|javascript)?\n?((?:\n|.)+?)\n?```/gi;

        if (!args.length) {
            const msgs = (await message.channel.messages.fetch({ limit: 100 })).map(m => m.content);

            for (const msg of msgs) {
                const groups = reg.exec(msg);
                if (groups && groups[1].length) {
                    code = groups[1];
                    break;
                }
            }
        } else {
            const msg = await message.channel.messages.fetch(args[0]).catch(() => null);
            if (!msg) return message.respond("Invalid message ID");
            const groups = reg.exec(msg.content);
            if (groups && groups[1].length) code = groups[1];
        }

        if (!code) return message.respond(`No code blocks found`);
        return message.code(beautify(code), "js");
    }
};