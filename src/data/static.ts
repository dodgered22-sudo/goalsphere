export type Article = {
  title: string;
  slug: string;
  description: string;
  content: string;
  source: string;
  publishedAt: string;
  image: string;
  category: string;
  url?: string;
  hideFromFeeds?: boolean;
};

export type Match = {
  id: string;
  league: string;
  status: string;
  venue: string;
  startTime: string;
  home: {name: string; logo?: string; score?: string};
  away: {name: string; logo?: string; score?: string};
  events?: {
    id: string;
    minute: number;
    team: string;
    player: string;
    assist?: string;
    type: 'Goal' | 'Card' | 'Other';
    detail: string;
  }[];
};

export type Standing = {
  rank: number;
  team: string;
  logo?: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  points: number;
};

export type Player = {
  name: string;
  nation: string;
  club: string;
  role: string;
  goals: number;
  assists: number;
  rating: string;
  image: string;
};

export type Team = {
  name: string;
  confederation: string;
  coach: string;
  strength: string;
  status: string;
};

const footballImages = [
  'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?q=80&w=1200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1553152531-562db4801e4d?q=80&w=1200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1543326727-cf6c39e8f84c?q=80&w=1200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1518605368461-1ee12db89bf5?q=80&w=1200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1517466787929-bc90951d0974?q=80&w=1200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1522778119026-d647f0596c20?q=80&w=1200&auto=format&fit=crop',
];

export const fallbackArticles: Article[] = [
  {
    title: 'World Cup 2026 expands the global football map',
    slug: 'world-cup-2026-expands-global-football-map',
    description: 'The 48-team format brings new routes, new host cities, and a larger tactical puzzle for every contender.',
    content:
      'The 2026 tournament will be the largest World Cup ever staged, with matches spread across the United States, Canada, and Mexico. The expanded field changes the rhythm of the group stage and gives more nations a realistic path to the knockout rounds. For analysts, the format creates a wider scouting challenge and puts travel management, squad depth, and recovery plans under the microscope.',
    source: 'GoalSphere Desk',
    publishedAt: new Date().toISOString(),
    image: footballImages[0],
    category: 'World Cup',
  },
  {
    title: 'Premier League title race enters its decisive stretch',
    slug: 'premier-league-title-race-decisive-stretch',
    description: 'Fine margins in midfield control and set-piece efficiency are shaping the final weeks of the campaign.',
    content:
      'The title race is being decided by small advantages. Teams that can control second balls, defend transitions, and convert set pieces are pulling away from the pack. The final stretch rewards squads with a settled identity and enough rotation to survive a crowded calendar.',
    source: 'GoalSphere Analysis',
    publishedAt: new Date(Date.now() - 3600000).toISOString(),
    image: footballImages[1],
    category: 'Leagues',
  },
  {
    title: 'Young stars pushing for breakout international summers',
    slug: 'young-stars-breakout-international-summers',
    description: 'A new generation of attackers and midfielders is building momentum before the next major tournament cycle.',
    content:
      'The international stage often accelerates reputations. Several young players are entering the summer with strong club form, improved tactical maturity, and the confidence to carry bigger attacking roles. Their national teams may ask them to solve games in tighter spaces than they face each week.',
    source: 'Scouting Room',
    publishedAt: new Date(Date.now() - 7200000).toISOString(),
    image: footballImages[2],
    category: 'Players',
  },
  {
    title: 'Champions League contenders lean into flexible front lines',
    slug: 'champions-league-contenders-flexible-front-lines',
    description: 'The best European sides are blurring roles between wide forwards, false nines, and advanced midfielders.',
    content:
      'Rigid attacking structures are giving way to front lines that rotate constantly. The strongest sides use movement to drag center backs into uncomfortable areas and create late-arriving chances for midfield runners. Flexibility is becoming a decisive Champions League weapon.',
    source: 'Tactical Board',
    publishedAt: new Date(Date.now() - 10800000).toISOString(),
    image: footballImages[3],
    category: 'Tactics',
  },
  {
    title: 'Host cities prepare for an unprecedented match calendar',
    slug: 'host-cities-prepare-unprecedented-match-calendar',
    description: 'Sixteen cities across North America are planning fan zones, transport routes, and stadium operations.',
    content:
      'The tournament footprint is enormous. Host cities are balancing local identity with the operational demands of a global event. The best prepared venues will make travel smoother for supporters while keeping matchday energy close to the stadium.',
    source: 'World Cup Hub',
    publishedAt: new Date(Date.now() - 14400000).toISOString(),
    image: footballImages[4],
    category: 'World Cup',
  },
  {
    title: 'Data departments are changing transfer strategy',
    slug: 'data-departments-changing-transfer-strategy',
    description: 'Recruitment teams are combining event data, tracking data, and video to find value earlier.',
    content:
      'Modern recruitment is no longer built on one signal. Clubs combine data models with live scouting and tactical context to reduce risk. The smartest departments identify transferable skills before a player becomes obvious to the wider market.',
    source: 'Analytics Lab',
    publishedAt: new Date(Date.now() - 18000000).toISOString(),
    image: footballImages[5],
    category: 'Analytics',
  },
  {
    title: 'World Cup squads enter final evaluation window',
    slug: 'world-cup-squads-final-evaluation-window',
    description: 'Coaches are using friendlies and qualification data to settle their strongest 26-player groups.',
    content:
      'The final months before a World Cup are about clarity. Managers are weighing club form, tactical fit, recovery profiles, and tournament experience before naming their squads. Late injuries and breakout performances can still change the picture, but most contenders are narrowing the core they trust for high-pressure knockout football.',
    source: 'Selection Desk',
    publishedAt: new Date(Date.now() - 21600000).toISOString(),
    image: footballImages[0],
    category: 'World Cup',
  },
  {
    title: 'Set pieces become a major tournament weapon',
    slug: 'set-pieces-major-tournament-weapon',
    description: 'International teams are spending more preparation time on corners, free kicks, and restart defending.',
    content:
      'Tournament matches are often decided by one clean delivery or one defensive lapse. With preparation time limited, set-piece routines give teams a repeatable route to chances. Analysts are tracking blockers, near-post movements, and second-ball structures as closely as open-play patterns.',
    source: 'Tactical Board',
    publishedAt: new Date(Date.now() - 25200000).toISOString(),
    image: footballImages[1],
    category: 'Tactics',
  },
];

