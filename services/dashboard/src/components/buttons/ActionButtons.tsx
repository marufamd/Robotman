import { Button, ButtonGroup, LightMode, useDisclosure } from '@chakra-ui/react';
import AutoResponseModal from '#components/modals/AutoResponseModal';
import { useRouter } from 'next/router';
import { toast } from '#utils/util';
import { useMutationDeleteResponse } from '#hooks/mutations';
import { useDiscordUser } from '#hooks/discord';
import type { DeletePayload } from '@robotman/types';

const ActionButtons = ({ id }: { id: number }) => {
	const router = useRouter();
	const user = useDiscordUser();
	const { isOpen, onOpen, onClose } = useDisclosure();

	const { isLoading, mutateAsync: deleteResponse } = useMutationDeleteResponse(router.query.id as string, id);

	const handleDelete = async () => {
		const payload: DeletePayload = {
			user: user.id,
			user_tag: user.tag
		};

		try {
			await deleteResponse(payload, {
				onSuccess: (data) => {
					toast({
						title: 'Success',
						description: `Deleted the response ${data.name}.`,
						status: 'success',
						position: 'top',
						isClosable: true
					});
				}
			});
		} catch (err: any) {
			toast({
				title: `Unable to delete response.`,
				description: err.message,
				status: 'error',
				position: 'top',
				isClosable: true
			});

			console.log(err.stack ?? err);
		}
	};

	return (
		<>
			<ButtonGroup spacing={3} size="sm">
				<Button colorScheme="blurple" color="white" onClick={onOpen} isDisabled={isLoading}>
					Edit
				</Button>
				<LightMode>
					<Button colorScheme="red" color="white" onClick={handleDelete} isLoading={isLoading} isDisabled={isOpen || isLoading}>
						Delete
					</Button>
				</LightMode>
			</ButtonGroup>

			<AutoResponseModal id={id} isOpen={isOpen} onClose={onClose} />
		</>
	);
};

export default ActionButtons;
