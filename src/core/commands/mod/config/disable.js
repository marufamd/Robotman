const Command = require("../../../classes/Command");

module.exports = class extends Command {
    constructor(client) {
        super(client, {
            name: "disable",
            group: "moderation",
            aliases: ["disablecmd"],
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

        const disabled = await message.guild.settings.get("disabledCommands"); 

        if (disabled) {
            if (disabled.includes(command)) return message.channel.send("This command is already disabled for this server.");
            disabled.push(command);
            await message.guild.settings.edit({ disabledCommands: disabled });
        } else {
            await message.guild.settings.set({ disabledCommands: [disabled] });
        }

        return message.respond(`Disabled **${command}** for **${message.guild.name}**`);
    }
};