const Command = require("../../../classes/Command");

module.exports = class extends Command {
    constructor(client) {
        super(client, {
            name: "enable",
            group: "moderation",
            aliases: ["enablecmd"],
            usage: "<command>",
            disableEdits: true
        });
    }

    async run(message, args) {
        if (!message.author.owner && !message.member.permissions.has("MANAGE_GUILD")) return;
        if (!args.length) return message.usage(this.usage);

        let command = this.handler.findCommand(args[0]);

        if (!command) return message.respond("That command does not exist");
        if (command.group === "dev" || ["disable", "enable"].includes(command.name)) return;

        command = command.name;
        let resp;

        const disabled = await message.guild.settings.get("disabledCommands"); 

        if (disabled && disabled.length) {
            if (!disabled.includes(command)) return message.respond("That command is not disabled.");
            disabled.splice(disabled.indexOf(command), 1);

            await message.guild.settings.edit({ disabledCommands: disabled });
            resp = `Enabled **${command}** for **${message.guild.name}**`;
        } else {
            resp = "There are no disabled commands for this server.";
        }

        return message.respond(resp);
    }
};