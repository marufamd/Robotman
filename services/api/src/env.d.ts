declare namespace NodeJS {
	interface ProcessEnv {
		NODE_ENV: 'production' | 'development';

		PORT: `${number}`;

		CLIENT_ID: string;
		CLIENT_SECRET: string;

		WEB_URL: string;

		WEBHOOK_URL: string;
		POSTGRES_URL: string;
	}
}
