import GuildCard from '#components/guild/GuildCard';
import Layout from '#components/display/Layout';
import { useDiscordUser } from '#hooks/discord';
import { Grid, Heading, useBreakpointValue } from '@chakra-ui/react';

const HomePage = () => {
	const user = useDiscordUser();

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
