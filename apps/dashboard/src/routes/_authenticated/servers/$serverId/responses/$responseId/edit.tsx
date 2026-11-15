import { createFileRoute } from '@tanstack/react-router';
import { ResponseEditor } from '../../../../../../components/response-editor';
import { RequireServer } from '../../../../../../components/server-page';
import { useAuth } from '../../../../../../lib/auth-context';

export const Route = createFileRoute('/_authenticated/servers/$serverId/responses/$responseId/edit')({ component: EditResponsePage });

function EditResponsePage() {
  const { serverId, responseId } = Route.useParams();
  const { csrfToken, user } = useAuth();
  return <RequireServer serverId={serverId}>{server => <ResponseEditor csrfToken={csrfToken ?? ''} responseId={responseId} server={server} user={user} />}</RequireServer>;
}
