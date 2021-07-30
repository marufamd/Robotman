import { Snowflake } from 'discord.js';

declare global {
    namespace NodeJS {
        interface ProcessEnv {
            DISCORD_TOKEN: string;
            WEBHOOK_URL: string;
            BOT_OWNER: Snowflake;
            BOT_PREFIX: string;
            BOT_PERMISSIONS: Snowflake;
            POSTGRES_URL: string;
            GOOGLE_SEARCH_KEY: string;
            GOOGLE_ENGINE_KEY: string;
            SERVICE_ACCOUNT_EMAIL: string;
            SERVICE_ACCOUNT_KEY: string;
            SPREADSHEET_ID: string;
            COMICVINE_KEY: string;
            PASTEE_KEY: string;
            WEBSTER_DICTIONARY_KEY: string;
            WEBSTER_THESAURUS_KEY: string;
            OPEN_MOVIE_DB_KEY: string;
            IMGUR_CLIENT_ID: string;
            NODE_ENV: 'production' | 'development';
        }
    }
}