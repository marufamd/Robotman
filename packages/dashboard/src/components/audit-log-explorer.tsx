import type {
	AuditLogAction,
	AuditLogEntry,
	AuditLogResourceType,
} from "@robotman/shared";
import {
	AUDIT_LOG_ACTION_OPTIONS,
	AUDIT_LOG_RESOURCE_TYPE_OPTIONS,
} from "@robotman/shared";
import {
	keepPreviousData,
	useQuery,
} from "@tanstack/react-query";
import { useDeferredValue, useEffect, useState } from "react";
import {
	ChevronLeft,
	ChevronRight,
	History,
	PanelRight,
	Search,
} from "lucide-react";
import { auditLogQueryOptions, DEFAULT_AUDIT_LOG_FILTERS } from "~/lib/queries";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Select } from "~/components/ui/select";
import { Table, TBody, TD, TH, THead, TR } from "~/components/ui/table";
import { cn } from "~/lib/utils";

type ActionFilter = AuditLogAction | "ALL";
type ResourceFilter = AuditLogResourceType | "ALL";

function formatTimestamp(timestamp: string) {
	return new Intl.DateTimeFormat("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
		hour: "numeric",
		minute: "2-digit",
	}).format(new Date(timestamp));
}

function formatValue(value: unknown) {
	if (Array.isArray(value)) {
		return value.length === 0 ? "[]" : value.join(", ");
	}

	if (typeof value === "boolean") {
		return value ? "Enabled" : "Disabled";
	}

	if (value === null || value === undefined || value === "") {
		return "—";
	}

	if (typeof value === "object") {
		return JSON.stringify(value);
	}

	return String(value);
}

function formatEnum(value: string) {
	return value
		.toLowerCase()
		.split("_")
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(" ");
}

function actionBadgeClass(action: AuditLogAction) {
	switch (action) {
		case "CREATE":
			return "border-emerald-400/20 bg-emerald-500/10 text-emerald-200";
		case "UPDATE":
			return "border-sky-400/20 bg-sky-500/10 text-sky-200";
		case "DELETE":
			return "border-red-400/20 bg-red-500/10 text-red-200";
		case "TOGGLE":
			return "border-amber-400/20 bg-amber-500/10 text-amber-200";
		default:
			return "";
	}
}

function ChangeBlock({
	title,
	values,
}: {
	title: string;
	values?: Record<string, unknown>;
}) {
	const entries = Object.entries(values ?? {});

	return (
		<div className="rounded-2xl border border-white/8 bg-night-950/80 p-4">
			<p className="text-xs font-semibold uppercase tracking-[0.18em] text-night-300/70">
				{title}
			</p>
			<div className="mt-4 space-y-3">
				{entries.length === 0 ? (
					<p className="text-sm text-night-300/55">No recorded fields.</p>
				) : (
					entries.map(([key, value]) => (
						<div key={key} className="rounded-xl bg-white/[0.03] px-3 py-3">
							<p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-night-300/60">
								{key}
							</p>
							<p className="mt-2 text-sm leading-6 text-night-100">
								{formatValue(value)}
							</p>
						</div>
					))
				)}
			</div>
		</div>
	);
}

