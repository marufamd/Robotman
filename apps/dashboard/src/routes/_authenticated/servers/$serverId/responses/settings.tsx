import { createFileRoute } from '@tanstack/react-router';
import { ResponseSettingsEditor } from '../../../../../components/response-settings';
import { RequireServer } from '../../../../../components/server-page';
import { useAuth } from '../../../../../lib/auth-context';

export const Route = createFileRoute('/_authenticated/servers/$serverId/responses/settings')({ component: SettingsPage });
function SettingsPage() {
  const { serverId } = Route.useParams();
  const { csrfToken } = useAuth();
  return <RequireServer serverId={serverId}>{server => <ResponseSettingsEditor csrfToken={csrfToken ?? ''} server={server} />}</RequireServer>;
}
