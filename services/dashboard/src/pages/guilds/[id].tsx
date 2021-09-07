import GuildPageDisplay from '#components/guild/GuildPageDisplay';
import Loading from '#components/display/Loading';
import { useDiscordUser } from '#hooks/discord';
import { useRouter } from 'next/router';
import { useEffect } from 'react';

const GuildPage = () => {
	const router = useRouter();
	const user = useDiscordUser();

	const guild = user?.guilds.find((g) => g.id === router.query.id);

	useEffect(() => {
		if (!user && router.isReady) {
			void router.push('/');
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [user]);

	return user && router.isReady ? <GuildPageDisplay guild={guild} /> : <Loading mt="20%" size="xl" />;
};

export default GuildPage;
