const ESPN_WORLD_CUP_URL = 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world';
const CACHE_TTL_MS = 2 * 60 * 1000;
const TOURNAMENT_START = new Date('2026-06-11T00:00:00Z');

type EspnEvent = {
  id: string;
  date: string;
  status: {type?: {state?: string; detail?: string; shortDetail?: string}};
  competitions?: {
    venue?: {fullName?: string; address?: {city?: string; country?: string}};
    competitors?: {
      homeAway: 'home' | 'away';
      score?: string;
      team: {displayName: string; shortDisplayName?: string; logo?: string};
    }[];
  }[];
};

export type WorldCupFixtureSnapshot = {
  id: string;
  home: string;
  away: string;
  score1: number | null;
  score2: number | null;
  status: 'Live' | 'Upcoming' | 'Result';
  startTime: string;
  venue?: string;
};

let cache: {expiresAt: number; payload: {updatedAt: string; fixtures: WorldCupFixtureSnapshot[]}} | null = null;

function mapEspnStatus(state?: string): 'Live' | 'Upcoming' | 'Result' {
  if (state === 'in') return 'Live';
  if (state === 'post') return 'Result';
  return 'Upcoming';
}

function parseScore(value?: string) {
  if (value == null || value === '' || value === '-') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function mapEspnEvent(event: EspnEvent): WorldCupFixtureSnapshot {
  const competition = event.competitions?.[0];
  const home = competition?.competitors?.find((team) => team.homeAway === 'home') || competition?.competitors?.[0];
  const away = competition?.competitors?.find((team) => team.homeAway === 'away') || competition?.competitors?.[1];
  const venue = competition?.venue;
  const status = mapEspnStatus(event.status.type?.state);
  const score1 = parseScore(home?.score);
  const score2 = parseScore(away?.score);

  return {
    id: event.id,
    home: home?.team.displayName || 'Home',
    away: away?.team.displayName || 'Away',
    score1: status === 'Upcoming' ? null : score1,
    score2: status === 'Upcoming' ? null : score2,
    status,
    startTime: event.date,
    venue: [venue?.fullName, venue?.address?.city, venue?.address?.country].filter(Boolean).join(', ') || undefined,
  };
}

function buildDateRange() {
  const dates: string[] = [];
  const end = new Date();
  end.setUTCDate(end.getUTCDate() + 8);

  for (let cursor = new Date(TOURNAMENT_START); cursor <= end; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
    const year = cursor.getUTCFullYear();
    const month = String(cursor.getUTCMonth() + 1).padStart(2, '0');
    const day = String(cursor.getUTCDate()).padStart(2, '0');
    dates.push(`${year}${month}${day}`);
  }

  return dates;
}

async function fetchEspnFixtures() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const dates = buildDateRange();
    const scoreboards = await Promise.allSettled(
      dates.map(async (date) => {
        const response = await fetch(`${ESPN_WORLD_CUP_URL}/scoreboard?dates=${date}`, {signal: controller.signal});
        if (!response.ok) throw new Error(`ESPN scoreboard ${date} failed with ${response.status}`);
        return response.json();
      }),
    );

    const byId = new Map<string, WorldCupFixtureSnapshot>();
    scoreboards.forEach((result) => {
      if (result.status !== 'fulfilled') return;
      ((result.value.events || []) as EspnEvent[]).forEach((event) => {
        byId.set(event.id, mapEspnEvent(event));
      });
    });

    return Array.from(byId.values()).sort((a, b) => a.startTime.localeCompare(b.startTime));
  } finally {
    clearTimeout(timeout);
  }
}

export default async function handler(_request: any, response: any) {
  if (cache && cache.expiresAt > Date.now()) {
    return response.status(200).json(cache.payload);
  }

  try {
    const fixtures = await fetchEspnFixtures();
    const payload = {
      updatedAt: new Date().toISOString(),
      fixtures,
    };
    cache = {expiresAt: Date.now() + CACHE_TTL_MS, payload};
    return response.status(200).json(payload);
  } catch (error) {
    if (cache) {
      return response.status(200).json({
        ...cache.payload,
        warning: error instanceof Error ? error.message : 'Unable to refresh World Cup fixtures.',
      });
    }

    return response.status(200).json({
      updatedAt: new Date().toISOString(),
      warning: error instanceof Error ? error.message : 'Unable to load World Cup fixtures.',
      fixtures: [],
    });
  }
}
