import ActionButtons from '#components/buttons/ActionButtons';
import AutoResponseDisplay from '#components/display/AutoResponseDisplay';
import TypeSelector from '#components/filter/TypeSelector';
import Layout from '#components/display/Layout';
import Loading from '#components/display/Loading';
import { AUTO_RESPONSE_HEADERS } from '#utils/constants';
import { useQueryResponses } from '#hooks/queries';
import type { AutoResponse, DiscordGuild } from '@robotman/types';
import { toTitleCase } from '#utils/util';
import { Avatar, Heading, HStack } from '@chakra-ui/react';
import { useMemo } from 'react';
import type { Column, Row } from 'react-table';

const GuildPageDisplay = ({ guild }: { guild: DiscordGuild }) => {
	const { data: responses, isLoading: loadingData } = useQueryResponses(guild.id);

	const data = useMemo(() => responses ?? [], [responses]);

	const columns = useMemo(() => {
		const headers: Column<any>[] = Object.entries(AUTO_RESPONSE_HEADERS).map(([k, v]) => {
			let obj = {
				Header: v,
				accessor: k
			};

			if (k === 'type') {
				obj = Object.assign(obj, {
					Cell: ({ row }: { row: Row<AutoResponse> }) => toTitleCase(row.original.type),
					Filter: TypeSelector,
					filter: 'includes'
				});
			}

			return obj;
		});

		headers.push({
			Header: '',
			accessor: 'buttons',
			// eslint-disable-next-line react/display-name
			Cell: ({ row }) => <ActionButtons id={row.original.id} />
		});

		return headers;
	}, []) as Column<AutoResponse>[];

	return (
		<Layout>
			<HStack spacing={5}>
				<Avatar size="xl" bg="blurple.200" name={guild?.acronym} src={guild?.icon_url} />
				<Heading size="3xl">{guild?.name}</Heading>
			</HStack>
			{loadingData ? <Loading size="xl" /> : <AutoResponseDisplay data={data} columns={columns} guild={guild.id} />}
		</Layout>
	);
};

export default GuildPageDisplay;
