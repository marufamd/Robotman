import cheerio from 'cheerio';
import { request } from '#util/request';
import { Links } from '#util/constants';

/**
 * Pastebins
 * Paste.ee and Hastebin
 */

export async function haste(text: string, format = 'js', raw = false): Promise<string> {
	if (!text) throw new Error('No text provided');

	const { body } = await request.post(`${Links.HASTEBIN}/documents`).set('Content-Type', 'text/plain').send(text);

	return `${Links.HASTEBIN}/${raw ? 'raw/' : ''}${body.key as string}.${format}`;
}

export async function paste(contents: string, title = 'Paste', lang = 'autodetect', raw = false): Promise<string> {
	if (!contents || !title) throw new Error('No text or title provided.');

	const { body } = await request
		.post(Links.PASTE_EE)
		.set({
			'X-Auth-Token': process.env.PASTEE_KEY,
			'Content-Type': 'application/json'
		})
		.send({ sections: [{ name: title, syntax: lang, contents }] });

	if (!body.success) throw new Error(body.errors[0].message);

	return raw ? body.link.replace('/p/', '/r/') : body.link;
}

/**
 * Google
 * Google Search and YouTube Search
 */

export async function google(query: string, safe = false): Promise<Record<string, any> | null> {
	const { body } = await request.get(`${Links.GOOGLE}/customsearch/v1`).query({
		key: process.env.GOOGLE_SEARCH_KEY,
		cx: process.env.GOOGLE_ENGINE_KEY,
		safe: safe ? 'active' : 'off',
		q: query
	});

	if (body.queries.request[0].totalResults === 0 || !body.items) return null;

	return body;
}

export async function youtube(params: Record<string, any>, mode = 'search'): Promise<Record<string, any> | null> {
	params.key = process.env.GOOGLE_SEARCH_KEY;

	const { body } = await request.get(`${Links.GOOGLE}/youtube/v3/${mode}`).query(params);

	if (body.pageInfo.totalResults === 0 || !body.items?.length) return null;

	return body.items[0];
}

/**
 * Thesaurus and Dictionary
 * Meriam Webster Dictionary API
 */

interface DictionaryBase {
	word: string;
}

export interface Definition extends DictionaryBase {
	type: string;
	definitions: string[];
	date: string;
}

export interface Synonyms extends DictionaryBase {
	synonyms: string[];
}

export async function define(word: string): Promise<Definition>;
export async function define(word: string, synonym: boolean): Promise<Synonyms>;
export async function define(word: string, synonym = false): Promise<Definition | Synonyms> {
	if (!word?.length) throw new Error('No query provided');

	const { body } = await request
		.get(`${Links.DICTIONARY}/${synonym ? 'thesaurus' : 'collegiate'}/json/${encodeURIComponent(word)}`)
		.query('key', process.env[`WEBSTER_${synonym ? 'THESAURUS' : 'DICTIONARY'}_KEY`]);

	if (!body.length) return null;
	const result = body[0];
	if (typeof result[0] === 'string') return body.slice(0, 3);

	if (synonym) {
		const found = body[0].meta;
		return {
			word: found.stems?.[0],
			synonyms: found?.syns?.flat(3)
		};
	}

	return {
		word: result.meta.stems[0],
		type: result.fl,
		definitions: result.shortdef,
		date: result.date?.replace(/\{(.*?)\}/gi, '')
	};
}

/**
 * Misc
 * Reddit, Imgur, and icanhazdadjoke
 */

export async function dadJoke(): Promise<string> {
	const { text } = await request.get(Links.DAD_JOKE).set('Accept', 'text/plain');

	return text;
}

export async function imgur(image: string | Buffer): Promise<string> {
	const { body } = await request.post(`${Links.IMGUR}/3/image`).set('Authorization', `Client-ID ${process.env.IMGUR_CLIENT_ID}`).send(image);

	return body?.data?.link;
}

export async function redditWiki(path: string, subreddit: string): Promise<Record<string, any>> {
	const url = `${Links.REDDIT}/r/${subreddit}/wiki/${path}.json`;
	const data = await request.get(url).catch(() => null);
	if (!data) return null;

	if (data.body.reason === 'PAGE_NOT_CREATED') return null;
	return data.body;
}

