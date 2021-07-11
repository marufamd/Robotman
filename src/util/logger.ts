import * as colorette from 'colorette';
import { MessageEmbedOptions, WebhookClient, Snowflake, Util } from 'discord.js';
import { DateTime } from 'luxon';
import { inspect } from 'util';
import { parseWebhook, codeblock } from '.';
import { Formats, LogTypes } from './constants';

const { NODE_ENV, BOT_OWNER, WEBHOOK_URL } = process.env;
const { id, token } = parseWebhook(WEBHOOK_URL);

const webhook = new WebhookClient(id as Snowflake, token);

type ConsoleType = 'log' | 'error' | 'info' | 'warn';
type ColoretteType = 'green' | 'red' | 'blue' | 'yellow';

interface LogOptions {
    logToWebhook?: boolean;
    logToConsole?: boolean;
    code?: boolean | string;
    ping?: boolean;
}

export default class Logger {
    public static log(text: any, logType: ConsoleType = 'log', { logToWebhook = true, logToConsole = true, code = false, ping = false }: LogOptions = {}, extra: MessageEmbedOptions = {}): void {
        if (Array.isArray(text)) text = text.join('\n');
        if (typeof text === 'object') text = inspect(text);
        if (!(logType.toLowerCase() in LogTypes)) logType = 'log';

        if (logToConsole) Logger.write(text?.replaceAll(/(```(\w+)?|`|\*|__|~~)/g, ''), logType);
        if (logToWebhook && id && token) Logger.webhook(text, logType, ping, code, extra);
    }

    private static write(text: string, logType: ConsoleType): void {
        console[logType](
            colorette.gray(`[${DateTime.local().setZone('est').toFormat(Formats.LOG)}] `),
            colorette.bold(colorette[LogTypes[logType].name as ColoretteType](text))
        );
    }

    private static webhook(text: string, logType: ConsoleType, ping: boolean, code: boolean | string, extra: MessageEmbedOptions): void {
        const mode = LogTypes[logType];
        const embed: MessageEmbedOptions = {
            title: `${mode.title} ${NODE_ENV === 'development' ? '(Development)' : ''}`,
            color: mode.color,
            footer: { text: DateTime.local().setZone('est').toFormat(Formats.LOG) }
        };

        if (typeof extra === 'object') Object.assign(embed, extra);

        try {
            if (text.length < 2040) {
                if (logType === 'error') text = `\`\`\`xl\n${text}\`\`\``;
                else if (code) text = `\`\`\`${typeof code === 'string' ? code : 'js'}\n${text}\`\`\``;

                if (typeof embed.description === 'undefined') embed.description = text;
                void webhook.send({
                    content: ping ? `<@${BOT_OWNER}>` : null,
                    embeds: [embed]
                });
            } else {
                void webhook.send({
                    content: ping ? `<@${BOT_OWNER}>` : null,
                    embeds: [embed]
                });

                const texts = Util.splitMessage(text, { maxLength: 1980, char: '' });

                for (const item of texts) {
                    void webhook.send(
                        codeblock(
                            item,
                            logType === 'error'
                                ? 'xl'
                                : (code === true ? 'js' : code as string)
                        )
                    );
                }
            }
        } catch (e) {
            Logger.write(e, 'error');
        }
    }
}