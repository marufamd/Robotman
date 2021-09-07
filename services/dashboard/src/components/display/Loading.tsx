import type { SpinnerProps } from '@chakra-ui/react';
import { Flex, Spinner } from '@chakra-ui/react';

const Loading = (props: SpinnerProps) => {
	return (
		<Flex justifyContent="center" alignItems="center" h="100%">
			<Spinner size="xl" {...props} />
		</Flex>
	);
};

export default Loading;
