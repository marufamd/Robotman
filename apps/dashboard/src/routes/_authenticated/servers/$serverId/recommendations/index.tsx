import { createFileRoute } from '@tanstack/react-router';
import { RecommendationManager } from '../../../../../components/content-managers';
import { RequireServer } from '../../../../../components/server-page';
import { useAuth } from '../../../../../lib/auth-context';

export const Route = createFileRoute('/_authenticated/servers/$serverId/recommendations/')({ component: RecommendationsPage });

function RecommendationsPage() {
  const { serverId } = Route.useParams();
  const { csrfToken } = useAuth();
  return <RequireServer serverId={serverId}>{server => <RecommendationManager csrfToken={csrfToken ?? ''} server={server} />}</RequireServer>;
}
