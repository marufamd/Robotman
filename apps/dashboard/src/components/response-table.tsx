import {
  columnFilteringFeature, createColumnHelper, createFilteredRowModel,
  createPaginatedRowModel, createSortedRowModel, filterFn_includesString,
  globalFilteringFeature, rowPaginationFeature, rowSortingFeature,
  sortFn_text, tableFeatures, useTable,
} from '@tanstack/react-table';
import { Link } from '@tanstack/react-router';
import type { GuildResponse, ResponseAuthor } from '../lib/graphql';
import { Icon } from './icon';
import { iconButtonClass } from './server-page';

const features = tableFeatures({
  columnFilteringFeature,
  globalFilteringFeature,
  filteredRowModel: createFilteredRowModel(),
  filterFns: { includesString: filterFn_includesString },
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  sortFns: { text: sortFn_text },
  rowPaginationFeature,
  paginatedRowModel: createPaginatedRowModel(),
});
const helper = createColumnHelper<typeof features, GuildResponse>();
const columns = helper.columns([
  helper.accessor('trigger', {
    header: 'Trigger', sortFn: 'text',
    cell: ({ getValue }) => <span className="block truncate font-semibold text-night-100" title={getValue()}>{getValue()}</span>,
  }),
  helper.accessor(row => row.aliases.join(', '), {
    id: 'aliases', header: 'Aliases', enableSorting: false,
    cell: ({ getValue }) => <span className="block truncate text-night-300" title={getValue()}>{getValue() || <span className="text-night-400">None</span>}</span>,
  }),
  helper.accessor('content', {
    header: 'Reply', enableSorting: false,
    cell: ({ row }) => <ReplySummary response={row.original} />,
  }),
  helper.accessor(row => row.createdBy?.username ?? '', {
    id: 'createdBy', header: 'Created by', enableSorting: false,
    cell: ({ row }) => <AuthorName author={row.original.createdBy} empty="Not recorded" />,
  }),
  helper.accessor(row => row.lastEditedBy?.username ?? '', {
    id: 'lastEditedBy', header: 'Last edited by', enableSorting: false,
    cell: ({ row }) => <AuthorName author={row.original.lastEditedBy} empty="Not edited" />,
  }),
  helper.display({ id: 'actions', header: 'Actions', enableSorting: false }),
]);

function AuthorName({ author, empty }: { author: ResponseAuthor | null; empty: string }) {
  if (!author) return <span className="text-night-400">{empty}</span>;
  const name = author.username ?? 'Unknown user';
  return <span aria-label={`${name}, Discord user ID ${author.id}`} className="block cursor-help truncate rounded text-night-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sunset-400" tabIndex={0} title={`Discord user ID: ${author.id}`}>{name}</span>;
}

function ReplySummary({ response }: { response: GuildResponse }) {
  let embeds = 0;
  try {
    const parsed: unknown = JSON.parse(response.embedsJson);
    if (Array.isArray(parsed)) embeds = parsed.length;
  } catch { /* Older rows can have an empty serialized embed value. */ }
  return <div className="flex min-w-0 items-center gap-2">
    <span className="block truncate text-night-300" title={response.content}>{response.content || (embeds ? 'Embeds only' : 'No text')}</span>
    {embeds > 0 && <span className="shrink-0 rounded border border-night-700 px-1.5 py-0.5 text-[11px] leading-4 text-night-300">{embeds} {embeds === 1 ? 'embed' : 'embeds'}</span>}
  </div>;
}