interface ComixologyData {
	publisher: {
		name: string;
		image: string;
	};
	name: string;
	description: string;
	cover: string;
	url: string;
	credits: {
		written: string[];
		art: string[];
		pencils: string[];
		inks: string[];
		colors: string[];
		cover: string[];
	};
	pageCount: number;
	releaseDate: string;
}

export async function comixology(query: string): Promise<ComixologyData> {
	const res = await google(`site:https://comixology.com/ ${query}`);
	if (!res) return null;

	const found = res.items.find((i: Record<string, string>): boolean => i.link.includes('digital-comic'));
	if (!found) return null;

	const link = found.link.replace('https://m.', 'https://www.');
	const { text } = await request.get(link);

	const $ = cheerio.load(text);
	if (!$('img.icon').length) return null;

	const credits = $('div.credits')[0];

	const findData = (type: string): string[] =>
		$(credits)
			.find(`h2[title='${type}']`)
			.map((_: number, el: cheerio.Element) => $(el).find('a').text().trim())
			.get();

	const written = findData('Written by');
	const art = findData('Art by');
	const pencils = findData('Pencils');
	const inks = findData('Inks');
	const colors = findData('Colored by');
	const cover = findData('Cover by');

	const otherDetails = $('div.aboutText');
	const pageCount = Number(otherDetails.get(0).children[0].data);
	const releaseDate = otherDetails.get(1).children[0].data;

	return {
		publisher: { name: $('h3.name').text(), image: $('img.icon').eq(1).attr('src') },
		name: $('h1.title').text(),
		description: $('.item-description').text(),
		cover: encodeURI($('img.cover').first().attr('src')).replace('%', ''),
		url: link,
		credits: { written, art, pencils, inks, colors, cover },
		pageCount,
		releaseDate
	};
}

/**
 * Letterboxd
 * Heavily based on https://github.com/zaccolley/letterboxd
 */

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

export async function letterboxd(username: string): Promise<LetterboxdResponse> {
	if (!username?.trim?.().length) throw new Error('No username provided.');

	const res = await request.get(`${Links.LETTERBOXD}/${username}/rss/`);

	const $ = cheerio.load(res.text, { xmlMode: true });

	const data = $('item')
		.map((_, element) => parseLetterboxdItem($(element)))
		.get();

	return {
		user: $('title').first().text().slice(13),
		diaries: data.filter((e) => e.type === 'diary'),
		lists: data.filter((e) => e.type === 'list')
	};
}

function parseLetterboxdItem(item: cheerio.Cheerio): ReviewEntry | ListEntry {
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
			description: getReviewDescription(item),
			ranked: getRanked(item),
			films: getFilms(item),
			total: getTotalFilms(item)
		};
	} else {
		data = {
			watched: new Date(text(`letterboxd\\:watchedDate`)),
			film: {
				title: text('letterboxd\\:filmTitle'),
				year: Number(text('letterboxd\\:filmYear')),
				image: getFilmImage(item)
			},
			rating: getRating(item),
			review: getReview(item),
			spoiler: text('title').includes('(contains spoilers)'),
			rewatch: item.find('letterboxd\\:rewatch').text() === 'Yes'
		};
	}

	Object.assign(entry, data);

	return entry as ReviewEntry | ListEntry;
}

function getReviewDescription(item: cheerio.Cheerio): string | null {
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

function getRanked(item: cheerio.Cheerio): number {
	const $ = cheerio.load(item.find('description').text());
	return $('ol').length;
}

function getFilms(item: cheerio.Cheerio): LetterboxdFilm[] {
	const $ = cheerio.load(item.find('description').text());

	return $('li a')
		.map((_, el) => {
			const element = $(el);
			return { title: element.text(), url: element.attr('href') };
		})
		.get();
}

function getTotalFilms(item: cheerio.Cheerio): number {
	const films = getFilms(item);
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

function getReview(item: cheerio.Cheerio): string | null {
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

function getRating(item: cheerio.Cheerio): string {
	const stars = (num: number) => '★'.repeat(num);
	const rating = Number(item.find('letterboxd\\:memberRating').text());

	if (rating === -1) return 'None';
	return Number.isInteger(rating) ? stars(rating) : `${stars(rating)}½`;
}

function getFilmImage(item: cheerio.Cheerio): string | null {
	const $ = cheerio.load(item.find('description').text());
	const image = $('p img').attr('src');

	return image?.replace?.(/-0-.*-crop/, '-0-460-0-690-crop') ?? null;
}
