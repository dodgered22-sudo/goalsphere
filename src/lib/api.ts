import {
  fallbackArticles,
  players as featuredPlayers,
  type Article,
  type Match,
  type Standing,
} from '../data/static';
import {manualPosts} from '../data/manualPosts';

const API_KEY = "cdf3ba665d43fb3d80478c709b51f1c2";
const API_FOOTBALL_BASE = 'https://v3.football.api-sports.io/';
const WORLD_CUP_LEAGUE = '1';
const WORLD_CUP_SEASON = '2026';
const WORLDCUP_REPO_BASE = 'https://raw.githubusercontent.com/rezarahiminia/worldcup2026/main';
const manualWorldCupResults: Record<string, {score1: number; score2: number}> = {
  // Fallback when live providers lag behind kickoff.
  '1': {score1: 2, score2: 0},
};

type WorldCupFixtureSnapshot = {
  id: string;
  home: string;
  away: string;
  score1: number | null;
  score2: number | null;
  status: 'Live' | 'Upcoming' | 'Result';
  startTime: string;
  venue?: string;
};

const TEAM_NAME_ALIASES: Record<string, string> = {
  'bosnia and herzegovina': 'bosnia herzegovina',
  'bosnia herzegovina': 'bosnia herzegovina',
  'czech republic': 'czechia',
  'cote d ivoire': 'ivory coast',
  'curacao': 'curacao',
  'korea republic': 'south korea',
  'republic of korea': 'south korea',
  'turkey': 'turkiye',
  'turkiye': 'turkiye',
  'united states': 'usa',
  'us': 'usa',
};

function normalizeTeamName(name: string) {
  const normalized = name
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
  return TEAM_NAME_ALIASES[normalized] || normalized;
}

function teamPairKey(team1: string, team2: string) {
  const names = [normalizeTeamName(team1), normalizeTeamName(team2)].sort();
  return names.join('|');
}

function matchKickoffTimestamp(match: Pick<WorldCupMatch, 'date' | 'time'>) {
  return new Date(`${match.date}T${match.time}:00`).getTime();
}

function hasRepoScores(match: RepoMatch) {
  const hasValues = match.home_score !== '' && match.away_score !== '' && match.home_score != null && match.away_score != null;
  if (!hasValues) return false;
  if (match.finished === 'TRUE') return true;
  return !(match.home_score === '0' && match.away_score === '0');
}

function applyFixtureScores(match: WorldCupMatch, fixture: Pick<WorldCupFixtureSnapshot, 'home' | 'away' | 'score1' | 'score2'>) {
  if (typeof fixture.score1 !== 'number' || typeof fixture.score2 !== 'number') return;

  if (normalizeTeamName(match.team1) === normalizeTeamName(fixture.home)) {
    match.score1 = fixture.score1;
    match.score2 = fixture.score2;
    return;
  }

  if (normalizeTeamName(match.team1) === normalizeTeamName(fixture.away)) {
    match.score1 = fixture.score2;
    match.score2 = fixture.score1;
    return;
  }

  if (normalizeTeamName(match.team2) === normalizeTeamName(fixture.home)) {
    match.score1 = fixture.score2;
    match.score2 = fixture.score1;
  }
}

function buildFixtureLookup(fixtures: WorldCupFixtureSnapshot[]) {
  const lookup = new Map<string, WorldCupFixtureSnapshot>();
  fixtures.forEach((fixture) => {
    lookup.set(teamPairKey(fixture.home, fixture.away), fixture);
  });
  return lookup;
}

async function fetchWorldCupFixtureSnapshots(): Promise<WorldCupFixtureSnapshot[]> {
  try {
    const data = await getJson<{fixtures?: WorldCupFixtureSnapshot[]}>('/api/world-cup-fixtures');
    return data.fixtures || [];
  } catch {
    return [];
  }
}

type ApiFootballFixture = {
  fixture: {
    id: number;
    date: string;
    status: {short: string; long: string; elapsed?: number | null};
    venue?: {name?: string; city?: string};
  };
  league: {name?: string; round?: string};
  teams: {
    home: {name: string; logo?: string};
    away: {name: string; logo?: string};
  };
  goals: {home: number | null; away: number | null};
};

