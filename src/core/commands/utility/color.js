const Command = require("../../classes/Command");
const { Embed, split, title } = require("../../../util");
const { colors } = require("../../../util/constants");
const list = Object.keys(colors);

module.exports = class extends Command {
    constructor(client) {
        super(client, {
            name: "color",
            description: "Shows info about a color",
            group: "utility",
            aliases: ["colour", "hex", "rgb", "decimal", "colors"],
            usage: "<color>",
            examples: [
                "#e67E22",
                "0xE67E22",
                "dark orange",
                "3447003",
                "(230, 126, 34)",
                "230 126 34"
            ],
            info: [
                `Color can be a hex code, integer, RGB value, or a specific name of a color from a pre-defined list.`,
                `To see a list of pre-defined colors, do \`{p}colors index\``,
                `There are currently ${list.length} pre-defined colors`
            ],
            args: true,
            disableEdits: true
        });
    }

    run(message, args) {
        if (["list", "index"].includes(args[0])) {
            const embeds = [];
            const pages = split(list.map(p => title(p.replaceAll("_", " "))), 51);
            for (const page of pages) {
                let subpages = [page];
                if (page.length > 17) subpages = split(page, 17);
                const embed = new Embed("RANDOM")
                    .setTitle("List of Colors")
                    .setFooter(`Page ${pages.indexOf(page) + 1}/${pages.length}`);
                for (const subpage of subpages) embed.addField("\u200b", subpage.join("\n"), true);
                embeds.push(embed);
            }

            return message.paginate(embeds, 360000);
        }

        let resolve;

        if (args.length === 3 && (this.parseRGB(args[0]) || this.parseRGB(args[0]) === 0)) resolve = args.map(a => this.parseRGB(a));
        else {
            resolve = args.join(" ").split(" ").join("_").toUpperCase().replace("#", "");
            resolve = resolve.length !== 6 ? parseInt(resolve) || resolve : resolve;
        }

        const resolvedColor = this.resolveColor(resolve ? resolve : 1);
        if (!resolvedColor && resolvedColor !== 0) return message.respond(`Invalid color. Try another one, or do \`${message.parsedPrefix}${message.command} index\` to see a list of colors.`);

        const embed = new Embed(resolvedColor).setTitle(args.join(" "));

        if (embed.color === 16777215) embed.color = 16777200;
        let color = resolvedColor.toString(16);
        if (color === "NaN") color = "0";

        const url = `https://www.beautycolorcode.com/${color}-1000x1000.png`;
        const hex = `#${"0".repeat(6 - color.length)}${color}`.toUpperCase();
        const rgb = this.decimalToRGB(resolvedColor);
        embed
            .setDescription([
                `• Hex: ${hex}`,
                `• RGB: (${rgb.join(", ")})`,
                `• Integer: ${isNaN(resolvedColor) ? 0 : resolvedColor}`
            ])
            .setImage(url);
        return message.embed(embed);
    }

    parseRGB(str) {
        return parseInt(str.replace(/,/g, "").replace(/(\(|\))/g, ""));
    }

    decimalToRGB(decimal) {
        return [(decimal >> 16) & 0xff, (decimal >> 8) & 0xff, decimal & 0xff];
    }

    resolveColor(color) {
        if (typeof color === "string") {
            if (color === "RANDOM") return Math.floor(Math.random() * (0xffffff + 1));
            if (color === "DEFAULT") return 0;
            if (color in colors) color = colors[color];
            else {
                color = color.replace("#", "");
                if (color.length > 6) return null;
                color = `#${"0".repeat(6 - color.length)}${color}`.toUpperCase();
                if (!/^#[0-9A-F]{6}$/i.test(color)) return null;
                color = parseInt(color.replace("#", ""), 16);
            }
        } else if (Array.isArray(color)) {
            color = (color[0] << 16) + (color[1] << 8) + color[2];
        }

        if (color < 0 || color > 0xffffff || (color && isNaN(color))) return null;

        return color;
    }
};