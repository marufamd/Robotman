import HistoryButton from '#components/buttons/HistoryButton';
import SearchBar from '#components/filter/SearchBar';
import AutoResponseModal from '#components/modals/AutoResponseModal';
import { AddIcon, ArrowBackIcon, ArrowForwardIcon } from '@chakra-ui/icons';
import {
	Button,
	HStack,
	NumberDecrementStepper,
	NumberIncrementStepper,
	NumberInput,
	NumberInputField,
	NumberInputStepper,
	Stack,
	Table,
	TableContainer,
	Tbody,
	Td,
	Text,
	Th,
	Thead,
	Tr,
	useBreakpointValue,
	useDisclosure,
	VStack
} from '@chakra-ui/react';
import type { AutoResponse } from '@robotman/types';
import type { Column } from 'react-table';
import { useFilters, useGlobalFilter, usePagination, useSortBy, useTable } from 'react-table';

declare module 'react-table' {
	export interface TableInstance<D> extends UseGlobalFiltersInstanceProps<D>, UsePaginationInstanceProps<D>, UseSortByInstanceProps<D> {}
	export interface TableState<D> extends UseGlobalFiltersState<D>, UsePaginationState<D>, UseSortByState<D> {}
	export interface ColumnInstance<D> extends UseFiltersColumnProps<D> {}
}

const AutoResponseDisplay = ({ data, columns, guild }: { data: AutoResponse[]; columns: Column<AutoResponse>[]; guild: string }) => {
	const { isOpen, onOpen, onClose } = useDisclosure();

	const {
		getTableProps,
		getTableBodyProps,
		headerGroups,
		page,
		canNextPage,
		nextPage,
		canPreviousPage,
		previousPage,
		pageOptions,
		gotoPage,
		pageCount,
		prepareRow,
		state: { globalFilter, pageIndex },
		setGlobalFilter
	} = useTable(
		{
			columns,
			data,
			initialState: {
				hiddenColumns: ['id', 'content', 'created'],
				sortBy: [
					{
						id: 'created',
						desc: true
					}
				]
			}
		},
		useFilters,
		useGlobalFilter,
		useSortBy,
		usePagination
	);

	const handleNumberInput = (_: string, val: number) => gotoPage(Number.isInteger(val) ? val - 1 : 0);

	const direction: 'column' | 'row' = useBreakpointValue({ base: 'column', md: 'row' });

	return (
		<VStack spacing={5}>
			<Stack direction={direction} spacing={15} alignItems="center" justifyContent="center">
				<HistoryButton guild={guild} />
				<Button colorScheme="blurple" color="white" leftIcon={<AddIcon />} onClick={onOpen}>
					Add Response
				</Button>
				<AutoResponseModal isOpen={isOpen} onClose={onClose} />
				<SearchBar filter={globalFilter} setFilter={setGlobalFilter} />
			</Stack>
			<TableContainer maxW={{ base: '400px', md: 'unset' }}>
				<Table variant="simple" border="1px" borderColor="gray.700" {...getTableProps}>
					<Thead>
						{headerGroups.map((headerGroup, i) => (
							<Tr key={i} {...headerGroup.getHeaderGroupProps()}>
								{headerGroup.headers.map((column, i) => (
									<Th key={i} {...column.getHeaderProps()}>
										{column.id === 'type' ? column.render('Filter') : column.render('Header')}
									</Th>
								))}
							</Tr>
						))}
					</Thead>
					<Tbody {...getTableBodyProps()}>
						{page.map((row, i) => {
							prepareRow(row);
							return (
								<Tr key={i} {...row.getRowProps()}>
									{row.cells.map((cell, i) => (
										<Td key={i} {...cell.getCellProps()}>
											{cell.render('Cell')}
										</Td>
									))}
								</Tr>
							);
						})}
					</Tbody>
				</Table>
			</TableContainer>
			<Stack direction={direction} spacing={5} alignItems="center" justifyContent="center">
				<HStack spacing={5}>
					<Button colorScheme="blurple" color="white" disabled={!canPreviousPage} onClick={previousPage} leftIcon={<ArrowBackIcon />}>
						Back
					</Button>
					<Text>
						Page {pageIndex + 1} of {pageOptions.length}
					</Text>
					<Button colorScheme="blurple" color="white" disabled={!canNextPage} onClick={nextPage} rightIcon={<ArrowForwardIcon />}>
						Next
					</Button>
				</HStack>
				<HStack spacing={5}>
					<Text>Jump to</Text>
					<NumberInput w="80px" defaultValue={pageIndex + 1} min={1} max={pageCount} onChange={handleNumberInput}>
						<NumberInputField />
						<NumberInputStepper>
							<NumberIncrementStepper />
							<NumberDecrementStepper />
						</NumberInputStepper>
					</NumberInput>
				</HStack>
			</Stack>
		</VStack>
	);
};

export default AutoResponseDisplay;
