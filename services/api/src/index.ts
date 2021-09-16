// eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
require('dotenv').config();

import 'reflect-metadata';

import extensions from '#util/extensions';
import type { Route } from '#util/interfaces';
import { Methods } from '#util/interfaces';
import { log } from '#util/log';
import cors from 'cors';
import helmet from 'helmet';
import { join } from 'node:path';
import type { Middleware } from 'polka';
import polka from 'polka';
import postgres from 'postgres';
import readdirp from 'readdirp';
import { container } from 'tsyringe';
import { json } from 'body-parser';
import { auth, checkAuth } from '#util/auth';

const app = polka({
	onNoMatch(_, res) {
		res.setHeader('Content-Type', 'application/json');
		res.statusCode = 404;
		res.end(JSON.stringify({ error: 'Not found.' }));
	}
});

app.use(cors({ origin: process.env.WEB_URL, credentials: true }));
app.use(helmet() as Middleware);
app.use(json());
app.use(extensions);
app.use(auth);

const sql = postgres(process.env.POSTGRES_URL);

container.register('sql', { useValue: sql });

const METHODS = [Methods.Get, Methods.Post, Methods.Patch, Methods.Delete];

const routes = readdirp(join(__dirname, 'routes'), { fileFilter: '*.js' });

async function init() {
	const loaded = [];

	for await (const file of routes) {
		let routePath = file.path
			.replace(/.js$/g, '')
			.replace(/\[([a-zA-Z]+)\]/g, ':$1')
			.replace(/\\/g, '/')
			.replace(/\/index/g, '');

		routePath = routePath.startsWith('/') ? routePath : `/${routePath}`;

		loaded.push(routePath);

		const route = container.resolve<Route>((await import(file.fullPath)).default);

		for (const method of METHODS) {
			if (method in route) {
				app[method](routePath, checkAuth(route), route[method].bind(route));
			}
		}
	}

	log(`Loaded ${loaded.length} routes:\n\n${loaded.map((r) => `\`${r}\``).join('\n')}`);
}

void init().catch((e) => log(e, 'error'));

app.listen(Number(process.env.PORT), () => {
	log(`Listening on port ${process.env.PORT}`);
});
