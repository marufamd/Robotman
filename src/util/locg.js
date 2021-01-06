const cheerio = require('cheerio');
const request = require('node-superfetch');
const { sort } = require('./');

const BASE_URL = 'https://leagueofcomicgeeks.com';

class Locg {
    static BASE_URL = BASE_URL;

    static async get(params, options = {}) {
        params.view = 'list';
        params.order = 'alpha-asc';

        if (!options.search) {
            params.date_type = 'week';
            params.list_option = 'thumbs';
        }
        
        const { body } = await request
            .get(`${BASE_URL}/comic/get_comics`)
            .query(params);

        const $ = cheerio.load(body.list);

        const extract = (_, element) => {
            element = $(element);

            const name = element.find('.title.color-primary').text().trim();
            let link, cover, publisher, description, price;

            if (options.search) {
                cover = element.find('.cover img').attr('data-src').replace('medium', 'large');
                link = `${BASE_URL}${element.find('.cover a').attr('href')}`;
                publisher = element.find('.publisher.color-offset').text().trim();
            } else {
                cover = element.find('.comic-cover-art img').attr('data-src').replace('medium', 'large');
                cover = cover === '/assets/images/no-cover-med.jpg' ? `${BASE_URL}${cover.replace('-med', '-lg')}` : cover;

                const details = element.find('.comic-details').text().split('·');
                publisher = (details[0] || '').trim();
                price = element.find('.price').text().trim();

                description = element.find('.comic-description.col-feed-max');
                link = `${BASE_URL}${description.find('a').attr('href')}`;

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
        };

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
        const url = `${BASE_URL}/profile/${name.toLowerCase()}/pull-list`;

        try {
            const { text } = await request.get(url);
            const $ = cheerio.load(text);

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

    static resolveDate(date) {
        return (date.day !== new Date().getDay() && date.weekday <= 3)
            ? date.set({ weekday: 3 })
            : date.set({ weekday: 3 }).plus({ weeks: 1 });
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