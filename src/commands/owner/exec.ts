import type { Command, CommandOptions } from '#util/commands';
import { log } from '#util/logger';
import { codeBlock } from '@discordjs/builders';
import { exec as execSync } from 'child_process';
import type { Message, MessageOptions } from 'discord.js';
import { performance } from 'node:perf_hooks';
import { promisify } from 'util';

const exec = promisify(execSync);

const lines = (text: string) => `${'-'.repeat(20)}${text}${'-'.repeat(20)}`;

export default class implements Command {
    public options: CommandOptions = {
        aliases: ['execute', 'commandline'],
        description: 'Executes a command on the command line.',
        regex: /^(?:\$>)(?:\s+)?(.+)/,
        args: [
            {
                name: 'command',
                match: 'content',
                prompt: 'What command would you like to execute?'
            }
        ],
        owner: true
    };

    public async exec(message: Message, { command, match }: { command: string; match: RegExpMatchArray }) {
        if (!command && match) command = match[1];

        const msg = await message.send('Executing...');

        let str = '';
        const start = performance.now();

        try {
            const { stdout, stderr } = await exec(command);

            if (stdout) {
                str += `${lines('StdOut')}\n${stdout}`;
            }

            if (stderr) {
                str += `${lines('StdErr')}\n${stderr}`;
            }
        } catch (e) {
            str += `${lines('Error')}\n${e}`;
            log(`Exec Error:\n${e.stack}`, 'error');
        }

        const executionTime = (performance.now() - start).toFixed(3);

        let content = str.length > 2000 ? 'Output was uploaded as a file.' : codeBlock('bash', str);

        content += `\nExecuted in ${executionTime}ms.`;

        const options: MessageOptions = { content, files: [] };

        if (str.length > 2000) {
            options.files.push({
                name: 'output.sh',
                attachment: Buffer.from(content)
            });
        }

        return msg.edit(options);
    }
}