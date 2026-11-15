import { createFileRoute } from '@tanstack/react-router';
import { RecommendationSettingsEditor } from '../../../../../components/recommendation-settings';
import { RequireServer } from '../../../../../components/server-page';

export const Route = createFileRoute('/_authenticated/servers/$serverId/recommendations/settings')({ component: SettingsPage });
function SettingsPage() {
  const { serverId } = Route.useParams();
  return <RequireServer serverId={serverId}>{server => <RecommendationSettingsEditor server={server} />}</RequireServer>;
}
