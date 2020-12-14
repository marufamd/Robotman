const Command = require("../../../classes/Command");
const { fetch } = require("../../../../util");

module.exports = class extends Command {
    constructor(client) {
        super(client, {
            name: "import",
            description: "Imports shortcuts/tags",
            group: "owner",
            aliases: ["imp"],
            usage: "<shortcuts|tags> <attachment or url> <guild id>",
            args: {
                flags: {
                    shortcuts: { matches: ["shortcuts", "shortcut", "sh", "s"] },
                    tags: { matches: ["tags", "tag", "t"] },
                    all: { matches: ["a", "all"] }
                }
            },
            disableEdits: true,
            typing: true
        });
    }

    async run(message, { args, flags }) {
        let [url, guild] = args;
        if (!url) {
            if (message.attachments.size) url = message.attachments.first().url;
            else return message.usage(this.usage);
        } else if (url && message.attachments.size) {
            guild = url;
            url = message.attachments.first().url;
        }

        const data = await fetch(url, null);
        if (!data.ok) return message.respond("Invalid file.");

        let guildToImport = message.guild.id;
        let response;
        let num = 0;

        if (flags.shortcuts) {
            await this.handler.shortcuts.db.sync({ force: true });
            for (const shortcut of data) {
                delete shortcut.id;
                await this.handler.shortcuts.db.create(shortcut);
                num++;
            }
            response = `shortcuts`;
        } else if (flags.tags) {
            if (guild && this.client.guilds.cache.has(guild)) guildToImport = guild;

            if (flags.all) await this.handler.tags.db.sync({ force: true });
            else await this.handler.tags.db.destroy({ where: { guild: guildToImport } });

            for (const tag of data) {
                delete tag.id;
                await this.handler.tags.db.create(tag);
                num++;
            }
            response = `tags${!flags.all ? ` for **${this.client.guilds.cache.get(guildToImport).name}**` : ""}`;
        } else {
            return message.usage(this.usage);
        }

        return message.respond(`Imported ${num} ${response}.`);
    }
};