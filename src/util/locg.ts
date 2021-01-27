import cheerio from 'cheerio';
import { DateTime } from 'luxon';
import request from './request';
import { sort } from './';

interface LocgParameters {
    list: number | string;
    title: string;
    view: 'list';
    order: 'alpha-asc';
    publisher: number;
    user_id: number;
    date_type: 'week';
    date: string;
    list_option: string;
}

type FilterType = 'singles' | 'trades';

interface LocgOptions {
    search: boolean;
    sort: boolean;
    filter: FilterType;
}

interface LocgUser {
    id: number;
    name: string;
    url: string;
}

export interface ComicData {
    name: string;
    cover: string;
    publisher: string;
    link: string;
    description: string | undefined;
    price: string | undefined;
}

export default class LeagueOfComicGeeks {
    public static readonly url = 'https://leagueofcomicgeeks.com';

    private static readonly SINGLE_REGEXP_CASE_SENSITIVE = /((\d:\d+)|((R|K)E|XXX|HC|TP)|(Covere?|Shop) [A-Z])/;
    private static readonly SINGLE_REGEXP_CASE_INSENSITIVE = /\s(var(iant)?|omnibus|printing|incentive|facsimile|exclusive|limited|cover|graded|box\s*set|lotay|giang|khoi pham|mckelvie|uncanny knack virgin|vinyl|newsstand|edition)/i;
    private static readonly TRADE_REGEXP = /(hc|tp|omnibus|box\s*set)/i;
    private static readonly TRADE_FILTER_REGEXP = /(var(iant)?|printing|incentive)/i;

    protected static async get(params: Partial<LocgParameters>, options: Partial<LocgOptions>): Promise<ComicData[]> {
        params.view = 'list';
        params.order = 'alpha-asc';

        if (!options.search) {
            params.date_type = 'week';
            params.list_option = 'thumbs';
        }

        const { body } = await request
            .get(`${this.url}/comic/get_comics`)
            .query(params);

        const $ = cheerio.load(body.list);

        const extract = (_: number, el: cheerio.Element) => {
            const element = $(el);

            const name = element.find('.title.color-primary').text().trim();
            let link, cover, publisher, description, price;

            if (options.search) {
                cover = element.find('.cover img')!.attr('data-src')!.replace('medium', 'large');
                link = `${this.url}${element.find('.cover a').attr('href')}`;
                publisher = element.find('.publisher.color-offset').text().trim();
            } else {
                cover = element.find('.comic-cover-art img').attr('data-src').replace('medium', 'large');
                cover = cover === '/assets/images/no-cover-med.jpg' ? `${this.url}${cover.replace('-med', '-lg')}` : cover;

                const details = element.find('.comic-details').text().split('·');
                publisher = (details[0] || '').trim();
                price = element.find('.price').text().trim();

                description = element.find('.comic-description.col-feed-max');
                link = `${this.url}${description.find('a').attr('href')}`;

                description.find('a').remove();
                description = description.text().trim();
            }

            return {
                name,
                cover,
                publisher,
                link,
                description,
                price
            };
        };

        let data: ComicData[] = $('li').map(extract).get();
        if (options.filter) data = this.filter(data, options.filter);
        if (options.sort) data = sort(data);

        return data;
    }

    public static getPulls(id: number, date: string, sort = true): Promise<ComicData[]> {
        const params = {
            list: 1,
            user_id: id,
            date: date
        };

        return this.get(params, { sort });
    }

    public static getComics(id: number, date: string, filter: FilterType = 'singles', sort = true): Promise<ComicData[]> {
        const params = {
            list: 'releases',
            publisher: id,
            date: date
        };

        return this.get(params, { filter, sort });
    }

    public static search(query: string): Promise<ComicData[]> {
        const params = {
            list: 'search',
            title: query,
            list_option: 'series'
        };

        return this.get(params, { search: true });
    }

    public static async resolveUser(name: string): Promise<LocgUser | null> {
        const url = `${this.url}/profile/${name.toLowerCase()}/pull-list`;

        try {
            const { text } = await request.get(url);
            const $ = cheerio.load(text);

            const details = $('#comic-list-block').first();
            if (!details) return null;

            return {
                id: Number(details.attr('data-user')),
                name: $('title').text().slice(0, -47),
                url
            };
        } catch {
            return null;
        }
    }

    public static resolveDate(date: DateTime) {
        return date.weekday <= 3
            ? date
                .set({ weekday: 3 })
            : date
                .set({ weekday: 3 })
                .plus({ weeks: 1 });
    }

    private static filter(pulls: ComicData[], filterType: FilterType = 'singles') {
        const match: (c: ComicData) => boolean =
            filterType === 'singles'
                ? c => !this.SINGLE_REGEXP_CASE_SENSITIVE.test(c.name) && !this.SINGLE_REGEXP_CASE_INSENSITIVE.test(c.name)
                : c => this.TRADE_REGEXP.test(c.name) && !this.TRADE_FILTER_REGEXP.test(c.name);

        return pulls.filter(match);
    }
}