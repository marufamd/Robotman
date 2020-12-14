const Command = require("../../../classes/Command");
const { fetch } = require("../../../../util");
const { writeFile } = require("fs/promises");
const { basename, extname } = require("path");

module.exports = class extends Command {
    constructor(client) {
        super(client, {
            name: "download",
            description: "Downloads a file",
            group: "owner",
            aliases: ["dl", "dwnld"],
            usage: "<url> <path> <options>",
            args: {
                flags: {
                    json: { matches: ["json"] },
                    array: { matches: ["arr", "array"] }
                },
                min: 2
            },
            disableEdits: true
        });
    }

    async run(message, { args, flags }) {
        const [url, path] = args;
        const toJSON = flags.json || flags.array;

        let res = await fetch(url, null, flags.json ? "json" : "text");
        if (res.ok === false) return message.respond(`Unable to download file: \`${res.statusText}\``);
        
        if (flags.array && typeof res === "string") res = res.split("\n");
        await writeFile(path.startsWith("./") ? path : `./${path}`, toJSON ? JSON.stringify(res, null, 4) : res);

        return message.respond(`Downloaded \`${basename(url, extname(url))}\` to \`${path}\``);
    }
};