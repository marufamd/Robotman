const { title, Embed, plural } = require("../../util");

module.exports = class Command {
    constructor(client, data = {}) {
        if (typeof data !== "object" || !data || !data.name || !data.group) throw new TypeError("Missing essential this information.");

        Object.defineProperties(this, {
            client: { value: client },
            handler: { value: client.handler },
            parser: { value: client.handler.parser }
        });

        this.name = data.name;
        this.description = data.description || null;
        this.group = data.group;

        this.aliases = data.aliases || [];
        this.regex = data.regex || null;
        this.exclusive = data.exclusive || false;

        this.usage = data.usage || null;
        this.examples = data.examples || [];
        this.info = data.info || [];

        this.args = data.args || false;
        this.cooldown = data.cooldown || 2;

        this.disableHelp = data.disableHelp || false;
        this.disableEdits = data.disableEdits || false;
        this.typing = data.typing || false;
    }

    makeHelp(prefix, embed) {
        let description = this.description;
        if (this.info.length) description += `\n\n${this.info.join("\n").replaceAll("{p}", prefix)}`;

        embed
            .setTitle(`${prefix}${this.name}${this.usage ? " " + this.usage : ""}`)
            .setDescription(description)
            .setFooter(`Group: ${title(this.group)}${this.cooldown > 2 ? ` | This command has a ${this.cooldown} second cooldown.` : ""}`);

        if (this.examples.length) embed.addField(plural("Example", this.examples.length), this.makeExamples(prefix));
        if (this.aliases.length) embed.addField("Aliases", this.aliases.join(", "));

        return embed;
    }

    makeUsage(message) {
        const embed = new Embed()
            .setTitle(`${message.parsedPrefix}${message.command} ${this.usage}`)
            .setDescription(this.description)
            .setFooter(`Do ${message.parsedPrefix}help ${message.command} for more information.`);
        if (this.examples.length) embed.addField(plural("Example", this.examples.length), this.makeExamples(message.parsedPrefix));
        return embed;
    }

    makeExamples(prefix) {
        return this.examples.map(example => {
            if (this.aliases.some(a => example.startsWith(a + " "))) return `${prefix}${example}`;
            return `${prefix}${this.name} ${example}`;
        }).join("\n");
    }
};