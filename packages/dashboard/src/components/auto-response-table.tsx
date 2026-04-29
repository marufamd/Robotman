import type { AutoResponse } from "@robotman/shared";
import {
	type ColumnFiltersState,
	type PaginationState,
	type SortingState,
	flexRender,
	getCoreRowModel,
	getFilteredRowModel,
	getPaginationRowModel,
	getSortedRowModel,
	useReactTable,
} from "@tanstack/react-table";
import { startTransition, useDeferredValue, useEffect, useState } from "react";
import { PencilLine, Trash2 } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Badge } from "~/components/ui/badge";
import { Table, TBody, TD, TH, THead, TR } from "~/components/ui/table";
import { formatRelativeDate } from "~/lib/utils";

export function AutoResponseTable({
	responses,
	selectedId,
	onEdit,
	onDelete,
}: {
	responses: AutoResponse[];
	selectedId?: string;
	onEdit: (response: AutoResponse) => void;
	onDelete: (response: AutoResponse) => void;
}) {
	const [sorting, setSorting] = useState<SortingState>([{ id: "updatedAt", desc: true }]);
	const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
	const [pagination, setPagination] = useState<PaginationState>({
		pageIndex: 0,
		pageSize: 6,
	});
	const [search, setSearch] = useState("");
	const deferredSearch = useDeferredValue(search);

	useEffect(() => {
		startTransition(() => {
			setColumnFilters(
				deferredSearch
					? [
							{
								id: "name",
								value: deferredSearch,
							},
					  ]
					: [],
			);
		});
	}, [deferredSearch]);

	const table = useReactTable({
		data: responses,
		columns: [
			{
				accessorKey: "name",
				header: "Trigger",
				cell: ({ row }) => (
					<div>
						<p className="font-semibold text-white">{row.original.name}</p>
						<p className="mt-1 text-xs uppercase tracking-[0.14em] text-night-200/55">
							{row.original.type}
						</p>
					</div>
				),
			},
			{
				id: "pattern",
				header: "Pattern",
				cell: ({ row }) => (
					<div className="space-y-2">
						<Badge>{row.original.wildcard ? "Wildcard" : "Regex / Exact"}</Badge>
						<p className="text-sm text-night-200/68">
							{row.original.aliases.length > 0
								? row.original.aliases.join(", ")
								: "No aliases configured"}
						</p>
					</div>
				),
			},
			{
				accessorKey: "content",
				header: "Reply",
				cell: ({ row }) => (
					<p className="max-w-xs text-sm leading-6 text-night-200/75">
						{row.original.content}
					</p>
				),
			},
			{
				accessorKey: "updatedAt",
				header: "Updated",
				cell: ({ row }) => formatRelativeDate(row.original.updatedAt),
			},
			{
				id: "actions",
				header: "",
				enableSorting: false,
				cell: ({ row }) => (
					<div className="flex justify-end gap-2">
						<Button size="sm" variant="secondary" onClick={() => onEdit(row.original)}>
							<PencilLine className="mr-2 size-4" />
							Edit
						</Button>
						<Button size="sm" variant="danger" onClick={() => onDelete(row.original)}>
							<Trash2 className="mr-2 size-4" />
							Delete
						</Button>
					</div>
				),
			},
		],
		state: {
			sorting,
			columnFilters,
			pagination,
		},
		onSortingChange: setSorting,
		onColumnFiltersChange: setColumnFilters,
		onPaginationChange: setPagination,
		getCoreRowModel: getCoreRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
	});

	return (
		<Card className="rounded-[32px]">
			<CardHeader className="gap-4">
				<div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
					<div>
						<p className="font-display text-2xl font-bold text-white">Active Triggers</p>
						<p className="mt-2 text-sm leading-6 text-night-200/68">
							Search, sort, and edit the rules powering your automated replies.
						</p>
					</div>
					<Input
						className="max-w-sm"
						placeholder="Search trigger names"
						value={search}
						onChange={(event) => setSearch(event.target.value)}
					/>
				</div>
			</CardHeader>
			<CardContent className="overflow-hidden p-0">
				<div className="overflow-x-auto">
					<Table>
						<THead>
							{table.getHeaderGroups().map((headerGroup) => (
								<TR key={headerGroup.id}>
									{headerGroup.headers.map((header) => (
										<TH
											key={header.id}
											className={header.id === "actions" ? "text-right" : undefined}
										>
											{header.isPlaceholder ? null : (
												<button
													className="inline-flex items-center gap-2"
													onClick={header.column.getToggleSortingHandler()?.bind(null)}
													type="button"
												>
													{flexRender(header.column.columnDef.header, header.getContext())}
												</button>
											)}
										</TH>
									))}
								</TR>
							))}
						</THead>
						<TBody>
							{table.getRowModel().rows.map((row) => (
								<TR
									key={row.id}
									className={row.original.id === selectedId ? "bg-white/[0.05]" : undefined}
								>
									{row.getVisibleCells().map((cell) => (
										<TD
											key={cell.id}
											className={cell.column.id === "actions" ? "text-right" : undefined}
										>
											{flexRender(cell.column.columnDef.cell, cell.getContext())}
										</TD>
									))}
								</TR>
							))}
						</TBody>
					</Table>
				</div>
				<div className="flex items-center justify-between border-t border-white/8 px-6 py-4">
					<p className="text-sm text-night-200/68">
						Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount() || 1}
					</p>
					<div className="flex gap-3">
						<Button
							size="sm"
							variant="secondary"
							disabled={!table.getCanPreviousPage()}
							onClick={() => table.previousPage()}
						>
							Previous
						</Button>
						<Button
							size="sm"
							variant="secondary"
							disabled={!table.getCanNextPage()}
							onClick={() => table.nextPage()}
						>
							Next
						</Button>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
