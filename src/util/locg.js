const { fetch, sort } = require('./');
const cheerio = require('cheerio');

class Locg {
    constructor() {
        throw new Error('This class cannot be instantiated.');
    }

    static async get(params, options = {}) {
        params.view = 'list';
        params.order = 'alpha-asc';
        if (!options.search) {
            params.date_type = 'week';
            params.list_option = 'thumbs';
        }

        const baseURL = 'https://leagueofcomicgeeks.com';

        const res = await fetch(`${baseURL}/comic/get_comics`, params);
        const $ = cheerio.load(res.list);

        function extract() {
            const name = $(this).find('.title.color-primary').text().trim();
            let link, cover, publisher, description, price;

            if (options.search) {
                cover = $(this).find('.cover img').attr('data-src').replace('medium', 'large');
                link = `${baseURL}${$(this).find('.cover a').attr('href')}`;
                publisher = $(this).find('.publisher.color-offset').text().trim();
            } else {
                cover = $(this).find('.comic-cover-art img').attr('data-src').replace('medium', 'large');
                cover = cover === '/assets/images/no-cover-med.jpg' ? `${baseURL}${cover.replace('-med', '-lg')}` : cover;

                const details = $(this).find('.comic-details').text().split('·');
                publisher = (details[0] || '').trim();
                price = $(this).find('.price').text().trim();

                description = $(this).find('.comic-description.col-feed-max');
                link = `${baseURL}${description.find('a').attr('href')}`;

                description.find('a').remove();
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
        }

        let data = $('li').map(extract).get();
        if (options.filter) data = Locg.filter(data, options.filter);
        if (options.sort) data = sort(data);

        return data;
    }

    static async getPulls(id, date, sort = true) {
        const params = {
            list: 1,
            user_id: id,
            date: date ? date : Locg.getPullDate(),
            date_type: 'week'
        };

        return Locg.get(params, { sort });
    }

    static async getComics(id, date, filter = 'singles', sort = true) {
        const params = {
            list: 'releases',
            publisher: id,
            date: date ? date : Locg.getPullDate(id === 1 ? true : false),
            date_type: 'week'
        };

        return Locg.get(params, { filter, sort });
    }

    static async search(query, publisher) {
        const params = {
            list: 'search',
            publisher,
            title: query,
            list_option: 'series'
        };

        return Locg.get(params, { search: true });
    }

    static async resolveUser(name) {
        const url = `https://leagueofcomicgeeks.com/profile/${name.toLowerCase()}/pull-list`;

        try {
            const body = await fetch(url, null, 'text');
            const $ = cheerio.load(body);

            const details = $('#comic-list-block')[0];
            if (!details) return null;

            return {
                id: details.attribs['data-user'],
                name: $('title').text().slice(0, -47),
                url
            };
        } catch {
            return 'private';
        }
    }

    static getPullDate(dc = false) {
        const num = dc ? 2 : 3;
        const date = new Date();
        const day = date.getDay() || 7;
        if (day !== num) date.setHours(-24 * (day - num));
        return date.toISOString().split('T')[0];
    }

    static filter(pulls, type = 'singles') {
        let match = () => true;

        switch (type) {
            case 'singles':
                match = c => !c.name.match(/((\d:\d+)|((R|K)E|XXX|HC|TP)|(Cover(e)?|Shop) [A-Z])/)
                    && !c.name.match(/\s(var(iant)?|omnibus|printing|incentive|facsimile|exclusive|limited|cover|graded|box\s*set|lotay|giang|khoi pham|mckelvie|uncanny knack virgin|vinyl|newsstand|edition)/i);
                break;
            case 'trades':
                match = t => t.name.match(/(hc|tp|omnibus|box\s*set)/i) && !t.name.match(/(var(iant)?|printing|incentive)/i);
                break;
        }

        return pulls.filter(match);
    }
}

module.exports = Locg;