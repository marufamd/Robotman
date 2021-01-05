const { SnowflakeUtil } = require('discord.js');
const beautify = require('js-beautify');
const request = require('node-superfetch');
const { dirname, basename } = require('path');
const { DateTime } = require('luxon');
const { formats } = require('./constants');

class Util {
    static async google(query, safe = false) {
        const { body } = await request
            .get('https://www.googleapis.com/customsearch/v1')
            .query({
                key: process.env.GOOGLE_SEARCH_KEY,
                cx: process.env.GOOGLE_ENGINE_KEY,
                safe: safe ? 'active' : 'off',
                q: query
            });

        if (body.queries.request[0].totalResults == 0 || !body.items) return null;

        return body;
    }

    static async youtube(params, mode = 'search') {
        params.key = process.env.GOOGLE_SEARCH_KEY;

        const { body } = await request
            .get(`https://www.googleapis.com/youtube/v3/${mode}`)
            .query(params);

        if (body.pageInfo.totalResults == 0 || !body.items) return null;
        return body.items[0];
    }

    static async dadJoke() {
        const { text } = await request
            .get('https://icanhazdadjoke.com/')
            .set('Accept', 'text/plain');

        return text;
    }

    static async define(word, synonym = false) {
        if (!word?.length) throw new Error('No query provided');
        const url = `https://www.dictionaryapi.com/api/v3/references/${synonym ? 'thesaurus' : 'collegiate'}/json/${encodeURIComponent(word)}`;

        const { body } = await request
            .get(url)
            .query('key', process.env[`${synonym ? 'THESAURUS' : 'DICTIONARY'}_KEY`]);

        if (!body.length) return null;
        const result = body[0];
        if (typeof result[0] === 'string') return body.slice(0, 3);

        if (synonym) {
            const found = body[0].meta;
            return {
                word: found.stems?.[0],
                synonyms: found?.syns?.flat(3)
            };
        } else {
            return {
                word: result.meta.stems[0],
                type: result.fl,
                definitions: result.shortdef,
                date: result.date?.replace(/\{(.*?)\}/gi, '')
            };
        }
    }

    static async paste(text, format = 'js', url = 'https://hastebin.com', raw = false) {
        if (!text) throw new Error('No text provided');

        const res = await request
            .post(`${url}/documents`)
            .set('Content-Type', 'text/plain')
            .send(text);

        if (!res.ok) throw new Error(res.statusText);

        return `${url}/${raw ? 'raw/' : ''}${res.body.key}.${format}`;
    }

    static async pastee(contents, title = 'Paste', lang = 'autodetect', raw = false) {
        if (!contents || !title) throw new Error('No text or title provided.');

        const { body } = await request
            .post('https://api.paste.ee/v1/pastes')
            .set({ 'X-Auth-Token': process.env.PASTE_KEY })
            .send({ sections: [{ name: title, syntax: lang, contents }] });

        if (!body.success) throw new Error(body.errors[0].message);

        return raw ? body.link.replace('/p/', '/r/') : body.link;
    }

    static compare(first, second) {
        first = first.replace(/\s+/g, '');
        second = second.replace(/\s+/g, '');

        if (first === second) return 1;
        if ((!first.length || !second.length) || (first.length < 2 || second.length < 2)) return 0;

        const compared = new Map();

        for (let i = 0; i < first.length - 1; i++) {
            const compare = first.substring(i, i + 2);
            compared.set(compare, (compared.get(compare) ?? 0) + 1);
        }

        let size = 0;

        for (let i = 0; i < second.length - 1; i++) {
            const compare = second.substring(i, i + 2);
            const count = compared.get(compare) ?? 0;

            if (count > 0) {
                compared.set(compare, count - 1);
                size++;
            }
        }

        return (2.0 * size) / (first.length + second.length - 2);
    }

    static randomResponse(arr) {
        if (!Array.isArray(arr)) throw new TypeError('Function requires an array');
        return arr[Math.floor(Math.random() * arr.length)];
    }

    static closest(target, arr) {
        if (typeof target !== 'string' || !Array.isArray(arr)) throw new TypeError('Invalid parameters');

        const compared = [];
        let match = 0;

        for (const str of arr) {
            const rating = Util.compare(target, str);
            compared.push({ str, rating });
            if (rating > compared[match].rating) match = arr.indexOf(str);
        }

        return compared[match].str;
    }

