const Command = require("../../../classes/Command");

module.exports = class extends Command {
    constructor(client) {
        super(client, {
            name: "tagalias",
            description: "Adds an alias for a tag",
            group: "tags",
            aliases: ["tag-alias", "talias"],
            usage: "<mode> <tag> <aliases>",
            args: {
                flags: {
                    add: { matches: ["a", "add", "create"] },
                    del: { matches: ["d", "r", "del", "delete", "remove"] }
                }
            },
            examples: [
                "-add test test1",
                "-delete test1"
            ],
            info: ["You can add more than one alias at once."],
            disableEdits: false
        });
    }

    async run(message, { flags, args }) {
        if (!message.author.owner && !message.member.permissions.has("MANAGE_GUILD")) return;

        const [name, ...aliases] = args;

        if (flags.add) {
            const found = await this.handler.tags.get(name, message.guild.id);

            if (!found) return message.respond(`The tag \`${name}\` does not exist.`);
            if (!aliases.length) return message.usage(this.usage);

            const existing = found.aliases;
            const newAliases = [];

            for (const alias of aliases) {
                if (existing.includes(alias) || await this.handler.exists(alias, message.guild.id)) continue;
                existing.push(alias);
                newAliases.push(alias);
            }

            if (!newAliases.length) return message.respond(`Unable to add alias${aliases.length > 1 ? "es. They all already exist" : ". It already exists"}.`);

            const updated = await message.guild.tagAliases(found.name, existing);
            if (updated) return message.respond(`Added ${newAliases.map(a => `\`${a}\``).join(", ")} alias${newAliases.length > 1 ? "es" : ""} for tag \`${found.name}\`.`);
        } else if (flags.del) {
            const tags = await message.guild.getTags();
            if (!tags?.length) return message.respond("There are no tags for this server.");

            const alias = name;
            const tag = tags.find(t => t.aliases.includes(alias));

            if (!tag) return message.respond("That alias does not exist.");
            const tagAliases = tag.aliases;
            tagAliases.splice(tag.aliases.indexOf(alias), 1);

            const removed = await message.guild.tagAliases(tag.name, tagAliases);
            if (removed) return message.respond(`Removed \`${alias}\` alias for tag \`${tag.name}\`.`);
        } else {
            return message.usage(this.usage);
        }
    }
};