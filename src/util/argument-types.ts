import type { ArgumentTypeCaster } from 'discord-akairo';
import { DateTime } from 'luxon';

export default {
    codeblock: (_, phrase) => {
        if (!phrase) return null;
        return phrase
            .replace(/^\s*```(js|javascript|sql)?/, '')
            .replace(/```$/, '');
    },

    commandCategory: (message, phrase) => {
        if (!phrase) return null;
        if (message.client.commandHandler.categories.has(phrase.toLowerCase())) return message.client.commandHandler.categories.get(phrase.toLowerCase());
        return null;
    },

    parsedDate: (_, phrase) => {
        if (!phrase) return null;
        const parsed = Date.parse(phrase);
        let str: string;

        if (isNaN(parsed)) {
            if (['next', 'last'].includes(phrase.toLowerCase())) {
                let date = DateTime.local();
                date = date[phrase.toLowerCase() === 'next' ? 'plus' : 'minus']({ days: 7 });
                str = date.toLocaleString();
            } else {
                const month = phrase.match(/(jan(uary)?|feb(ruary)?|mar(ch)?|apr(il)?|may|june?|july?|aug(ust)?|sep(tember)?|oct(ober)?|nov(ember)?|dec(ember)?)/gi);
                const day = phrase.match(/[0-9]{1,2}(st|th|nd|rd|\s)/gi);
                const year = phrase.match(/[0-9]{4}/g);

                if (month && day) {
                    str = `${month[0]} ${day[0].replace(/(st|nd|rd|th)/gi, '')} ${year?.[0] ?? new Date().getFullYear()}`;
                } else {
                    return null;
                }
            }
        }

        return new Date(str ?? parsed);
    },

    tag: (message, phrase) => {
        if (!phrase) return null;
        return message.client.tags.get(phrase.toLowerCase(), message.guild.id);
    }
} as Record<string, ArgumentTypeCaster>;