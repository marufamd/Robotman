import {
	AUTO_RESPONSE_TYPE_OPTIONS,
	type AutoResponse,
	type AutoResponseType,
} from "@robotman/shared";
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
import { Input } from "~/components/ui/input";
import { Select } from "~/components/ui/select";
import { Table, TBody, TD, TH, THead, TR } from "~/components/ui/table";

export function AutoResponseTable({
	responses,
	onEdit,
	onDelete,
}: {
	responses: AutoResponse[];
	onEdit: (response: AutoResponse) => void;
	onDelete: (response: AutoResponse) => void;
}) {
	const [sorting, setSorting] = useState<SortingState>([
		{ id: "updatedAt", desc: true },
	]);
	const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
	const [pagination, setPagination] = useState<PaginationState>({
		pageIndex: 0,
		pageSize: 6,
	});
	const [search, setSearch] = useState("");
	const [selectedType, setSelectedType] = useState<AutoResponseType | "ALL">(
		"ALL",
	);
	const deferredSearch = useDeferredValue(search);

	useEffect(() => {
		startTransition(() => {
			const nextFilters: ColumnFiltersState = [];

			if (deferredSearch) {
				nextFilters.push({
					id: "trigger",
					value: deferredSearch,
				});
			}

			if (selectedType !== "ALL") {
				nextFilters.push({
					id: "type",
					value: selectedType,
				});
			}

			setColumnFilters(nextFilters);
		});
	}, [deferredSearch, selectedType]);

	const table = useReactTable({
		data: responses,
		columns: [
			{
				accessorKey: "trigger",
				header: "Name",
				cell: ({ row }) => (
					<p className="font-semibold text-white">
						{row.original.trigger}
					</p>
				),
			},
			{
				accessorKey: "type",
				header: "Type",
			},
			{
				accessorKey: "createdBy",
				header: "Created By",
			},
			{
				accessorKey: "lastEditedBy",
				header: "Last Edited By",
				cell: ({ row }) => row.original.lastEditedBy ?? "—",
			},
			{
				id: "actions",
				header: "",
				enableSorting: false,
				cell: ({ row }) => (
					<div className="flex justify-end gap-2">
						<Button
							size="sm"
							variant="secondary"
							onClick={() => onEdit(row.original)}
						>
							<PencilLine className="mr-2 size-4" />
							Edit
						</Button>
						<Button
							size="sm"
							variant="danger"
							onClick={() => onDelete(row.original)}
						>
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
		<div className="flex flex-col">
			<div className="flex flex-col gap-4 rounded-t-xl border border-night-700 bg-night-900 p-6 md:flex-row md:items-center md:justify-between">
				<div className="w-full max-w-xs">
					<Select
						aria-label="Filter by type"
						value={selectedType}
						onChange={(event) =>
							setSelectedType(
								event.target.value as AutoResponseType | "ALL",
							)
						}
						className=""
					>
						<option value="ALL">All Types</option>
						{AUTO_RESPONSE_TYPE_OPTIONS.map((type) => (
							<option key={type} value={type}>
								{type}
							</option>
						))}
					</Select>
				</div>
				<div className="flex items-center gap-4">
					<Input
						className="max-w-sm border-night-700 bg-night-950"
						placeholder="Search trigger names"
						value={search}
						onChange={(event) => setSearch(event.target.value)}
					/>
				</div>
			</div>

			<div className="overflow-hidden rounded-b-xl border border-t-0 border-night-700 bg-night-950 shadow-lg shadow-black/20">
				<div className="overflow-x-auto">
					<Table>
						<THead>
							{table.getHeaderGroups().map((headerGroup) => (
								<TR key={headerGroup.id}>
									{headerGroup.headers.map((header) => (
										<TH
											key={header.id}
											className={
												header.id === "actions"
													? "text-right"
													: undefined
											}
										>
											{header.isPlaceholder ? null : (
												<button
													className="inline-flex items-center gap-2"
													onClick={header.column
														.getToggleSortingHandler()
														?.bind(null)}
													type="button"
												>
													{flexRender(
														header.column.columnDef
															.header,
														header.getContext(),
													)}
												</button>
											)}
										</TH>
									))}
								</TR>
							))}
						</THead>
						<TBody>
							{table.getRowModel().rows.length === 0 ? (
								<TR>
									<TD
										colSpan={5}
										className="py-10 text-center text-night-200/60"
									>
										No auto responses match this filter.
									</TD>
								</TR>
							) : (
								table.getRowModel().rows.map((row) => (
									<TR
										key={row.id}
										className="hover:bg-white/[0.02]"
									>
										{row.getVisibleCells().map((cell) => (
											<TD
												key={cell.id}
												className={
													cell.column.id === "actions"
														? "text-right"
														: undefined
												}
											>
												{flexRender(
													cell.column.columnDef.cell,
													cell.getContext(),
												)}
											</TD>
										))}
									</TR>
								))
							)}
						</TBody>
					</Table>
				</div>
				<div className="flex items-center justify-between border-t border-white/8 px-6 py-4">
					<p className="text-sm text-night-200/68">
						{table.getFilteredRowModel().rows.length === 0
							? "Showing 0 results"
							: `Showing ${table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} to ${Math.min((table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize, table.getFilteredRowModel().rows.length)} of ${table.getFilteredRowModel().rows.length} results`}
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
			</div>
		</div>
	);
}
