const Command = require("../../classes/Command");
const { fetch } = require("../../../util");
const { stripIndents } = require("common-tags");

const mappings = {
    "liveactionfilm": [
        "live action films",
        "liveaction films",
        "live action movies",
        "liveaction movies"
    ],
    "animatedfilm": [
        "animated films",
        "animated movies"
    ],
    "liveactiontv": [
        "live action television",
        "liveaction television",
        "live action shows",
        "liveaction shows"
    ],
};

module.exports = class extends Command {
    constructor(client) {
        super(client, {
            name: "recs",
            description: "Retrieves a specified list of recommendations",
            group: "utility",
            aliases: ["recommendations"],
            usage: "<recommendation list>",
            examples: [
                "animated films",
                "batman",
                "aquaman"
            ],
            args: true,
            disableHelp: true,
            disableEdits: true
        });

        this.recs = new Map();
    }

    async run(message, args) {
        let rec;

        for (const [key, mapping] of Object.entries(mappings)) {
            mapping.push(key);
            if (mapping.includes(args.join(" ").toLowerCase().replaceAll("-", ""))) {
                rec = key;
                break;
            }
        }

        if (!rec) rec = args.join("").toLowerCase().replaceAll("-", "");

        let resp;

        if (this.recs.has(rec)) {
            resp = this.recs.get(rec);
        } else {
            const url = `https://www.reddit.com/r/DCcomics/wiki/recommended/${rec}.json`;
            const res = await fetch(url);
            if (!res.ok || ["Not Found", "Bad Request"].includes(res.message)) return message.respond("Invalid list.");

            const { data: { content_md: markdown } } = res;

            if (markdown.includes("Starting Points")) resp = this.parseComicRec(markdown, rec);
            else if (/(Animated|Live Action)/.test(markdown)) resp = this.parseMediaRec(markdown, rec);

            if (!resp) return message.respond("Invalid list.");
            this.recs.set(rec, resp);
        }

        return message.send(resp, { split: true });
    }

    parseComicRec(markdown, rec) {
        const char = markdown.match(/[a-z]* Recommended Reading/gi)[0].replace("Recommended Reading", "").trim();

        const starting = markdown.match(/##Starting Points((.|\r|\n)*?)##Greatest Hits/);
        if (!starting) return null;
        const parsed = starting[0].split("\r\n").filter(a => a.length && !a.startsWith("&gt;")).map(b => b.trim());

        const filter = str => parsed.filter(r => r.startsWith(str));

        const titles = filter("###");
        const writers = filter("Written by:");
        const artists = filter("Art by:");
        const published = filter("First Published:");

        const final = [`**Starting Points for ${char}** (<https://www.reddit.com/r/DCcomics/wiki/recommended/${rec}>)\n`];

        for (let i = 0; i < titles.length; i++) {
            final.push(stripIndents`
            **${titles[i].replaceAll("#", "")} (${published[i].replace("First Published:", "").trim()})**
            ${writers[i]}
            ${artists[i]}
            ${!parsed[parsed.indexOf(published[i]) + 1].includes("Comixology") ? "> " + parsed[parsed.indexOf(published[i]) + 1] : ""}` + "\n");
        }

        return final.join("\n");
    }

    parseMediaRec(markdown, rec) {
        const rows = markdown.split("\r\n");

        return rows.map(row => {
            if (rows[0] === row) return `**${row.replace("#", "").trim()} Recommendations** (<https://www.reddit.com/r/DCcomics/wiki/recommended/${rec}>)\n`;
            return row.replaceAll(/amp;/g, "");
        }).filter(a => a.length).join("\n");
    }
};