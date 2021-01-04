const request = require('node-superfetch');
const cheerio = require('cheerio');

class Letterboxd {
    static BASE_URL = 'https://letterboxd.com';

    static async get(username) {
        if (!username?.trim?.().length) throw new Error('No username provided.');

        const res = await request.get(`${this.BASE_URL}/${username}/rss/`);

        if (res.status === 404) return null;
        if (res.status !== 200) throw new Error(res.statusText);

        const $ = cheerio.load(res.text, { xmlMode: true });

        const data = $('item')
            .map(function () { return Letterboxd.parseItem($(this)); })
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

        if (entry.url.includes('/list/')) {
            Object.assign(entry, {
                type: 'list',
                title: text('title'),
                description: Letterboxd.getDescription(item),
                ranked: Letterboxd.getRanked(item),
                films: Letterboxd.getFilms(item),
                total: Letterboxd.getTotal(item),
            });
        } else {
            Object.assign(entry, {
                watched: new Date(text(`letterboxd\\:watchedDate`)),
                film: {
                    title: text('letterboxd\\:filmTitle'),
                    year: text('letterboxd\\:filmYear'),
                    image: Letterboxd.getImage(item)
                },
                rating: Letterboxd.getRating(item),
                review: Letterboxd.getReview(item),
                spoiler: text('title').includes('(contains spoilers)'),
                rewatch: item.find('letterboxd\\:rewatch').text() === 'Yes'
            });
        }

        return entry;
    }

    static getDescription(item) {
        const description = item.find('description').text();
        const $ = cheerio.load(description);

        let res;

        if ($('p').length <= 0) {
            res = null;
        } else {
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
            .map(function () {
                const element = $(this);
                return { title: element.text(), url: element.attr('href') };
            })
            .get();
    }

    static getTotal(item) {
        const films = Letterboxd.getFilms(item);
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
            if (p !== 'This review may contain spoilers.') review += `${p}\n`;
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

        return image ? image.replace(/-0-.*-crop/, '-0-230-0-345-crop') : null;
    }
}

module.exports = Letterboxd;