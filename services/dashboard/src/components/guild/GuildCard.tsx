import type { DiscordGuild } from '@robotman/types';
import { Avatar, Box, Heading, Link, VStack } from '@chakra-ui/react';

const GuildCard = ({ guild }: { guild: DiscordGuild }) => {
	return (
		<Link href={`guilds/${guild.id}`}>
			<Box
				as="button"
				width="180px"
				height="230px"
				p={6}
				rounded="xl"
				bgColor="blackAlpha.400"
				transition="all 0.2s cubic-bezier(.08,.52,.52,1)"
				_hover={{ bgColor: 'whiteAlpha.100' }}
			>
				<VStack spacing={5}>
					<Avatar size="2xl" bg="blurple.200" name={guild.acronym} src={guild.icon_url} />
					<Heading fontSize="auto">{guild.name}</Heading>
				</VStack>
			</Box>
		</Link>
	);
};

export default GuildCard;
