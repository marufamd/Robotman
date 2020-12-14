const Command = require("../../classes/Command");
const { Embed, google, trim, fetch } = require("../../../util");
const cheerio = require("cheerio");

module.exports = class extends Command {
    constructor(client) {
        super(client, {
            name: "comic",
            description: "Searches ComiXology",
            group: "comics",
            aliases: ["comixology", "issue", "trade"],
            usage: "<query>",
            examples: [
                "daredevil 1 zdarsky",
                "batman 50"
            ],
            info: ["More specific queries will give a more accurate result (e.g. including the launch year of the book, the writer, etc)"],
            args: true,
            cooldown: 20,
            typing: true
        });
    }

    async run(message, args) {
        const comic = await this.search(args.join(" "), google);
        if (!comic) return message.respond("Comic not found. Please try a different query.");

        const embed = new Embed("#45b792")
            .setAuthor(comic.publisher.name, comic.publisher.image)
            .setTitle(comic.name)
            .setURL(comic.url)
            .setDescription(trim(comic.description, 2048))
            .setThumbnail(comic.cover)
            .setFooter("ComiXology", "https://i.imgur.com/w8RoAMX.png");

        const { writers, artists, pencils, inks, colors, coverArtists } = comic.credits;

        if (writers.length) embed.addField("Written By", writers.join("\n"), true);
        if (artists.length) embed.addField("Art By", artists.join("\n"), true);
        if (pencils.length) embed.addField("Pencils By", pencils.join("\n"), true);
        if (inks.length) embed.addField("Inks By", inks.join("\n"), true);
        if (colors.length) embed.addField("Colors By", colors.join("\n"), true);
        if (coverArtists.length) embed.addField("Cover By", coverArtists.join("\n"), true);

        const { releaseDate, pageCount } = comic;

        if (pageCount) embed.addField("Page Count", pageCount, true);
        if (releaseDate) embed.addField("Release Date", releaseDate, true);

        if ([5, 8].includes(embed.fields.length)) embed.addField("\u200b", "\u200b", true);

        return message.embed(embed);
    }

    async search(query, google) {
        const res = await google(`site:https://comixology.com/ ${query}`);
        if (!res) return null;

        const found = res.items.find(i => i.link.includes("digital-comic"));
        if (!found) return null;

        const link = found.link.replace("https://m.", "https://www.");
        const body = await fetch(link, null, "text");

        const $ = cheerio.load(body);
        if (!$("img.icon").length) return null;

        const credits = $("div.credits")[0];

        const findData = type => $(credits).find(`h2[title="${type}"]`).map(function () { return $(this).find("a").text().trim(); }).get();

        const writers = findData("Written by");
        const artists = findData("Art by");
        const pencils = findData("Pencils");
        const inks = findData("Inks");
        const colors = findData("Colored by");
        const coverArtists = findData("Cover by");

        const otherDetails = $("div.aboutText");
        const pageCount = otherDetails.get(0).children[0].data;
        const releaseDate = otherDetails.get(1).children[0].data;

        return {
            publisher: { name: $("h3.name").text(), image: $("img.icon")[1].attribs["src"] },
            name: $("h1.title").text(),
            description: $(".item-description").text(),
            cover: encodeURI($("img.cover")[0].attribs["src"]).replace("%", ""),
            url: link,
            credits: { writers, artists, pencils, inks, colors, coverArtists },
            pageCount,
            releaseDate
        };
    }
};