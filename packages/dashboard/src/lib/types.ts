export interface Session {
	userId: string;
	username: string;
	avatarUrl: string | null;
}

export function parseSession(input: unknown): Session {
	if (
		typeof input !== "object" ||
		input === null ||
		!("userId" in input) ||
		!("username" in input) ||
		!("avatarUrl" in input)
	) {
		throw new Error("Invalid session payload");
	}

	const { userId, username, avatarUrl } = input as Record<string, unknown>;

	if (typeof userId !== "string" || typeof username !== "string") {
		throw new Error("Invalid session payload");
	}

	if (avatarUrl !== null && typeof avatarUrl !== "string") {
		throw new Error("Invalid session payload");
	}

	return {
		userId,
		username,
		avatarUrl,
	};
}
