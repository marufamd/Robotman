import { exec as execAsync } from 'child_process';
import { Command } from 'discord-akairo';
import type { Message } from 'discord.js';
import { promisify } from 'util';
import { paste } from '../../util';

const exec = promisify(execAsync);

export default class extends Command {
    public constructor() {
        super('exec', {
            aliases: ['exec', 'execute', 'commandline'],
            description: {
                info: 'Executes a command on the command line.',
                usage: '<code>'
            },
            regex: /^(?:\$>)(?:\s+)?(.+)/,
            ownerOnly: true,
            args: [
                {
                    id: 'command',
                    type: 'string',
                    match: 'content',
                    prompt: {
                        start: 'What command would you like to execute?'
                    }
                }
            ]
        });
    }

    public async exec(message: Message, { command, match }: { command: string; match: any }) {
        if (!command && match) command = match[1];
        const msg = await message.util.send('Executing...');

        let str = '';

        const start = process.hrtime();
        let executionTime;

        try {
            let { stdout, stderr } = await exec(command);
            executionTime = (process.hrtime(start)[1] / 1000000).toFixed(3);

            if (stdout) {
                if (stdout.length > 900) stdout = `Too long to display (${stdout.length} chars). StdOut was uploaded to hastebin.\n${await paste(stdout, 'sh')}\n`;
                str += `-------------------StdOut-------------------\n${stdout}`;
            }

            if (stderr) {
                if (stderr.length > 900) stderr = `Too long to display (${stderr.length} chars). StdErr was uploaded to hastebin.\n${await paste(stderr, 'sh')}\n`;
                str += `-------------------StdErr-------------------\n${stderr}`;
            }

            if (!stdout && !stderr) str += 'No output recieved';
        } catch (e) {
            executionTime = (process.hrtime(start)[1] / 1000000).toFixed(3);

            if (e.length > 1000) e = `Too long to display. (${e.length} chars). StdErr was uploaded to hastebin.\n${await paste(e, 'sh')}\n`;
            str += `----------------Error----------------\n${e}`;

            this.client.log(`Exec Error:\n${e.stack}`, 'error');
        }

        const arr = [
            '```prolog',
            str,
            '```',
            `Executed in ${executionTime}ms`
        ];

        return msg.edit(arr);
    }
}