import {
	AUTO_RESPONSE_TYPE_OPTIONS,
	AutoResponseType,
	type AutoResponse,
	type GuildSummary,
	type UpsertAutoResponse,
	UpsertAutoResponseSchema,
} from "@robotman/shared";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { startTransition } from "react";
import { Eye, Info, Plus, Save, Trash2, WandSparkles } from "lucide-react";
import { FieldError } from "~/components/field-error";
import { DiscordPreview } from "~/components/discord-preview";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Select } from "~/components/ui/select";
import { Switch } from "~/components/ui/switch";
import { Textarea } from "~/components/ui/textarea";
import { createAutoResponse, updateAutoResponse } from "~/lib/api";
import { invalidateAutoResponses } from "~/lib/queries";
import type { Session } from "~/lib/types";
import { discordColorToHex, hexToDiscordColor } from "~/lib/utils";

const AUTO_RESPONSE_VARIABLES = [
	"{user} - The mention of the author of the message.",
	"{username} - The username of the author of the message.",
	"{avatar} - The avatar of the author of the message.",
	"{server} - The name of the server.",
	"{channel} - The name of the channel.",
];

function getDefaultValues(
	guildId: string,
	response?: AutoResponse,
): UpsertAutoResponse {
	if (response) {
		return {
			guildId,
			trigger: response.trigger,
			type: response.type,
			content: response.content,
			aliases: response.aliases,
			wildcard: response.wildcard,
			embed: response.embed,
			embedColor: response.embedColor,
		};
	}

	return {
		guildId,
		trigger: "",
		type: AutoResponseType.Regular,
		content: "",
		aliases: [],
		wildcard: false,
		embed: false,
		embedColor: hexToDiscordColor("#ff8c37"),
	};
}