export const leagues = [
  {id: 'eng.1', name: 'Premier League'},
  {id: 'esp.1', name: 'La Liga'},
  {id: 'ger.1', name: 'Bundesliga'},
  {id: 'ita.1', name: 'Serie A'},
  {id: 'fra.1', name: 'Ligue 1'},
  {id: 'uefa.champions', name: 'UCL'},
];

export const fallbackMatches: Match[] = [
  {
    id: 'demo-1',
    league: 'Premier League',
    status: 'Live',
    venue: 'Emirates Stadium',
    startTime: new Date().toISOString(),
    home: {name: 'Arsenal', score: '2'},
    away: {name: 'Chelsea', score: '1'},
  },
  {
    id: 'demo-2',
    league: 'La Liga',
    status: 'Upcoming',
    venue: 'Santiago Bernabeu',
    startTime: new Date(Date.now() + 7200000).toISOString(),
    home: {name: 'Real Madrid', score: '-'},
    away: {name: 'Barcelona', score: '-'},
  },
  {
    id: 'demo-3',
    league: 'Champions League',
    status: 'Full Time',
    venue: 'Allianz Arena',
    startTime: new Date(Date.now() - 7200000).toISOString(),
    home: {name: 'Bayern Munich', score: '1'},
    away: {name: 'PSG', score: '1'},
  },
];

export const fallbackStandings: Standing[] = [
  {rank: 1, team: 'Liverpool', played: 28, won: 19, drawn: 6, lost: 3, points: 63},
  {rank: 2, team: 'Arsenal', played: 28, won: 18, drawn: 7, lost: 3, points: 61},
  {rank: 3, team: 'Manchester City', played: 28, won: 17, drawn: 6, lost: 5, points: 57},
  {rank: 4, team: 'Aston Villa', played: 28, won: 15, drawn: 5, lost: 8, points: 50},
  {rank: 5, team: 'Tottenham', played: 28, won: 14, drawn: 6, lost: 8, points: 48},
  {rank: 6, team: 'Manchester United', played: 28, won: 13, drawn: 6, lost: 9, points: 45},
];