    static sort(arr) {
        if (!Array.isArray(arr)) throw new TypeError('Function requires an array');
        return arr.sort((a, b) => {
            a = Util.removeArticles((a.name ? a.name : a).toLowerCase());
            b = Util.removeArticles((b.name ? b.name : b).toLowerCase());

            if (a > b) return 1;
            if (a < b) return -1;

            return 0;
        });
    }

    static split(arr, max) {
        const newArray = [];
        let i = 0;
        while (i < arr.length) newArray.push(arr.slice(i, i += max));

        return newArray;
    }

    static title(str) {
        return str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
    }

    static capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    static trim(str, max) {
        return (str.length > max) ? `${str.slice(0, max - 3).trimEnd()}...` : str;
    }

    static plural(word, length) {
        return `${word}${length === 1 ? '' : 's'}`;
    }

    static escapeRegex(str) {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    static formatDate(date, format = formats.log) {
        return DateTime.fromJSDate(date, { zone: 'utc' }).toFormat(format);
    }

    static difference(date, format = 'd') {
        return DateTime.local().diff(DateTime.fromJSDate(date), 'years').toFormat(format);
    }

    static formatQuery(str) {
        return Util.title(str).split(' ').join('_');
    }

    static redact(str) {
        if (typeof str !== 'string') return str;
        const tokens = [
            'WEBHOOK_URL',
            'DISCORD_TOKEN',
            'DATABASE_URL',
            'GOOGLE_SEARCH_KEY',
            'GOOGLE_ENGINE_KEY',
            'SERVICE_ACCOUNT_EMAIL',
            'SERVICE_ACCOUNT_KEY',
            'SPREADSHEET',
            'COMICVINE_KEY',
            'PASTE_KEY',
            'DICTIONARY_KEY',
            'MOVIEDB_KEY'
        ];
        return str.replaceAll(new RegExp(tokens.map(t => Util.escapeRegex(process.env[t])).join('|'), 'gi'), '[REDACTED]');
    }

    static beautify(str, lang = 'js') {
        if (!['js', 'html', 'css'].includes(lang)) lang = 'js';
        const beautified = beautify[lang](str, { indent_size: 4, brace_style: 'preserve-inline' });
        return beautified;
    }

    static removeArticles(str) {
        const words = str.split(' ');
        if (['a', 'the', 'an'].includes(words[0]) && words[1]) return words.slice(1).join(' ');
        return str;
    }

    static parseWebhook(url) {
        let id, token;
        if (url) {
            id = basename(dirname(url));
            token = basename(url);
        }

        return { id, token };
    }

    static randomToken(amount = 1) {
        const final = [];

        const a = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z'];
        const b = ['_', '-'];

        const ids = this.randomID(amount);

        for (const id of ids) {
            let current = `${Buffer.from(id).toString('base64')}.C`;

            for (let i = 0; i < 5; i++) {
                if (i === 0) current += Math.round(Math.random() * 9);
                else current += (Math.random() > 0.4) ? a[Math.round(Math.random() * 25)].toUpperCase() : (Math.random() > 0.9) ? b[Math.round(Math.random())] : a[Math.round(Math.random() * 25)];
            }

            current += '.';

            for (let i = 0; i < 27; i++) {
                if (Math.random() > 0.4) current += a[Math.round(Math.random() * 25)].toUpperCase();
                else if (Math.random() > 0.3) current += a[Math.round(Math.random() * 25)];
                else if (Math.random() > 0.5) current += b[Math.round(Math.random())];
                else current += Math.round(Math.random() * 9);
            }

            final.push(current);
        }

        return amount === 1 ? final[0] : final;
    }

    static randomID(amount = 1) {
        const dates = this.randomDate(amount);
        const arr = [];
        for (const date of dates) arr.push(SnowflakeUtil.generate(date));
        return arr;
    }

    static randomDate(amount = 1) {
        const epoch = 1420070400000;
        const arr = [];
        for (let i = 0; i < amount; i++) arr.push(new Date(epoch + Math.random() * (Date.now() - epoch)).getTime());
        return arr;
    }

    static wait(ms) {
        return new Promise(resolve => {
            setTimeout(resolve, ms);
        });
    }

    static getPrefix(message) {
        return new RegExp(`<@!?${message.client.user.id}>`).test(message.util.parsed.prefix) ? `@${message.client.user.tag} ` : message.util.parsed.prefix;
    }
}

module.exports = Util;