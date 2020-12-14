/* eslint-disable no-unused-vars */
const Command = require("../../../classes/Command");
const util = require("../../../../util");
const { inspect } = require("util");

module.exports = class extends Command {
    constructor(client) {
        super(client, {
            name: "eval",
            description: "Evaluates code",
            group: "owner",
            aliases: ["async", "evla"],
            usage: "<code>",
            args: {
                flags: {
                    inspect: { matches: ["ins", "inspect"], option: true }
                }
            },
            disableEdits: true
        });

        this.lastInput = null;
        this.lastResult = null;
    }

    async run(message, { args, flags }) {
        const { lastInput, lastResult, client } = this;

        let code = args
            .join(" ")
            .replace(/^\s*```(js|javascript)?/, "")
            .replace(/```\s*$/, "");

        if (/while\s*\(\s*true\s*\)\s*/gi.test(code)) return message.respond("No.");

        const input = code.length > 950 ? `Too Long to Display (${code.length} chars)` : util.beautify(code);

        const msg = await message.respond("Evaluating...");

        let str = `**Input**\n\`\`\`js\n${this.clean(input)}\`\`\``;

        const maxLength = 2000 - input.length;

        const start = process.hrtime();
        let executionTime;

        try {
            let evaled;
            const oldInput = code;
            code = code.replaceAll(/(\S*\.)?(client|config).token$/gi, "util.randomToken()");

            if (/(await|async)/g.test(code) || message.command === "async") evaled = eval(`(async () => {${code}})();`);
            else evaled = eval(code);

            executionTime = (process.hrtime(start)[1] / 1000000).toFixed(3);
            
            if (evaled instanceof Promise) evaled = await evaled;
            const type = (evaled === null || evaled === undefined) ? "" : evaled.constructor ? evaled.constructor.name && evaled.constructor.name.length ? evaled.constructor.name : Object.getPrototypeOf(evaled.constructor).name : "";

            const depth = flags.inspect && parseInt(flags.inspect) ? parseInt(flags.inspect) : 0;
            if (evaled instanceof Object && typeof evaled !== "function") evaled = inspect(evaled, { depth });

            if (evaled === null) evaled = "null";
            if (evaled === undefined) evaled = "undefined";

            if (typeof evaled === "string" && !evaled.length) evaled = "\u200b";

            evaled = util.redact(this.clean(evaled.toString()));

            this.lastInput = oldInput;
            this.lastResult = evaled;

            if (evaled.length > maxLength) evaled = `Too long to display (${evaled.length} chars). Output was uploaded to hastebin: ${await util.paste(evaled)}\n`;
            else evaled = `\`\`\`js\n${evaled}\`\`\``;

            str += `\n**Output${type ? ` <${type}>` : ""}**\n${evaled}`;
        } catch (e) {
            executionTime = (process.hrtime(start)[1] / 1000000).toFixed(3);

            e = util.redact(this.clean(e.toString()), this.client);
            if (e.length > maxLength) e = `Too long to display (${e.length} chars). Error was uploaded to hastebin: ${await util.paste(e, "js")}\n`;
            else e = `\`\`\`js\n${e}\`\`\``;

            str += `\n**Error**\n${e}`;
        }

        str += `\nExecuted in ${executionTime}ms`;

        return msg.edit(str);
    }

    clean(str) {
        return str.replace(/`/g, "`" + String.fromCharCode(8203));
    }
};