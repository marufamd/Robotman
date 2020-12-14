const Command = require("../../../classes/Command");
const { oneLine } = require("common-tags");

module.exports = class extends Command {
    constructor(client) {
        super(client, {
            name: "export",
            description: "Exports shortcuts/tags",
            group: "owner",
            aliases: ["exp"],
            usage: "(-shortcuts | -tags) <guild id>",
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
        const [guild] = args;

        let items;
        let guildToExport = message.guild.id;

        if (flags.shortcuts) {
            items = await this.handler.shortcuts.db.findAll();
        } else if (flags.tags) {
            if (guild && this.client.guilds.cache.has(guild)) guildToExport = guild;
            items = flags.all ? await this.handler.tags.db.findAll() : await this.handler.tags.db.findAll({ where: { guild: guildToExport } });
        } else {
            return message.usage(this.usage);
        }

        const mode = flags.shortcuts ? "shortcuts" : "tags";
        if (!items || !items.length) return message.respond(`There are no ${mode} to export.`);

        return message.send(oneLine`Exported ${mode}
        ${flags.tags && !flags.all ? ` from **${this.client.guilds.cache.get(guildToExport).name}**` : ""}`, {
            files: [{ attachment: Buffer.from(JSON.stringify(items.map(i => i.get()), null, 4)), name: `${mode}.json` }]
        });
    }
};