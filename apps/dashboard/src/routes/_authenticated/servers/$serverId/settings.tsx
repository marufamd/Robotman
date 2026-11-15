import { createFileRoute } from '@tanstack/react-router';
import { ModeratorSettingsEditor } from '../../../../components/moderator-settings-editor';
import { RequireServer } from '../../../../components/server-page';
import { useAuth } from '../../../../lib/auth-context';

export const Route = createFileRoute('/_authenticated/servers/$serverId/settings')({ component: ServerSettingsPage });

function ServerSettingsPage() {
  const { serverId } = Route.useParams();
  const { csrfToken } = useAuth();
  return <RequireServer serverId={serverId}>{server => <ModeratorSettingsEditor csrfToken={csrfToken ?? ''} server={server} />}</RequireServer>;
}
