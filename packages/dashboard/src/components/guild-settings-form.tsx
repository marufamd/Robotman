import type { GuildSettings } from "@robotman/shared";
import { GuildSettingsSchema } from "@robotman/shared";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Keyboard, Medal, ScrollText } from "lucide-react";
import { FieldError } from "~/components/field-error";
import { Button } from "~/components/ui/button";
import { Switch } from "~/components/ui/switch";
import { updateGuildSettings } from "~/lib/api";
import { invalidateGuildSettings } from "~/lib/queries";

export function GuildSettingsForm({
	initialSettings,
}: {
	initialSettings: GuildSettings;
}) {
	const queryClient = useQueryClient();

	const mutation = useMutation({
		mutationFn: (payload: GuildSettings) =>
			updateGuildSettings(initialSettings.guildId, payload),
		onSuccess: async (settings) => {
			await invalidateGuildSettings(queryClient, initialSettings.guildId);
			form.reset(settings);
		},
	});

	const form = useForm({
		defaultValues: initialSettings,
		validators: {
			onChange: GuildSettingsSchema,
		},
		onSubmit: async ({ value }) => {
			await mutation.mutateAsync(GuildSettingsSchema.parse(value));
		},
	});

	return (
		<form
			className="flex flex-col gap-6"
			onSubmit={(event) => {
				event.preventDefault();
				event.stopPropagation();
				void form.handleSubmit();
			}}
		>
			{/* Command Prefix Card */}
			<div className="group flex flex-col overflow-hidden rounded-xl border border-night-700 bg-night-900 shadow-sm transition-colors hover:border-night-700/80 md:flex-row md:items-stretch">
				<div className="flex flex-col gap-2 border-b border-night-700 bg-night-950/50 p-6 md:w-1/3 md:border-b-0 md:border-r">
					<div className="flex items-center gap-3 text-white">
						<Keyboard className="size-8 rounded-md bg-sunset-500/10 p-1.5 text-sunset-500" />
						<h3 className="font-display text-[18px] font-semibold">
							Command Prefix
						</h3>
					</div>
					<p className="text-[14px] leading-relaxed text-night-200/70">
						The character string used to trigger bot commands. Limit
						15 characters. Avoid common punctuation used in casual
						chat.
					</p>
				</div>
				<div className="flex items-center bg-night-900 p-6 md:w-2/3">
					<form.Field
						name="prefix"
						children={(field) => (
							<div className="relative w-full max-w-md">
								<label className="sr-only" htmlFor={field.name}>
									Command Prefix
								</label>
								<input
									className="w-full rounded-lg border border-night-700 bg-night-950 py-3 pl-4 pr-12 font-mono text-sm text-white shadow-inner transition-all focus:border-sunset-500 focus:outline-none focus:ring-1 focus:ring-sunset-500"
									id={field.name}
									maxLength={15}
									type="text"
									placeholder="="
									value={field.state.value ?? ""}
									onBlur={field.handleBlur}
									onChange={(event) =>
										field.handleChange(
											event.target.value.trim() || null,
										)
									}
								/>
								<div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 font-mono text-xs text-night-200/50">
									{(field.state.value ?? "").length}/15
								</div>
								<FieldError errors={field.state.meta.errors} />
							</div>
						)}
					/>
				</div>
			</div>

			{/* Ranking System Card */}
			<div className="group relative flex flex-col overflow-hidden rounded-xl border border-night-700 bg-night-900 shadow-sm transition-colors hover:border-night-700/80 md:flex-row md:items-stretch">
				<div className="absolute left-0 top-0 h-1 w-full bg-gradient-to-r from-sunset-400 to-sunset-500 opacity-50 transition-opacity group-hover:opacity-100"></div>
				<div className="flex flex-col gap-2 border-b border-night-700 bg-night-950/50 p-6 pt-7 md:w-1/3 md:border-b-0 md:border-r">
					<div className="flex items-center gap-3 text-white">
						<Medal className="size-8 rounded-md bg-sunset-400/10 p-1.5 text-sunset-400" />
						<h3 className="font-display text-[18px] font-semibold">
							Ranking System
						</h3>
					</div>
					<p className="text-[14px] leading-relaxed text-night-200/70">
						Enable automated XP distribution and leveling for
						members based on their text and voice activity.
					</p>
				</div>
				<div className="flex items-center justify-between bg-night-900 p-6 pt-7 md:w-2/3">
					<form.Field
						name="isRankingEnabled"
						children={(field) => (
							<>
								<div className="flex flex-col gap-1">
									<span className="text-sm font-semibold text-white">
										Status
									</span>
									<span className="text-[13px] text-night-200/70">
										Currently{" "}
										{field.state.value
											? "enabled"
											: "disabled"}
										.
									</span>
									<FieldError
										errors={field.state.meta.errors}
									/>
								</div>
								<div className="mt-1 flex items-center">
									<Switch
										aria-label="Ranking System"
										checked={field.state.value}
										id={field.name}
										onCheckedChange={(checked) =>
											field.handleChange(checked)
										}
									/>
								</div>
							</>
						)}
					/>
				</div>
			</div>

			{/* Audit Log Channel Card */}
			<div className="group flex flex-col overflow-hidden rounded-xl border border-night-700 bg-night-900 shadow-sm transition-colors hover:border-night-700/80 md:flex-row md:items-stretch">
				<div className="flex flex-col gap-2 border-b border-night-700 bg-night-950/50 p-6 md:w-1/3 md:border-b-0 md:border-r">
					<div className="flex items-center gap-3 text-white">
						<ScrollText className="size-8 rounded-md bg-night-200/10 p-1.5 text-night-200" />
						<h3 className="font-display text-[18px] font-semibold">
							Audit Log Channel
						</h3>
					</div>
					<p className="text-[14px] leading-relaxed text-night-200/70">
						Designate a specific channel where Robotman will
						broadcast moderation actions, deleted messages, and role
						updates.
					</p>
				</div>
				<div className="flex flex-col justify-center gap-3 bg-night-900 p-6 md:w-2/3">
					<form.Field
						name="auditLogChannelId"
						children={(field) => (
							<div className="relative w-full max-w-md">
								<label className="sr-only" htmlFor={field.name}>
									Audit Log Channel
								</label>
								<input
									className="w-full rounded-lg border border-night-700 bg-night-950 py-3 pl-4 pr-4 text-[15px] text-white shadow-inner transition-all focus:border-sunset-500 focus:outline-none focus:ring-1 focus:ring-sunset-500"
									id={field.name}
									type="text"
									placeholder="Channel ID (e.g., 123456789012345678)"
									value={field.state.value ?? ""}
									onBlur={field.handleBlur}
									onChange={(event) =>
										field.handleChange(
											event.target.value.trim() || null,
										)
									}
								/>
								<FieldError errors={field.state.meta.errors} />
							</div>
						)}
					/>
					<div className="mt-2 flex items-center gap-2">
						<span className="size-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
						<span className="text-[12px] text-night-200/70">
							Robotman requires write permissions in this channel.
						</span>
					</div>
				</div>
			</div>

			<div className="mt-2 flex flex-wrap items-center gap-3">
				<form.Subscribe
					selector={(state) =>
						[state.canSubmit, state.isSubmitting] as const
					}
					children={([canSubmit, isSubmitting]) => (
						<Button
							disabled={!canSubmit || isSubmitting}
							type="submit"
							className="bg-gradient-to-r from-sunset-400 to-sunset-500 px-6 font-bold text-night-950 hover:from-sunset-300 hover:to-sunset-400"
						>
							{isSubmitting ? "Saving..." : "Save Settings"}
						</Button>
					)}
				/>
				<Button
					type="button"
					variant="secondary"
					onClick={() => form.reset(initialSettings)}
					className="px-6 border border-night-700 bg-night-800 text-white hover:bg-night-700"
				>
					Reset
				</Button>
				{mutation.isSuccess ? (
					<div className="inline-flex items-center gap-2 text-sm text-emerald-400">
						<CheckCircle2 className="size-4" />
						Settings synced successfully.
					</div>
				) : null}
				{mutation.error ? (
					<p className="text-sm text-red-400">
						{mutation.error.message}
					</p>
				) : null}
			</div>
		</form>
	);
}
