import type { Command } from '#util/commands';
import { PromptOptions, Timezones } from '#util/constants';
import { closest, parseRGB, resolveColor } from '#util/misc';
import type { Message } from 'discord.js';
import type { Args } from 'lexure';
import { fail, finish, joinTokens, loop1Async, step } from 'lexure';
import { DateTime } from 'luxon';

const fnOrAny = (fn: any | ((message: Message) => string), message: Message) => typeof fn === 'function' ? fn(message) : fn;

export type ArgumentMatch = 'single' | 'rest' | 'content' | 'flag' | 'option';
export type ContentSupplier = string | ((message: Message) => string);

export interface ArgumentOption {
    name?: string;
    type?: ArgumentType;
    match?: ArgumentMatch;
    default?: unknown | ((message: Message) => string);
    required?: boolean;
    flags?: string[];
    prompt?: ContentSupplier;
    otherwise?: ContentSupplier;
}

export type ArgumentType = keyof ArgumentTypeEntries | ArgumentTypeCaster | string[] | string[][];
export type ArgumentTypeCaster = (message: Message, arg: string) => unknown;

export interface ArgumentTypeEntries {
    string: string;
    lowercase: string;
    uppercase: string;
    number: number;
    integer: number;
    codeBlock: string;
    date: Date;
    timezone: string;
    color: number;
}

export const ArgumentTypes: { [key: string]: ArgumentTypeCaster } = {
    string: (_, arg) => arg || null,

    lowercase: (_, arg) => arg?.toLowerCase() || null,

    uppercase: (_, arg) => arg?.toUpperCase() || null,

    number: (_, arg) => {
        const parsed = parseFloat(arg);
        if (!arg || isNaN(parsed)) return null;
        return parsed;
    },

    integer: (_, arg) => {
        const parsed = parseInt(arg);
        if (!arg || isNaN(parsed)) return null;
        return parsed;
    },

    codeBlock: (_, arg) => {
        if (!arg) return null;
        return arg
            .replace(/^\s*```(js|javascript|ts|typescript|sql)?/, '')
            .replace(/```$/, '');
    },

    date: (_, arg) => {
        if (!arg) return null;

        const parsed = Date.parse(arg);
        let str: string;

        if (isNaN(parsed)) {
            if (['next', 'last'].includes(arg.toLowerCase())) {
                let date = DateTime.local();
                date = date[arg.toLowerCase() === 'next' ? 'plus' : 'minus']({ days: 7 });
                str = date.toLocaleString();
            } else {
                const month = arg.match(/(jan(uary)?|feb(ruary)?|mar(ch)?|apr(il)?|may|june?|july?|aug(ust)?|sep(tember)?|oct(ober)?|nov(ember)?|dec(ember)?)/gi);
                const day = arg.match(/[0-9]{1,2}(st|th|nd|rd|\s)/gi);
                const year = arg.match(/[0-9]{4}/g);

                if (month && day) {
                    str = `${month[0]} ${day[0].replace(/(st|nd|rd|th)/gi, '')} ${year?.[0] ?? new Date().getFullYear()}`;
                } else {
                    return null;
                }
            }
        }

        return new Date(str ?? parsed);
    },

    timezone: (_, arg) => {
        if (!arg) return null;
        const target = closest(arg.toLowerCase().split(' ').join('_'), Timezones.map(t => t.toLowerCase()));
        return Timezones.find(t => t.toLowerCase() === target);
    },

    color: (_, arg) => {
        arg = arg.toUpperCase();

        let resolve;

        const split = arg.split(/ +/);

        if (split.length === 3 && !isNaN(parseRGB(split[0]))) {
            resolve = split.map(a => parseRGB(a));
        } else {
            resolve = arg
                .replaceAll(/ +/g, '_')
                .replaceAll('#', '');

            resolve = resolve.length !== 6 ? (isNaN(parseInt(resolve)) ? resolve : parseInt(resolve)) : resolve;
        }

        const resolved = resolveColor(resolve);

        if (resolved == null) return null;

        return resolved;
    }
};

export const ArgumentUtil = {
    union(...types: ArgumentType[]): ArgumentTypeCaster {
        return async function typeFn(message, arg) {
            for (const type of types) {
                const result = await resolveArgument(arg, type, message);
                if (result != null) return result;
            }

            return null;
        };
    },

    validate(type: ArgumentType, validator: (message: Message, resolved: any) => boolean): ArgumentTypeCaster {
        return async function typeFn(message, arg) {
            const resolved = await resolveArgument(arg, type, message);
            if (resolved == null || !validator(message, resolved)) return null;
            return resolved;
        };
    },

    range(type: ArgumentType, min: number, max: number): ArgumentTypeCaster {
        return ArgumentUtil.validate(type, (_, resolved) => {
            const num = ['number', 'bigint'].includes(typeof resolved)
                ? resolved
                : resolved.length != null
                    ? resolved.length
                    : resolved.size != null
                        ? resolved.size
                        : resolved;

            return num >= min && num <= max;
        });
    }
};

