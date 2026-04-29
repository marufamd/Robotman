function requireEnv(name: "DASHBOARD_API_BASE_URL" | "DASHBOARD_DISCORD_OAUTH_URL") {
	const value = import.meta.env[name];

	if (!value) {
		throw new Error(`Missing required environment variable: ${name}`);
	}

	return value;
}

export function getApiBaseUrl() {
	return requireEnv("DASHBOARD_API_BASE_URL");
}

export function getDiscordOauthUrl() {
	return requireEnv("DASHBOARD_DISCORD_OAUTH_URL");
}
