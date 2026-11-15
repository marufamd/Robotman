import { createFileRoute } from '@tanstack/react-router';
import { ChangeHistory, type HistoryOrder } from '../../../../components/content-managers';
import { RequireServer } from '../../../../components/server-page';

// Defaults stay out of the address bar so the plain link to this page keeps working.
type HistorySearch = { page?: number; order?: 'oldest' };

export const Route = createFileRoute('/_authenticated/servers/$serverId/history')({
  validateSearch: (search: Record<string, unknown>): HistorySearch => {
    const page = Math.trunc(Number(search.page));
    return { ...(page > 1 ? { page } : {}), ...(search.order === 'oldest' ? { order: 'oldest' as const } : {}) };
  },
  component: HistoryPage,
});

function HistoryPage() {
  const { serverId } = Route.useParams();
  const { page = 1, order = 'newest' } = Route.useSearch() as { page?: number; order?: HistoryOrder };
  const navigate = Route.useNavigate();
  return <RequireServer serverId={serverId}>{server => <ChangeHistory order={order} page={page} server={server} onChange={next => void navigate({ search: { ...(next.page > 1 ? { page: next.page } : {}), ...(next.order === 'oldest' ? { order: 'oldest' as const } : {}) } })} />}</RequireServer>;
}