export function resolveArgument<T extends keyof ArgumentTypeEntries>(arg: string, type: T, message?: Message): ArgumentTypeEntries[T];
export function resolveArgument(arg: string, type: ArgumentType, message?: Message): unknown;
export function resolveArgument(arg: string, type: ArgumentType, message?: Message): unknown {
    if (Array.isArray(type)) {
        for (const el of type) {
            if (Array.isArray(el)) {
                if (el.some(str => str.toLowerCase() === arg.toLowerCase())) {
                    return el[0];
                }
            } else if (el.toLowerCase() === arg.toLowerCase()) {
                return el;
            }
        }

        return null;
    }

    const resolver = typeof type === 'string' ? ArgumentTypes[type] : type;
    return resolver(message, arg);
}

export type ArgumentGenerator = (message?: Message) => ArgumentGeneratorOutput;
export type ArgumentGeneratorOutput = Generator<ArgumentOption, Record<string, any>, any>;

export function createArgumentGenerator(args: ArgumentOption[]): ArgumentGenerator {
    return function* generate() {
        const res: Record<string, any> = {};

        for (const arg of args) {
            res[arg.name] = yield arg;
        }

        return res;
    };
}

export async function parseArguments(message: Message, command: Command, args: Args): Promise<Record<string, any>> {
    const generator = command.options.args?.length ? createArgumentGenerator(command.options.args) : command.args;
    const iterator = generator(message);

    const fullState = args.save();

    let current = await iterator.next();

    while (!current.done) {
        let arg = current.value;

        arg = Object.assign({
            type: 'string',
            match: 'single',
            default: undefined,
            required: false
        }, arg);

        if (typeof arg.type === 'function') {
            arg.type = arg.type.bind(command);
        }

        if (typeof arg.default === 'function') {
            arg.default = arg.default.bind(command);
        }

        if (typeof arg.otherwise === 'function') {
            arg.otherwise = arg.otherwise.bind(command);
        }

        if (typeof arg.prompt === 'function') {
            arg.prompt = arg.prompt.bind(command);
        }

        if (['flag', 'option'].includes(arg.match) && arg.default == null) {
            arg.required = false;
        } else if (arg.otherwise != null || arg.prompt != null || arg.default != null) {
            arg.required = true;
        }

        let phrase: string;
        let res: any;

        switch (arg.match) {
            case 'single':
                phrase = args.single();
                break;
            case 'rest':
                phrase = joinTokens(args.many());
                break;
            case 'content':
                const currentState = args.save();

                args.restore(fullState);

                phrase = joinTokens(args.many());

                args.restore(currentState);
                break;
            case 'flag':
                res = args.flag(...arg.flags);
                break;
            case 'option':
                phrase = args.option(...arg.flags);
                break;
        }

        if (arg.match !== 'flag') {
            res = await resolveArgument(phrase, arg.type, message);

            if (res == null) {
                res = await getMissingArgument(message, arg);

                if (res === null) return;
            }
        }

        current = await iterator.next(res);
    }

    return current.value;
}

async function getMissingArgument(message: Message, arg: ArgumentOption) {
    let res;

    if (arg.required) {
        if (arg.default != null) {
            res = fnOrAny(arg.default, message);
        } else if (arg.prompt != null) {
            res = await getPromptedArgument(message, arg);
            if (res == null) return null;
        } else if (arg.otherwise != null) {
            await message.send(fnOrAny(arg.otherwise, message));

            return null;
        } else {
            return null;
        }
    } else {
        res = undefined;
    }

    return res;
}

async function getPromptedArgument(message: Message, arg: ArgumentOption): Promise<unknown> {
    let retries = 0;

    const result = await loop1Async({
        async getInput() {
            if (retries >= PromptOptions.MAX_RETRIES) {
                return fail(PromptOptions.ERRORS.RETRY_LIMIT);
            }

            const input = await prompt(message, arg, retries);

            retries++;

            if (input == null) {
                return fail(PromptOptions.ERRORS.TIMEOUT);
            }

            if (input === 'cancel') {
                return fail(PromptOptions.ERRORS.CANCELLED);
            }

            return step(input);
        },

        // eslint-disable-next-line @typescript-eslint/require-await
        async parse(str: string) {
            const phrase = arg.match === 'single' ? str.split(/ +/g)[0] : str;

            const parsed = await resolveArgument(phrase, arg.type, message);

            if (parsed != null) {
                return finish(parsed);
            }

            return fail(PromptOptions.ERRORS.INCORRECT_TYPE);
        }
    });

    if (!result.success) {
        let errorText: string;

        switch (result.error) {
            case PromptOptions.ERRORS.TIMEOUT:
                errorText = PromptOptions.TEXT.TIMEOUT;
                break;
            case PromptOptions.ERRORS.CANCELLED:
                errorText = PromptOptions.TEXT.CANCEL;
                break;
            case PromptOptions.ERRORS.RETRY_LIMIT:
            case PromptOptions.ERRORS.INCORRECT_TYPE:
                errorText = PromptOptions.TEXT.FAIL;
                break;
        }

        await message.channel.send(errorText);

        return null;
    }

    return result.value;
}

async function prompt(message: Message, arg: ArgumentOption, retries: number): Promise<string> {
    const text = retries >= 1 ? PromptOptions.TEXT.RETRY(await fnOrAny(arg.prompt, message)) : PromptOptions.TEXT.START(await fnOrAny(arg.prompt, message));

    await message.channel.send(text);

    const messages = await message.channel.awaitMessages({
        filter: msg => msg.author.id === message.author.id,
        max: 1,
        time: PromptOptions.TIME
    });

    if (!messages.size) return null;

    return messages.first().content;
}