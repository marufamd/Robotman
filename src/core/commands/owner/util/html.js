const Command = require("../../../classes/Command");
const { Embed, beautify } = require("../../../../util");
const puppeteer = require("puppeteer");

module.exports = class extends Command {
    constructor(client) {
        super(client, {
            name: "html",
            description: "Renders HTML",
            group: "owner",
            aliases: ["css", "render", "htm"],
            usage: "<html>",
            examples: [
                "<h1>Hello World!</h1>",
                '<p style="font-size:100px">Testing 123</p>'
            ],
            args: true,
            typing: true
        });
    }

    async run(message, args) {
        const html = args.join(" ");

        const start = process.hrtime();

        const browser = await puppeteer.launch({ defaultViewport: { width: 1680, height: 1050 }, args: ["--window-size=1680,1050"] });
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: "networkidle2" });

        const screenshot = await page.screenshot();
        const render = (process.hrtime(start)[1] / 1000000).toFixed(3);

        const embed = new Embed()
            .setTitle("HTML Render")
            .setDescription(`\`\`\`html\n${beautify(html, "html")}\`\`\``)
            .attachFiles([{ name: "html.png", attachment: screenshot }])
            .setImage("attachment://html.png")
            .setFooter(`Rendered in ${render} ms`);

        return message.embed(embed);
    }
};