export function AuditLogExplorer({
	guildId,
}: {
	guildId: string;
}) {
	const [page, setPage] = useState(DEFAULT_AUDIT_LOG_FILTERS.page);
	const [pageSize] = useState(DEFAULT_AUDIT_LOG_FILTERS.pageSize);
	const [search, setSearch] = useState("");
	const [actionFilter, setActionFilter] = useState<ActionFilter>("ALL");
	const [resourceFilter, setResourceFilter] = useState<ResourceFilter>("ALL");
	const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
	const deferredSearch = useDeferredValue(search);

	useEffect(() => {
		setPage(1);
	}, [deferredSearch, actionFilter, resourceFilter]);

	const queryParams = {
		page,
		pageSize,
		q: deferredSearch.trim() || undefined,
		action: actionFilter === "ALL" ? undefined : actionFilter,
		resourceType: resourceFilter === "ALL" ? undefined : resourceFilter,
	};

	const { data, error, isFetching, isPending } = useQuery({
		...auditLogQueryOptions(guildId, queryParams),
		placeholderData: keepPreviousData,
	});

	const entries = data?.entries ?? [];
	const selectedEntry = entries.find((entry) => entry.id === selectedEntryId) ?? entries[0] ?? null;

	useEffect(() => {
		if (!entries.length) {
			setSelectedEntryId(null);
			return;
		}

		if (!entries.some((entry) => entry.id === selectedEntryId)) {
			setSelectedEntryId(entries[0].id);
		}
	}, [entries, selectedEntryId]);

	return (
		<div className="grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_400px]">
			<div className="flex flex-col">
				<div className="flex flex-col gap-4 rounded-t-xl border border-night-700 bg-night-900 p-6 md:flex-row md:items-center md:justify-between">
					<div className="flex w-full flex-col gap-3 md:max-w-md md:flex-row">
						<Select
							aria-label="Filter by action"
							className="flex-1"
							value={actionFilter}
							onChange={(event) => setActionFilter(event.target.value as ActionFilter)}
						>
							<option value="ALL">All Actions</option>
							{AUDIT_LOG_ACTION_OPTIONS.map((option) => (
								<option key={option} value={option}>
									{formatEnum(option)}
								</option>
							))}
						</Select>
						<Select
							aria-label="Filter by resource type"
							className="flex-1"
							value={resourceFilter}
							onChange={(event) => setResourceFilter(event.target.value as ResourceFilter)}
						>
							<option value="ALL">All Resources</option>
							{AUDIT_LOG_RESOURCE_TYPE_OPTIONS.map((option) => (
								<option key={option} value={option}>
									{formatEnum(option)}
								</option>
							))}
						</Select>
					</div>
					<div className="flex items-center gap-4">
						<div className="relative">
							<Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-night-300/55" />
							<Input
								aria-label="Search audit log"
								className="max-w-sm border-night-700 bg-night-950 pl-9"
								placeholder="Search actor or resource"
								value={search}
								onChange={(event) => setSearch(event.target.value)}
							/>
						</div>
					</div>
				</div>

				<div className="overflow-hidden rounded-b-xl border border-t-0 border-night-700 bg-night-950 shadow-lg shadow-black/20">
					<div className="flex items-center justify-between border-b border-white/8 px-6 py-5">
						<div>
							<p className="font-display text-xl font-bold text-white">
								Event Feed
							</p>
							<p className="mt-1 text-sm text-night-200/70">
								Newest events appear first. Select a row to inspect the recorded diff.
							</p>
						</div>
						{isFetching ? (
							<Badge className="border-sky-400/20 bg-sky-500/10 text-sky-200">
								Refreshing
							</Badge>
						) : null}
					</div>

					{error ? (
						<div className="px-6 py-12 text-center">
							<p className="text-lg font-semibold text-white">Could not load audit history.</p>
							<p className="mt-2 text-sm text-red-200">{error.message}</p>
						</div>
					) : isPending ? (
						<div className="px-6 py-12 text-center text-night-200/70">Loading audit history…</div>
					) : (
						<>
							<div className="overflow-x-auto">
								<Table>
									<THead>
										<TR>
											<TH>Timestamp</TH>
											<TH>Actor</TH>
											<TH>Action</TH>
											<TH>Resource</TH>
											<TH>Name</TH>
										</TR>
									</THead>
									<TBody>
										{entries.length === 0 ? (
											<TR>
												<TD colSpan={5} className="py-14 text-center text-night-200/60">
													No audit entries match the current filters.
												</TD>
											</TR>
										) : (
											entries.map((entry) => (
												<TR
													key={entry.id}
													className={cn(
														"cursor-pointer transition hover:bg-white/[0.04]",
														selectedEntry?.id === entry.id && "bg-white/[0.06]",
													)}
													onClick={() => setSelectedEntryId(entry.id)}
												>
													<TD>
														<p className="font-medium text-white">{formatTimestamp(entry.createdAt)}</p>
													</TD>
													<TD>
														<p className="font-medium text-white">{entry.userUsername}</p>
														<p className="mt-1 text-xs text-night-200/55">{entry.userId}</p>
													</TD>
													<TD>
														<Badge className={actionBadgeClass(entry.action)}>
															{formatEnum(entry.action)}
														</Badge>
													</TD>
													<TD>
														<Badge>{formatEnum(entry.resourceType)}</Badge>
													</TD>
													<TD>
														<p className="font-medium text-white">
															{entry.resourceName ?? "—"}
														</p>
													</TD>
												</TR>
											))
										)}
									</TBody>
								</Table>
							</div>

							<div className="flex flex-col gap-4 border-t border-white/8 px-6 py-4 md:flex-row md:items-center md:justify-between">
								<div className="text-sm text-night-200/68">
									Page {data?.page ?? 1} of {data?.totalPages ?? 1} • {data?.total ?? 0} total entries
								</div>
								<div className="flex gap-3">
									<Button
										size="sm"
										variant="secondary"
										disabled={page <= 1}
										onClick={() => setPage((currentPage) => Math.max(currentPage - 1, 1))}
									>
										Previous
									</Button>
									<Button
										size="sm"
										variant="secondary"
										disabled={page >= (data?.totalPages ?? 1)}
										onClick={() => setPage((currentPage) => currentPage + 1)}
									>
										Next
									</Button>
								</div>
							</div>
						</>
					)}
				</div>
			</div>

			<div className="overflow-hidden rounded-xl border border-night-700 bg-night-900 shadow-sm xl:sticky xl:top-24 xl:self-start">
				<div className="flex items-center gap-3 border-b border-night-700 bg-night-950/50 px-6 py-5">
					<div className="flex size-11 items-center justify-center rounded-lg bg-sunset-500/10 text-sunset-500">
						<PanelRight className="size-5" />
					</div>
					<div>
						<p className="font-display text-[18px] font-semibold text-white">Change Details</p>
						<p className="mt-1 text-[13px] text-night-200/70">
							Recorded field snapshots for the selected event.
						</p>
					</div>
				</div>

					{selectedEntry ? (
						<div className="space-y-6 px-6 py-6">
							<div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
								<div className="flex flex-wrap gap-2">
									<Badge className={actionBadgeClass(selectedEntry.action)}>
										{formatEnum(selectedEntry.action)}
									</Badge>
									<Badge>{formatEnum(selectedEntry.resourceType)}</Badge>
								</div>
								<p className="mt-4 text-lg font-semibold text-white">
									{selectedEntry.resourceName ?? "Unnamed Resource"}
								</p>
								<p className="mt-2 text-sm text-night-200/65">
									{selectedEntry.userUsername} • {formatTimestamp(selectedEntry.createdAt)}
								</p>
							</div>

							<ChangeBlock title="Before" values={selectedEntry.changes?.before} />
							<ChangeBlock title="After" values={selectedEntry.changes?.after} />
						</div>
					) : (
					<div className="px-6 py-12 text-center text-night-200/60">
						Select an event to inspect its recorded changes.
					</div>
				)}
			</div>
		</div>
	);
}
