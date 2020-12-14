const Command = require("../../classes/Command");
const { Embed, paste, trim, split } = require("../../../util");
const translate = require("@vitalets/google-translate-api");

module.exports = class extends Command {
    constructor(client) {
        super(client, {
            name: "translate",
            description: "Translates text",
            group: "utility",
            usage: "(-from=[language code]) (-to=[language code]) <text>",
            examples: [
                "Bonjour, comment ça va?",
                "-from=es -to=en Hola"
            ],
            info: [
                "Defaults to auto detecting the language and translating to English",
                "To see a list of supported languages, do `{p}translate index`"
            ],
            args: {
                flags: {
                    from: { matches: ["from", "f"], option: true },
                    to: { matches: ["to", "t"], option: true }
                }
            },
            cooldown: 45,
            typing: true
        });
    }

    async run(message, { args, flags: { from, to } }) {
        if (["index", "list"].includes(args[0])) {
            const embeds = [];
            const pages = split(Object.entries(translate.languages).filter(l => typeof l[1] === "string").map(l => `**${l[1]}**: \`${l[0]}\``), 53);

            for (const page of pages) {
                let subpages = [page];
                if (page.length > 18) subpages = split(page, 18);

                const embed = new Embed("#4d8cf5")
                    .setTitle("List of Supported Languages")
                    .setFooter(`Page ${pages.indexOf(page) + 1}/${pages.length}`);

                for (const subpage of subpages) embed.addField("\u200b", subpage.join("\n"), true);
                embeds.push(embed);
            }

            return message.paginate(embeds, 120000);
        }

        const options = { to: "en" };

        const toTranslate = args.join(" ");
        if (!toTranslate.length) return message.usage(this.usage);

        if ((from && !translate.languages.isSupported(from)) || (to && !translate.languages.isSupported(to))) {
            return message.respond(`Invalid language key. Do \`${message.parsedPrefix}${message.command} index\` to see a list of supported language keys.`);
        }

        if (from) options.from = from;
        if (to) options.to = to;

        const translated = await translate(toTranslate, options);
        const result = translated.from.text.value || translated.text;

        const embed = new Embed("#4d8cf5")
            .addField(`Input (${translate.languages[translated.from.language.iso]})`, trim(toTranslate, 1024))
            .addField(`Translation (${translate.languages[options.to]})`, result.length > 1024 ? await paste(result, "") : result)
            .setFooter("Google Translate", "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d7/Google_Translate_logo.svg/128px-Google_Translate_logo.svg.png");

        return message.embed(embed);
    }
};