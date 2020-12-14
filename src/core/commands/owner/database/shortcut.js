const Command = require("../../../classes/Command");
const { beautify } = require("../../../../util");

module.exports = class extends Command {
    constructor(client) {
        super(client, {
            name: "shortcut",
            description: "Manages shortcuts",
            group: "owner",
            aliases: ["sh", "short"],
            usage: "-dev -mode <name> <command> <parameters>",
            info: [
                "Available modes:",
                ["add", "del", "edit", "source", "hide", "unhide", "list"].map(i => `\`${i}\``)
            ].flat(),
            args: {
                flags: {
                    dev: { matches: ["dev", "d"] },
                    add: { matches: ["add", "a"] },
                    remove: { matches: ["delete", "remove", "del", "r"] },
                    edit: { matches: ["edit", "e"] },
                    source: { matches: ["source", "s"] },
                    hide: { matches: ["hide", "h"] },
                    unhide: { matches: ["unhide", "uh"] },
                    list: { matches: ["list", "l"] }
                }
            },
            disableEdits: true
        });
    }

    async run(message, { args, flags }) {
        const shortcuts = this.handler.shortcuts;

        let [name, command, ...params] = args; // eslint-disable-line prefer-const
        const devOnly = flags.dev && message.author.owner;

        const { exists, invalidCommand, dnExist } = {
            exists: `The \`${name}\` shortcut/command/tag already exists.`,
            invalidCommand: "The command you are trying to make a shortcut for does not exist.",
            dnExist: `The \`${name}\` shortcut does not exist.`
        };

        let finalResponse;
        if (name) name = name.toLowerCase();

        if (flags.add) {
            if (!name || !command || !params) return message.usage(this.usage);

            if (await this.handler.exists(name, message.guild.id)) return message.respond(exists);
            if (!this.handler.findCommand(command)) return message.respond(invalidCommand);

            finalResponse = await shortcuts.add(name, command, params, devOnly);
        } else if (flags.remove) {
            if (!name) return message.usage(this.usage);
            finalResponse = await shortcuts.delete(name);
        } else if (flags.edit) {
            if (!name || !command || !params) return message.usage(this.usage);
            if (!this.handler.findCommand(command)) return message.respond(invalidCommand);

            const edited = await shortcuts.edit(name, { command, params: params ? params.join(" ").replace(/^\s*```(js|javascript)?/, "").replace(/```\s*$/, "") : "", dev: devOnly });
            if (edited) finalResponse = `Edited \`${edited}\` shortcut!`;
        } else if (flags.source) {
            const fetched = await shortcuts.get(name);
            if (fetched) {
                const command = fetched.command;
                const params = fetched.params;

                let str = `**${name}** is a shortcut for the command \`${command}\``;
                if (params.length) str += ` with the parameters:\n\`\`\`js\n${/eval/g.test(command) ? beautify(params) : params}\`\`\``;

                finalResponse = str;
            }
        } else if (flags.hide) {
            if (!name) return message.usage(this.usage);
            const hidden = await shortcuts.edit(name, { hidden: true });
            if (hidden) finalResponse = `Hid \`${hidden}\` shortcut.`;
        } else if (flags.unhide) {
            if (!name) return message.usage(this.usage);
            const unhidden = await shortcuts.edit(name, { hidden: false });
            if (unhidden) finalResponse = `Unhid \`${unhidden}\` shortcut.`;
        } else if (flags.list) {
            const list = await shortcuts.list(devOnly);
            if (list && list.length) finalResponse = `Available shortcuts (${list.length})\n\`\`\`${list.map(s => s.name).join(", ")}\`\`\``;
            else finalResponse = "There are no shortcuts.";
        } else {
            return message.usage(this.usage);
        }

        if (!finalResponse) finalResponse = dnExist;
        return message.respond(finalResponse);
    }
};