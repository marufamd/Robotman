import type { ButtonProps } from '@chakra-ui/react';
import { Button } from '@chakra-ui/react';
import { useRouter } from 'next/router';
import DiscordIcon from '#components/icons/DiscordIcon';
import type { MouseEventHandler } from 'react';
import { OAUTH_URL } from '#utils/constants';

const LoginButton = (props: ButtonProps) => {
	const router = useRouter();

	const handleLogin: MouseEventHandler<HTMLButtonElement> = (e) => {
		e.preventDefault();
		void router.push(OAUTH_URL);
	};

	return (
		<Button onClick={handleLogin} colorScheme="blurple" color="white" leftIcon={<DiscordIcon />} {...props}>
			Login
		</Button>
	);
};

export default LoginButton;