type ApiFootballStandingRow = {
  rank: number;
  team: {name: string; logo?: string};
  all: {played: number; win: number; draw: number; lose: number};
  points: number;
};

type ApiFootballTeamRow = {
  team: {id: number; name: string; code?: string; country?: string; founded?: number; logo?: string};
  venue?: {name?: string; city?: string; capacity?: number};
};

export type WorldCupRawMatch = {
  round: string;
  num?: number;
  date: string;
  time: string;
  team1: string;
  team2: string;
  group?: string;
  ground: string;
  score1?: number;
  score2?: number;
};

export type WorldCupMatch = {
  id: string;
  number?: number;
  round: string;
  date: string;
  time: string;
  team1: string;
  team2: string;
  team1Flag?: string;
  team2Flag?: string;
  group: string;
  ground: string;
  city: string;
  country: string;
  status: 'Live' | 'Upcoming' | 'Result';
  score1?: number;
  score2?: number;
};

export type WorldCupTeam = {
  id: string;
  name: string;
  code?: string;
  flag?: string;
  group: string;
  matches: number;
  firstMatch?: string;
};

export type WorldCupStadium = {
  id: string;
  name: string;
  city: string;
  country: string;
  capacity?: number;
  matches: number;
};

export type WorldCupHostCity = {
  id: string;
  city: string;
  country: string;
  matches: number;
};

export type PlayerProfile = {
  id: string;
  name: string;
  team: string;
  position: string;
  age?: number;
  rating: string;
  image: string;
};

export type WorldCupData = {
  name: string;
  matches: WorldCupMatch[];
  teams: WorldCupTeam[];
  stadiums: WorldCupStadium[];
  hostCities: WorldCupHostCity[];
  players: PlayerProfile[];
  standings: Standing[];
};

export type LiveStream = {
  title: string;
  match: string;
  status: 'live' | 'scheduled' | 'offline';
  provider: string;
  embedUrl?: string;
  posterImage?: string;
  message?: string;
  updatedAt: string;
};

type RepoTeam = {id: string; name_en: string; fifa_code: string; flag: string; groups: string};
type RepoStadium = {id: string; name_en: string; fifa_name: string; city_en: string; country_en: string; capacity: number};
type RepoMatch = {
  id: string;
  home_team_id: string;
  away_team_id: string;
  home_score: string;
  away_score: string;
  group: string;
  matchday: string;
  local_date: string;
  stadium_id: string;
  finished: string;
  time_elapsed: string;
  type: string;
};
type RepoTable = {group: string; teams: {team_id: string; mp: string; w: string; l: string; d: string; pts: string}[]};

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

async function getApiFootball<T>(endpoint: string): Promise<T> {
  const response = await fetch(`${API_FOOTBALL_BASE}${endpoint}`, {
    headers: {
      'x-apisports-key': API_KEY,
    },
  });

  if (!response.ok) {
    throw new Error(`API-Football request failed: ${response.status}`);
  }

  const data = await response.json();
  if (Array.isArray(data.errors) && data.errors.length) {
    throw new Error(data.errors.join(', '));
  }
  if (data.errors && Object.keys(data.errors).length) {
    throw new Error(JSON.stringify(data.errors));
  }

  return data.response as T;
}

export async function fetchArticles(query = 'FIFA World Cup 2026'): Promise<Article[]> {
  try {
    const params = new URLSearchParams({q: query});
    const articles = await getJson<Article[]>(`/api/news?${params}`);
    return mergeArticlesMixed(manualPosts, articles.length ? articles : fallbackArticles);
  } catch {
    return mergeArticlesMixed(manualPosts, fallbackArticles);
  }
}

function mergeArticles(...groups: Article[][]) {
  const seen = new Set<string>();
  return groups.flat().filter((article) => {
    if (seen.has(article.slug)) return false;
    seen.add(article.slug);
    return true;
  });
}

function mergeArticlesMixed(localArticles: Article[], apiArticles: Article[]) {
  const mixed: Article[] = [];
  const max = Math.max(localArticles.length, apiArticles.length);

  for (let index = 0; index < max; index += 1) {
    if (localArticles[index]) mixed.push(localArticles[index]);
    if (apiArticles[index]) mixed.push(apiArticles[index]);
  }

  return mergeArticles(mixed);
}

