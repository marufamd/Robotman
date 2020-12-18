const Command = require("../../../classes/Command");
const { Embed, title } = require("../../../../util");
const { groups: Groups } = require("../../../../util/constants");

module.exports = class extends Command {
    constructor(client) {
        super(client, {
            name: "help",
            group: "info",
            aliases: ["command", "commands", "hlep", "group", "cmd", "cmds"],
            disableHelp: true,
            args: {
                min: 0,
                flags: {
                    mod: { matches: ["mod", "m"] },
                    dev: { matches: ["dev", "d"] },
                }
            }
        });
    }

    async run(message, { args, flags }) {
        let embed = new Embed();
        const isMod = message.author.owner || message.member.permissions.has("MANAGE_GUILD");
        const mod = flags.mod && isMod;
        const dev = flags.dev && message.author.owner;

        const prefix = message.parsedPrefix;
        const disabled = await message.guild.settings.get("disabledCommands");

        if (!args.length || mod || dev) {
            embed
                .setTitle("Commands")
                .setDescription(`Do \`${prefix}${this.name} <command or group>\` for more info on a command or group.`)
                .setFooter(`Hover over a command for descriptions`);

            for (const group of this.handler.groups) {
                if ((Groups.dev.includes(group) && !dev) || (Groups.mod.includes(group) && !mod)) continue;

                const found = this.handler.findGroup(group, true);
                if (!found) continue;

                const groupCommands = found
                    .filter(c => {
                        if (!disabled) return true;
                        return !disabled.includes(c.name);   
                    })
                    .map(cmd => `[\`${cmd.name}\`](https://notarealwebsi.te/ "${cmd.description}")`)
                    .join(" ");
                embed.addField(title(group), groupCommands);
            }
        } else {
            const name = args[0].toLowerCase();
            const group = this.handler.findGroup(name, true);
            const command = this.handler.findCommand(name);

            if (group) {
                if ((Groups.dev.includes(group.first().group) && !message.author.owner) || (Groups.mod.includes(group.first().group) && !isMod)) return;
                embed.setTitle(`${title(group.first().group)} Commands`);
                for (const c of group.values()) embed.addField(`${prefix}${c.name}${c.usage ? ` ${c.usage}` : ""}`, c.description);
            } else {
                if (!command
                    || (command.group === "dev" && !message.author.owner)
                    || command.disableHelp
                    || (disabled?.includes(command.name))) return message.respond("Invalid command or group. Please try a different one.");
                embed = command.makeHelp(prefix, embed);
            }
        }

        return message.embed(embed);
    }
};



