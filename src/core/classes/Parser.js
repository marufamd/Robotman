module.exports = class Parser {
    constructor(handler) {
        Object.defineProperties(this, {
            handler: { value: handler },
            client: { value: handler.client }
        });
    }

    parseQuotes(args) {
        if (!args) throw new Error("No arguments provided.");
        let joined = Array.isArray(args) ? args.join(" ") : args;

        let quotes = joined.match(/"(.*?)"/g);
        if (!quotes || !quotes.length) return Array.isArray(args) ? args : args.split(" ");

        for (const quote of quotes) joined = joined.replace(quote, `{${quotes.indexOf(quote)}}`);
        quotes = quotes.map(a => a.replaceAll('"', ""));

        return joined
            .split(" ")
            .map(a => a.replace(/\{([0-9])\}/, (_, p1) => quotes[p1]));
    }

    parseFlags(args, data) {
        if (typeof data !== "object") throw new Error("Insufficient parameters.");
        args = Array.isArray(args) ? args : args.split(" ");

        const returned = {};

        for (const [key, options] of Object.entries(data)) {
            if (typeof options.matches === "string") options.matches = [options.matches];

            if (options.index || options.index === 0) {
                const reg = f => this.getRegex(f, options.option).exec(args[options.index]);
                const find = options.matches.find(reg);
                if (find) {
                    returned[key] = options.option ? reg(find)[1] : true;
                    args.splice(options.index, 1);
                }
                continue;
            }

            for (const match of options.matches) {
                for (const arg of args) {
                    const reg = this.getRegex(match, options.option).exec(arg);
                    if (reg) {
                        args.splice(args.indexOf(arg), 1);
                        returned[key] = options.option ? reg[1] : true;
                        break;
                    }
                }

                if (returned[key]) break;
            }
        }

        return { args, flags: returned };
    }

    getRegex(flag, mode) {
        return new RegExp(`-+${flag}${mode ? "=(.+)" : "$"}`, "gi");
    }
};