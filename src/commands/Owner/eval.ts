import { Commands } from '#util/commands';
import type { Command, CommandOptions } from '#util/commands';
import * as util from '#util/misc';
import { request as Request } from '#util/request';
import { codeBlock } from '@discordjs/builders';
import { Type } from '@sapphire/type';
import { isThenable } from '@sapphire/utilities';
import type { Message, MessageOptions } from 'discord.js';
import { Client } from 'discord.js';
import { DateTime as dateTime, Duration as duration } from 'luxon';
import { performance } from 'node:perf_hooks';
import { inject, injectable } from 'tsyringe';
import { inspect } from 'util';

@injectable()
export default class implements Command {
    public lastInput: any = null;
    public lastResult: any = null;

    public constructor(
        private readonly client: Client,
        @inject('commands') private readonly commands: Commands
    ) {}

    public options: CommandOptions = {
        aliases: ['async'],
        description: 'Evaluates code.',
        usage: '<code> [--depth=<integer>]',
        args: [
            {
                name: 'code',
                type: 'codeBlock',
                match: 'content',
                prompt: 'What code would you like to evaluate?'
            },
            {
                name: 'depth',
                type: 'integer',
                match: 'option',
                flags: ['inspect', 'depth', 'd'],
                default: 0
            }
        ],
        owner: true
    };

    public async exec(message: Message, { code, depth }: { code: string; depth: number }) {
        /* eslint-disable @typescript-eslint/no-unused-vars */
        const DateTime = dateTime;
        const Duration = duration;
        const request = Request;
        const { lastInput, lastResult, client, commands } = this;
        /* eslint-enable @typescript-eslint/no-unused-vars */

        this.lastInput = code;

        code = (/(await|async)/g.test(code) || message.alias === 'async') ? `(async () => {${code}})();` : code;

        const msg = await message.send('Evaluating...');

        let content = '';
        let result = null;
        let file = null;
        let type: Type;

        const start = performance.now();

        try {
            result = eval(code);

            type = new Type(result);

            if (isThenable(result)) result = await result;

            content += `**Output**\n`;
        } catch (e) {
            result = e;

            type = new Type(result);

            content += `**Error**\n`;
        }

        const executionTime = (performance.now() - start).toFixed(3);

        this.lastResult = result;

        if (result !== null && typeof result === 'object') result = inspect(result, { depth });

        const displayed = this.displayResult(result);

        if (displayed.length > 1800) {
            file = Buffer.from(displayed);
            content += `Output was uploaded as a file. (${displayed.length} chars)\n`;
        } else {
            content += codeBlock('js', displayed);
        }

        content += `\n**Type**\n${codeBlock('ts', type.toString())}`;
        content += `\nExecuted in ${executionTime}ms`;

        const options: MessageOptions = { content, files: [] };

        if (file) {
            options.files.push({
                name: 'output.js',
                attachment: file
            });
        }

        return msg.edit(options);
    }

    private displayResult(result: any) {
        let str = result;

        if (result == null) str = String(result);

        if (typeof result === 'string' && !result.length) str = '\u200b';

        str = str.toString?.() ??
            inspect(
                JSON.parse(
                    JSON.stringify(str)
                )
            );

        return util.redact(str.replace(/`/g, '`\u200b'));
    }
}