import Loading from '#components/display/Loading';
import ModalAccordion from '#components/display/ModalAccordion';
import { useDiscordUser } from '#hooks/discord';
import { useMutationInsertResponse, useMutationUpdateResponse } from '#hooks/mutations';
import { useQueryResponse } from '#hooks/queries';
import { AUTO_RESPONSE_TYPES, AUTO_RESPONSE_VARIABLES } from '#utils/constants';
import type { AutoResponse, AutoResponsePayload, DiscordUser } from '@robotman/types';
import { replaceVariables, toast } from '#utils/util';
import {
	Box,
	Button,
	ButtonGroup,
	Checkbox,
	Flex,
	FormControl,
	FormErrorIcon,
	FormErrorMessage,
	FormLabel,
	HStack,
	Input,
	InputGroup,
	InputRightElement,
	LightMode,
	Modal,
	ModalBody,
	ModalCloseButton,
	ModalContent,
	ModalFooter,
	ModalHeader,
	ModalOverlay,
	Select,
	Text,
	Textarea
} from '@chakra-ui/react';
import { DiscordEmbed, DiscordMention, DiscordMessage, DiscordMessages } from '@skyra/discord-components-react';
import { toHTML } from 'discord-markdown';
import { useRouter } from 'next/router';
import type { FormEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';
import autosize from 'react-autosize-textarea';
import { ChromePicker } from 'react-color';
import { renderToString } from 'react-dom/server';
import { Controller, useFieldArray, useForm } from 'react-hook-form';

type FormValues = Omit<AutoResponse, 'aliases'> & { aliases?: { value: string }[] };

const getHTML = (user: DiscordUser, id: string, content: string) => {
	return toHTML(replaceVariables(user, id, content), {
		embed: true,
		discordCallback: {
			user: () => `@${user.username}`,
			channel: () => `#general`
		},
		cssModuleNames: {}
	})
		.replaceAll(`@${user.username}`, (str) =>
			renderToString(
				<DiscordMention type="user" highlight>
					{str.slice(1)}
				</DiscordMention>
			)
		)
		.replaceAll('#general', (str) => renderToString(<DiscordMention type="channel">{str.slice(1)}</DiscordMention>));
};

const AutoResponseModal = ({ id, isOpen, onClose }: { id?: number; isOpen: boolean; onClose: () => void }) => {
	const user = useDiscordUser();
	const router = useRouter();

	const [name, setName] = useState('');
	const [content, setContent] = useState('');
	const [embed, setEmbed] = useState<boolean>(undefined);
	const [color, setColor] = useState('#000000');

	const {
		reset,
		control,
		register,
		handleSubmit,
		watch,
		formState: { errors, isSubmitting }
	} = useForm<FormValues>();

	const { fields, append, remove } = useFieldArray({ control, name: 'aliases' });

	const isEdit = Boolean(id);

	const { isLoading: loadingQuery, data } = useQueryResponse(router.query.id as string, id, isEdit && isOpen);

	const response = useMemo(() => data, [data]);

	const { isLoading: loadingInsert, mutateAsync: insertResponse } = useMutationInsertResponse(router.query.id as string);
	const { isLoading: loadingUpdate, mutateAsync: updateResponse } = useMutationUpdateResponse(router.query.id as string, id);

	const handleCancel = () => {
		remove();
		reset();
		onClose();
	};

	const handleSave = async (e: FormEvent<HTMLFormElement>) => {
		e.preventDefault();

		await handleSubmit(async (values: FormValues) => {
			const { name, aliases, ...rest } = values;

			let data: AutoResponsePayload = {
				...rest,
				name: name.toLowerCase(),
				aliases: (aliases ?? []).map((a) => a.value?.toLowerCase()),
				author: response?.author ?? user.id,
				author_tag: response?.author_tag ?? user.tag
			};

			if (isEdit) {
				data = Object.assign(data, {
					editor: user.id,
					editor_tag: user.tag
				});
			} else {
				data.guild = router.query.id as string;
			}

			try {
				const options = {
					onSuccess: () => {
						toast({
							title: 'Success',
							description: `${isEdit ? 'Updated' : 'Created'} the response ${data.name}`,
							status: 'success',
							position: 'top',
							isClosable: true
						});
					}
				};

				if (isEdit) {
					await updateResponse(data, options);
				} else {
					await insertResponse(data, options);
				}
			} catch (err: any) {
				toast({
					title: `Unable to ${isEdit ? 'update' : 'create'} the response ${data.name}`,
					description: err.message,
					status: 'error',
					isClosable: true,
					position: 'top'
				});

				console.log(err.stack ?? err);

				return;
			}

			remove();
			reset();
			onClose();
		})(e);
	};

	const watchName = watch('name', response?.name);
	const watchContent = watch('content', response?.content);
	const watchEmbed = watch('embed', response?.embed);
	const watchColor = watch('embed_color', response?.embed_color);

	useEffect(() => {
		setName(watchName);
	}, [watchName, response?.name]);

	useEffect(() => {
		setContent(watchContent);
	}, [watchContent, response?.content]);

	useEffect(() => {
		setEmbed(watchEmbed);
	}, [watchEmbed, response?.embed]);

	useEffect(() => {
		setColor(watchColor);
	}, [watchColor, response?.embed_color]);

	useEffect(() => {
		remove();
		append(response?.aliases?.map((value) => ({ value })) ?? []);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [response?.aliases]);

	return (
		<Modal size="3xl" isOpen={isOpen} onClose={onClose}>
			<ModalOverlay />
			<ModalContent>
				<ModalHeader>{loadingQuery ? '' : `${isEdit ? 'Edit' : 'Add'} Response`}</ModalHeader>
				<ModalCloseButton />
				{loadingQuery ? (
					<Loading size="md" />
				) : (
					<>
						<ModalBody>
							<form id="auto-response-modal" onSubmit={handleSave}>
								<FormControl id="name" mb={4} isInvalid={Boolean(errors.name)}>
									<FormLabel>Name</FormLabel>
									<Input
										{...register('name', {
											required: { value: true, message: 'A response name is required' },
											maxLength: { value: 50, message: 'Response names have a max of 50 characters' }
										})}
										defaultValue={response?.name}
									/>
									<FormErrorMessage>
										<FormErrorIcon />
										{errors.name?.message}
									</FormErrorMessage>
								</FormControl>

								<ModalAccordion name="Aliases">
									{fields.map((field, index) => (
										<Box key={field.id}>
											<FormControl mb={4} isInvalid={Boolean(errors.aliases?.[index]?.value)}>
												<InputGroup>
													<Input
														{...register(`aliases.${index}.value`, {
															required: { value: true, message: 'Aliases cannot be empty' },
															maxLength: { value: 50, message: 'Response names have a max of 50 characters' }
														})}
														defaultValue={field.value}
													/>
													<InputRightElement width="4.5rem">
														<LightMode>
															<Button
																h="2.35rem"
																mr="-0.45rem"
																style={{ borderTopLeftRadius: 0, borderBottomLeftRadius: 0 }}
																colorScheme="red"
																size="sm"
																onClick={() => remove(index)}
															>
																Delete
															</Button>
														</LightMode>
													</InputRightElement>
												</InputGroup>
												<FormErrorMessage>
													<FormErrorIcon />
													{errors.aliases?.[index]?.value.message}
												</FormErrorMessage>
											</FormControl>
										</Box>
									))}
									<Flex justifyContent="flex-end">
										<Button colorScheme="blurple" color="white" size="sm" onClick={() => append({ value: '' })}>
											Add
										</Button>
									</Flex>
								</ModalAccordion>

								<FormControl id="type" mb={4} isInvalid={Boolean(errors.type)}>
									<FormLabel>Type</FormLabel>
									<Select
										{...register('type', {
											required: { value: true, message: 'A response type is required' }
										})}
										textTransform="capitalize"
										defaultValue={response?.type ?? 'regular'}
									>
										{AUTO_RESPONSE_TYPES.map((t) => (
											<option key={t} value={t}>
												{t.replaceAll('_', ' ')}
											</option>
										))}
									</Select>
									<FormErrorMessage>
										<FormErrorIcon />
										{errors.type?.message}
									</FormErrorMessage>
								</FormControl>

								<FormControl id="options" mb={4}>
									<FormLabel>Options</FormLabel>
									<HStack spacing={10}>
										<Controller
											control={control}
											name="wildcard"
											defaultValue={response?.wildcard ?? false}
											render={({ field: { onChange, value, ref } }) => (
												<Checkbox onChange={onChange} ref={ref} isChecked={value}>
													Wildcard
												</Checkbox>
											)}
										/>
										<Controller
											control={control}
											name="embed"
											defaultValue={response?.embed ?? false}
											render={({ field: { onChange, value, ref } }) => (
												<Checkbox onChange={onChange} ref={ref} isChecked={value}>
													Embed
												</Checkbox>
											)}
										/>
									</HStack>
								</FormControl>

								{(embed || (embed === undefined && response?.embed)) && (
									<FormControl id="embed_color" mb={4}>
										<FormLabel>Embed Color</FormLabel>
										<Controller
											control={control}
											name="embed_color"
											defaultValue={response?.embed_color ?? '#000000'}
											render={({ field: { onChange, value, ref } }) => (
												<ChromePicker
													onChange={({ hex }) => onChange(hex)}
													ref={ref}
													color={value}
													styles={{
														default: {
															body: {
																fontFamily: 'var(--chakra-fonts-body)'
															},
															picker: {
																background: 'none',
																borderRadius: '5px',
																boxShadow: 'none',
																borderWidth: '1px'
															}
														}
													}}
												/>
											)}
										/>
									</FormControl>
								)}

								<FormControl id="content" mb={4} isInvalid={Boolean(errors.content)}>
									<FormLabel>Content</FormLabel>
									<Textarea
										minH="unset"
										overflow="hidden"
										resize="none"
										{...register('content', {
											required: { value: true, message: 'Response content cannot be empty' },
											maxLength: { value: 1950, message: 'Response content has a max of 1950 characters' }
										})}
										transition="height none"
										rows={5}
										as={autosize}
										defaultValue={isEdit ? response?.content : null}
									/>
									<FormErrorMessage>
										<FormErrorIcon />
										{errors.content?.message}
									</FormErrorMessage>
								</FormControl>

								<ModalAccordion name="Variables">
									{Object.entries(AUTO_RESPONSE_VARIABLES).map(([key, val]) => (
										<Text key={key}>{`{${key}} - ${val}`}</Text>
									))}
								</ModalAccordion>

								<ModalAccordion name="Preview">
									<DiscordMessages>
										<DiscordMessage author={user.username} avatar={user.avatar_url}>
											<Box
												dangerouslySetInnerHTML={{
													__html: toHTML(name || response?.name || '', {
														embed: true,
														discordCallback: {},
														cssModuleNames: {}
													})
												}}
											></Box>
										</DiscordMessage>
										<DiscordMessage author="Robotman" avatar={process.env.NEXT_PUBLIC_BOT_AVATAR} bot roleColor="#206694">
											<Box
												dangerouslySetInnerHTML={{
													__html: embed
														? renderToString(
																<DiscordEmbed color={color}>
																	<Box
																		dangerouslySetInnerHTML={{
																			__html: getHTML(
																				user,
																				router.query.id as string,
																				content || response?.content || ''
																			)
																		}}
																	></Box>
																</DiscordEmbed>
														  )
														: getHTML(user, router.query.id as string, content || response?.content || '')
												}}
											></Box>
										</DiscordMessage>
									</DiscordMessages>
								</ModalAccordion>
							</form>
						</ModalBody>
						<ModalFooter mt={-5}>
							<ButtonGroup>
								<Button onClick={handleCancel}>Cancel</Button>
								<Button
									type="submit"
									form="auto-response-modal"
									color="white"
									colorScheme="blurple"
									loadingText="Saving"
									isLoading={isSubmitting || loadingInsert || loadingUpdate}
									isDisabled={isSubmitting || loadingInsert || loadingUpdate}
								>
									Save
								</Button>
							</ButtonGroup>
						</ModalFooter>
					</>
				)}
			</ModalContent>
		</Modal>
	);
};

export default AutoResponseModal;
