const Command = require("../../../classes/Command");
const util = require("../../../../util"); // eslint-disable-line no-unused-vars 

module.exports = class extends Command {
    constructor(client) {
        super(client, {
            name: "silenteval",
            description: "Silently evaluates code",
            group: "owner",
            aliases: ["seval", "silent-eval", "silentasync"],
            args: true,
            disableEdits: true,
        });
    }

    async run(message, args) {
        try {
            let content = args.join(" ");
            if (content.match(/(await|async)/g)) content = `(async () => {${content}})();`;
            eval(content);
        } catch (e) {
            message.error(e);
            this.client.log(`Silent Eval Error\n${e.stack}`, "error");
        }
    }
};