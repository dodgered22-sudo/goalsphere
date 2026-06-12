const API_FOOTBALL_BASE = 'https://v3.football.api-sports.io';
const API_FOOTBALL_KEY = process.env.API_FOOTBALL_KEY || process.env.VITE_API_FOOTBALL_KEY || 'cdf3ba665d43fb3d80478c709b51f1c2';
const ESPN_WORLD_CUP_URL = 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world';
const ESPN_FRIENDLIES_URL = 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.friendly';
const CACHE_TTL_MS = 2 * 60 * 1000;
let liveCache: {expiresAt: number; payload: {date: string; source: string; matches: Awaited<ReturnType<typeof fetchLiveFixtures>>; warning?: string}} | null = null;

type ApiFootballFixture = {
  fixture: {
    id: number;
    date: string;
    status: {short: string; long: string; elapsed?: number | null};
    venue?: {name?: string; city?: string};
  };
  league: {id: number; name: string; country?: string; logo?: string; round?: string};
  teams: {
    home: {name: string; logo?: string};
    away: {name: string; logo?: string};
  };
  goals: {home: number | null; away: number | null};
};

type ApiFootballEvent = {
  time: {elapsed: number; extra?: number | null};
  team: {name: string};
  player?: {name?: string};
  assist?: {name?: string};
  type: string;
  detail: string;
};

type LiveFixture = ReturnType<typeof mapFixture>;

type EspnEvent = {
  id: string;
  date: string;
  name: string;
  status: {displayClock?: string; type?: {state?: string; detail?: string; shortDetail?: string}};
  competitions?: {
    venue?: {fullName?: string; address?: {city?: string; country?: string}};
    competitors?: {
      homeAway: 'home' | 'away';
      score?: string;
      team: {displayName: string; shortDisplayName?: string; logo?: string};
    }[];
  }[];
};

type EspnKeyEvent = {
  id: string;
  scoringPlay?: boolean;
  type?: {text?: string; type?: string};
  text?: string;
  clock?: {value?: number; displayValue?: string};
  team?: {displayName?: string};
  participants?: {athlete?: {displayName?: string}}[];
};

function isInternationalFriendly(match: ApiFootballFixture) {
  const league = `${match.league.name} ${match.league.country || ''}`.toLowerCase();
  return league.includes('friend') || league.includes('world') || league.includes('international');
}

function mapFixture(match: ApiFootballFixture) {
  const elapsed = match.fixture.status.elapsed;
  const status = elapsed ? `${elapsed}'` : match.fixture.status.long || match.fixture.status.short || 'Live';

  return {
    id: String(match.fixture.id),
    league: match.league.name || 'International Friendlies',
    status,
    venue: [match.league.country, match.league.round, match.fixture.venue?.name, match.fixture.venue?.city].filter(Boolean).join(' | '),
    startTime: match.fixture.date,
    home: {
      name: match.teams.home.name,
      logo: match.teams.home.logo,
      score: match.goals.home === null ? '-' : String(match.goals.home),
    },
    away: {
      name: match.teams.away.name,
      logo: match.teams.away.logo,
      score: match.goals.away === null ? '-' : String(match.goals.away),
    },
  };
}

async function getApiFootball<T>(endpoint: string, signal: AbortSignal) {
  const response = await fetch(`${API_FOOTBALL_BASE}/${endpoint}`, {
    signal,
    headers: {
      'x-apisports-key': API_FOOTBALL_KEY,
    },
  });

  if (!response.ok) throw new Error(`API-Football ${endpoint} failed with ${response.status}`);

  const data = await response.json();
  if (Array.isArray(data.errors) && data.errors.length) throw new Error(data.errors.join(', '));
  if (data.errors && Object.keys(data.errors).length) throw new Error(JSON.stringify(data.errors));

  return data.response as T;
}

async function fetchFixtureEvents(fixtureId: string, signal: AbortSignal) {
  const events = await getApiFootball<ApiFootballEvent[]>(`fixtures/events?fixture=${fixtureId}`, signal);

  return events
    .filter((event) => event.type === 'Goal' || event.type === 'Card')
    .map((event, index) => ({
      id: `${fixtureId}-${event.time.elapsed}-${event.type}-${index}`,
      minute: event.time.elapsed,
      team: event.team.name,
      player: event.player?.name || 'Unknown player',
      assist: event.assist?.name,
      type: event.type === 'Goal' || event.type === 'Card' ? event.type : 'Other',
      detail: event.detail,
    }));
}

async function enrichWithEvents(matches: LiveFixture[]) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3200);

  try {
    const eventResults = await Promise.race([
      Promise.allSettled(
        matches.slice(0, 8).map(async (match) => ({
          ...match,
          events: await fetchFixtureEvents(match.id, controller.signal),
        })),
      ),
      new Promise<PromiseSettledResult<LiveFixture & {events: Awaited<ReturnType<typeof fetchFixtureEvents>>}>[]>((resolve) => {
        setTimeout(() => resolve([]), 3000);
      }),
    ]);

    const enriched = new Map(
      eventResults
        .map((result) => (result.status === 'fulfilled' ? result.value : null))
        .filter(Boolean)
        .map((match) => [match!.id, match!]),
    );

    return matches.map((match) => enriched.get(match.id) || {...match, events: []});
  } finally {
    clearTimeout(timeout);
    controller.abort();
  }
}

