import { createFileRoute } from '@tanstack/react-router';
import { ResponseEditor } from '../../../../../components/response-editor';
import { RequireServer } from '../../../../../components/server-page';
import { useAuth } from '../../../../../lib/auth-context';

export const Route = createFileRoute('/_authenticated/servers/$serverId/responses/new')({ component: NewResponsePage });

function NewResponsePage() {
  const { serverId } = Route.useParams();
  const { csrfToken, user } = useAuth();
  return <RequireServer serverId={serverId}>{server => <ResponseEditor csrfToken={csrfToken ?? ''} server={server} user={user} />}</RequireServer>;
}
