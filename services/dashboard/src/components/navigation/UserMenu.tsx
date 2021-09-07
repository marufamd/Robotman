import { setDiscordUser, useDiscordUser } from '#hooks/discord';
import { clearUserState, fetchAPI } from '#utils/util';
import { Avatar, Button, HStack, Menu, MenuButton, MenuItem, MenuList, Text } from '@chakra-ui/react';
import { useRouter } from 'next/router';
import type { MouseEventHandler } from 'react';

const UserMenu = () => {
	const user = useDiscordUser();
	const router = useRouter();

	const setUser = setDiscordUser();

	const handleLogout: MouseEventHandler<HTMLButtonElement> = async (e) => {
		e.preventDefault();

		await fetchAPI('/auth/logout', { method: 'POST' });

		clearUserState();
		setUser(null);

		void router.push('/');
	};

	return (
		<Menu>
			<MenuButton as={Button} variant="solid" bgColor="whiteAlpha.100">
				<HStack spacing={4}>
					<Text size="md">{user.tag}</Text>
					<Avatar size="sm" src={user.avatar_url} />
				</HStack>
			</MenuButton>
			<MenuList>
				<MenuItem onClick={handleLogout}>Logout</MenuItem>
			</MenuList>
		</Menu>
	);
};

export default UserMenu;
