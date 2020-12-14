const Command = require("../../../classes/Command");
const { basename, extname } = require("path");

module.exports = class extends Command {
    constructor(client) {
        super(client, {
            name: "reload",
            description: "Reloads a file",
            group: "owner",
            aliases: ["r", "relaod", "realod"],
            usage: "(-module | -event | -group | -all) <thing to reload>",
            args: {
                flags: {
                    module: { matches: ["module", "m", "file", "f"] },
                    event: { matches: ["event", "listener", "e", "l"] },
                    group: { matches: ["grp", "group", "g"] },
                    all: { matches: ["a", "all"] }
                }
            },
            disableEdits: true
        });
    }

    run(message, { flags, args }) {
        const toReload = args[0];
        let response;

        const invalidPath = `An error occurred. Most likely an invalid file path.`;

        if (flags.all) {
            try {
                this.handler.loadCommands(true);
                response = "Reloaded all commands.";
            } catch (e) {
                response = "An error occurred.";
                this.client.log(`Command: ${this.name}\n${e.stack}`, "error");
            }
        } else if (flags.module) {
            try {
                delete require.cache[require.resolve(toReload)];
                response = `Reloaded \`${basename(toReload, extname(toReload))}\` file.`;
            } catch (e) {
                response = invalidPath;
                this.client.log(`Command: ${this.name}\n${e.stack}`, "error");
            }
        } else if (flags.event) {
            const reloaded = this.handler.reloadListener(toReload);
            if (!reloaded) response = "Invalid listener.";
            else response = `Reloaded \`${reloaded}\` listener.`;

            if (toReload === "message") this.handler.reloadListener("messageUpdate");
            else if (toReload === "messageUpdate") this.handler.reloadListener("message");
        } else if (flags.group) {
            const group = this.handler.findGroup(toReload);
            if (!group) return message.respond("That group does not exist.");
            
            for (const cmd of group.values()) this.handler.reloadCommand(cmd);
            response = `Reloaded \`${toReload}\` group.`;
        } else {
            const cmd = this.handler.findCommand(toReload);
            if (!cmd) return message.respond("That command does not exist.");

            try {
                this.handler.reloadCommand(cmd);
                response = `Reloaded \`${cmd.name}\` command.`;
            } catch (e) {
                this.client.log(`Command: ${this.name}\n${e.stack}`, "error");
                response = invalidPath;
            }
        }

        return message.respond(response);
    }
};