import { createFileRoute } from '@tanstack/react-router';
import { ResponseHistory } from '../../../../components/content-managers';
import { RequireServer } from '../../../../components/server-page';

export const Route = createFileRoute('/_authenticated/servers/$serverId/history')({ component: HistoryPage });

function HistoryPage() {
  const { serverId } = Route.useParams();
  return <RequireServer serverId={serverId}>{server => <ResponseHistory server={server} />}</RequireServer>;
}
