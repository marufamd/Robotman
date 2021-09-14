import GuildCard from '#components/guild/GuildCard';
import Layout from '#components/display/Layout';
import { setDiscordUser, useDiscordUser } from '#hooks/discord';
import { Grid, Heading, useBreakpointValue } from '@chakra-ui/react';
import { useEffect } from 'react';
import { clearUserState } from '#utils/util';

const HomePage = () => {
	const user = useDiscordUser();
	const setUser = setDiscordUser();

	useEffect(() => {
		if (Date.now() >= user.expires) {
			clearUserState();
			setUser(null);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const columns = useBreakpointValue({ base: 'auto', md: '4' });

	return (
		<Layout>
			<Heading size="4xl">Welcome</Heading>
			<Heading size="md">{user ? 'Please select a server.' : 'Please Login.'}</Heading>
			<Grid templateColumns={`repeat(${columns}, 180px)`} gap={5} placeContent="center">
				{user?.guilds && user.guilds.map((g, i) => <GuildCard guild={g} key={i} />)}
			</Grid>
		</Layout>
	);
};

export default HomePage;