function inferCountry(ground: string) {
  if (ground.includes('Mexico') || ground.includes('Guadalajara') || ground.includes('Monterrey')) return 'Mexico';
  if (ground.includes('Toronto') || ground.includes('Vancouver')) return 'Canada';
  return 'United States';
}

function cleanCity(ground: string) {
  return ground.replace(/\s*\(.+?\)/g, '').trim();
}

function matchTimestamp(match: WorldCupRawMatch) {
  const offsetRaw = match.time.match(/UTC([+-]\d+)/)?.[1] || '+0';
  const offsetNumber = Number(offsetRaw);
  const offset = `${offsetNumber >= 0 ? '+' : '-'}${String(Math.abs(offsetNumber)).padStart(2, '0')}`;
  const hour = match.time.match(/^(\d{1,2}):(\d{2})/)?.[1] || '00';
  const minute = match.time.match(/^(\d{1,2}):(\d{2})/)?.[2] || '00';
  return new Date(`${match.date}T${hour.padStart(2, '0')}:${minute}:00${offset}:00`).getTime();
}

function mapOpenFootballMatch(match: WorldCupRawMatch, index: number): WorldCupMatch {
  const now = Date.now();
  const startsAt = matchTimestamp(match);
  const endsAt = startsAt + 2 * 60 * 60 * 1000;
  const hasScore = typeof match.score1 === 'number' || typeof match.score2 === 'number';
  const status = hasScore || now > endsAt ? 'Result' : now >= startsAt && now <= endsAt ? 'Live' : 'Upcoming';

  return {
    id: String(match.num || index + 1),
    number: match.num,
    round: match.round,
    date: match.date,
    time: match.time,
    team1: match.team1,
    team2: match.team2,
    group: match.group || 'Knockout',
    ground: match.ground,
    city: cleanCity(match.ground),
    country: inferCountry(match.ground),
    status,
    score1: match.score1,
    score2: match.score2,
  };
}

function buildTeams(matches: WorldCupMatch[]): WorldCupTeam[] {
  const groupTeams = matches.filter((match) => match.group !== 'Knockout' && !/^\d|^[WL]\d/.test(match.team1 + match.team2));
  const teams = new Map<string, WorldCupTeam>();

  groupTeams.forEach((match) => {
    [match.team1, match.team2].forEach((team) => {
      const current = teams.get(team);
      teams.set(team, {
        id: slugify(team),
        name: team,
        group: match.group,
        matches: (current?.matches || 0) + 1,
        firstMatch: current?.firstMatch || match.date,
      });
    });
  });

  return Array.from(teams.values()).sort((a, b) => a.group.localeCompare(b.group) || a.name.localeCompare(b.name));
}

function buildStadiums(matches: WorldCupMatch[]): WorldCupStadium[] {
  const stadiums = new Map<string, WorldCupStadium>();
  matches.forEach((match) => {
    const id = slugify(match.ground);
    const current = stadiums.get(id);
    stadiums.set(id, {
      id,
      name: match.ground,
      city: match.city,
      country: match.country,
      matches: (current?.matches || 0) + 1,
    });
  });
  return Array.from(stadiums.values()).sort((a, b) => b.matches - a.matches);
}

function buildHostCities(stadiums: WorldCupStadium[]): WorldCupHostCity[] {
  const cities = new Map<string, WorldCupHostCity>();
  stadiums.forEach((stadium) => {
    const id = slugify(`${stadium.city}-${stadium.country}`);
    const current = cities.get(id);
    cities.set(id, {
      id,
      city: stadium.city,
      country: stadium.country,
      matches: (current?.matches || 0) + stadium.matches,
    });
  });
  return Array.from(cities.values()).sort((a, b) => b.matches - a.matches);
}

