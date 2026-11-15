import { createFileRoute } from '@tanstack/react-router';
import { ResponseEditor } from '../../../../../components/response-editor';
import { RequireServer } from '../../../../../components/server-page';
import { useAuth } from '../../../../../lib/auth-context';

export const Route = createFileRoute('/_authenticated/servers/$serverId/recommendations/new')({ component: EditorPage });
function EditorPage() {
  const { serverId } = Route.useParams();
  const { user, csrfToken } = useAuth();
  return <RequireServer serverId={serverId}>{server => <ResponseEditor recommendation server={server} user={user} csrfToken={csrfToken ?? ''} />}</RequireServer>;
}
