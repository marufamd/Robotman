export interface Session {
	userId: string;
	username: string;
	displayName: string;
	avatarUrl: string | null;
}

export function parseSession(input: unknown): Session {
	if (
		typeof input !== "object" ||
		input === null ||
		!("userId" in input) ||
		!("username" in input) ||
		!("displayName" in input) ||
		!("avatarUrl" in input)
	) {
		console.error("Invalid session payload. Input:", input);
		throw new Error("Invalid session payload");
	}

	const { userId, username, displayName, avatarUrl } = input as Record<string, unknown>;

	if (typeof userId !== "string" || typeof username !== "string" || typeof displayName !== "string") {
		throw new Error("Invalid session payload");
	}

	if (avatarUrl !== null && typeof avatarUrl !== "string") {
		throw new Error("Invalid session payload");
	}

	return {
		userId,
		username,
		displayName,
		avatarUrl,
	};
}
