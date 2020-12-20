const { Command } = require('discord-akairo');
const { basename, extname } = require("path");
const { writeFile } = require("fs/promises");
const { fetch } = require('../../util');

module.exports = class extends Command {
    constructor() {
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
                    id: 'array',
                    match: 'flag',
                    flag: ['-array', '--array']
                },
                {
                    id: 'json',
                    match: 'flag',
                    flag: ['-json', '--json']
                }
            ],
        });
    }

    async exec(message, { url, path, array, json }) {
        const toJSON = json || array;

        let res = await fetch(url, null, json ? 'json' : 'text');
        if (res.ok === false) return message.util.send(`Unable to download file: \`${res.statusText}\``);
        
        if (array && typeof res === 'string') res = res.split('\n');
        res = toJSON ? JSON.stringify(res, null, 4) : res;
        if (path) {
            await writeFile (path.startsWith('./') ? path : `./${path}`, res);
            return message.util.send(`Downloaded \`${basename(url, extname(url))}\` to \`${path}\``);
        } else {
            res = Buffer.from(res);
            return message.util.send({ files: [{ name:`download.${toJSON ? 'json' : 'txt'}`, attachment: res }] });
        }
    }
};