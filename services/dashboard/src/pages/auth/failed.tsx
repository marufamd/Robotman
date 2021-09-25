import Layout from '#components/display/Layout';
import { Heading } from '@chakra-ui/react';

const AuthFailedPage = () => {
	return (
		<Layout>
			<Heading size="4xl">Failed to Login.</Heading>
			<Heading size="md">Please try again.</Heading>
		</Layout>
	);
};

export default AuthFailedPage;
