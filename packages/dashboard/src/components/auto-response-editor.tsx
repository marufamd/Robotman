import type { AutoResponse, UpsertAutoResponse } from "@robotman/shared";
import { UpsertAutoResponseSchema } from "@robotman/shared";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { startTransition } from "react";
import { WandSparkles } from "lucide-react";
import { FieldError } from "~/components/field-error";
import { DiscordPreview } from "~/components/discord-preview";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Switch } from "~/components/ui/switch";
import { Textarea } from "~/components/ui/textarea";
import { createAutoResponse, updateAutoResponse } from "~/lib/api";
import { invalidateAutoResponses } from "~/lib/queries";
import { discordColorToHex, hexToDiscordColor } from "~/lib/utils";

function getDefaultValues(guildId: string, response?: AutoResponse): UpsertAutoResponse {
	if (response) {
		return {
			guildId,
			name: response.name,
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
		name: "",
		type: "trigger",
		content: "",
		aliases: [],
		wildcard: false,
		embed: false,
		embedColor: hexToDiscordColor("#ff8c37"),
	};
}

export function AutoResponseEditor({
	guildId,
	selectedResponse,
	onSaved,
	onResetSelection,
}: {
	guildId: string;
	selectedResponse?: AutoResponse;
	onSaved: (response: AutoResponse) => void;
	onResetSelection: () => void;
}) {
	const queryClient = useQueryClient();
	const mutation = useMutation({
		mutationFn: async (payload: UpsertAutoResponse) => {
			if (selectedResponse) {
				return updateAutoResponse(guildId, selectedResponse.id, payload);
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
		<div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
			<Card className="rounded-[32px]">
				<CardHeader className="gap-3">
					<div className="flex items-start justify-between gap-4">
						<div>
							<p className="font-display text-2xl font-bold text-white">
								{selectedResponse ? "Edit Trigger" : "Create Trigger"}
							</p>
							<p className="mt-2 text-sm leading-6 text-night-200/68">
								Build regex or wildcard-driven responses with live Discord output.
							</p>
						</div>
						<WandSparkles className="text-sunset-300" />
					</div>
				</CardHeader>
				<CardContent>
					<form
						className="grid gap-5"
						onSubmit={(event) => {
							event.preventDefault();
							event.stopPropagation();
							void form.handleSubmit();
						}}
					>
						<div className="grid gap-5 lg:grid-cols-2">
							<form.Field
								name="name"
								children={(field) => (
									<div className="space-y-2">
										<Label htmlFor={field.name}>Name</Label>
										<Input
											id={field.name}
											placeholder="welcome-back"
											value={field.state.value}
											onBlur={field.handleBlur}
											onChange={(event) => field.handleChange(event.target.value)}
										/>
										<FieldError errors={field.state.meta.errors} />
									</div>
								)}
							/>
							<form.Field
								name="type"
								children={(field) => (
									<div className="space-y-2">
										<Label htmlFor={field.name}>Type</Label>
										<Input
											id={field.name}
											placeholder="regex"
											value={field.state.value}
											onBlur={field.handleBlur}
											onChange={(event) => field.handleChange(event.target.value)}
										/>
										<FieldError errors={field.state.meta.errors} />
									</div>
								)}
							/>
						</div>

						<form.Field
							name="aliases"
							children={(field) => (
								<div className="space-y-2">
									<Label htmlFor={field.name}>Aliases</Label>
									<Input
										id={field.name}
										placeholder="hello there, hi bot"
										value={field.state.value.join(", ")}
										onBlur={field.handleBlur}
										onChange={(event) =>
											field.handleChange(
												event.target.value
													.split(",")
													.map((alias) => alias.trim())
													.filter(Boolean),
											)
										}
									/>
									<p className="text-sm text-night-200/60">
										Comma-separated alternate phrases for this trigger.
									</p>
									<FieldError errors={field.state.meta.errors} />
								</div>
							)}
						/>

						<form.Field
							name="content"
							children={(field) => (
								<div className="space-y-2">
									<Label htmlFor={field.name}>Reply Content</Label>
									<Textarea
										id={field.name}
										placeholder="Pong, captain."
										value={field.state.value}
										onBlur={field.handleBlur}
										onChange={(event) => field.handleChange(event.target.value)}
									/>
									<FieldError errors={field.state.meta.errors} />
								</div>
							)}
						/>

						<div className="grid gap-4 lg:grid-cols-3">
							<form.Field
								name="wildcard"
								children={(field) => (
									<div className="rounded-[24px] border border-white/8 bg-white/5 px-4 py-4">
										<div className="flex items-center justify-between gap-3">
											<div>
												<Label htmlFor={field.name}>Wildcard</Label>
												<p className="mt-1 text-sm text-night-200/60">
													Treat aliases as wildcard matches.
												</p>
											</div>
											<Switch
												checked={field.state.value}
												id={field.name}
												onCheckedChange={(checked) => field.handleChange(checked)}
											/>
										</div>
										<FieldError errors={field.state.meta.errors} />
									</div>
								)}
							/>
							<form.Field
								name="embed"
								children={(field) => (
									<div className="rounded-[24px] border border-white/8 bg-white/5 px-4 py-4">
										<div className="flex items-center justify-between gap-3">
											<div>
												<Label htmlFor={field.name}>Embed Reply</Label>
												<p className="mt-1 text-sm text-night-200/60">
													Render the response inside an embed.
												</p>
											</div>
											<Switch
												checked={field.state.value}
												id={field.name}
												onCheckedChange={(checked) => field.handleChange(checked)}
											/>
										</div>
										<FieldError errors={field.state.meta.errors} />
									</div>
								)}
							/>
							<form.Field
								name="embedColor"
								children={(field) => (
									<div className="rounded-[24px] border border-white/8 bg-white/5 px-4 py-4">
										<Label htmlFor={field.name}>Embed Color</Label>
										<div className="mt-3 flex items-center gap-3">
											<input
												aria-label="Embed Color"
												className="size-11 rounded-xl border border-white/8 bg-transparent"
												id={field.name}
												type="color"
												value={discordColorToHex(field.state.value)}
												onChange={(event) =>
													field.handleChange(hexToDiscordColor(event.target.value))
												}
											/>
											<p className="text-sm text-night-200/60">
												Current color {discordColorToHex(field.state.value)}
											</p>
										</div>
										<FieldError errors={field.state.meta.errors} />
									</div>
								)}
							/>
						</div>

						<div className="flex flex-wrap gap-3">
							<form.Subscribe
								selector={(state) => [state.canSubmit, state.isSubmitting] as const}
								children={([canSubmit, isSubmitting]) => (
									<Button disabled={!canSubmit || isSubmitting} type="submit">
										{isSubmitting
											? "Saving..."
											: selectedResponse
												? "Update Trigger"
												: "Create Trigger"}
									</Button>
								)}
							/>
							<Button type="button" variant="secondary" onClick={onResetSelection}>
								New Trigger
							</Button>
							{mutation.error ? (
								<p className="self-center text-sm text-red-200">{mutation.error.message}</p>
							) : null}
						</div>
					</form>
				</CardContent>
			</Card>

			<form.Subscribe
				selector={(state) => state.values}
				children={(values) => {
					const result = UpsertAutoResponseSchema.safeParse(values);
					return result.success ? <DiscordPreview response={result.data} /> : null;
				}}
			/>
		</div>
	);
}
