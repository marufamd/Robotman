import { Command } from 'discord-akairo';
import type { Message } from 'discord.js';
import { writeFile } from 'fs/promises';
import { basename, extname } from 'path';
import request from '../../util/request';

export default class extends Command {
    public constructor() {
        super('download', {
            aliases: ['download', 'dl'],
            description: {
                info: 'Downloads a file to the specified path.',
                usage: '<url> <path> <options>'
            },
            ownerOnly: true,
            args: [
                {
                    id: 'url',
                    type: 'string',
                    prompt: {
                        start: 'What url would you like to download from?'
                    }
                },
                {
                    id: 'path',
                    type: 'string'
                },
                {
                    id: 'json',
                    match: 'flag',
                    flag: ['-json', '--json']
                }
            ]
        });
    }

    public async exec(message: Message, { url, path, json }: { url: string; path: string; json: boolean }) {
        try {
            const res = await request.get(url);

            let body = json ? res.body : res.text;

            if (json && typeof res === 'string') body = body.split('\n');

            body = json ? JSON.stringify(body, null, 4) : res;

            if (path) {
                await writeFile(path.startsWith('./') ? path : `./${path}`, body);
                return message.util.send(`Downloaded \`${basename(url, extname(url))}\` to \`${path}\``);
            }

            return message.util.send({
                files: [{
                    name: `download.${json ? 'json' : 'txt'}`,
                    attachment: Buffer.from(body)
                }]
            });
        } catch (e) {
            return message.util.send(`Unable to download file: \`${e.message}\``);
        }
    }
}