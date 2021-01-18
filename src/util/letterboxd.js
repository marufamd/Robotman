const request = require('node-superfetch');
const cheerio = require('cheerio');

const BASE_URL = 'https://letterboxd.com';

module.exports = class Letterboxd {
    static BASE_URL = BASE_URL;

    static async get(username) {
        if (!username?.trim?.().length) throw new Error('No username provided.');

        const res = await request.get(`${BASE_URL}/${username}/rss/`);

        if (res.status === 404) return null;
        if (res.status !== 200) throw new Error(res.statusText);

        const $ = cheerio.load(res.text, { xmlMode: true });

        const data = $('item')
            .map((_, element) => this.parseItem($(element)))
            .get();

        return {
            user: $('title').first().text().slice(13),
            diaries: data.filter(e => e.type === 'diary'),
            lists: data.filter(e => e.type === 'list')
        };
    }

    static parseItem(item) {
        const text = str => item.find(str).text();

        const entry = {
            type: 'diary',
            published: new Date(text('pubDate')),
            url: item.find('link').html()
        };

        let data;

        if (entry.url.includes('/list/')) {
            data = {
                type: 'list',
                title: text('title'),
                description: this.getDescription(item),
                ranked: this.getRanked(item),
                films: this.getFilms(item),
                total: this.getTotal(item),
            };
        } else {
            data = {
                watched: new Date(text(`letterboxd\\:watchedDate`)),
                film: {
                    title: text('letterboxd\\:filmTitle'),
                    year: text('letterboxd\\:filmYear'),
                    image: this.getImage(item)
                },
                rating: this.getRating(item),
                review: this.getReview(item),
                spoiler: text('title').includes('(contains spoilers)'),
                rewatch: item.find('letterboxd\\:rewatch').text() === 'Yes'
            };
        }

        Object.assign(entry, data);

        return entry;
    }

    static getDescription(item) {
        const $ = cheerio.load(item.find('description').text());

        let res = null;

        if ($('p').length > 0) {
            $('p').each((_, element) => {
                const text = $(element).text();
                if (!text.includes('View the full list on Letterboxd')) res = text;
            });
        }

        return res;
    }

    static getRanked(item) {
        const $ = cheerio.load(item.find('description').text());
        return $('ol').length;
    }

    static getFilms(item) {
        const $ = cheerio.load(item.find('description').text());

        return $('li a')
            .map((_, element) => {
                element = $(element);
                return { title: element.text(), url: element.attr('href') };
            })
            .get();
    }

    static getTotal(item) {
        const films = this.getFilms(item);
        let result = films.length;

        const $ = cheerio.load(item.find('description').text());

        if ($('p').length <= 0) return result;

        $('p').each((_, element) => {
            const text = $(element).text();

            if (text.includes('View the full list on Letterboxd')) {
                const startStr = '...plus ';
                const startPosition = text.indexOf(startStr) + startStr.length;
                const endPosition = text.indexOf(' more. View the full list on Letterboxd.');

                result += parseInt(text.substring(startPosition, endPosition), 10) || 0;
            }
        });

        return result;
    }

    static getReview(item) {
        const $ = cheerio.load(item.find('description').text());
        const ps = $('p');

        if (ps.length <= 0 || ps.last().text().includes('Watched on ')) return null;

        let review = '';

        ps.each((_, element) => {
            const p = $(element).text();
            if (p !== 'This review may contain spoilers.') review += `${p}\n\n`;
        });

        return review.trim();
    }

    static getRating(element) {
        const stars = num => '★'.repeat(num);
        const rating = Number(element.find('letterboxd\\:memberRating').text());

        if (rating === -1) return 'None';
        return Number.isInteger(rating) ? stars(rating) : stars(rating) + '½';
    }

    static getImage(item) {
        const $ = cheerio.load(item.find('description').text());
        const image = $('p img').attr('src');

        return image?.replace?.(/-0-.*-crop/, '-0-460-0-690-crop') ?? null;
    }
};