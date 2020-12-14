const Command = require("../../classes/Command");
const { Embed, paste, trim } = require("../../../util");
const { evaluate } = require("mathjs");

module.exports = class extends Command {
    constructor(client) {
        super(client, {
            name: "math",
            description: "Solves mathematical problems",
            group: "utility",
            aliases: ["calculate", "solve", "convert"],
            usage: "<expression>",
            examples: [
                "1 + 2",
                "12 / (2.3 + 0.7)",
                "sin(45 deg) ^ 2",
                "12.7 cm to inch",
                "10 weeks to days"
            ],
            args: true,
        });
    }

    async run(message, args) {
        const expression = args.join(" ")
            .replaceAll(/(x|times)/gi, "*")
            .replaceAll(/(÷|divided(\sby)?)/gi, "/")
            .replaceAll(/plus/gi, "+")
            .replaceAll(/minus/gi, "-")
            .replaceAll(/to the power of/gi, "^")
            .replaceAll(/π/g, "pi");
        try {
            const answer = evaluate(expression);
            const embed = new Embed()
                .addField("Input", `\`\`\`${trim(args.join(" "), 1015)}\`\`\``)
                .addField("Result", answer.length > 1015 ? await paste(answer, "") : `\`\`\`${answer}\`\`\``);
            return message.embed(embed);
        } catch {
            return message.respond(`\`${expression}\` is not a valid expression.`);
        }
    }
};