export const players: Player[] = [
  {name: 'Lamine Yamal', nation: 'Spain', club: 'Spain National Team', role: 'Fearless right-wing creator', goals: 6, assists: 9, rating: '8.6', image: '/players/lamine-yamal.png'},
  {name: 'Cristiano Ronaldo', nation: 'Portugal', club: 'Portugal National Team', role: 'Legendary finisher and captain', goals: 128, assists: 46, rating: '9.1', image: '/players/cristiano-ronaldo.png'},
  {name: 'Lionel Messi', nation: 'Argentina', club: 'Argentina National Team', role: 'World champion playmaker', goals: 106, assists: 58, rating: '9.4', image: '/players/lionel-messi.png'},
  {name: 'Neymar Jr.', nation: 'Brazil', club: 'Brazil National Team', role: 'Creative winger and set-piece threat', goals: 79, assists: 59, rating: '8.8', image: '/players/neymar.png'},
  {name: 'Kylian Mbappe', nation: 'France', club: 'France National Team', role: 'Explosive forward and captain', goals: 48, assists: 31, rating: '9.2', image: 'https://i.postimg.cc/TPkGFDZn/Blue-and-White-Simple-Modern-Illustrative-Football-Club-Logo-(7).png'},
  {name: 'Erling Haaland', nation: 'Norway', club: 'Norway National Team', role: 'Powerful striker and penalty-box finisher', goals: 38, assists: 4, rating: '9.0', image: 'https://i.postimg.cc/xT7fTMCv/Blue-and-White-Simple-Modern-Illustrative-Football-Club-Logo-(6).png'},
];

export const teams: Team[] = [
  {name: 'France', confederation: 'UEFA', coach: 'Didier Deschamps', strength: 'Pace and depth', status: 'Qualified contender'},
  {name: 'Brazil', confederation: 'CONMEBOL', coach: 'Dorival Junior', strength: 'Attacking flair', status: 'Qualification race'},
  {name: 'Argentina', confederation: 'CONMEBOL', coach: 'Lionel Scaloni', strength: 'Control and experience', status: 'Defending champions'},
  {name: 'England', confederation: 'UEFA', coach: 'Gareth Southgate', strength: 'Midfield variety', status: 'Qualified contender'},
  {name: 'United States', confederation: 'CONCACAF', coach: 'Mauricio Pochettino', strength: 'Athletic pressing', status: 'Host nation'},
  {name: 'Mexico', confederation: 'CONCACAF', coach: 'Javier Aguirre', strength: 'Tournament experience', status: 'Host nation'},
  {name: 'Canada', confederation: 'CONCACAF', coach: 'Jesse Marsch', strength: 'Vertical transitions', status: 'Host nation'},
];

export const hostCities = [
  {country: 'United States', cities: '11 Cities', detail: 'New York/New Jersey, Los Angeles, Miami, Dallas, Seattle, San Francisco Bay Area, and more.'},
  {country: 'Mexico', cities: '3 Cities', detail: 'Mexico City, Guadalajara, and Monterrey bring heritage, altitude, and massive crowds.'},
  {country: 'Canada', cities: '2 Cities', detail: 'Toronto and Vancouver welcome the World Cup stage for the first time.'},
];

export const timeline = [
  {year: '2022', host: 'Qatar', winner: 'Argentina', note: 'Defeated France on penalties in a classic final.'},
  {year: '2018', host: 'Russia', winner: 'France', note: 'Beat Croatia 4-2 in Moscow.'},
  {year: '2014', host: 'Brazil', winner: 'Germany', note: 'Beat Argentina 1-0 after extra time.'},
  {year: '2010', host: 'South Africa', winner: 'Spain', note: 'Iniesta sealed Spains first World Cup.'},
];
