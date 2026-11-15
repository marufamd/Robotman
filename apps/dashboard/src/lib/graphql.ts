export type User = {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
};

export type ManagedServer = {
  id: string;
  name: string;
  icon: string | null;
  owner: boolean;
  installed: boolean;
  inviteUrl: string;
};

export type ResponseAuthor = { id: string; username: string | null };

export type GuildResponse = {
  id: string;
  trigger: string;
  aliases: string[];
  content: string;
  embedsJson: string;
  createdBy: ResponseAuthor | null;
  lastEditedBy: ResponseAuthor | null;
};

export type RecommendationEntry = {
  id: string;
  category: string;
  name: string;
  aliases: string[];
  content: string;
  embedsJson: string;
  curatorName: string;
  curatorUserId: string | null;
  introductionMode: 'INHERIT' | 'CUSTOM' | 'NONE';
  introduction: string;
  effectiveIntroduction: string;
};
export type RecommendationListSettings = { title: string; introduction: string; color: number };
export type RecommendationSettings = {
  lists: { tasteTest: RecommendationListSettings & { moderatorHeading: string; boosterHeading: string }; characters: RecommendationListSettings; writers: RecommendationListSettings };
  categories: Array<{ category: string; introduction: string }>;
};
export const recommendationFields = 'id category name aliases content embedsJson curatorName curatorUserId introductionMode introduction effectiveIntroduction';
export const recommendationSettingsFields = 'lists { tasteTest { title introduction color moderatorHeading boosterHeading } characters { title introduction color } writers { title introduction color } } categories { category introduction }';

export type ResponseChange = {
  action: string;
  actorId: string;
  responseId: string;
  occurredAt: string;
  trigger: string;
};

export type ModeratorSettings = {
  guildId: string;
  releaseListChannelId: string | null;
  releaseListDayOfWeek: number;
  releaseListHour: number;
  releaseListMinute: number;
  releaseListTimeZone: string;
  tvmazeShowIds: number[];
};

type GraphqlResult<T> = { data?: T; errors?: Array<{ message: string; extensions?: { code?: string } }> };

function userFacingError(message: string) {
  const discordFailure = message.match(/Discord API request failed at .+ \(HTTP (\d+)\)/i);
  if (discordFailure?.[1] === '429') {
    const retry = message.match(/retry after (\d+) seconds/i)?.[1];
    return retry ? `Discord is temporarily limiting server-list requests. Try again in ${retry} seconds.` : 'Discord is temporarily limiting server-list requests. Wait a moment, then try again.';
  }
  if (discordFailure) return `Discord request failed (HTTP ${discordFailure[1]}). Try again in a moment.`;
  return message.replace(/\bguilds?\b/gi, match => match.toLowerCase() === 'guilds' ? 'servers' : 'server');
}

export async function queryGraphql<T>(
  query: string,
  csrfToken?: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  const response = await fetch('/api/graphql', {
    method: 'POST',
    credentials: 'same-origin',
    headers: {
      'content-type': 'application/json',
      ...(csrfToken ? { 'x-csrf-token': csrfToken } : {}),
    },
    body: JSON.stringify({ query, variables }),
  });

  const result = await response.json().catch(() => ({})) as GraphqlResult<T>;
  if (!response.ok || result.errors?.length || !result.data) {
    const code = result.errors?.[0]?.extensions?.code ?? (response.status >= 500 ? 'SERVICE_UNAVAILABLE' : undefined);
    const message = userFacingError(result.errors?.[0]?.message ?? 'Robotman could not complete the request. Please try again.');
    if (typeof window !== 'undefined' && (code === 'UNAUTHENTICATED' || code === 'SERVICE_UNAVAILABLE')) {
      window.dispatchEvent(new CustomEvent('robotman:auth-error', { detail: { code, message } }));
    }
    throw new Error(message);
  }
  return result.data;
}
