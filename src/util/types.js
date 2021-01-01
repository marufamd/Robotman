module.exports = {
    commandCategory: (_, phrase) => {
        if (!phrase) return null;
        if (this.commandHandler.categories.has(phrase)) return this.commandHandler.categories.get(phrase);
        return null;
    },

    clientChannel: (_, phrase) => {
        if (!phrase) return null;
        if (this.channels.cache.has(phrase)) return this.channels.cache.get(phrase);
        return null;
    },

    parsedDate: (_, phrase) => {
        if (!phrase) return null;
        let parsed = Date.parse(phrase);

        if (isNaN(parsed)) {
            const month = phrase.match(/(jan(uary)?|feb(ruary)?|mar(ch)?|apr(il)?|may|jun(e)?|jul(y)?|aug(ust)?|sep(tember)?|oct(ober)?|nov(ember)?|dec(ember)?)/gi);
            const day = phrase.match(/[0-9]{1,2}(st|th|nd|rd|\s)/gi);
            const year = phrase.match(/[0-9]{4}/g);

            if (month && day) {
                parsed = `${month[0]} ${day[0].replace(/(st|nd|rd|th)/gi, '')} ${year?.[0] ?? new Date().getFullYear()}`;
            } else {
                return null;
            }
        }

        return new Date(parsed);
    },

    tag: async (message, phrase) => {
        if (!phrase) return null;
        return await this.tags.get(phrase.toLowerCase(), message.guild.id) ?? null;
    }
};