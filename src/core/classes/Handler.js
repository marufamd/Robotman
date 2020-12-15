const { readdir } = require("fs/promises");
const { join, resolve, extname } = require("path");
const { Collection } = require("discord.js");
const { oneLine } = require("common-tags");

const Parser = require("./Parser");
const { escapeRegex } = require("../../util");
const { shortcuts, tags } = require(`../../database`);
const ShortcutManager = require(`../../database/managers/ShortcutManager`);
const TagManager = require(`../../database/managers/TagManager`);

const format = arr => Array.isArray(arr) ? arr : [arr];
const check = (ex, id) => {
    ex = format(ex);
    return ex.includes(id);
};

module.exports = class Handler {
    constructor(client) {
        Object.defineProperty(this, "client", { value: client });

        this.parser = new Parser(this);
        this.commands = new Collection();
        this.groups = new Set();
        this.cooldowns = new Map();
        this.events = new Map();

        this.shortcuts = new ShortcutManager(this, shortcuts);
        this.tags = new TagManager(this, tags);
    }

    static async read(path) {
        const items = await readdir(path, { withFileTypes: true });
        const files = await Promise.all(items.map(item => {
            const filepath = resolve(path, item.name);
            return item.isDirectory() ? Handler.read(filepath) : filepath;
        }));
        return files.flat(5);
    }

    /* Commands */

    async loadCommands(reload = false) {
        if (reload && this.commands.size) this.commands.clear();

        const files = await this.constructor.read(join(__dirname, "..", "commands"));

        for (const file of files) {
            if (extname(file) !== ".js") continue;
            if (reload) delete require.cache[require.resolve(file)];
            const Command = require(file);
            this.loadCommand(Command, file);
        }

        this.client.log(`${reload ? "Rel" : "L"}oaded Commands: \`\`\`css\n${this.commands.map(p => p.name).join(", ")}\`\`\``);
    }

    loadCommand(Command, path) {
        const command = new Command(this.client);

        if (path) Object.defineProperty(command, "path", { value: path });
        this.commands.set(command.name, command);
        if (!this.groups.has(command.group)) this.groups.add(command.group);

        return command;
    }

    reloadCommand(cmd) {
        if (!this.commands.has(cmd.name)) throw new Error("Command does not exist in cache");

        delete require.cache[require.resolve(cmd.path)];
        const Command = require(cmd.path);

        return this.loadCommand(Command);
    }

    findCommand(command) {
        const found = this.commands.get(command) || this.commands.find(c => c.aliases.length && c.aliases.includes(command));
        return found || null;
    }

    findGroup(group, filter = false) {
        const found = this.commands.filter(c => {
            if (filter) return !c.disableHelp && c.group === group;
            return c.group === group;
        });

        return found.size ? found : null;
    }

    async parseCommand(message, args) {
        let parsed = null;

        /* Commnads */
        const cmd = this.findCommand(message.command);

        if (cmd) {
            if (cmd.group === "dev" && !message.author.owner) return { parsed };

            const disabled = await message.guild.settings.get("disabledCommands");
            if (disabled && disabled.includes(cmd.name)) return { parsed };

            parsed = "command";
            return { parsed, command: cmd, params: args };
        }

        const findItem = item => item.name === message.command || item.aliases.length && item.aliases.includes(message.command);

        /* Shortcuts */
        const shortcuts = await this.shortcuts.db.findAll();
        const shortcut = shortcuts.find(findItem);
        if (shortcut) {
            if (shortcut.dev && !message.author.owner) return { parsed };
            const command = shortcut.get("command");

            const cmd = this.findCommand(command);
            if (!cmd) return { parsed };

            let params = shortcut.get("params");

            params = params
                .replaceAll(/{content}/g, args.join(" "))
                .replaceAll(/{escapedContent}/g, args.join(" ").replaceAll(/('|")/g, a => `\\${a}`))
                .replaceAll(/{([0-9])}/g, (_, p1) => args[p1])
                .split(" ");

            parsed = "shortcut";
            return { parsed, command: cmd, params };
        }

        /* Tags */
        const tags = await message.guild.getTags();
        const tag = tags.find(findItem);
        if (tag) {
            parsed = "tag";
            return { parsed, command: tag };
        }

        return { parsed };
    }

    async handleCommand(message, editEvent = false) {
        if (message.channel.type === "dm" || message.author.bot || !message.guild.me.permissionsIn(message.channel.id).has("SEND_MESSAGES")) return;
        let args;

        const prefix = await this.getPrefix(message);
        const regex = this.getRegex(prefix);

        if (!regex.test(message.content)) {
            if (!this.client.development) {
                const regexCmd = this.commands.find(c => c.regex && c.regex.test(message.content));
                if (regexCmd) {
                    message.command = message.content.match(regexCmd.regex)[0];
                    args = message.content.slice(message.command.length).trim().split(/ +/);
                    await this.runCommand(message, regexCmd, args, editEvent);
                }
            }
            return;
        }

        message.prefix = message.content.match(regex)[1];
        message.parsedPrefix = this.parsePrefix(message.prefix);

        args = message.content.slice(message.prefix.length).trim().split(/ +/);
        message.command = args.shift().toLowerCase();

        const { parsed, command, params } = await this.parseCommand(message, args);
        if (!parsed) return;

        switch (parsed) {
            case "tag":
                command.increment("uses").catch(e => this.client.log(e.stack, "error"));
                const files = command.attachments.length ? command.attachments : null;

                message.send(command.contents, { files }).catch(e => {
                    message.channel.send(`An error occurred: \`${e.message}\``);
                    this.client.log(`Tag: ${command.name}\n${e.stack}`, "error", { ping: true });
                });
                break;
            case "shortcut":
            case "command":
                await this.runCommand(message, command, params, editEvent);
                break;
        }
    }

    async runCommand(message, command, params, editEvent) {
        if (editEvent && command.disableEdits) return;

        if (command.exclusive) {
            const ex = command.exclusive;
            if (ex.roles) {
                ex.roles = format(ex.roles);
                if (!message.member.roles.cache.some(r => ex.roles.includes(r.id))) return;
            }
            if (ex.guilds && !check(ex.guilds, message.guild.id) && !message.guild.development) return;
            if (ex.channels && !check(ex.channels, message.channel.id) && !message.guild.development) return;
        }

        if (command.args) {
            const { args } = command;
            if (!params.length && !args.hasOwnProperty("min")) return message.usage(command);

            if (typeof args === "object") {
                if (args.hasOwnProperty("min") && (args.min > params.length)) return message.usage(command);
                if (args.quotes) params = this.parser.parseQuotes(params);
                if (args.flags && typeof args.flags === "object") params = this.parser.parseFlags(params, args.flags);
            }
        }

        if (!this.cooldowns.has(command.name)) this.cooldowns.set(command.name, new Map());
        if (await this.handleCooldowns(message, command)) return;

        if (command.typing) message.channel.startTyping();

        try {
            await command.run(message, params);
        } catch (e) {
            message.channel.send(`An error occurred.`);
            this.client.log(`Command: ${command.name}\n${e.stack}`, "error", { ping: true });
        } finally {
            if (command.typing) message.channel.stopTyping(true);
            this.client.util.stat("commandsUsed");
        }
    }

    async handleCooldowns(message, command) {
        if (message.author.owner) return;

        const now = Date.now();
        const cooldowns = this.cooldowns.get(command.name);
        const limit = command.cooldown * 1000;

        if (cooldowns.has(message.author.id)) {
            const expiration = cooldowns.get(message.author.id) + limit;

            if (now < expiration) {
                const remaining = (expiration - now) / 1000;
                const seconds = remaining < 1 ? remaining.toFixed(1) : remaining.toFixed();

                const m = await message.respond(oneLine`
                        **${message.author.username}**, please wait **${seconds}** second${seconds == 1 ? "" : "s"} 
                        before using \`${message.parsedPrefix + message.command}\` again. This message will delete when the cooldown ends.`);

                m.delete({ timeout: remaining * 1000 });
                return true;
            }
        }

        cooldowns.set(message.author.id, now);
        setTimeout(() => cooldowns.delete(message.author.id), limit);

        return false;
    }

    async exists(name, guild) {
        const tags = await this.tags.db.findAll({ where: { guild } });
        const shortcuts = await this.shortcuts.db.findAll();
        const findItem = item => item.name === name || item.aliases.length && item.aliases.includes(name);
        return Boolean(this.findCommand(name) || shortcuts.find(findItem) || tags.find(findItem));
    }

    /* Prefixes */

    async getPrefix(message) {
        const guildPrefix = await message.guild.settings.get("prefix");
        return guildPrefix ? guildPrefix : process.env.CLIENT_PREFIX;
    }

    parsePrefix(prefix) {
        return prefix === `<@!${this.client.user.id}>` ? `@${this.client.user.tag} ` : prefix;
    }

    getRegex(prefix) {
        prefix = Array.isArray(prefix) ? prefix.map(p => escapeRegex(p)).join("|") : escapeRegex(prefix);
        return new RegExp(String.raw`^(<@!?${this.client.user.id}>|${prefix})\s*`, "i");
    }

    /* Listeners */

    async loadListeners() {
        const files = await this.constructor.read(join(__dirname, "..", "listeners"));

        for (const file of files) {
            const Listener = require(file);
            const event = new Listener(this.client);

            this.client[event.handles === "ready" ? "once" : "on"](event.handles, event.handle.bind(event));
            this.events.set(event.handles, file);
        }

        this.client.log(`Loaded Listeners: \`\`\`css\n${Object.keys(this.client._events).join(", ")}\`\`\``);
    }

    reloadListener(listener) {
        if (!Object.keys(this.client._events).includes(listener)) return null;

        this.client.off(listener, this.client.listeners(listener)[0]);
        const eventPath = this.events.get(listener);

        delete require.cache[require.resolve(eventPath)];
        const Listener = require(eventPath);

        const event = new Listener(this.client);
        this.client.on(event.handles, event.handle.bind(event));

        return event.handles;
    }
};