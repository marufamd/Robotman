import { createFileRoute } from '@tanstack/react-router';
import { ResponseManager } from '../../../../../components/content-managers';
import { RequireServer } from '../../../../../components/server-page';
import { useAuth } from '../../../../../lib/auth-context';

export const Route = createFileRoute('/_authenticated/servers/$serverId/responses/')({ component: ResponsesPage });

function ResponsesPage() {
  const { serverId } = Route.useParams();
  const { csrfToken } = useAuth();
  return <RequireServer serverId={serverId}>{server => <ResponseManager csrfToken={csrfToken ?? ''} server={server} />}</RequireServer>;
}
