import { Center, VStack } from '@chakra-ui/react';
import NavBar from '#components/navigation/NavBar';

const Layout = ({ children }: { children: React.ReactNode }) => {
	return (
		<>
			<NavBar />
			<Center>
				<VStack spacing="50px" py={6}>
					{children}
				</VStack>
			</Center>
		</>
	);
};

export default Layout;
