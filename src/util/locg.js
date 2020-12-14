const { fetch } = require("./");
const cheerio = require("cheerio");

class Locg {
    constructor() {
        throw new Error("This class cannot be instantiated.");
    }

    static async getData(params, search = false) {
        params.view = "list";
        params.order = "alpha-asc";
        if (!search) {
            params.date_type = "week";
            params.list_option = "thumbs";
        }

        const baseURL = "https://leagueofcomicgeeks.com";

        const res = await fetch(`${baseURL}/comic/get_comics`, params);
        const $ = cheerio.load(res.list);

        return $("li").map(function () {
            const name = $(this).find(".title.color-primary").text().trim();
            let link, cover, publisher, description, price;

            if (search) {
                cover = $(this).find(".cover img").attr("data-src").replace("medium", "large");
                link = `${baseURL}${$(this).find(".cover a").attr("href")}`;
                publisher = $(this).find(".publisher.color-offset").text().trim();
            } else {
                cover = $(this).find(".comic-cover-art img").attr("data-src").replace("medium", "large");
                cover = cover === "/assets/images/no-cover-med.jpg" ? `${baseURL}${cover.replace("-med", "-lg")}` : cover;
                
                const details = $(this).find(".comic-details").text().split("·");
                publisher = (details[0] || "").trim();
                price = $(this).find(".price").text().trim();

                description = $(this).find(".comic-description.col-feed-max");
                link = `${baseURL}${description.find("a").attr("href")}`;

                description.find("a").remove();
                description = description.text().trim();
            }

            return {
                name,
                cover,
                publisher,
                description,
                link,
                price
            };
        }).get();
    }

    static async getPulls(id, date) {
        const params = {
            list: 1,
            user_id: id,
            date: date ? date : Locg.getPullDate(),
            date_type: "week"
        };

        return Locg.getData(params);
    }

    static async getComics(id, date) {
        const params = {
            list: "releases",
            publisher: id,
            date: date ? date : Locg.getPullDate(id === 1 ? true : false),
            date_type: "week"
        };

        return Locg.getData(params);
    }

    static async search(query, publisher) {
        const params = {
            list: "search",
            publisher,
            title: query,
            list_option: "series"
        };

        return Locg.getData(params, true);
    }

    static getPullDate(dc = false) {
        const num = dc ? 2 : 3;
        const date = new Date();
        const day = date.getDay() || 7;
        if (day !== num) date.setHours(-24 * (day - num));
        return date.toISOString().split("T")[0];
    }

    static filterPulls(pulls, trades = false) {
        let final;

        if (trades) {
            final = pulls.filter(t => {
                t = t.name;
                return t.match(/(hc|tp|omnibus|box\s*set)/i) && !t.match(/(var(iant)?|printing|incentive)/i);
            });
        } else {
            final = pulls.filter(c => {
                c = c.name;
                return !c.match(/((\d:\d+)|((R|K)E|XXX|HC|TP)|(Cover(e)?|Shop) [A-Z])/)
                    && !c.match(/\s(var(iant)?|omnibus|printing|incentive|facsimile|exclusive|limited|cover|graded|box\s*set|lotay|giang|khoi pham|mckelvie|uncanny knack virgin|vinyl|newsstand|edition)/i);
            });
        }

        return final;
    }
}

module.exports = Locg;