export function AutoResponseEditor({
	guildId,
	guild,
	session,
	selectedResponse,
	onSaved,
	onCancel,
}: {
	guildId: string;
	guild: GuildSummary;
	session: Session;
	selectedResponse?: AutoResponse;
	onSaved: (response: AutoResponse) => void;
	onCancel: () => void;
}) {
	const queryClient = useQueryClient();
	const mutation = useMutation({
		mutationFn: async (payload: UpsertAutoResponse) => {
			if (selectedResponse) {
				return updateAutoResponse(
					guildId,
					selectedResponse.id,
					payload,
				);
			}

			return createAutoResponse(guildId, payload);
		},
		onSuccess: async (response) => {
			await invalidateAutoResponses(queryClient, guildId);
			startTransition(() => onSaved(response));
		},
	});

	const form = useForm({
		defaultValues: getDefaultValues(guildId, selectedResponse),
		validators: {
			onChange: UpsertAutoResponseSchema,
		},
		onSubmit: async ({ value }) => {
			await mutation.mutateAsync(UpsertAutoResponseSchema.parse(value));
		},
	});

	return (
		<div className="grid gap-8 xl:grid-cols-12">
			<div className="rounded-xl border border-white/[0.08] bg-night-950/40 p-8 shadow-2xl shadow-black/20 backdrop-blur-md xl:col-span-7">
				<div className="mb-8 flex items-center justify-between">
					<div>
						<h2 className="font-display text-[32px] font-bold leading-[1.2] tracking-tight text-white">
							{selectedResponse
								? "Edit Auto-Response"
								: "Create Auto-Response"}
						</h2>
						<p className="mt-1 text-base text-night-200/80">
							Configure replies based on keyword triggers.
						</p>
					</div>
					<WandSparkles className="text-sunset-300" size={28} />
				</div>

				<form
					className="space-y-8"
					onSubmit={(event) => {
						event.preventDefault();
						event.stopPropagation();
						void form.handleSubmit();
					}}
				>
					<div className="grid gap-6 lg:grid-cols-2">
						<form.Field
							name="trigger"
							children={(field) => (
								<div className="flex flex-col gap-2">
									<Label htmlFor={field.name}>Trigger</Label>
									<Input
										id={field.name}
										placeholder="welcome-back"
										value={field.state.value}
										onBlur={field.handleBlur}
										onChange={(event) =>
											field.handleChange(
												event.target.value,
											)
										}
									/>
									<FieldError
										errors={field.state.meta.errors}
									/>
								</div>
							)}
						/>
						<form.Field
							name="type"
							children={(field) => (
								<div className="flex flex-col gap-2">
									<Label htmlFor={field.name}>Type</Label>
									<Select
										aria-label="Type"
										id={field.name}
										value={field.state.value}
										onBlur={field.handleBlur}
										onChange={(event) =>
											field.handleChange(
												event.target
													.value as AutoResponseType,
											)
										}
									>
										{AUTO_RESPONSE_TYPE_OPTIONS.map(
											(option) => (
												<option
													key={option}
													value={option}
												>
													{option}
												</option>
											),
										)}
									</Select>
									<FieldError
										errors={field.state.meta.errors}
									/>
								</div>
							)}
						/>
					</div>

					<form.Field
						name="aliases"
						children={(field) => (
							<div className="space-y-2">
								<div className="flex items-center justify-between">
									<Label
										className="text-base"
										htmlFor={field.name}
									>
										Aliases
									</Label>
									<Button
										type="button"
										size="sm"
										variant="secondary"
										onClick={() =>
											field.handleChange([
												...field.state.value,
												"",
											])
										}
									>
										<Plus className="mr-2 size-4" />
										Add Alias
									</Button>
								</div>
								<div className="flex flex-col gap-3">
									{field.state.value.length === 0 ? (
										<p className="rounded-xl border border-dashed border-white/10 px-4 py-3 text-sm text-night-200/60">
											No aliases yet. Add as many extra
											triggers as you need.
										</p>
									) : null}
									{field.state.value.map((alias, index) => (
										<div
											key={`${field.name}-${index}`}
											className="flex items-center gap-3"
										>
											<Input
												aria-label={`Alias ${index + 1}`}
												placeholder="hello there"
												value={alias}
												onBlur={field.handleBlur}
												onChange={(event) => {
													const nextAliases = [
														...field.state.value,
													];
													nextAliases[index] =
														event.target.value;
													field.handleChange(
														nextAliases,
													);
												}}
											/>
											<Button
												type="button"
												size="sm"
												variant="secondary"
												aria-label={`Remove alias ${index + 1}`}
												className="px-2.5"
												onClick={() =>
													field.handleChange(
														field.state.value.filter(
															(_, aliasIndex) =>
																aliasIndex !==
																index,
														),
													)
												}
											>
												<Trash2 className="size-4" />
											</Button>
										</div>
									))}
								</div>
								<p className="text-sm text-night-200/60">
									Alternate triggers for the same response.
								</p>
								<FieldError errors={field.state.meta.errors} />
							</div>
						)}
					/>

					<form.Field
						name="content"
						children={(field) => (
							<div className="space-y-2">
								<Label htmlFor={field.name}>Response</Label>
								<Textarea
									className="mt-2"
									id={field.name}
									placeholder="Pong, captain."
									value={field.state.value}
									onBlur={field.handleBlur}
									onChange={(event) =>
										field.handleChange(event.target.value)
									}
								/>
								<div className="rounded-2xl border border-white/10 bg-white/5 p-5">
									<p className="text-sm font-semibold text-white">
										Variables
									</p>
									<div className="mt-3 space-y-2 text-sm text-night-200/75">
										{AUTO_RESPONSE_VARIABLES.map((item) => (
											<p key={item}>{item}</p>
										))}
									</div>
								</div>
								<FieldError errors={field.state.meta.errors} />
							</div>
						)}
					/>

					<div className="grid gap-4 lg:grid-cols-3">
						<form.Field
							name="wildcard"
							children={(field) => (
								<div className="rounded-[24px] border border-white/8 bg-white/5 p-4">
									<div className="flex items-center justify-between gap-3">
										<div>
											<Label htmlFor={field.name}>
												Wildcard
											</Label>
											<p className="mt-1 text-sm text-night-200/60">
												Treat aliases as wildcard
												matches.
											</p>
										</div>
										<Switch
											checked={field.state.value}
											id={field.name}
											onCheckedChange={(checked) =>
												field.handleChange(checked)
											}
										/>
									</div>
									<FieldError
										errors={field.state.meta.errors}
									/>
								</div>
							)}
						/>
						<form.Field
							name="embed"
							children={(field) => (
								<div className="rounded-[24px] border border-white/8 bg-white/5 p-4">
									<div className="flex items-center justify-between gap-3">
										<div>
											<Label htmlFor={field.name}>
												Embed Reply
											</Label>
											<p className="mt-1 text-sm text-night-200/60">
												Render the response inside an
												embed.
											</p>
										</div>
										<Switch
											checked={field.state.value}
											id={field.name}
											onCheckedChange={(checked) =>
												field.handleChange(checked)
											}
										/>
									</div>
									<FieldError
										errors={field.state.meta.errors}
									/>
								</div>
							)}
						/>
						<form.Field
							name="embedColor"
							children={(field) => (
								<div className="rounded-[24px] border border-white/8 bg-white/5 p-4">
									<div className="flex items-center justify-between gap-3">
										<div>
											<Label htmlFor={field.name}>
												Embed Color
											</Label>
											<p className="mt-1 text-sm text-night-200/60">
												Pick a color for the embed.
											</p>
										</div>
										<div className="flex items-center gap-3">
											<Label
												htmlFor={field.name}
												className="cursor-pointer text-sm font-bold uppercase tracking-wider text-white"
											>
												{discordColorToHex(
													field.state.value,
												)}
											</Label>
											<div className="size-10 overflow-hidden rounded-xl border border-white/10 ring-sunset-500/20 transition-all hover:ring-4">
												<input
													aria-label="Embed Color"
													className="size-full"
													id={field.name}
													type="color"
													value={discordColorToHex(
														field.state.value,
													)}
													onChange={(event) =>
														field.handleChange(
															hexToDiscordColor(
																event.target
																	.value,
															),
														)
													}
												/>
											</div>
										</div>
									</div>
									<FieldError
										errors={field.state.meta.errors}
									/>
								</div>
							)}
						/>
					</div>

					<div className="flex justify-end gap-4 border-t border-white/10 pt-6">
						<Button
							type="button"
							variant="secondary"
							onClick={onCancel}
							className="border border-white/20 bg-transparent hover:bg-white/5"
						>
							Cancel
						</Button>
						<form.Subscribe
							selector={(state) =>
								[state.canSubmit, state.isSubmitting] as const
							}
							children={([canSubmit, isSubmitting]) => (
								<Button
									disabled={!canSubmit || isSubmitting}
									type="submit"
									className="bg-gradient-to-r from-sunset-400 to-sunset-500 text-night-950 font-bold shadow-[0_4px_14px_rgba(255,140,55,0.15)] hover:brightness-110 gap-2"
								>
									{isSubmitting ? (
										"Saving..."
									) : (
										<>
											<Save size={18} strokeWidth={2.5} />
											Save Response
										</>
									)}
								</Button>
							)}
						/>
						{mutation.error ? (
							<p className="self-center text-sm text-red-400">
								{mutation.error.message}
							</p>
						) : null}
					</div>
				</form>
			</div>

			<div className="flex flex-col gap-4 xl:col-span-5">
				<h3 className="flex items-center gap-2 text-[24px] font-semibold text-white font-display">
					<Eye className="text-sunset-400" size={24} /> Live Preview
				</h3>
				<form.Subscribe
					selector={(state) => state.values}
					children={(values) => {
						const result =
							UpsertAutoResponseSchema.safeParse(values);
						return result.success ? (
							<DiscordPreview
								previewContext={{
									channelName: "general",
									guild,
									session,
								}}
								response={result.data}
							/>
						) : null;
					}}
				/>
				<div className="flex items-start gap-3 rounded-lg border border-white/10 bg-white/5 p-4 mt-2">
					<Info className="mt-0.5 text-sunset-400" size={18} />
					<p className="text-[13px] leading-relaxed text-night-200/80 font-inter">
						Preview is an approximation. Rendering may vary slightly
						depending on the user's client platform and specific
						theme settings.
					</p>
				</div>
			</div>
		</div>
	);
}
