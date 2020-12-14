const Command = require("../../../classes/Command");

module.exports = class extends Command {
    constructor(client) {
        super(client, {
            name: "prefix",
            description: "Sets the prefix for the server.",
            group: "moderation",
            aliases: ["newprefix", "setprefix", "changeprefix"],
            usage: "<new prefix>",
            examples: ["&", "reset"],
            info: [
                "Requires you to have the Manage Server permission.",
                "To reset the prefix, type `reset` after the command."
            ],
            disableEdits: true
        });
    }

    async run(message, args) {
        if (!args.length) return message.respond(`The current prefix for **${message.guild.name}** is \`${message.parsedPrefix}\``);
        if (!message.author.owner && !message.member.permissions.has("MANAGE_GUILD")) return;

        const prefix = await message.guild.settings.get("prefix");

        let response;
        const already = pref => `The prefix for **${message.guild.name}** is already **${pref}**`;

        if ([process.env.CLIENT_PREFIX, "reset"].includes(args[0].toLowerCase())) {
            if (!prefix) return message.respond(already(process.env.CLIENT_PREFIX));
            await message.guild.settings.edit({ prefix: null });
            response = `Reset prefix for **${message.guild.name}** to **${process.env.CLIENT_PREFIX}**`;
        } else {
            const newPrefix = args[0];

            if (prefix) {
                if (prefix === newPrefix) return message.respond(already(newPrefix));
                await message.guild.settings.edit({ prefix: newPrefix });
            } else {
                await message.guild.settings.set({ prefix: newPrefix });
            }

            response = `Changed prefix for **${message.guild.name}** to **${newPrefix}**`;
        }

        return message.respond(response);
    }
};