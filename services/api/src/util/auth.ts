import type { Middleware } from 'polka';
import { COOKIE_NAME } from '#util/constants';
import type { Route, Session } from '#util/interfaces';
import { deleteCookie } from '#util/util';
import { OAuth } from '#util/oauth';

declare module 'http' {
	interface IncomingMessage {
		auth?: Session | null;
	}
}

export const auth: Middleware = (req, res, next) => {
	const auth = req.cookies[COOKIE_NAME];

	if (!auth) {
		req.auth = null;
	} else {
		req.auth = OAuth.decrypt(auth);

		if (req.auth === null) {
			deleteCookie(res, COOKIE_NAME);
		}
	}

	void next();
};

export const checkAuth = (route: Route): Middleware => {
	return (req, res, next) => {
		if (route.auth && !req.auth) {
			return res.send(401, { error: 'Unauthorized.' });
		}

		void next();
	};
};