function buildPlayers(teams: WorldCupTeam[]): PlayerProfile[] {
  const positions = ['Forward', 'Midfielder', 'Winger', 'Goalkeeper', 'Defender'];
  const curatedPlayers = featuredPlayers.map((player) => ({
    id: slugify(player.name),
    name: player.name,
    team: player.nation,
    position: player.role,
    rating: player.rating,
    image: player.image,
  }));
  const generatedPlayers = teams.slice(0, 24).map((team, index) => ({
    id: `${team.id}-player-${index + 1}`,
    name: `${team.name} Star ${index + 1}`,
    team: team.name,
    position: positions[index % positions.length],
    age: 21 + (index % 12),
    rating: (7.4 + (index % 14) / 10).toFixed(1),
    image: `https://ui-avatars.com/api/?name=${encodeURIComponent(team.name)}+${index + 1}&size=200&background=1a2035&color=F0A500`,
  }));
  return [...curatedPlayers, ...generatedPlayers];
}

export async function fetchWorldCupData(): Promise<WorldCupData> {
  const [repoTeams, repoMatches, repoStadiums, repoTables, apiFixtures, liveFixtures] = await Promise.all([
    getJson<RepoTeam[]>(`${WORLDCUP_REPO_BASE}/football.teams.json`),
    getJson<RepoMatch[]>(`${WORLDCUP_REPO_BASE}/football.matches.json`),
    getJson<RepoStadium[]>(`${WORLDCUP_REPO_BASE}/football.stadiums.json`),
    getJson<RepoTable[]>(`${WORLDCUP_REPO_BASE}/football.matchtables.json`),
    getApiFootball<ApiFootballFixture[]>(`fixtures?league=${WORLD_CUP_LEAGUE}&season=${WORLD_CUP_SEASON}`).catch(() => [] as ApiFootballFixture[]),
    fetchWorldCupFixtureSnapshots(),
  ]);
  const teamById = new Map(repoTeams.map((team) => [team.id, team]));
  const stadiumById = new Map(repoStadiums.map((stadium) => [stadium.id, stadium]));
  const liveFixtureLookup = buildFixtureLookup(liveFixtures);
  const now = Date.now();
  const matches = repoMatches.map((match) => {
    const home = teamById.get(match.home_team_id);
    const away = teamById.get(match.away_team_id);
    const stadium = stadiumById.get(match.stadium_id);
    const [datePart, timePart = '00:00'] = match.local_date.split(' ');
    const [month, day, year] = datePart.split('/');
    const manualResult = manualWorldCupResults[match.id];
    const team1 = home?.name_en || `Team ${match.home_team_id}`;
    const team2 = away?.name_en || `Team ${match.away_team_id}`;

    const startIso = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${timePart}:00`;
    const startsAt = new Date(startIso).getTime();
    const endsAt = startsAt + 2 * 60 * 60 * 1000;

    const liveFixture = liveFixtureLookup.get(teamPairKey(team1, team2));
    const repoScores = hasRepoScores(match);
    const isResult = Boolean(manualResult)
      || match.finished === 'TRUE'
      || liveFixture?.status === 'Result'
      || (repoScores && now > endsAt);
    const isLive = liveFixture?.status === 'Live' || (!isResult && now >= startsAt && now <= endsAt);

    const entry = {
      id: match.id,
      number: Number(match.id),
      round: match.type === 'group' ? `Matchday ${match.matchday}` : match.type.toUpperCase(),
      date: `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`,
      time: timePart,
      team1,
      team2,
      team1Flag: home?.flag,
      team2Flag: away?.flag,
      group: match.group.length === 1 ? `Group ${match.group}` : match.group,
      ground: stadium?.fifa_name || stadium?.name_en || `Stadium ${match.stadium_id}`,
      city: stadium?.city_en || 'Host city TBD',
      country: stadium?.country_en || 'Host country TBD',
      status: isResult ? 'Result' : isLive ? 'Live' : 'Upcoming',
      score1: manualResult?.score1 ?? (repoScores ? Number(match.home_score) : undefined),
      score2: manualResult?.score2 ?? (repoScores ? Number(match.away_score) : undefined),
    } satisfies WorldCupMatch;

    if (liveFixture) {
      applyFixtureScores(entry, liveFixture);
    }

    return entry;
  }).sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));

  // Merge API-Football fixtures for ended/live matches when ESPN is unavailable.
  if (apiFixtures.length) {
    const fixtureMap = new Map<string, ApiFootballFixture>();
    apiFixtures.forEach((fixture) => {
      fixtureMap.set(teamPairKey(fixture.teams.home.name, fixture.teams.away.name), fixture);
    });
    matches.forEach((match) => {
      const fixture = fixtureMap.get(teamPairKey(match.team1, match.team2));
      if (!fixture || fixture.goals.home === null || fixture.goals.away === null) return;

      const startsAt = matchKickoffTimestamp(match);
      const endsAt = startsAt + 2 * 60 * 60 * 1000;
      applyFixtureScores(match, {
        home: fixture.teams.home.name,
        away: fixture.teams.away.name,
        score1: fixture.goals.home,
        score2: fixture.goals.away,
      });
      const statusShort = fixture.fixture.status.short;
      if (['FT', 'PEN', 'AET'].includes(statusShort)) {
        match.status = 'Result';
      } else if (['1H', 'HT', '2H', 'ET', 'P', 'LIVE', 'SUSP'].includes(statusShort)) {
        match.status = 'Live';
      } else if (statusShort === 'NS' && now < startsAt) {
        match.status = 'Upcoming';
      } else if (statusShort === 'NS' && now > endsAt) {
        match.status = 'Result';
      }
    });
  }

  // Final pass: apply live provider snapshots and keep finished matches out of upcoming.
  matches.forEach((match) => {
    const liveFixture = liveFixtureLookup.get(teamPairKey(match.team1, match.team2));
    if (liveFixture) {
      if (liveFixture.status === 'Result' || liveFixture.status === 'Live') {
        match.status = liveFixture.status;
      }
      applyFixtureScores(match, liveFixture);
    }

    const startsAt = matchKickoffTimestamp(match);
    const endsAt = startsAt + 2 * 60 * 60 * 1000;
    const hasFinalScore = typeof match.score1 === 'number' && typeof match.score2 === 'number';

    if (match.status === 'Upcoming' && now > endsAt && hasFinalScore) {
      match.status = 'Result';
    }
  });

  const teams = repoTeams.map((team) => {
    const teamMatches = matches.filter((match) => match.team1 === team.name_en || match.team2 === team.name_en);
    return {
      id: slugify(team.name_en),
      name: team.name_en,
      code: team.fifa_code,
      flag: team.flag,
      group: `Group ${team.groups}`,
      matches: teamMatches.length,
      firstMatch: teamMatches[0]?.date,
    };
  });
  const stadiums = repoStadiums.map((stadium) => ({
    id: slugify(stadium.name_en),
    name: stadium.name_en,
    city: stadium.city_en,
    country: stadium.country_en,
    capacity: stadium.capacity,
    matches: matches.filter((match) => match.ground === stadium.fifa_name || match.city === stadium.city_en).length,
  })).sort((a, b) => b.matches - a.matches);
  // Apply manual override for South Korea vs Czech Republic if present
  matches.forEach((m) => {
    const liveFixture = liveFixtureLookup.get(teamPairKey(m.team1, m.team2));
    if (liveFixture) return;

    if (m.team1 === 'South Korea' && m.team2 === 'Czech Republic') {
      m.score1 = 2;
      m.score2 = 1;
      m.status = 'Result';
    }
    // force Canada 1-1 Bosnia result (handle name variants and either home/away ordering)
    if ((m.team1 === 'Canada' && (m.team2 === 'Bosnia & Herzegovina' || m.team2 === 'Bosnia and Herzegovina')) || (m.team2 === 'Canada' && (m.team1 === 'Bosnia & Herzegovina' || m.team1 === 'Bosnia and Herzegovina'))) {
      if (m.team1 === 'Canada') {
        m.score1 = 1;
        m.score2 = 1;
      } else {
        m.score2 = 1;
        m.score1 = 1;
      }
      m.status = 'Result';
    }
  });

  // Build standings from match results so manual/result updates are reflected immediately
  const statsByTeam = new Map<string, {team: string; logo?: string; group: string; played: number; won: number; drawn: number; lost: number; points: number}>();
  // initialize teams
  repoTeams.forEach((team) => {
    statsByTeam.set(team.name_en, {team: team.name_en, logo: team.flag, group: `Group ${team.groups}`, played: 0, won: 0, drawn: 0, lost: 0, points: 0});
  });
  // accumulate from matches with results
  matches.forEach((m) => {
    if (m.status === 'Result' && typeof m.score1 === 'number' && typeof m.score2 === 'number') {
      const a = statsByTeam.get(m.team1);
      const b = statsByTeam.get(m.team2);
      if (!a || !b) return;
      a.played += 1;
      b.played += 1;
      if (m.score1 > m.score2) {
        a.won += 1; b.lost += 1; a.points += 3;
      } else if (m.score2 > m.score1) {
        b.won += 1; a.lost += 1; b.points += 3;
      } else {
        a.drawn += 1; b.drawn += 1; a.points += 1; b.points += 1;
      }
    }
  });

  const standings = Array.from(statsByTeam.values())
    .map((s) => ({rank: 0, team: `${s.team} (${s.group})`, logo: s.logo, played: s.played, won: s.won, drawn: s.drawn, lost: s.lost, points: s.points}))
    .sort((x, y) => y.points - x.points || y.won - x.won || x.team.localeCompare(y.team));

  return {
    name: 'FIFA World Cup 2026',
    matches,
    teams,
    stadiums,
    hostCities: buildHostCities(stadiums),
    players: buildPlayers(teams),
    standings,
  };
}

function mapFixture(fixture: ApiFootballFixture): Match {
  return {
    id: String(fixture.fixture.id),
    league: fixture.league.round || fixture.league.name || 'FIFA World Cup 2026',
    status: fixture.fixture.status.long || fixture.fixture.status.short,
    venue: [fixture.fixture.venue?.name, fixture.fixture.venue?.city].filter(Boolean).join(', ') || 'Venue TBD',
    startTime: fixture.fixture.date,
    home: {
      name: fixture.teams.home.name,
      logo: fixture.teams.home.logo,
      score: fixture.goals.home === null ? '-' : String(fixture.goals.home),
    },
    away: {
      name: fixture.teams.away.name,
      logo: fixture.teams.away.logo,
      score: fixture.goals.away === null ? '-' : String(fixture.goals.away),
    },
  };
}

export async function fetchLiveMatches(): Promise<Match[]> {
  const data = await getJson<{matches: Match[]}>('/api/live');
  return data.matches;
}

export async function fetchLiveStream(): Promise<LiveStream | null> {
  const data = await getJson<{stream?: LiveStream}>('/api/live-stream');
  return data.stream || null;
}

export async function fetchWorldCupFixtures(): Promise<Match[]> {
  const fixtures = await getApiFootball<ApiFootballFixture[]>(`fixtures?league=${WORLD_CUP_LEAGUE}&season=${WORLD_CUP_SEASON}`);
  return fixtures.map(mapFixture);
}

export async function fetchWorldCupStandings(): Promise<Standing[]> {
  const response = await getApiFootball<{league?: {standings?: ApiFootballStandingRow[][]}}[]>(`standings?league=${WORLD_CUP_LEAGUE}&season=${WORLD_CUP_SEASON}`);
  const rows = response[0]?.league?.standings?.flat() || [];
  return rows.map((row) => ({
    rank: row.rank,
    team: row.team.name,
    logo: row.team.logo,
    played: row.all.played,
    won: row.all.win,
    drawn: row.all.draw,
    lost: row.all.lose,
    points: row.points,
  }));
}

export type ApiFootballTeam = {
  id: number;
  name: string;
  code?: string;
  country?: string;
  founded?: number;
  logo?: string;
  venueName?: string;
  venueCity?: string;
  venueCapacity?: number;
};

export async function fetchWorldCupTeams(): Promise<ApiFootballTeam[]> {
  const response = await getApiFootball<ApiFootballTeamRow[]>(`teams?league=${WORLD_CUP_LEAGUE}&season=${WORLD_CUP_SEASON}`);
  return response.map((row) => ({
    id: row.team.id,
    name: row.team.name,
    code: row.team.code,
    country: row.team.country,
    founded: row.team.founded,
    logo: row.team.logo,
    venueName: row.venue?.name,
    venueCity: row.venue?.city,
    venueCapacity: row.venue?.capacity,
  }));
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}
