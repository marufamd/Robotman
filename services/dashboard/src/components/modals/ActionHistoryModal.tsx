import Loading from '#components/display/Loading';
import type { FormattedHistory } from '#utils/constants';
import {
	Button,
	Modal,
	ModalBody,
	ModalCloseButton,
	ModalContent,
	ModalFooter,
	ModalHeader,
	ModalOverlay,
	Table,
	TableContainer,
	Tbody,
	Td,
	Th,
	Thead,
	Tr
} from '@chakra-ui/react';
import type { Column } from 'react-table';
import { useTable, useSortBy } from 'react-table';

const ActionHistoryModal = ({
	data,
	columns,
	isLoading,
	isOpen,
	onClose
}: {
	data: FormattedHistory[];
	columns: Column<FormattedHistory>[];
	isLoading: boolean;
	isOpen: boolean;
	onClose: () => void;
}) => {
	const { getTableProps, getTableBodyProps, headerGroups, rows, prepareRow } = useTable(
		{
			columns,
			data,
			initialState: {
				sortBy: [
					{
						id: 'date',
						desc: true
					}
				]
			}
		},
		useSortBy
	);

	return (
		<Modal size="3xl" isOpen={isOpen} onClose={onClose} scrollBehavior="inside">
			<ModalOverlay />
			<ModalContent>
				<ModalHeader>Action History</ModalHeader>
				<ModalCloseButton />

				<ModalBody>
					{isLoading ? (
						<Loading size="md" />
					) : (
						<TableContainer maxW={{ base: '400px', md: 'unset' }}>
							<Table {...getTableProps()}>
								<Thead>
									{headerGroups.map((headerGroup, i) => (
										<Tr key={i} {...headerGroup.getHeaderGroupProps()}>
											{headerGroup.headers.map((column, i) => (
												<Th key={i} {...column.getHeaderProps()}>
													{column.render('Header')}
												</Th>
											))}
										</Tr>
									))}
								</Thead>
								<Tbody {...getTableBodyProps()}>
									{rows.map((row, i) => {
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
					)}
				</ModalBody>

				<ModalFooter>
					<Button onClick={onClose}>Close</Button>
				</ModalFooter>
			</ModalContent>
		</Modal>
	);
};

export default ActionHistoryModal;
