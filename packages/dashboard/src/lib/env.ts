function requireEnv(
	name:
		| "DASHBOARD_API_BASE_URL"
		| "DASHBOARD_DISCORD_OAUTH_URL"
		| "DASHBOARD_DISCORD_CLIENT_ID",
) {
	const value = import.meta.env[name];

	if (!value) {
		throw new Error(`Missing required environment variable: ${name}`);
	}

	return value;
}

export function getApiBaseUrl() {
	if (typeof window === "undefined" && process.env.INTERNAL_API_BASE_URL) {
		return process.env.INTERNAL_API_BASE_URL;
	}

	return requireEnv("DASHBOARD_API_BASE_URL");
}

export function getDiscordOauthUrl() {
	return requireEnv("DASHBOARD_DISCORD_OAUTH_URL");
}

export function getDiscordClientId() {
	return requireEnv("DASHBOARD_DISCORD_CLIENT_ID");
}