function mapEspnEvent(event: EspnEvent) {
  const competition = event.competitions?.[0];
  const home = competition?.competitors?.find((team) => team.homeAway === 'home') || competition?.competitors?.[0];
  const away = competition?.competitors?.find((team) => team.homeAway === 'away') || competition?.competitors?.[1];
  const venue = competition?.venue;

  return {
    id: event.id,
    league: 'Friendlies',
    status: event.status.type?.shortDetail || event.status.displayClock || 'Live',
    venue: ['World', 'Friendly International', venue?.fullName, venue?.address?.city || venue?.address?.country].filter(Boolean).join(' | '),
    startTime: event.date,
    home: {
      name: home?.team.displayName || 'Home',
      logo: home?.team.logo,
      score: home?.score || '-',
    },
    away: {
      name: away?.team.displayName || 'Away',
      logo: away?.team.logo,
      score: away?.score || '-',
    },
    events: [] as {
      id: string;
      minute: number;
      team: string;
      player: string;
      assist?: string;
      type: 'Goal' | 'Card' | 'Other';
      detail: string;
    }[],
  };
}

function mapEspnKeyEvent(event: EspnKeyEvent, fixtureId: string, index: number) {
  const eventType = `${event.type?.text || ''} ${event.type?.type || ''}`.toLowerCase();
  const isGoal = Boolean(event.scoringPlay || eventType.includes('goal'));
  const isCard = eventType.includes('card');
  if (!isGoal && !isCard) return null;

  return {
    id: `${fixtureId}-${event.id || index}`,
    minute: Math.max(0, Math.floor((event.clock?.value || 0) / 60)),
    team: event.team?.displayName || 'Team',
    player: event.participants?.[0]?.athlete?.displayName || event.text?.split('(')[0]?.trim() || 'Unknown player',
    assist: isGoal ? event.participants?.[1]?.athlete?.displayName : undefined,
    type: isGoal ? 'Goal' as const : 'Card' as const,
    detail: isGoal ? 'Goal' : event.type?.text || 'Card',
  };
}

async function fetchEspnEvents(match: LiveFixture, signal: AbortSignal, baseUrl: string) {
  const response = await fetch(`${baseUrl}/summary?event=${match.id}`, {signal});
  if (!response.ok) return [];
  const data = await response.json();
  return ((data.keyEvents || []) as EspnKeyEvent[])
    .map((event, index) => mapEspnKeyEvent(event, match.id, index))
    .filter(Boolean);
}

async function fetchEspnLiveFixtures(baseUrl = ESPN_WORLD_CUP_URL) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6500);

  try {
    const response = await fetch(`${baseUrl}/scoreboard`, {signal: controller.signal});
    if (!response.ok) throw new Error(`ESPN scoreboard failed with ${response.status}`);
    const data = await response.json();
    const liveMatches = ((data.events || []) as EspnEvent[])
      .filter((event) => event.status.type?.state === 'in')
      .map(mapEspnEvent);

    const eventResults = await Promise.allSettled(
      liveMatches.slice(0, 8).map(async (match) => ({
        ...match,
        events: await fetchEspnEvents(match, controller.signal, baseUrl),
      })),
    );
    const enriched = new Map(
      eventResults
        .map((result) => (result.status === 'fulfilled' ? result.value : null))
        .filter(Boolean)
        .map((match) => [match!.id, match!]),
    );

    return liveMatches.map((match) => enriched.get(match.id) || match);
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchLiveFixtures() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5500);
  let apiFootballError: unknown = null;

  try {
    const fixtures = await getApiFootball<ApiFootballFixture[]>('fixtures?live=all', controller.signal);
    const matches = fixtures.filter(isInternationalFriendly).map(mapFixture);
    clearTimeout(timeout);
    if (matches.length) return enrichWithEvents(matches);
  } catch (error) {
    apiFootballError = error;
  } finally {
    clearTimeout(timeout);
  }

  try {
    return await fetchEspnLiveFixtures(ESPN_WORLD_CUP_URL);
  } catch {
    const friendlyMatches = await fetchEspnLiveFixtures(ESPN_FRIENDLIES_URL);
    if (friendlyMatches.length || !apiFootballError) return friendlyMatches;
  }

  throw apiFootballError;
}

export default async function handler(_request: any, response: any) {
  if (liveCache && liveCache.expiresAt > Date.now()) {
    return response.status(200).json(liveCache.payload);
  }

  try {
    const matches = await fetchLiveFixtures();
    const payload = {
      date: new Date().toISOString(),
      source: 'Live FIFA World Cup fixtures',
      matches,
    };
    liveCache = {expiresAt: Date.now() + CACHE_TTL_MS, payload};

    return response.status(200).json(payload);
  } catch (error) {
    if (liveCache) {
      return response.status(200).json({
        ...liveCache.payload,
        warning: error instanceof Error ? error.message : 'Unable to refresh live matches.',
      });
    }

    const payload = {
      date: new Date().toISOString(),
      source: 'Live FIFA World Cup fixtures',
      warning: error instanceof Error ? error.message : 'Unable to load live matches.',
      matches: [],
    };
    liveCache = {expiresAt: Date.now() + 30 * 1000, payload};
    return response.status(200).json(payload);
  }
}
