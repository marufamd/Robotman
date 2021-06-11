import { Type } from '@sapphire/type';
import { Command } from 'discord-akairo';
import type { Message } from 'discord.js';
import { DateTime as dateTime, Duration as duration } from 'luxon';
import { inspect } from 'util';
import * as util from '../../util';
import Request from '../../util/request';

const parse = (obj: Record<string, any>): Record<string, any> => JSON.parse(JSON.stringify(obj));

export default class extends Command {
    public lastInput: any = null;
    public lastResult: any = null;

    private readonly TOKEN_REGEX = /(\S*\.)?(client|config).token$/gi;

    public constructor() {
        super('eval', {
            aliases: ['eval', 'async'],
            description: 'Evaluates code.',
            ownerOnly: true,
            args: [
                {
                    id: 'code',
                    type: (message, phrase) => {
                        if (!phrase) return null;
                        const extract = this.handler.resolver.type('codeblock')(message, phrase);
                        if (/while\s*\(\s*true\s*\)\s*/gi.test(extract)) return null;
                        return extract;
                    },
                    match: 'rest',
                    prompt: {
                        start: 'What code would you like to evaluate?',
                        retry: 'Please try again.'
                    }
                },
                {
                    id: 'depth',
                    type: 'integer',
                    match: 'option',
                    flag: ['--inspect=', '-inspect=', '--depth=', 'inspect:'],
                    default: 0
                }
            ]
        });
    }

    public usage = {
        usage: '<code> [--depth=<integer>]'
    };

    public async exec(message: Message, { code, depth }: { code: string; depth: number }) {
        /* eslint-disable @typescript-eslint/no-unused-vars */
        const DateTime = dateTime;
        const Duration = duration;
        const request = Request;
        const { lastInput, lastResult, client } = this;
        const { commandHandler: commands, application: { commands: interactions }, sql } = client;
        /* eslint-enable @typescript-eslint/no-unused-vars */

        const msg = await message.util.send('Evaluating...');

        const start = process.hrtime();

        let str = '';
        let type: Type | undefined = undefined;
        let executionTime: string;

        try {
            const oldInput = code;

            code = code.replaceAll(this.TOKEN_REGEX, 'util.randomToken()');
            code = /(await|async)/g.test(code) || message.util.parsed.alias === 'async' ? `(async () => {${code}})();` : code;

            let evaled = eval(code);
            type = new Type(evaled);

            executionTime = (process.hrtime(start)[1] / 1000000).toFixed(3);

            const has = (type: string) => Reflect.has(evaled, type) && typeof evaled[type] === 'function';

            if (evaled instanceof Promise || (typeof evaled === 'object' && has('then') && has('catch'))) evaled = await evaled;

            if (evaled !== null && typeof evaled === 'object') evaled = inspect(evaled, { depth });

            if (evaled == null) evaled = String(evaled);

            if (typeof evaled === 'string' && !evaled.length) evaled = '\u200b';

            evaled = util.redact(this.clean(evaled.toString?.() ?? inspect(parse(evaled))));

            this.lastInput = oldInput;
            this.lastResult = evaled;

            if (evaled.length > 1800) {
                evaled = `Too long to display (${evaled.length} chars). Output was uploaded to hastebin: ${await util.paste(evaled)}\n`;
            } else {
                evaled = util.codeblock(evaled, 'js');
            }

            str += `**Output**\n${evaled}`;
        } catch (e) {
            if (!type) type = new Type(e);
            executionTime = (process.hrtime(start)[1] / 1000000).toFixed(3);

            e = util.redact(this.clean(e.toString()));

            if (e.length > 1800) {
                e = `Too long to display (${e.length} chars). Error was uploaded to hastebin: ${await util.paste(e, 'js')}\n`;
            } else {
                e = util.codeblock(e, 'js');
            }

            str += `**Error**\n${e}`;
        }

        str += `\n**Type**\n${util.codeblock(type, 'ts')}`;
        str += `\nExecuted in ${executionTime}ms`;

        return msg.edit(str);
    }

    private clean(str: string) {
        return str.replace(/`/g, '`\u200b');
    }
}