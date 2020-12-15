const { Structures } = require("discord.js");
const Paginator = require("../classes/Paginator");
const { botColors } = require("../../util/constants");

module.exports = Structures.extend("Message", Message => {
    return class RobotMessage extends Message {
        constructor(...args) {
            super(...args);

            this.command = null;
            this.prefix = null;
            this.parsedPrefix = null;
            this.botMessage = null;
        }

        async send(content, options) {
            const cmd = this.client.handler.findCommand(this.command);
            if (cmd && !cmd.disableEdits && this.botMessage && !this.botMessage.deleted) return this.botMessage.edit(content, options);

            this.botMessage = await this.channel.send(content, options);
            return this.botMessage;
        }

        delete(options) {
            if (this.botMessage) this.botMessage = null;
            return super.delete(options);
        }

        respond(content) {
            return this.send(content, { embed: null });
        }

        file(files) {
            if (!Array.isArray(files)) files = [files];
            return this.send(null, { files });
        }

        embed(embed) {
            let final = embed;
            
            if (Array.isArray(embed)) final = embed.join("\n");
            embed = typeof final === "string" ? { color: botColors.main, description: final } : final;

            return this.send(null, { embed });
        }

        editEmbed(embed) {
            return this.edit(null, { embed });
        }

        code(content, lang = true, split = false) {
            return this.send(content, { code: lang, split });
        }

        editCode(content, lang = true) {
            return this.edit(content, { code: lang });
        }

        direct(content, options) {
            return this.author.send(content, options);
        }

        error(err) {
            return this.respond(`An error occurred: \`${err.message}\``);
        }

        usage(command) {
            if (!this.command) throw new TypeError("Message does not contain any command");
            return this.embed(command.makeUsage(this));
        }

        progress(game) {
            return this.respond(`There is already ${game} game in progress.`);
        }

        paginate(embeds, time) {
            return new Paginator(embeds, time).send(this);
        }

        async awaitMessage(filter, time = 60000) {
            const msg = await this.channel.awaitMessages(filter, { max: 1, time, errors: ["time"] }).catch(() => null);
            return (msg ? msg.first() : msg);
        }
    };
});