export function ResponseTable({ responses, serverId, loading, deletingId, onDelete }: {
  responses: GuildResponse[];
  serverId: string;
  loading: boolean;
  deletingId: string | null;
  onDelete: (id: string, trigger: string) => void;
}) {
  const table = useTable({
    features, columns, data: responses, getRowId: row => row.id,
    globalFilterFn: 'includesString',
    getColumnCanGlobalFilter: column => column.id !== 'actions',
    initialState: { sorting: [{ id: 'trigger', desc: false }], pagination: { pageIndex: 0, pageSize: 10 } },
    enableSortingRemoval: false,
    enableMultiSort: false,
  });
  const search = String(table.state.globalFilter ?? '');
  const rows = table.getRowModel().rows;
  const total = table.getFilteredRowModel().rows.length;
  const { pageIndex, pageSize } = table.state.pagination;

  return <div className="mt-3">
    <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
      <label className="relative block w-full sm:max-w-xs">
        <span className="sr-only">Search Responses</span>
        <Icon className="pointer-events-none absolute left-3 top-2.5 size-4 text-night-400" name="search" />
        <input className="h-9 w-full rounded-lg border border-night-700 bg-night-950 pl-9 pr-9 text-[13px] text-white outline-none placeholder:text-night-400 focus:border-sunset-400 focus:ring-1 focus:ring-sunset-400 disabled:opacity-50" disabled={loading} onChange={event => table.setGlobalFilter(event.target.value)} placeholder="Search Responses…" type="search" value={search} />
      </label>
      <span aria-live="polite" className="text-xs tabular-nums text-night-400">{loading ? 'Loading…' : `${total} ${total === 1 ? 'Response' : 'Responses'}${search ? ' found' : ''}`}</span>
    </div>
    <div className="overflow-hidden rounded-xl border border-night-800 bg-night-900/40">
      <div aria-label="Response table, scroll horizontally to see all columns" className="overflow-x-auto focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-sunset-400" role="region" tabIndex={0}>
        <table aria-busy={loading} className="w-full min-w-[960px] table-fixed text-left text-[13px] leading-5">
          <caption className="sr-only">Saved Responses for this server</caption>
          <colgroup><col className="w-[18%]" /><col className="w-[16%]" /><col /><col className="w-[14%]" /><col className="w-[14%]" /><col className="w-28" /></colgroup>
          <thead className="border-b border-night-800 bg-night-900 text-xs text-night-300">
            {table.getHeaderGroups().map(group => <tr key={group.id}>{group.headers.map(header => {
              const sorted = header.column.getIsSorted();
              return <th aria-sort={header.column.getCanSort() ? sorted === 'asc' ? 'ascending' : sorted === 'desc' ? 'descending' : 'none' : undefined} className={`px-4 py-3 font-medium ${header.column.id === 'actions' ? 'sticky right-0 bg-night-900 text-right' : ''}`} key={header.id} scope="col">
                {header.column.getCanSort() ? <button className="inline-flex items-center gap-2 rounded text-xs font-medium transition-colors hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sunset-400" onClick={header.column.getToggleSortingHandler()} type="button"><table.FlexRender header={header} /><Icon className="size-3.5 text-night-400" name="sort" /><span className="sr-only">, {sorted === 'asc' ? 'sorted ascending' : 'sorted descending'}</span></button> : <table.FlexRender header={header} />}
              </th>;
            })}</tr>)}
          </thead>
          <tbody className="divide-y divide-night-800">
            {loading ? [0, 1, 2].map(index => <tr key={index}>{columns.map((_, column) => <td className="px-4 py-4" key={column}><span className="block h-4 w-3/4 animate-pulse rounded bg-night-800 motion-reduce:animate-none" /></td>)}</tr>) : rows.length ? rows.map(row => <tr className="transition-colors hover:bg-night-800/35" key={row.id}>
              {row.getAllCells().map(cell => <td className={`px-4 py-3 align-middle ${cell.column.id === 'actions' ? 'sticky right-0 bg-night-900' : ''}`} key={cell.id}>{cell.column.id === 'actions' ? <div className="flex justify-end gap-2">
                <Link aria-label={`Edit Response ${row.original.trigger}`} className={iconButtonClass} params={{ serverId, responseId: row.original.id }} title="Edit Response" to="/servers/$serverId/responses/$responseId/edit"><Icon className="size-4" name="edit" /></Link>
                <button aria-label={deletingId === row.id ? `Deleting Response ${row.original.trigger}` : `Delete Response ${row.original.trigger}`} className={`${iconButtonClass} hover:border-rose-400/50 hover:bg-rose-950/30 hover:text-rose-300`} disabled={deletingId !== null} onClick={() => onDelete(row.original.id, row.original.trigger)} title="Delete Response" type="button"><Icon className={`size-4 ${deletingId === row.id ? 'animate-spin motion-reduce:animate-none' : ''}`} name={deletingId === row.id ? 'loader' : 'trash'} /></button>
              </div> : <table.FlexRender cell={cell} />}</td>)}
            </tr>) : <tr><td className="px-4 py-10 text-center" colSpan={columns.length}>
              <p className="font-semibold text-night-100">{search ? 'No matching Responses' : 'No Responses yet'}</p>
              <p className="mt-1 text-xs leading-5 text-night-300">{search ? 'Try another trigger, alias, or reply.' : 'Create a Response for members to request in Discord.'}</p>
              {search && <button className="mt-3 rounded text-xs font-semibold text-sunset-200 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sunset-400" onClick={() => table.setGlobalFilter('')} type="button">Clear search</button>}
            </td></tr>}
          </tbody>
        </table>
      </div>
      {!loading && total > pageSize && <nav aria-label="Response table pages" className="flex items-center justify-between gap-3 border-t border-night-800 px-4 py-3">
        <p aria-live="polite" className="text-xs tabular-nums text-night-400">{pageIndex * pageSize + 1}–{Math.min((pageIndex + 1) * pageSize, total)} of {total}</p>
        <div className="flex items-center gap-3"><span className="text-xs tabular-nums text-night-300">Page {pageIndex + 1} of {table.getPageCount()}</span><div className="flex gap-2"><button aria-label="Previous page" className={iconButtonClass} disabled={!table.getCanPreviousPage()} onClick={() => table.previousPage()} type="button"><Icon className="size-4" name="chevron-left" /></button><button aria-label="Next page" className={iconButtonClass} disabled={!table.getCanNextPage()} onClick={() => table.nextPage()} type="button"><Icon className="size-4" name="chevron-right" /></button></div></div>
      </nav>}
    </div>
  </div>;
}
