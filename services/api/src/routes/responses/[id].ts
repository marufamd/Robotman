import { Methods } from '#util/interfaces';
import type { Route } from '#util/interfaces';
import { log } from '#util/log';
import type { Request, Response } from 'polka';
import { Sql } from 'postgres';
import { inject, injectable } from 'tsyringe';
import { createHistory, transformPayload } from '#util/util';
import type { AutoResponse, DeletePayload } from '@robotman/types';
import { Actions } from '@robotman/types';

const error = (res: Response, e: any, id: string, method: Methods) => {
	log(e, 'error', { path: `/responses/${id}`, method });
	return res.send(400, { error: e.message ?? 'An error occurred.' });
};

const missing = (req: Request, res: Response) => res.send(404, { error: `An autoresponse with the id ${req.params.id} does not exist.` });

@injectable()
export default class implements Route {
	public constructor(@inject('sql') private readonly sql: Sql<any>) {}

	public auth = true;

	public async get(req: Request, res: Response) {
		try {
			const [row] = await this.sql<AutoResponse[]>`
				select * from auto_responses
				where id = ${parseInt(req.params.id)}
				`;

			if (row) {
				return res.send(200, row);
			}

			return missing(req, res);
		} catch (e) {
			return error(res, e, req.params.id, Methods.Get);
		}
	}

	public async patch(req: Request, res: Response) {
		try {
			const body = transformPayload(req.body);

			const [row] = await this.sql<AutoResponse[]>`
            update auto_responses set
            ${this.sql(body as any, ...Object.keys(body))}
            where id = ${parseInt(req.params.id)}
            returning *
            `;

			if (row) {
				void createHistory({
					action: Actions.Edit,
					guild: row.guild,
					user: row.editor,
					user_tag: row.editor_tag,
					response: row.name
				}).catch((e) => log(e, 'error', { path: `/responses/${row.id}`, method: Methods.Patch }));

				return res.send(200, row);
			}

			return missing(req, res);
		} catch (e) {
			return error(res, e, req.params.id, Methods.Patch);
		}
	}

	public async delete(req: Request, res: Response) {
		try {
			const body = req.body as DeletePayload;

			const [row] = await this.sql<AutoResponse[]>`
            delete from auto_responses
            where id = ${parseInt(req.params.id)}
            returning *
            `;

			if (row) {
				void createHistory({
					action: Actions.Delete,
					guild: row.guild,
					user: body.user,
					user_tag: body.user_tag,
					response: row.name
				}).catch((e) => log(e, 'error', { path: `/responses`, method: Methods.Post }));

				return res.send(200, row);
			}

			return missing(req, res);
		} catch (e) {
			return error(res, e, req.params.id, Methods.Delete);
		}
	}
}
