import type { DiscordUser } from '@robotman/types';
import { getUserState } from '#utils/util';
import constate from 'constate';
import { useState } from 'react';

const state = getUserState();

const useDiscordUserState = () => {
	const [user, setUser] = useState<DiscordUser>(state ?? null);

	return { user, setUser };
};

export const [DiscordUserProvider, useDiscordUser, setDiscordUser] = constate(
	useDiscordUserState,
	(value) => value.user,
	(value) => value.setUser
);
