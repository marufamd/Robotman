import LoginButton from '#components/buttons/LoginButton';
import { useDiscordUser } from '#hooks/discord';
import type { FlexProps } from '@chakra-ui/react';
import { Box, Flex, Link, useBreakpointValue } from '@chakra-ui/react';
import Logo from '#components/icons/Logo';
import MobileIcon from '#components/icons/MobileIcon';
import UserMenu from '#components/navigation/UserMenu';

import styles from '#styles/nav.module.css';

const NavBar = (props: FlexProps) => {
	const user = useDiscordUser();

	const display = useBreakpointValue({ base: 'none', md: 'block' });

	return (
		<Flex
			as="nav"
			align="center"
			justify="space-between"
			wrap="wrap"
			w="100%"
			mb={4}
			px={4}
			bgColor="gray.800"
			shadow="md"
			className={styles.navBar}
			zIndex="1"
			{...props}
		>
			<Link href="/">
				<Box p={2.5} transition="all 0.2s cubic-bezier(.08,.52,.52,1)" _hover={{ bgColor: 'whiteAlpha.100' }}>
					{display === 'none' ? <MobileIcon /> : <Logo />}
				</Box>
			</Link>
			{user ? (
				<UserMenu />
			) : (
				<Box>
					<LoginButton />
				</Box>
			)}
		</Flex>
	);
};

export default NavBar;
