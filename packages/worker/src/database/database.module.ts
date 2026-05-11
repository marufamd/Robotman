import { Inject, Injectable, Module, type OnModuleDestroy } from "@nestjs/common";
import { Pool } from "pg";

import { POSTGRES_POOL } from "./database.constants";

const DEFAULT_POSTGRES_HOST = "127.0.0.1";
const DEFAULT_POSTGRES_PORT = 5432;
const DEFAULT_POSTGRES_DATABASE = "robotman_db";
const DEFAULT_POSTGRES_USER = "robotman";
const DEFAULT_POSTGRES_PASSWORD = "password";

const parseInteger = (value: string | undefined, fallback: number): number => {
	if (!value) {
		return fallback;
	}

	const parsed = Number.parseInt(value, 10);

	return Number.isNaN(parsed) ? fallback : parsed;
};

const createPostgresPool = (): Pool => {
	if (process.env.POSTGRES_URL) {
		return new Pool({
			connectionString: process.env.POSTGRES_URL,
		});
	}

	return new Pool({
		database: process.env.POSTGRES_DB ?? DEFAULT_POSTGRES_DATABASE,
		host: process.env.POSTGRES_HOST ?? DEFAULT_POSTGRES_HOST,
		password: process.env.POSTGRES_PASSWORD ?? DEFAULT_POSTGRES_PASSWORD,
		port: parseInteger(process.env.POSTGRES_PORT, DEFAULT_POSTGRES_PORT),
		user: process.env.POSTGRES_USER ?? DEFAULT_POSTGRES_USER,
	});
};

@Injectable()
class DatabasePoolLifecycle implements OnModuleDestroy {
	public constructor(
		@Inject(POSTGRES_POOL) private readonly pool: Pool,
	) {}

	public async onModuleDestroy(): Promise<void> {
		await this.pool.end();
	}
}

@Module({
	providers: [
		{
			provide: POSTGRES_POOL,
			useFactory: createPostgresPool,
		},
		DatabasePoolLifecycle,
	],
	exports: [POSTGRES_POOL],
})
export class DatabaseModule {}
