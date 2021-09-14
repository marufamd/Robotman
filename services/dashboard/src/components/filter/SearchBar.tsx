/* eslint-disable react/no-children-prop */
import { SearchIcon } from '@chakra-ui/icons';
import type { InputProps } from '@chakra-ui/react';
import { Center, Input, InputGroup, InputLeftElement } from '@chakra-ui/react';

const SearchBar = ({
	filter,
	setFilter,
	...rest
}: InputProps & {
	filter: any;
	setFilter: (value: any) => void;
}) => {
	return (
		<Center>
			<InputGroup>
				<InputLeftElement pointerEvents="none" children={<SearchIcon />} />
				<Input placeholder="Search" value={filter} onChange={(e) => setFilter(e.target.value)} {...rest} />;
			</InputGroup>
		</Center>
	);
};

export default SearchBar;
