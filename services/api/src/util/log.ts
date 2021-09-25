import type { Methods } from '#util/interfaces';
import { parseWebhook, toTitleCase, trim } from '#util/util';
import { REST } from '@discordjs/rest';
import type { APIEmbed } from 'discord-api-types/v9';
import { APIVersion as version, Routes } from 'discord-api-types/v9';
import * as colorette from 'colorette';

const { id, token } = parseWebhook(process.env.WEBHOOK_URL);
const rest = new REST({ version }).setToken(token);

export function log(text: any, type: 'log' | 'error' = 'log', route?: { path: string; method: Methods }) {
	text = type === 'error' ? text?.stack ?? text : text;

	consoleLog(text, type);

	const formatText = trim(String(text), 3900);

	const embed: APIEmbed = {
		title: `API ${toTitleCase(type)} ${process.env.NODE_ENV === 'development' ? '(Development)' : ''}`,
		description: type === 'error' ? `\`\`\`js\n${formatText}\`\`\`` : formatText,
		color: type === 'error' ? 14429952 : 56374
	};

	if (route) {
		embed.fields = [
			{
				name: 'Route',
				value: `\`${route.method?.toUpperCase()} ${route.path}\``
			}
		];
	}

	void rest
		.post(Routes.webhook(id, token), {
			body: {
				content: `<t:${Math.round(new Date().getTime() / 1000)}:f>`,
				embeds: [embed]
			}
		})
		.catch((e) => consoleLog(e, 'error'));
}

function consoleLog(text: any, type: 'log' | 'error') {
	console[type](colorette.bold(colorette[type === 'error' ? 'red' : 'green'](text?.replaceAll?.(/(```(\w+)?|`|\*|__|~~)/g, '') ?? text)));
}
