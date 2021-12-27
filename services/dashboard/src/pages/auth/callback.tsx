// Copyright (c) 2020 Skyra Project - Apache License 2.0
// https://github.com/skyra-project/skyra.pw/blob/main/src/pages/oauth/callback.tsx

import Loading from '#components/display/Loading';
import { setDiscordUser } from '#hooks/discord';
import type { DiscordUser } from '@robotman/types';
import { fetchAPI, saveUserState } from '#utils/util';
import { useRouter } from 'next/router';
import { useCallback, useEffect, useState } from 'react';

const AuthCallbackPage = () => {
	const [loading, setLoading] = useState(false);
	const setUser = setDiscordUser();
	const router = useRouter();

	const setAuth = useCallback(
		async (code: string) => {
			setLoading(true);

			try {
				const data = await fetchAPI<DiscordUser>(`/auth/callback`, {
					method: 'POST',
					body: JSON.stringify({
						code,
						redirectUri: `${process.env.NEXT_PUBLIC_WEB_URL}/auth/callback`
					})
				});

				setUser(data);
				saveUserState(data);

				setLoading(false);

				return router.push('/');
			} catch (e: any) {
				setLoading(false);
				console.log(e.stack ?? e);
				return router.push('/auth/failed');
			}
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[]
	);

	useEffect(() => {
		if (router.isReady) {
			void setAuth((router.query.code as string) ?? null);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [router.isReady]);

	return loading ? <Loading mt="20%" size="xl" /> : null;
};

export default AuthCallbackPage;
