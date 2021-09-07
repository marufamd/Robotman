import type { Middleware } from 'polka';
import cookie from 'cookie';
import { COOKIE_NAME } from '#util/constants';
import type { Route, Session } from '#util/interfaces';
import { decryptSession, deleteCookie } from '#util/util';

declare module 'polka' {
	interface Request {
		auth?: Session | null;
	}
}

export const auth: Middleware = (req, res, next) => {
	const cookies = cookie.parse(req.headers.cookie ?? '');

	const auth = cookies[COOKIE_NAME];

	if (!auth) {
		req.auth = null;
	} else {
		req.auth = decryptSession(auth);

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
