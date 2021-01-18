// Credit: Heavily based on https://github.com/zaccolley/letterboxd

import cheerio from 'cheerio';
import request from './request';

export interface LetterboxdFilm {
    title: string;
    url?: string;
    year?: number;
    image: string | null;
}

interface LetterboxdEntry {
    type: 'diary' | 'list';
    published: Date;
    url: string;
}

export interface ListEntry extends LetterboxdEntry {
    title: string;
    description: string | null;
    ranked: number;
    films: LetterboxdFilm[];
    total: number;
}

export interface ReviewEntry extends LetterboxdEntry {
    watched: Date;
    film: LetterboxdFilm;
    rating: string;
    review: string | null;
    spoiler: boolean;
    rewatch: boolean;
}

export interface LetterboxdResponse {
    user: string;
    diaries: ReviewEntry[];
    lists: ListEntry[];
}

export default class Letterboxd {
    private static readonly url = 'https://letterboxd.com';

    public static async get(username: string): Promise<LetterboxdResponse> {
        if (!username?.trim?.().length) throw new Error('No username provided.');

        const res = await request.get(`${this.url}/${username}/rss/`);

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

    private static parseItem(item: cheerio.Cheerio): ReviewEntry | ListEntry {
        const text = (str: string) => item.find(str).text();

        const entry: LetterboxdEntry = {
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
                total: this.getTotal(item)
            };
        } else {
            data = {
                watched: new Date(text(`letterboxd\\:watchedDate`)),
                film: {
                    title: text('letterboxd\\:filmTitle'),
                    year: Number(text('letterboxd\\:filmYear')),
                    image: this.getImage(item)
                },
                rating: this.getRating(item),
                review: this.getReview(item),
                spoiler: text('title').includes('(contains spoilers)'),
                rewatch: item.find('letterboxd\\:rewatch').text() === 'Yes'
            };
        }

        Object.assign(entry, data);

        return entry as ReviewEntry | ListEntry;
    }

    private static getDescription(item: cheerio.Cheerio): string | null {
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

    private static getRanked(item: cheerio.Cheerio): number {
        const $ = cheerio.load(item.find('description').text());
        return $('ol').length;
    }

    private static getFilms(item: cheerio.Cheerio): LetterboxdFilm[] {
        const $ = cheerio.load(item.find('description').text());

        return $('li a')
            .map((_, el) => {
                const element = $(el);
                return { title: element.text(), url: element.attr('href') };
            })
            .get();
    }

    private static getTotal(item: cheerio.Cheerio): number {
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

    private static getReview(item: cheerio.Cheerio): string | null {
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

    private static getRating(item: cheerio.Cheerio): string {
        const stars = (num: number) => '★'.repeat(num);
        const rating = Number(item.find('letterboxd\\:memberRating').text());

        if (rating === -1) return 'None';
        return Number.isInteger(rating) ? stars(rating) : `${stars(rating)}½`;
    }

    private static getImage(item: cheerio.Cheerio): string | null {
        const $ = cheerio.load(item.find('description').text());
        const image = $('p img').attr('src');

        return image?.replace?.(/-0-.*-crop/, '-0-460-0-690-crop') ?? null;
    }
}