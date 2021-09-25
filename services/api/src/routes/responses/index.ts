import { history } from '#util/history';
import type { Route } from '#util/interfaces';
import { Methods } from '#util/interfaces';
import { log } from '#util/log';
import { transformPayload } from '#util/util';
import type { AutoResponse } from '@robotman/types';
import { Actions } from '@robotman/types';
import { Request, Response } from 'polka';
import { Sql } from 'postgres';
import { inject, injectable } from 'tsyringe';

const error = (res: Response, e: any, method: Methods) => {
	log(e, 'error', { path: `/responses`, method });
	return res.send(400, { error: e.message ?? 'An error occurred.' });
};

@injectable()
export default class implements Route {
	public constructor(@inject('sql') private readonly sql: Sql<any>) {}

	public auth = true;

	public async get(req: Request, res: Response) {
		try {
			const rows = await this.sql<AutoResponse[]>`
            select * from auto_responses
            where guild = ${req.query.guild}
            `;

			return res.send(200, [...rows]);
		} catch (e) {
			return error(res, e, Methods.Get);
		}
	}

	@history('/responses')
	public async post(req: Request, res: Response) {
		try {
			const body = transformPayload(req.body);

			const [row] = await this.sql<AutoResponse[]>`
            insert into auto_responses
            ${this.sql(body as any, ...Object.keys(body))}
            returning *
            `;

			res.send(200, row);

			return {
				action: Actions.Add,
				guild: row.guild,
				user_id: row.author,
				user_tag: row.author_tag,
				response: row.name
			};
		} catch (e) {
			return error(res, e, Methods.Post);
		}
	}
}
