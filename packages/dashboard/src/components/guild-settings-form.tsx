import type { GuildSettings } from "@robotman/shared";
import { GuildSettingsSchema } from "@robotman/shared";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Sparkles } from "lucide-react";
import { FieldError } from "~/components/field-error";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Switch } from "~/components/ui/switch";
import { updateGuildSettings } from "~/lib/api";
import { invalidateGuildSettings } from "~/lib/queries";

export function GuildSettingsForm({ initialSettings }: { initialSettings: GuildSettings }) {
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
		<Card className="rounded-[32px]">
			<CardHeader className="gap-3">
				<div className="flex items-start justify-between gap-4">
					<div>
						<p className="font-display text-2xl font-bold text-white">Server Settings</p>
						<p className="mt-2 max-w-2xl text-sm leading-6 text-night-200/68">
							Control your prefix, ranking toggle, and audit destination without leaving the dashboard.
						</p>
					</div>
					<Sparkles className="text-sunset-300" />
				</div>
			</CardHeader>
			<CardContent>
				<form
					className="grid gap-6 lg:grid-cols-2"
					onSubmit={(event) => {
						event.preventDefault();
						event.stopPropagation();
						void form.handleSubmit();
					}}
				>
					<form.Field
						name="prefix"
						children={(field) => (
							<div className="space-y-2">
								<Label htmlFor={field.name}>Prefix</Label>
										<Input
											id={field.name}
											maxLength={15}
											placeholder="!"
											value={field.state.value ?? ""}
											onBlur={field.handleBlur}
											onChange={(event) =>
												field.handleChange(event.target.value.trim() || null)
											}
										/>
								<p className="text-sm text-night-200/60">
									Leave blank to fall back to your global command default.
								</p>
								<FieldError errors={field.state.meta.errors} />
							</div>
						)}
					/>

					<form.Field
						name="auditLogChannelId"
						children={(field) => (
							<div className="space-y-2">
								<Label htmlFor={field.name}>Audit Log Channel</Label>
										<Input
											id={field.name}
											placeholder="123456789012345678"
											value={field.state.value ?? ""}
											onBlur={field.handleBlur}
											onChange={(event) =>
												field.handleChange(event.target.value.trim() || null)
											}
										/>
								<p className="text-sm text-night-200/60">
									Optional Discord channel ID for moderation change history.
								</p>
								<FieldError errors={field.state.meta.errors} />
							</div>
						)}
					/>

					<form.Field
						name="isRankingEnabled"
						children={(field) => (
							<div className="lg:col-span-2">
								<div className="flex items-center justify-between rounded-[24px] border border-white/8 bg-white/5 px-5 py-4">
									<div>
										<Label htmlFor={field.name}>Ranking System</Label>
										<p className="mt-1 text-sm text-night-200/60">
											Toggle score tracking for member activity on this server.
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

					<div className="lg:col-span-2 flex flex-wrap items-center gap-3">
						<form.Subscribe
							selector={(state) => [state.canSubmit, state.isSubmitting] as const}
							children={([canSubmit, isSubmitting]) => (
								<Button disabled={!canSubmit || isSubmitting} type="submit">
									{isSubmitting ? "Saving..." : "Save Settings"}
								</Button>
							)}
						/>
						<Button
							type="button"
							variant="secondary"
							onClick={() => form.reset(initialSettings)}
						>
							Reset
						</Button>
						{mutation.isSuccess ? (
							<div className="inline-flex items-center gap-2 text-sm text-emerald-200">
								<CheckCircle2 className="size-4" />
								Settings synced successfully.
							</div>
						) : null}
						{mutation.error ? (
							<p className="text-sm text-red-200">{mutation.error.message}</p>
						) : null}
					</div>
				</form>
			</CardContent>
		</Card>
	);
}
