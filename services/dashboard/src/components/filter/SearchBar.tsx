/* eslint-disable react/no-children-prop */
import { SearchIcon } from '@chakra-ui/icons';
import type { LayoutProps } from '@chakra-ui/react';
import { Center, Input, InputGroup, InputLeftElement } from '@chakra-ui/react';

const SearchBar: React.FC<
	LayoutProps & {
		filter: any;
		setFilter: (value: any) => void;
	}
> = ({ filter, setFilter, ...rest }) => {
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
