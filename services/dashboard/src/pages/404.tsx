import Layout from '#components/display/Layout';
import { Heading } from '@chakra-ui/react';

const NotFoundPage = () => {
	return (
		<Layout>
			<Heading size="4xl" textAlign="center">
				404
			</Heading>
			<Heading size="md" textAlign="center">
				{"This page wasn't found."}
			</Heading>
		</Layout>
	);
};

export default NotFoundPage;
