import { createFileRoute, Link } from '@tanstack/react-router';
import { Icon } from '../../../../components/icon';
import { PageHeader, RequireServer } from '../../../../components/server-page';
import { useAuth } from '../../../../lib/auth-context';
import type { ManagedServer } from '../../../../lib/graphql';

export const Route = createFileRoute('/_authenticated/servers/$serverId/')({ component: ServerOverviewPage });

function ServerOverviewPage() {
  const { serverId } = Route.useParams();
  return <RequireServer serverId={serverId}>{server => <Overview server={server} />}</RequireServer>;
}

function Overview({ server }: { server: ManagedServer }) {
  const { user } = useAuth();
  const sections = [
    { label: 'Responses', description: 'Create and maintain phrases that members can request in Discord.', to: '/servers/$serverId/responses' as const, icon: 'responses' as const },
    { label: 'Recommendations', description: 'Manage the entries available through the recommendation commands.', to: '/servers/$serverId/recommendations' as const, icon: 'recommendations' as const },
    { label: 'Change History', description: 'See who created, edited or deleted Responses and recommendation lists.', to: '/servers/$serverId/history' as const, icon: 'history' as const },
    { label: 'Server Settings', description: 'Choose the Release List schedule and TV shows used by /shows.', to: '/servers/$serverId/settings' as const, icon: 'settings' as const },
  ];

  return <section>
    <PageHeader description="Manage the Robotman features available to your members." server={server} title={server.name} />
    <div className="mb-8 flex flex-wrap items-center gap-3 border-y border-night-800 py-4 text-sm"><span className="inline-flex items-center gap-2 font-medium text-night-100"><span className="size-2 rounded-full bg-emerald-400" />Robotman is installed</span><span className="text-night-600" aria-hidden="true">·</span><span className="text-night-300">Signed in as {user?.displayName || user?.username}</span></div>
    <div>
      <h2 className="mb-4 font-display text-lg font-bold text-white">Choose what to manage</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {sections.map(section => (
          <Link
            className="group flex flex-col justify-between rounded-2xl border border-night-800 bg-night-900/50 p-5 transition-all duration-200 hover:border-sunset-500/40 hover:bg-night-900/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sunset-400"
            key={section.label}
            params={{ serverId: server.id }}
            to={section.to}
          >
            <div>
              <div className="mb-4 flex items-center justify-between">
                <span className="grid size-11 place-items-center rounded-xl bg-night-800 text-sunset-300 transition-colors group-hover:bg-sunset-500/10 group-hover:text-sunset-200">
                  <Icon className="size-5" name={section.icon} />
                </span>
                <Icon className="size-4 text-night-400 transition-transform group-hover:translate-x-1 group-hover:text-sunset-300" name="arrow" />
              </div>
              <h3 className="font-display text-base font-bold text-white">{section.label}</h3>
              <p className="mt-2 text-sm leading-6 text-night-300">{section.description}</p>
            </div>
            <div className="mt-6 flex items-center gap-1.5 text-xs font-semibold text-sunset-300 opacity-90 transition-opacity group-hover:opacity-100">
              <span>Open</span>
              <span aria-hidden="true">&rarr;</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  </section>;
}
