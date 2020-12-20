const fetch = require('node-fetch');
const moment = require('moment');
const beautify = require('js-beautify');
const { stringify } = require('querystring');
const { SnowflakeUtil } = require('discord.js');
const { dirname, basename } = require('path');
const { formats } = require('./constants');

class Util {
    static async fetch(url, params, type = 'json') {
        if (typeof params === 'object' && params !== null) url = `${url}?${stringify(params)}`;
        const res = await fetch(url);
        if (!res.ok) return res;
        return await res[type]();
    }

    static async google(query, safe = 'off') {
        const params = {
            key: process.env.GOOGLE_SEARCH_KEY,
            cx: process.env.GOOGLE_ENGINE_KEY,
            safe,
            q: query
        };

        const res = await Util.fetch('https://www.googleapis.com/customsearch/v1', params);
        if (res.queries.request[0].totalResults == 0 || !res.items) return null;

        return res;
    }

    static async youtube(params, mode = 'search') {
        params.key = process.env.GOOGLE_SEARCH_KEY;
        const res = await Util.fetch(`https://www.googleapis.com/youtube/v3/${mode}`, params);

        if (res.pageInfo.totalResults == 0 || !res.items) return null;
        return res.items[0];
    }

    static async dadJoke() {
        const joke = await fetch('https://icanhazdadjoke.com/', { headers: { 'Accept': 'text/plain' } }).then(res => res.text());
        return joke;
    }

    static async paste(text, format = 'js', url = 'https://hasteb.in', raw = false) {
        if (!text) throw new Error('No text provided');

        const res = await fetch(`${url}/documents`, { method: 'POST', body: text, headers: { 'Content-Type': 'text/plain' } });

        if (!res.ok) throw new Error(res.statusText);
        const { key } = await res.json();

        return `${url}/${raw ? 'raw/' : ''}${key}.${format}`;
    }

    static async pastee(contents, title = 'Paste', lang = 'autodetect', raw = false) {
        if (!contents || !title) throw new Error('No text or title provided.');
        const body = { sections: [{ name: title, syntax: lang, contents }] };

        const res = await fetch('https://api.paste.ee/v1/pastes', {
            method: 'POST',
            body: JSON.stringify(body),
            headers: { 'Content-Type': 'application/json', 'X-Auth-Token': process.env.PASTE_KEY }
        }).then(res => res.json());

        if (!res.success) throw new Error(res.errors[0].message);

        return raw ? res.link.replace('/p/', '/r/') : res.link;
    }

    static findUser(message, query, global = true) {
        let res = message.author;
        const reg = new RegExp(`^${Util.escapeRegex(query)}`, 'i');
        const reg2 = new RegExp(Util.escapeRegex(query), 'i');

        if (!query) return res;

        const member = message.guild.members.cache.find(
            m => m.id === query ||
                m.user.discriminator === query ||
                (message.mentions.members.size && message.mentions.members.first().id === m.id) ||
                reg.test(m.user.tag) ||
                m.nickname && reg.test(m.nickname) ||
                reg2.test(m.user.tag) ||
                m.nickname && reg2.test(m.nickname));

        if (member) res = member.user;

        if (global && !member) {
            const user = message.client.users.cache.find(
                u => u.id === query ||
                    u.discriminator === query ||
                    (message.mentions.users.size && message.mentions.users.first().id === u.id) ||
                    reg.test(u.tag) ||
                    reg2.test(u.tag));
            if (user) res = user;
        }

        return res;
    }

    static findChannel(message, query, type = '') {
        let res = message.channel;
        if (!query) return res;

        const reg = new RegExp(query, 'i');
        let found;

        switch (type) {
            case 'text':
                found = message.guild.channels.cache.find(c => c.type === 'text' && (c.id === query || reg.test(c.name))) || res;
                break;
            case 'voice':
                found = message.guild.channels.cache.find(c => c.type === 'voice' && (c.id === query || reg.test(c.name))) || res;
                break;
            default:
                found = message.guild.channels.cache.find(c => c.id === query || reg.test(c.name)) || res;
                break;
        }

        if (found) res = found;

        return res;
    }

    static findGuild(message, query) {
        let res = message.guild;
        if (!query) return res;
        const reg = new RegExp(query, 'i');

        res = message.client.guilds.cache.find(g => g.id === query || reg.test(g.name) || reg.test(g.nameAcronym)) || res;

        return res;
    }

    static findRole(message, query) {
        let res = null;
        if (!query) return res;

        res = message.guild.roles.cache.find(r => r.id === query || (message.mentions.roles.size && message.mentions.roles.first().id === r.id) || new RegExp(query, 'i').test(r.name)) || res;

        return res;
    }

    static randomResponse(arr) {
        if (!Array.isArray(arr)) throw new TypeError('Function requires an array');
        return arr[Math.floor(Math.random() * arr.length)];
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

    static formatDate(date) {
        return moment.utc(date).format(formats.log);
    }

    static difference(date) {
        return moment().diff(date, 'years', true).toFixed(2);
    }

    static formatQuery(str) {
        return Util.title(str).split(' ').join('_');
    }

    static getValues(arr, ...objs) {
        for (const obj of objs) {
            for (const value of Object.values(obj)) {
                if (typeof value === 'object' && value !== null) {
                    Util.getValues(value);
                } else {
                    arr.push(value);
                }
            }
        }
    }

    static redact(str) {
        if (typeof str !== 'string') return str;
        const tokens = [
            process.env.WEBHOOK_URL,
            process.env.DISCORD_TOKEN,
            process.env.DATABASE_URL,
            process.env.GOOGLE_SEARCH_KEY,
            process.env.GOOGLE_ENGINE_KEY,
            process.env.SERVICE_ACCOUNT_EMAIL,
            process.env.SERVICE_ACCOUNT_KEY,
            process.env.SPREADSHEET,
            process.env.COMICVINE_KEY,
            process.env.PASTE_KEY,
            process.env.DICTIONARY_KEY,
            process.env.MOVIEDB_KEY
        ];
        return str.replaceAll(new RegExp(tokens.map(t => Util.escapeRegex(t)).join('|'), 'gi'), '[REDACTED]');
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

        for (let j = 0; j < amount; j++) {
            let current = `${Buffer.from(ids[j]).toString('base64')}.C`;

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
}

module.exports = Util;