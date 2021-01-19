import { Command } from 'discord-akairo';
import { Message } from 'discord.js';
import { inspect } from 'util';
import * as util from '../../util';

const parse = (obj: util.KVObject): util.KVObject => JSON.parse(JSON.stringify(obj));

/* eslint-disable @typescript-eslint/no-unused-vars */
import { DateTime, Duration } from 'luxon';
import request from '../../util/request';

export default class extends Command {
    public lastInput: any = null;
    public lastResult: any = null;

    public constructor() {
        super('eval', {
            aliases: ['eval', 'async'],
            description: {
                info: 'Evaluates code.',
                usage: '<code>'
            },
            ownerOnly: true,
            args: [
                {
                    id: 'depth',
                    type: 'integer',
                    match: 'option',
                    flag: ['--inspect=', '-inspect=', '--depth=', 'inspect:'],
                    default: 0
                },
                {
                    id: 'code',
                    type: 'codeblock',
                    match: 'rest',
                    prompt: {
                        start: 'What code would you like to evaluate?'
                    }
                }
            ]
        });
    }

    public async exec(message: Message, { code, depth }: { code: string; depth: number }) {
        const { lastInput, lastResult, client } = this;
        const { commandHandler, interactionHandler, sql } = client;

        if (/while\s*\(\s*true\s*\)\s*/gi.test(code)) return message.util.send('No.');

        const msg = await message.util.send('Evaluating...');

        const input = code.length > 950 ? `Too Long to Display (${code.length} chars)` : util.beautify(code);

        let str = `**Input**\n\`\`\`js\n${this.clean(input)}\`\`\``;
        const maxLength = 2000 - input.length;

        const start = process.hrtime();
        let executionTime;

        try {
            const oldInput = code;

            code = code.replaceAll(/(\S*\.)?(client|config).token$/gi, 'util.randomToken()');
            code = /(await|async)/g.test(code) || message.util.parsed.alias === 'async' ? `(async () => {${code}})();` : code;

            let evaled = eval(code);

            executionTime = (process.hrtime(start)[1] / 1000000).toFixed(3);

            if (evaled instanceof Promise) evaled = await evaled;
            const type = evaled?.constructor?.name ?? (evaled?.constructor ? Object.getPrototypeOf(evaled.constructor).name : null);

            if (evaled !== null && typeof evaled === 'object') evaled = inspect(evaled, { depth });

            if (evaled === null) evaled = 'null';
            if (evaled === undefined) evaled = 'undefined';

            if (typeof evaled === 'string' && !evaled.length) evaled = '\u200b';

            evaled = util.redact(this.clean(
                evaled.toString?.() ?? inspect(parse(evaled))
                ));

            this.lastInput = oldInput;
            this.lastResult = evaled;

            if (evaled.length > maxLength) evaled = `Too long to display (${evaled.length} chars). Output was uploaded to hastebin: ${await util.paste(evaled)}\n`;
            else evaled = `\`\`\`js\n${evaled}\`\`\``;

            str += `\n**Output${type ? ` <${type}>` : ''}**\n${evaled}`;
        } catch (e) {
            executionTime = (process.hrtime(start)[1] / 1000000).toFixed(3);

            e = util.redact(this.clean(e.toString()));
            if (e.length > maxLength) e = `Too long to display (${e.length} chars). Error was uploaded to hastebin: ${await util.paste(e, 'js')}\n`;
            else e = `\`\`\`js\n${e}\`\`\``;

            str += `\n**Error**\n${e}`;
        }

        str += `\nExecuted in ${executionTime}ms`;

        return msg.edit(str);
    }

    private clean(str: string) {
        return str.replace(/`/g, '`' + String.fromCharCode(8203));
    }
}