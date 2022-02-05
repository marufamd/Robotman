import ActionHistoryModal from '#components/modals/ActionHistoryModal';
import { useQueryHistory } from '#hooks/queries';
import type { FormattedHistory } from '#utils/constants';
import { ACTION_HISTORY_HEADERS } from '#utils/constants';
import { toTitleCase } from '#utils/util';
import { TimeIcon } from '@chakra-ui/icons';
import { Button, useDisclosure } from '@chakra-ui/react';
import { useMemo } from 'react';
import type { Column } from 'react-table';

const HistoryButton = ({ guild }: { guild: string }) => {
	const { isOpen, onOpen, onClose } = useDisclosure();

	const { isLoading, data: history } = useQueryHistory(guild);

	const data: FormattedHistory[] = useMemo(
		() =>
			(history ?? []).map((h) => ({
				date: new Date(h.date).toLocaleString(),
				user: h.user_tag,
				action: `${toTitleCase(h.action)}${h.action === 'delete' ? 'd' : 'ed'} response: ${h.response}`
			})),
		[history]
	);

	const columns = useMemo(
		() =>
			Object.entries(ACTION_HISTORY_HEADERS).map(([k, v]) => {
				const obj = {
					Header: v,
					accessor: k
				};

				if (k === 'date') {
					Reflect.defineProperty(obj, 'sortType', {
						value: 'datetime',
						writable: true,
						enumerable: true,
						configurable: true
					});
				}

				return obj;
			}),
		[]
	) as Column<FormattedHistory>[];

	return (
		<>
			<Button colorScheme="gray" color="white" leftIcon={<TimeIcon />} onClick={onOpen}>
				View History
			</Button>

			<ActionHistoryModal isOpen={isOpen} onClose={onClose} data={data} columns={columns} isLoading={isLoading} />
		</>
	);
};

export default HistoryButton;
