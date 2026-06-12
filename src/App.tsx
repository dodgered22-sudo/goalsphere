import {FormEvent, Key, ReactNode, useEffect, useMemo, useState} from 'react';
import {
  fallbackArticles,
  fallbackStandings,
  players,
  timeline,
  type Article,
  type Standing,
} from './data/static';
import {manualPosts} from './data/manualPosts';
import {sampleReplay, type ReplayCamera} from './data/replaySimulations';
import {siteArticles} from './data/siteArticles';
import {highlightVideos, homeVideos, type VideoItem} from './data/videos';
import {
  fetchArticles,
  fetchLiveMatches,
  fetchLiveStream,
  fetchWorldCupData,
  slugify,
  type LiveStream,
  type PlayerProfile,
  type WorldCupData,
  type WorldCupMatch,
  type WorldCupTeam,
} from './lib/api';
import {initAnalytics, trackPageView} from './lib/analytics';

const logo = '/goalsphere-logo.gif';
const siteUrl = 'https://goal-sphere.live';
const fallbackArticleImage = 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?q=80&w=1200&auto=format&fit=crop';
const liveWaitingImage = '/post-images/south-korea-czech-republic-live.png';
const popupFeatureImages = ['https://i.postimg.cc/YCTwR7T5/11d7f4e2-afdb-4b4b-9c66-b7f5ae12db3e.png'];
const routeMeta: Record<string, {title: string; description: string}> = {
  '/videos': {
    title: 'GoalSphere Video Highlights',
    description: 'Watch GoalSphere football video highlights, live match moments, goals, warm-up clips, and World Cup 2026 replay features.',
  },
};
type LiveMatch = Awaited<ReturnType<typeof fetchLiveMatches>>[number];
type LiveMatchesState = {matches: LiveMatch[]; loading: boolean; error: string | null};
type LiveStreamState = {stream: LiveStream | null; loading: boolean; error: string | null};
type GroupStandingRow = Standing & {goalDiff: number; goalsFor: number; goalsAgainst: number};
type GroupStanding = {group: string; rows: GroupStandingRow[]};
const initialArticles = [...manualPosts, ...fallbackArticles.filter((article) => !manualPosts.some((post) => post.slug === article.slug))];
const staticPlayerProfiles: PlayerProfile[] = players.map((player) => ({
  id: slugify(player.name),
  name: player.name,
  team: player.nation,
  position: player.role,
  rating: player.rating,
  image: player.image,
}));
const emptyWorldCupData: WorldCupData = {
  name: 'World Cup 2026',
  matches: [],
  teams: [],
  stadiums: [],
  hostCities: [],
  players: staticPlayerProfiles,
  standings: [],
};

function useRoute() {
  const [path, setPath] = useState(window.location.pathname);

  useEffect(() => {
    const onPop = () => setPath(window.location.pathname);
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  return path;
}

function go(path: string) {
  window.history.pushState({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
  window.scrollTo({top: 0, behavior: 'smooth'});
}

function Link({to, children, className}: {to: string; children: ReactNode; className?: string; key?: Key}) {
  return (
    <a
      className={className}
      href={to}
      onClick={(event) => {
        event.preventDefault();
        go(to);
      }}
    >
      {children}
    </a>
  );
}

function Loader() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => setVisible(false), 2400);
    return () => window.clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <div className="loader">
      <img alt="GoalSphere loading" className="loader-logo" src={logo} />
      <div className="loader-bar" />
    </div>
  );
}

function Header({hasLiveMatches, path, onSearch}: {hasLiveMatches: boolean; path: string; onSearch: () => void}) {
  const [open, setOpen] = useState(false);
  const nav = [
    {to: '/', label: 'Home'},
    {to: '/scores', label: 'Scores'},
    {to: '/schedule', label: 'Schedule'},
    {
      to: '/world-cup-2026',
      label: 'World cup 2026',
      special: true,
      children: [
        {to: '/world-cup-2026/teams', label: 'Teams'},
        {to: '/world-cup-2026/players', label: 'Players'},
        {to: '/world-cup-2026/standings', label: 'Standings'},
        {to: '/world-cup-2026/stats', label: 'Stats'},
        {to: '/world-cup-2026/results', label: 'Results'},
        {to: '/world-cup-2026/history', label: 'History'},
      ],
    },
    {to: '/news', label: 'News'},
    {to: '/3d-pitch', label: '3D Pitch'},
    {to: '/live', label: 'Live', warning: hasLiveMatches},
    {to: '/articles', label: 'Articles'},
    {to: '/videos', label: 'Videos'},
  ];

  return (
    <header>
      <div className="container nav-wrap">
        <Link to="/" className="logo">
          <img alt="GoalSphere" src={logo} />
        </Link>
        <nav>
          <ul className={`nav-menu ${open ? 'open' : ''}`}>
            {nav.map((item) => (
              <li className={item.children ? 'has-dropdown' : ''} key={item.to}>
                <Link
                  to={item.to}
                  className={[
                    path === item.to || (item.to !== '/' && path.startsWith(item.to)) ? 'active' : '',
                    item.warning ? 'live-warning' : '',
                    item.special ? 'special-event-link' : '',
                  ].filter(Boolean).join(' ')}
                >
                  {item.label}
                  {item.warning ? <i className="fa-solid fa-bolt live-menu-bolt" /> : null}
                  {item.children ? <i className="fa-solid fa-angle-down nav-caret" /> : null}
                </Link>
                {item.children ? (
                  <ul className="nav-dropdown">
                    {item.children.map((child) => (
                      <li key={child.to}>
                        <Link to={child.to} className={path === child.to ? 'active' : ''}>
                          {child.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            ))}
          </ul>
        </nav>
        <div className="nav-right">
          <button className="ico-btn" onClick={onSearch} type="button" aria-label="Open search">
            <i className="fa-solid fa-magnifying-glass" />
          </button>
          <Link to="/contact" className="btn-sub">
            Subscribe
          </Link>
          <button className="ico-btn mob-toggle" onClick={() => setOpen(!open)} type="button" aria-label="Toggle menu">
            <i className="fa-solid fa-bars" />
          </button>
        </div>
      </div>
    </header>
  );
}

function Ticker({articles}: {articles: Article[]}) {
  const fallbackItems = [
    {title: 'FIFA World Cup 2026 is underway across North America', path: '/world-cup-2026'},
    {title: 'Follow live fixtures, results, videos, and matchday stories on GoalSphere', path: '/news'},
  ];
  const items = articles.length
    ? articles.slice(0, 10).map((article) => ({title: article.title, path: getArticlePath(article)}))
    : fallbackItems;

  return (
    <div className="ticker">
      <div className="ticker-tag">
        <i className="fa-solid fa-bolt" /> Breaking
      </div>
      <div className="ticker-inner">
        {[...items, ...items].map((item, index) => (
          <Link className="ticker-item" key={`${item.path}-${index}`} to={item.path}>
            <i className="fa-solid fa-futbol" /> {item.title}
          </Link>
        ))}
      </div>
    </div>
  );
}

function SearchOverlay({open, onClose, articles}: {open: boolean; onClose: () => void; articles: Article[]}) {
  const [query, setQuery] = useState('');
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return articles.slice(0, 4);
    return articles.filter((article) => `${article.title} ${article.description} ${article.category}`.toLowerCase().includes(q)).slice(0, 6);
  }, [articles, query]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className={`search-overlay ${open ? 'open' : ''}`}>
      <div className="search-wrap">
        <input autoFocus={open} onChange={(event) => setQuery(event.target.value)} placeholder="Search players, teams, news..." type="text" value={query} />
        <button className="search-x" onClick={onClose} type="button">
          &times;
        </button>
      </div>
      <p className="search-hint">
        <i className="fa-solid fa-keyboard" /> Press Esc to close
      </p>
      <div className="search-results">
        {results.map((article) => (
          <Link key={article.slug} to={`/news/${article.slug}`} className="search-result">
            <span>{article.category}</span>
            <strong>{article.title}</strong>
          </Link>
        ))}
      </div>
    </div>
  );
}

function Layout({hasLiveMatches, path, articles, children}: {hasLiveMatches: boolean; path: string; articles: Article[]; children: ReactNode}) {
  const [searchOpen, setSearchOpen] = useState(false);
  return (
    <>
      <Loader />
      <SearchOverlay articles={articles} onClose={() => setSearchOpen(false)} open={searchOpen} />
      <Ticker articles={articles} />
      <Header hasLiveMatches={hasLiveMatches} onSearch={() => setSearchOpen(true)} path={path} />
      <main>{children}</main>
      <FixedImagePopup />
      <Footer />
    </>
  );
}

function FixedImagePopup() {
  const [open, setOpen] = useState(true);
  if (!open) return null;

  return (
    <aside className="fixed-image-popup" aria-label="Featured World Cup image">
      <button aria-label="Close featured image" className="fixed-image-popup-close" onClick={() => setOpen(false)} type="button">
        &times;
      </button>
      <div className="fixed-image-popup-scroll">
        {popupFeatureImages.map((image) => (
          <img alt="South Korea vs Czech Republic live match feature" key={image} src={image} />
        ))}
      </div>
    </aside>
  );
}

function Footer() {
  return (
    <footer>
      <div className="container">
        <div className="footer-grid">
          <div className="f-about">
            <div className="logo small">
              <img alt="GoalSphere" src={logo} />
            </div>
            <p>
              GoalSphere is your premium destination for football news, real-time scores, data-led analysis, and complete
              coverage of FIFA World Cup 2026.
            </p>
            <div className="socials">
              <a className="soc-a" href="https://x.com/Goalspherewc26" rel="noreferrer" target="_blank"><i className="fa-brands fa-x-twitter" /></a>
              <a className="soc-a" href="https://www.youtube.com/@GoalSphere-wc26" rel="noreferrer" target="_blank"><i className="fa-brands fa-youtube" /></a>
              <a className="soc-a" href="https://www.tiktok.com/@goalsphere26?lang=en" rel="noreferrer" target="_blank"><i className="fa-brands fa-tiktok" /></a>
            </div>
          </div>
          <FooterColumn title="Coverage" links={[['/news', 'News'], ['/articles', 'Articles'], ['/live', 'Live Matches'], ['/scores', 'Scores'], ['/schedule', 'Schedule'], ['/results', 'Results'], ['/standings', 'Standings'], ['/world-cup-2026', 'World Cup 2026'], ['/3d-pitch', '3D Pitch']]} />
          <FooterColumn title="Explore" links={[['/players', 'Players'], ['/teams', 'Teams'], ['/host-cities', 'Host Cities'], ['/stadiums', 'Stadiums'], ['/stats', 'Stats'], ['/search', 'Search']]} />
          <FooterColumn title="Company" links={[['/about', 'About'], ['/contact', 'Contact'], ['/privacy', 'Privacy'], ['/terms', 'Terms']]} />
        </div>
        <div className="f-btm">
          <span>Copyright 2026 GoalSphere. All rights reserved.</span>
          <div className="f-btm-links">
            <Link to="/privacy">Privacy</Link>
            <Link to="/terms">Terms</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({title, links}: {title: string; links: string[][]}) {
  return (
    <div className="f-col">
      <h5>{title}</h5>
      <ul>
        {links.map(([to, label]) => (
          <li key={to}>
            <Link to={to}><i className="fa-solid fa-angle-right" /> {label}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SectionTitle({icon, children}: {icon: string; children: ReactNode}) {
  return (
    <h2 className="stitle">
      <span className="sicon"><i className={icon} /></span>
      {children}
    </h2>
  );
}

function Badge({children, tone = 'gold'}: {children: ReactNode; tone?: 'gold' | 'live' | 'green' | 'blue' | 'def'}) {
  return <span className={`badge b-${tone}`}>{children}</span>;
}

function HeroSlider({articles}: {articles: Article[]}) {
  const slides = articles.slice(0, 8);
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (!slides.length) return;
    const timer = window.setInterval(() => setActive((value) => (value + 1) % slides.length), 5000);
    return () => window.clearInterval(timer);
  }, [slides.length]);

  if (!slides.length) return null;

  return (
    <section className="hero container">
      <div className="hero-grid">
        <div className="slider-wrap glass">
          {slides.map((article, index) => (
            <article className={`slide ${index === active ? 'active' : ''}`} key={article.slug}>
              <a className="slide-link" href={getArticlePath(article)} onClick={(event) => { event.preventDefault(); go(getArticlePath(article)); }}>
                <img alt={article.title} loading="lazy" src={article.image} />
                <div className="slide-overlay">
                  <Badge>{article.category}</Badge>
                  <h1>{article.title}</h1>
                  <p>{article.description}</p>
                  <div className="slide-meta">
                    <span><i className="fa-regular fa-clock" /> {formatDate(article.publishedAt)}</span>
                    <span><i className="fa-solid fa-rss" /> {article.source}</span>
                  </div>
                  <span className="slide-read">
                    {isSiteArticle(article) ? 'Read the Article' : 'Read Full Story'} <i className="fa-solid fa-arrow-right-long" />
                  </span>
                </div>
              </a>
            </article>
          ))}
          <div className="slider-dots">
            {slides.map((article, index) => (
              <button className={`dot ${index === active ? 'active' : ''}`} key={article.slug} onClick={() => setActive(index)} type="button" />
            ))}
          </div>
        </div>
        <div className="hero-side">
          {slides.map((article, index) => (
            <a
              className={`side-post glass ${index === active ? 'active' : ''}`}
              href={getArticlePath(article)}
              key={article.slug}
              onClick={(event) => { event.preventDefault(); go(getArticlePath(article)); }}
              onMouseEnter={() => setActive(index)}
            >
              <img alt={article.title} loading="lazy" src={article.image} />
              <div className="side-post-over">
                <Badge tone="blue">{article.category}</Badge>
                <h4>{article.title}</h4>
                <span>Read article</span>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

function isSiteArticle(article: Article) {
  return siteArticles.some((item) => item.slug === article.slug);
}

function getArticlePath(article: Article) {
  return isSiteArticle(article) ? `/articles/${article.slug}` : `/news/${article.slug}`;
}

function ScoresSection({compact = false, data, liveState, loading, error}: {compact?: boolean; data: WorldCupData; liveState?: LiveMatchesState; loading: boolean; error: string | null}) {
  const [selectedMatch, setSelectedMatch] = useState<WorldCupMatch | null>(null);
  const live = data.matches.filter((match) => match.status === 'Live');
  const upcoming = data.matches.filter((match) => match.status === 'Upcoming');
  const showLiveFixture = compact && liveState;

  return (
    <>
      <section className="sp container">
        <div className="scores-split">
          {showLiveFixture ? (
            <LiveMatchPanel
              emptyLabel="No live fixtures right now."
              error={liveState.error}
              matches={liveState.matches.slice(0, 1)}
              title="Live Fixture"
            />
          ) : (
            <WorldCupMatchPanel
              emptyLabel="No live matches right now."
              error={error}
              icon="fa-solid fa-satellite-dish"
              loading={loading}
              matches={live.slice(0, compact ? 2 : 6)}
              onSelect={setSelectedMatch}
              title={<>Live <span className="glow">Matches</span></>}
            />
          )}
          <WorldCupMatchPanel
            emptyLabel="No upcoming World Cup 2026 fixtures available yet."
            error={error}
            gridClassName={compact ? 'scrollable-fixtures' : undefined}
            icon="fa-regular fa-calendar"
            loading={loading}
            matches={upcoming.slice(0, compact ? 8 : 8)}
            onSelect={setSelectedMatch}
            title={<>WORLD CUP Upcoming <span className="glow">Fixtures</span></>}
          />
        </div>
      </section>
      {selectedMatch && <MatchDetailsModal match={selectedMatch} onClose={() => setSelectedMatch(null)} />}
    </>
  );
}

function LivePage({liveState, streamState}: {liveState: LiveMatchesState; streamState: LiveStreamState}) {
  return (
    <>
      <PageHero
        kicker="Live"
        title="Live Fixtures And Broadcasts"
        text="Watch authorized live broadcasts and follow fixtures happening right now with automatic score refreshes."
      />
      <section className="container live-page-section">
        <LiveBroadcastPanel streamState={streamState} />
        <div className="live-grid single">
          <LiveMatchPanel
            emptyLabel="No live fixtures right now."
            error={liveState.error}
            matches={liveState.matches}
            showAnalytics
            title="Live Fixtures"
          />
        </div>
      </section>
    </>
  );
}

function WorldCupMatchdaySection({data, error, liveState, loading, streamState}: {data: WorldCupData; error: string | null; liveState: LiveMatchesState; loading: boolean; streamState: LiveStreamState}) {
  const [selectedMatch, setSelectedMatch] = useState<WorldCupMatch | null>(null);
  const live = data.matches.filter((match) => match.status === 'Live');
  const results = data.matches.filter((match) => match.status === 'Result');
  const upcoming = data.matches.filter((match) => match.status === 'Upcoming');

  return (
    <>
      <section className="sp container wc-matchday-section">
        <div className="section-head">
          <SectionTitle icon="fa-solid fa-tower-broadcast">World Cup <span className="glow">Matchday Center</span></SectionTitle>
          <Link className="slide-read" to="/live">Open Live Page</Link>
        </div>
        <LiveBroadcastPanel streamState={streamState} />
        <div className="wc-matchday-grid">
          <LiveMatchPanel
            emptyLabel="No live World Cup fixtures right now."
            error={liveState.error}
            matches={liveState.matches}
            showAnalytics
            title="Live Fixtures"
          />
          <WorldCupMatchPanel
            emptyLabel="No World Cup match is live right now."
            error={error}
            icon="fa-solid fa-satellite-dish"
            loading={loading}
            matches={live.slice(0, 4)}
            onSelect={setSelectedMatch}
            title={<>Feed <span className="glow">Live</span></>}
          />
          <WorldCupMatchPanel
            emptyLabel="No completed World Cup results yet."
            error={error}
            icon="fa-solid fa-square-poll-vertical"
            loading={loading}
            matches={results.slice(0, 4)}
            onSelect={setSelectedMatch}
            title={<>Latest <span className="glow">Results</span></>}
          />
          <WorldCupMatchPanel
            emptyLabel="No upcoming World Cup fixtures available yet."
            error={error}
            icon="fa-regular fa-calendar"
            loading={loading}
            matches={upcoming.slice(0, 6)}
            onSelect={setSelectedMatch}
            title={<>Next <span className="glow">Fixtures</span></>}
          />
        </div>
      </section>
      {selectedMatch && <MatchDetailsModal match={selectedMatch} onClose={() => setSelectedMatch(null)} />}
    </>
  );
}

function LiveBroadcastPanel({streamState}: {streamState: LiveStreamState}) {
  const stream = streamState.stream;
  const hasPlayer = Boolean(stream?.embedUrl && stream.status !== 'offline');
  const posterImage = stream?.posterImage || liveWaitingImage;

  return (
    <section className="live-broadcast-card glass">
      <div className="live-broadcast-info">
        <div className="eyebrow"><i className="fa-solid fa-tower-broadcast" /> Live Broadcast</div>
        <h2>{stream?.title || 'World Cup 2026 Matchday Live Center'}</h2>
        <p>{stream?.message || 'The World Cup has begun. Live broadcast players will appear here when an authorized stream is available.'}</p>
        <div className="live-broadcast-meta">
          <span className={`stream-status stream-${stream?.status || 'scheduled'}`}>
            <i className="fa-solid fa-circle" /> {stream?.status || 'scheduled'}
          </span>
          <span><i className="fa-solid fa-futbol" /> {stream?.match || 'World Cup 2026 Matchday Coverage'}</span>
          <span><i className="fa-solid fa-tv" /> {stream?.provider || 'Authorized stream source pending'}</span>
        </div>
      </div>
      <div className="live-player-shell">
        {streamState.error ? (
          <StateBox label={streamState.error} showSpinner={false} />
        ) : streamState.loading && !stream ? (
          <StateBox label="Loading live stream frame..." />
        ) : hasPlayer ? (
          <iframe
            allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
            allowFullScreen
            className="live-player-frame"
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
            src={stream!.embedUrl}
            title={stream!.title}
          />
        ) : (
          <div className="live-player-placeholder">
            <img alt="World Cup 2026 matchday coverage" src={posterImage} />
            <div className="live-waiting-overlay">
              <i className="fa-solid fa-satellite-dish" />
              <strong>World Cup 2026 Is Underway</strong>
              <span>Live video frames will appear here when an authorized stream source is active.</span>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function LiveMatchPanel({emptyLabel, error, matches, showAnalytics = false, title}: {emptyLabel: string; error: string | null; matches: LiveMatch[]; showAnalytics?: boolean; title: string}) {
  return (
    <div className="match-panel">
      <SectionTitle icon="fa-solid fa-satellite-dish">{title === 'Live Fixtures' ? <>Live <span className="glow">Fixtures</span></> : title}</SectionTitle>
      {error ? <ErrorBox message={error} /> : matches.length ? (
        <div className="live-match-list">
          {matches.map((match) => <LiveMatchCard key={match.id} match={match} showAnalytics={showAnalytics} />)}
        </div>
      ) : (
        <StateBox label={emptyLabel} showSpinner={false} />
      )}
    </div>
  );
}

function LiveMatchCard({match, showAnalytics = false}: {match: LiveMatch; showAnalytics?: boolean; key?: Key}) {
  const isLive = match.status !== 'FT' && match.status !== 'Upcoming';
  const events = match.events || [];
  const goals = events.filter((event) => event.type === 'Goal').length;
  const yellowCards = events.filter((event) => event.type === 'Card' && event.detail.toLowerCase().includes('yellow')).length;
  const redCards = events.filter((event) => event.type === 'Card' && event.detail.toLowerCase().includes('red')).length;
  return (
    <article className={`glass live-match-card ${isLive ? 'is-live' : ''}`}>
      <div className="live-match-top">
        <span><i className="fa-solid fa-shield-halved" /> {match.league}</span>
        <strong>{match.status}</strong>
      </div>
      <div className="live-score-row">
        <div>{match.home.name}</div>
        <b>{match.home.score ?? '-'}</b>
        <span>-</span>
        <b>{match.away.score ?? '-'}</b>
        <div>{match.away.name}</div>
      </div>
      <div className="live-match-foot">
        <span><i className="fa-regular fa-calendar" /> {formatTime(match.startTime)}</span>
        <span><i className="fa-solid fa-location-dot" /> {match.venue || 'Matchday fixture'}</span>
      </div>
      {showAnalytics ? (
        <div className="live-analytics">
          <div className="live-analytics-stats">
            <span><i className="fa-solid fa-futbol" /> Goals {goals}</span>
            <span><i className="fa-solid fa-square yellow-card" /> Yellow {yellowCards}</span>
            <span><i className="fa-solid fa-square red-card" /> Red {redCards}</span>
          </div>
          {events.length ? (
            <div className="live-events-list">
              {events.map((event) => (
                <div className="live-event" key={event.id}>
                  <span>{event.minute}&apos;</span>
                  <strong>{event.type === 'Goal' ? 'Goal' : event.detail}</strong>
                  <p>{event.player} | {event.team}{event.assist ? ` | Assist: ${event.assist}` : ''}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="live-no-events">No goals or cards reported yet.</p>
          )}
        </div>
      ) : null}
    </article>
  );
}

function WorldCupMatchPanel({
  emptyLabel,
  error,
  icon,
  gridClassName = '',
  loading,
  matches,
  onSelect,
  title,
}: {
  emptyLabel: string;
  error: string | null;
  gridClassName?: string;
  icon: string;
  loading: boolean;
  matches: WorldCupMatch[];
  onSelect: (match: WorldCupMatch) => void;
  title: ReactNode;
}) {
  return (
    <div className="match-panel">
      <SectionTitle icon={icon}>{title}</SectionTitle>
      {loading ? <SkeletonGrid count={3} /> : error ? <ErrorBox message={error} /> : matches.length ? (
        <div className={`matches-grid compact-matches ${gridClassName}`}>{matches.map((match) => <WorldCupMatchCard key={match.id} match={match} onSelect={onSelect} />)}</div>
      ) : (
        <StateBox label={emptyLabel} />
      )}
    </div>
  );
}

function WorldCupMatchCard({match, onSelect}: {match: WorldCupMatch; onSelect: (match: WorldCupMatch) => void; key?: Key}) {
  return (
    <button className={`match-card glass ${match.status === 'Live' ? 'is-live' : ''}`} onClick={() => onSelect(match)} type="button">
      <div className="match-hdr">
        <span className="comp-nm"><i className="fa-solid fa-trophy" /> {match.group} | {match.round}</span>
        <span className={`ms ${match.status === 'Live' ? 'live' : match.status === 'Result' ? 'ft' : 'sched'}`}>{match.status}</span>
      </div>
      <div className="teams-row">
        <TeamMini name={match.team1} logo={match.team1Flag} />
        <div className="score-blk">
          <div className="score">
            <span>{match.score1 ?? '-'}</span>
            <span className="score-dash">-</span>
            <span>{match.score2 ?? '-'}</span>
          </div>
          {match.status === 'Live' && <div className="live-pulse"><span /> LIVE</div>}
        </div>
        <TeamMini name={match.team2} logo={match.team2Flag} />
      </div>
      <div className="match-ftr"><i className="fa-solid fa-location-dot" /> {match.ground} | {formatMatchDate(match)}</div>
    </button>
  );
}

function MatchDetailsModal({match, onClose}: {match: WorldCupMatch; onClose: () => void}) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="glass match-modal" onClick={(event) => event.stopPropagation()}>
        <button className="search-x modal-close" onClick={onClose} type="button">&times;</button>
        <Badge tone={match.status === 'Live' ? 'live' : match.status === 'Result' ? 'green' : 'gold'}>{match.status}</Badge>
        <h2>{match.team1} vs {match.team2}</h2>
        <p>{match.round} | {match.group}</p>
        <div className="modal-score">{match.score1 ?? '-'} <span>-</span> {match.score2 ?? '-'}</div>
        <dl className="modal-details">
          <div><dt>Date</dt><dd>{formatMatchDate(match)}</dd></div>
          <div><dt>Time</dt><dd>{match.time}</dd></div>
          <div><dt>Ground</dt><dd>{match.ground}</dd></div>
          <div><dt>Host</dt><dd>{match.city}, {match.country}</dd></div>
        </dl>
      </div>
    </div>
  );
}

function TeamMini({name, logo}: {name: string; logo?: string}) {
  return (
    <div className="tm">
      <img alt={name} loading="lazy" src={logo || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&size=80&background=ffffff&color=131929&bold=true`} />
      <span className="tm-n">{name}</span>
    </div>
  );
}

function WorldCupSection({articles = [], full = false, data}: {articles?: Article[]; full?: boolean; data?: WorldCupData}) {
  return (
    <section className="wc-hub">
      <div className="container wc-inner wc-identity">
        <div className="wc-hero-panel">
          <div>
            <div className="eyebrow"><i className="fa-solid fa-trophy" /> FIFA World Cup 2026</div>
            <h2 className="wc-h">WORLD CUP <span className="glow">BEGINS</span></h2>
            <p className="wc-desc">The road to glory is now live across Mexico, the United States, and Canada. Follow every match, result, and tournament story on GoalSphere.</p>
            <div className="tournament-live-card">
              <span className="live-pill"><i className="fa-solid fa-circle" /> Tournament Live</span>
              <strong>Mexico opened the tournament with a 2-0 win over South Africa.</strong>
              <div className="tournament-live-stats">
                <span><b>48</b> teams</span>
                <span><b>104</b> matches</span>
                <span><b>16</b> stadiums</span>
              </div>
            </div>
          </div>
          <img alt="FIFA World Cup 2026 identity" className="wc-identity-img" src="/worldcup-identity.png" />
        </div>
        <RoadToGlorySidebar articles={articles} />
        {data && <WorldCupInfoGrid data={data} />}
        {full && (
          <div className="feature-grid top-gap">
            <Feature title="Expanded Format" text="Twelve groups and a larger knockout path make depth and rotation more important than ever." />
            <Feature title="Travel Strategy" text="North American distances will reward teams with strong base-camp planning and recovery work." />
            <Feature title="Tournament Data" text="Live matches, fixtures, results, standings, and teams update from GoalSphere match feeds." />
          </div>
        )}
      </div>
    </section>
  );
}

function RoadToGlorySidebar({articles}: {articles: Article[]}) {
  const related = articles.slice(0, 3);
  return (
    <div className="road-extra-grid">
      <aside className="glass road-news-card">
        <div className="eyebrow"><i className="fa-regular fa-newspaper" /> Related News</div>
        <h3>Latest from the road</h3>
        <div className="road-news-list">
          {related.map((article) => (
            <Link className="road-news-item" key={article.slug} to={`/news/${article.slug}`}>
              <img alt={article.title} loading="lazy" src={article.image} />
              <div>
                <Badge tone="blue">{article.category}</Badge>
                <h4>{article.title}</h4>
                <span>{formatDate(article.publishedAt)}</span>
              </div>
            </Link>
          ))}
        </div>
      </aside>
      <aside className="glass road-social-card">
        <div className="eyebrow"><i className="fa-solid fa-share-nodes" /> Follow GoalSphere</div>
        <h3>Join the tournament conversation</h3>
        <p>Get lineup notes, breaking World Cup updates, matchday reels, and live reaction across our social channels.</p>
        <div className="road-socials">
          <a href="https://x.com/Goalspherewc26" rel="noreferrer" target="_blank"><i className="fa-brands fa-x-twitter" /> X</a>
          <a href="https://www.youtube.com/@GoalSphere-wc26" rel="noreferrer" target="_blank"><i className="fa-brands fa-youtube" /> YouTube</a>
          <a href="https://www.tiktok.com/@goalsphere26?lang=en" rel="noreferrer" target="_blank"><i className="fa-brands fa-tiktok" /> TikTok</a>
        </div>
      </aside>
    </div>
  );
}

function WorldCupInfoGrid({data}: {data: WorldCupData}) {
  return (
    <div className="wc-info-grid">
      <Feature title={`${data.teams.length} Teams`} text="All teams and flags are fetched from rezarahiminia/worldcup2026." />
      <Feature title={`${data.matches.length} Matches`} text="Full group and knockout schedule from the repo match dataset." />
      <Feature title={`${data.stadiums.length} Stadiums`} text="Official stadium names, cities, countries, capacities, and match counts." />
      <Feature title={`${data.hostCities.length} Host Cities`} text="Host city coverage across the United States, Mexico, and Canada." />
    </div>
  );
}

function NewsSection({articles, contained = false, title = 'Latest'}: {articles: Article[]; contained?: boolean; title?: string}) {
  const [visible, setVisible] = useState(8);
  useEffect(() => {
    const onScroll = () => {
      if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 600) {
        setVisible((count) => Math.min(count + 3, articles.length));
      }
    };
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, [articles.length]);

  return (
    <section className={`posts-section ${contained ? '' : 'container'} ${articles.length === 2 ? 'two-posts' : ''}`}>
      <div className="section-head">
        <SectionTitle icon="fa-regular fa-newspaper">{title} <span className="glow">Articles</span></SectionTitle>
        <Link to="/news" className="btn-sub">View All Posts</Link>
      </div>
      <div className="posts-grid">
        {articles.slice(0, visible).map((article, index) => <ArticleCard article={article} index={index} key={article.slug} />)}
      </div>
      {visible < articles.length && <StateBox label="Scroll for more football news..." />}
    </section>
  );
}

function ArticleCard({article, basePath = '/news', index}: {article: Article; basePath?: string; index: number; key?: Key}) {
  const articlePath = `${basePath}/${article.slug}`;
  return (
    <article className="post-card glass">
      <Link to={articlePath} className="post-thumb">
        <img alt={article.title} loading="lazy" onError={(event) => { event.currentTarget.src = fallbackArticleImage; }} src={article.image || fallbackArticleImage} />
        <Badge>{article.category}</Badge>
        <div className="post-num">{String(index + 1).padStart(2, '0')}</div>
      </Link>
      <div className="post-body">
        <h3><Link to={articlePath}>{article.title}</Link></h3>
        <p>{article.description}</p>
        <div className="post-footer">
          <span><i className="fa-solid fa-rss" /> {article.source} | {formatDate(article.publishedAt)}</span>
          <Link to={articlePath}>Read <i className="fa-solid fa-arrow-right-long" /></Link>
        </div>
        <ShareLinks article={article} basePath={basePath} compact />
      </div>
    </article>
  );
}

function articleShareUrl(article: Article, basePath = '/news') {
  return `${siteUrl}${basePath}/${article.slug}`;
}

function shareText(article: Article) {
  return `${article.title} | GoalSphere`;
}

function copyShareLink(article: Article, basePath = '/news') {
  const url = articleShareUrl(article, basePath);
  if (navigator.clipboard) {
    navigator.clipboard.writeText(url).catch(() => undefined);
  }
}

function ShareLinks({article, basePath = '/news', compact = false}: {article: Article; basePath?: string; compact?: boolean}) {
  const url = articleShareUrl(article, basePath);
  const text = shareText(article);
  const encodedUrl = encodeURIComponent(url);
  const encodedText = encodeURIComponent(text);

  const links = [
    {label: 'X', icon: 'fa-brands fa-x-twitter', href: `https://x.com/intent/tweet?url=${encodedUrl}&text=${encodedText}&via=Goalspherewc26`},
    {label: 'Facebook', icon: 'fa-brands fa-facebook-f', href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`},
    {label: 'WhatsApp', icon: 'fa-brands fa-whatsapp', href: `https://api.whatsapp.com/send?text=${encodedText}%20${encodedUrl}`},
    {label: 'Telegram', icon: 'fa-brands fa-telegram', href: `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`},
  ];

  return (
    <div className={`share-row ${compact ? 'compact' : ''}`}>
      <span><i className="fa-solid fa-share-nodes" /> Share</span>
      {links.map((link) => (
        <a aria-label={`Share on ${link.label}`} href={link.href} key={link.label} rel="noreferrer" target="_blank">
          <i className={link.icon} /> {!compact && link.label}
        </a>
      ))}
      <button aria-label="Copy article link" onClick={() => copyShareLink(article, basePath)} type="button">
        <i className="fa-regular fa-copy" /> {!compact && 'Copy'}
      </button>
    </div>
  );
}

function videoShareUrl(video: VideoItem) {
  return video.url.startsWith('http') ? video.url : `${siteUrl}${video.url}`;
}

function copyVideoShareLink(video: VideoItem) {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(videoShareUrl(video)).catch(() => undefined);
  }
}

function VideoShareLinks({video}: {video: VideoItem}) {
  const url = videoShareUrl(video);
  const text = `${video.title} | GoalSphere`;
  const encodedUrl = encodeURIComponent(url);
  const encodedText = encodeURIComponent(text);
  const links = [
    {label: 'X', icon: 'fa-brands fa-x-twitter', href: `https://x.com/intent/tweet?url=${encodedUrl}&text=${encodedText}&via=Goalspherewc26`},
    {label: 'Facebook', icon: 'fa-brands fa-facebook-f', href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`},
    {label: 'WhatsApp', icon: 'fa-brands fa-whatsapp', href: `https://api.whatsapp.com/send?text=${encodedText}%20${encodedUrl}`},
  ];

  return (
    <div className="video-share-row" aria-label={`Share ${video.title}`}>
      {links.map((link) => (
        <a aria-label={`Share on ${link.label}`} href={link.href} key={link.label} rel="noreferrer" target="_blank">
          <i className={link.icon} />
        </a>
      ))}
      <button aria-label="Copy video link" onClick={() => copyVideoShareLink(video)} type="button">
        <i className="fa-regular fa-copy" />
      </button>
    </div>
  );
}

function PlayersSection({contained = false, full = false}: {contained?: boolean; full?: boolean}) {
  const shown = full ? players : players;
  return (
    <section className={`sp ${contained ? '' : 'container'}`}>
      <SectionTitle icon="fa-solid fa-star">Players to <span className="glow">Watch</span></SectionTitle>
      <div className="players-grid players-scroll">
        {shown.map((player) => (
          <article className="player-card player-cutout" key={player.name}>
            <img alt={player.name} className="p-avatar" loading="lazy" src={player.image} />
            <h4>{player.name}</h4>
            <div className="p-nation">{player.nation} | {player.club}</div>
            <p className="muted">{player.role}</p>
            <div className="p-stats">
              <div className="pstat"><span className="pstat-v">{player.goals}</span><span className="pstat-l">Goals</span></div>
              <div className="pstat"><span className="pstat-v">{player.assists}</span><span className="pstat-l">Assists</span></div>
              <div className="pstat"><span className="pstat-v">{player.rating}</span><span className="pstat-l">Rating</span></div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function VideosSection({contained = false, fullPage = false, limit, title, videos = homeVideos}: {contained?: boolean; fullPage?: boolean; limit?: number; title?: ReactNode; videos?: VideoItem[]}) {
  const [selectedVideo, setSelectedVideo] = useState<VideoItem | null>(null);
  const visibleVideos = typeof limit === 'number' ? videos.slice(0, limit) : videos;

  return (
    <section className={`video-section sp ${contained ? '' : 'container'} ${fullPage ? 'videos-page-section' : ''}`}>
      <div className="section-head">
        <SectionTitle icon="fa-solid fa-circle-play">{title || <>Latest <span className="glow">Videos</span></>}</SectionTitle>
      </div>
      <div className={`video-thumbs highlight-video-thumbs ${fullPage ? 'videos-page-grid' : ''}`}>
        {visibleVideos.length ? visibleVideos.map((video, index) => (
          <article className="video-thumb glass" key={`${video.title}-${video.url}`}>
            <button className="video-thumb-trigger" onClick={() => setSelectedVideo(video)} type="button">
              <img alt={video.title} loading="lazy" src={video.thumbnail || getVideoThumbnail(video.url)} />
              <div>
                <h4>{video.title}</h4>
              </div>
            </button>
            <VideoShareLinks video={video} />
          </article>
        )) : (
          [1, 2, 3].map((item) => (
            <div className="video-thumb video-thumb-placeholder glass" key={item}>
              <div className="video-thumb-icon"><i className="fa-solid fa-link" /></div>
              <div>
                <span>Waiting</span>
                <h4>Video link slot {item}</h4>
              </div>
            </div>
          ))
        )}
      </div>
      {selectedVideo ? <VideoPopup video={selectedVideo} onClose={() => setSelectedVideo(null)} /> : null}
    </section>
  );
}

function VideosPage() {
  return (
    <>
      <PageHero
        kicker="Videos"
        title="GoalSphere Video Highlights"
        text="Watch every GoalSphere highlight thumbnail in one place, from goals and warm-up clips to live match moments and replay features."
      />
      <VideosSection
        fullPage
        title={<>All <span className="glow">Video Highlights</span></>}
        videos={highlightVideos}
      />
    </>
  );
}

function YouTubeVideosSection({contained = false, videos = homeVideos}: {contained?: boolean; videos?: VideoItem[]}) {
  const [active, setActive] = useState(0);
  const current = videos[active];

  useEffect(() => {
    if (active >= videos.length) setActive(0);
  }, [active, videos.length]);

  return (
    <section className={`video-section sp ${contained ? '' : 'container'}`}>
      <div className="section-head">
        <SectionTitle icon="fa-brands fa-youtube">Latest <span className="glow">Videos</span></SectionTitle>
      </div>
      {current ? (
        <>
          <div className="video-player-shell glass">
            <div className="video-frame">
              <VideoFrameContent autoplay={false} video={current} />
            </div>
            <div className="video-copy">
              <Badge tone="blue">{current.source}</Badge>
              <h3>{current.title}</h3>
              <p>{current.description}</p>
            </div>
          </div>
          <div className="video-thumbs video-player-thumbs">
            {videos.map((video, index) => (
              <button
                className={`video-thumb glass ${index === active ? 'active' : ''}`}
                key={`${video.title}-${video.url}`}
                onClick={() => setActive(index)}
                type="button"
              >
                <img alt={video.title} loading="lazy" src={video.thumbnail || getVideoThumbnail(video.url)} />
                <div>
                  <span>{video.source}</span>
                  <h4>{video.title}</h4>
                  <p>{video.description}</p>
                </div>
              </button>
            ))}
          </div>
        </>
      ) : (
        <div className="video-player-shell video-empty glass">
          <i className="fa-solid fa-video" />
          <h3>Add your YouTube videos</h3>
          <p>Place your video links in <code>src/data/videos.ts</code> to show them here.</p>
        </div>
      )}
    </section>
  );
}

function VideoPopup({video, onClose}: {video: VideoItem; onClose: () => void}) {
  return (
    <div className="modal-backdrop video-popup-backdrop" onClick={onClose}>
      <div className="glass video-popup-card" onClick={(event) => event.stopPropagation()}>
        <button className="search-x modal-close" onClick={onClose} type="button">&times;</button>
        <div className="video-frame">
          <VideoFrameContent autoplay video={video} />
        </div>
      </div>
    </div>
  );
}

function VideoFrameContent({autoplay = false, video}: {autoplay?: boolean; video: VideoItem}) {
  if (isTwitterVideo(video.url)) {
    const tweetId = getTweetId(video.url);
    if (tweetId) {
      return (
        <iframe
          allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
          allowFullScreen
          className="x-embed-frame"
          src={`https://platform.twitter.com/embed/Tweet.html?id=${tweetId}&theme=dark&dnt=true`}
          title={video.title}
        />
      );
    }

    return (
      <div className="x-video-card">
        <div className="x-video-icon"><i className="fa-brands fa-x-twitter" /></div>
        <Badge tone="blue">{video.source}</Badge>
        <h3>{video.title}</h3>
        <p>{video.description}</p>
        <a className="slide-read" href={video.url} rel="noreferrer" target="_blank">
          Watch Video on X <i className="fa-solid fa-arrow-up-right-from-square" />
        </a>
      </div>
    );
  }

  if (isDirectVideo(video.url)) {
    return (
      <video autoPlay={autoplay} controls poster={video.thumbnail}>
        <source src={video.url} />
      </video>
    );
  }

  return (
    <iframe
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
      allowFullScreen
      src={autoplay ? getVideoPlaybackUrl(video.url) : getVideoEmbedUrl(video.url)}
      title={video.title}
    />
  );
}

function getVideoPlaybackUrl(url: string) {
  const embedUrl = getVideoEmbedUrl(url);
  const separator = embedUrl.includes('?') ? '&' : '?';
  return `${embedUrl}${separator}autoplay=1`;
}

function getVideoEmbedUrl(url: string) {
  const youtubeId = getYouTubeId(url);
  if (youtubeId) {
    const separator = url.includes('?') ? '?' : '';
    const query = url.includes('/embed/') ? url.split('?')[1] : '';
    return `https://www.youtube.com/embed/${youtubeId}${separator}${query}`;
  }

  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes('vimeo.com')) {
      const id = parsed.pathname.split('/').filter(Boolean)[0];
      if (id) return `https://player.vimeo.com/video/${id}`;
    }
  } catch {
    return url;
  }

  return url;
}

function getVideoThumbnail(url: string) {
  const youtubeId = getYouTubeId(url);
  if (youtubeId) return `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`;
  if (isTwitterVideo(url)) return '/worldcup-identity.png';
  return '/worldcup-identity.png';
}

function getYouTubeId(url: string) {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes('youtu.be')) return parsed.pathname.replace('/', '');
    if (parsed.hostname.includes('youtube.com') && parsed.pathname.startsWith('/embed/')) {
      return parsed.pathname.split('/').filter(Boolean)[1] || null;
    }
    if (parsed.hostname.includes('youtube.com')) return parsed.searchParams.get('v');
  } catch {
    return null;
  }
  return null;
}

function isDirectVideo(url: string) {
  return /\.(mp4|webm|ogg)(\?.*)?$/i.test(url);
}

function isTwitterVideo(url: string) {
  try {
    const parsed = new URL(url);
    return parsed.hostname.includes('twitter.com') || parsed.hostname.includes('x.com');
  } catch {
    return false;
  }
}

function getTweetId(url: string) {
  try {
    const parsed = new URL(url);
    const parts = parsed.pathname.split('/').filter(Boolean);
    return parts.find((part) => /^\d+$/.test(part)) || null;
  } catch {
    return null;
  }
}

function HomeEditorialLayout({articles}: {articles: Article[]}) {
  return (
    <section className="container home-editorial">
      <div className="home-content-grid">
        <div className="home-main-stack">
          <NewsSection articles={articles.slice(0, 8)} contained />
          <YouTubeVideosSection contained />
        </div>
        <HomeSidebar articles={articles} />
      </div>
    </section>
  );
}

function HomeSidebar({articles}: {articles: Article[]}) {
  const latest = articles.slice(0, 4);
  const [spotlightIndex, setSpotlightIndex] = useState(0);
  const spotlight = players[spotlightIndex % players.length];

  useEffect(() => {
    const timer = window.setInterval(() => {
      setSpotlightIndex((value) => (value + 1) % players.length);
    }, 4200);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <aside className="home-sidebar">
      <div className="glass sidebar-card sidebar-card-highlight">
        <div className="eyebrow"><i className="fa-solid fa-bolt" /> Editor Picks</div>
        <h3>Latest from GoalSphere</h3>
        <div className="sidebar-news-list">
          {latest.map((article, index) => (
            <Link className="sidebar-news-item" key={article.slug} to={`/news/${article.slug}`}>
              <span>{String(index + 1).padStart(2, '0')}</span>
              <div>
                <Badge tone="blue">{article.category}</Badge>
                <h4>{article.title}</h4>
              </div>
            </Link>
          ))}
        </div>
      </div>
      <div className="glass sidebar-card player-spotlight">
        <div className="eyebrow"><i className="fa-solid fa-star" /> Player Watch</div>
        <div className="spotlight-rotator" key={spotlight.name}>
          <img alt={spotlight.name} loading="lazy" src={spotlight.image} />
          <h3>{spotlight.name}</h3>
          <p>{spotlight.nation} | {spotlight.club}</p>
          <div className="spotlight-stats">
            <span>{spotlight.goals}<small>Goals</small></span>
            <span>{spotlight.assists}<small>Assists</small></span>
            <span>{spotlight.rating}<small>Rating</small></span>
          </div>
        </div>
        <Link to="/players" className="slide-read">View Players</Link>
      </div>
      <div className="glass sidebar-card sidebar-social">
        <div className="eyebrow"><i className="fa-solid fa-share-nodes" /> Follow</div>
        <h3>Matchday social feed</h3>
        <p>Breaking news, squad notes, short reels, and World Cup reactions in the GoalSphere voice.</p>
        <div className="road-socials">
          <a href="https://x.com/Goalspherewc26" rel="noreferrer" target="_blank"><i className="fa-brands fa-x-twitter" /> X</a>
          <a href="https://www.youtube.com/@GoalSphere-wc26" rel="noreferrer" target="_blank"><i className="fa-brands fa-youtube" /> YouTube</a>
          <a href="https://www.tiktok.com/@goalsphere26?lang=en" rel="noreferrer" target="_blank"><i className="fa-brands fa-tiktok" /> TikTok</a>
        </div>
      </div>
    </aside>
  );
}

function HistoryBanner({contained = false}: {contained?: boolean}) {
  const lastWinner = timeline[0];
  const banner = (
    <div className="glass history-banner">
      <div>
        <div className="eyebrow"><i className="fa-solid fa-clock-rotate-left" /> World Cup History</div>
        <h2>From Past Glory to 2026</h2>
        <p>{lastWinner.year} in {lastWinner.host}: {lastWinner.winner} lifted the trophy.</p>
      </div>
      <img alt="Diego Maradona Argentina legend" className="history-player" loading="lazy" src="/players/diego-maradona.png" />
      <Link to="/world-cup-2026/history" className="slide-read">Explore History</Link>
    </div>
  );

  if (contained) return banner;

  return (
    <section className="container history-banner-section">
      {banner}
    </section>
  );
}

function YouTubeChannelBanner({contained = false}: {contained?: boolean}) {
  const banner = (
    <div className="glass youtube-banner">
      <div className="youtube-mark">
        <i className="fa-brands fa-youtube" />
      </div>
      <div>
        <div className="eyebrow"><i className="fa-solid fa-tv" /> Official GoalSphere Channel</div>
        <h2>Watch GoalSphere on YouTube</h2>
        <p>Follow our World Cup 2026 channel for video stories, matchday features, analysis, and tournament highlights.</p>
      </div>
      <a className="slide-read" href="https://www.youtube.com/@GoalSphere-wc26" rel="noreferrer" target="_blank">
        Visit Channel <i className="fa-solid fa-arrow-up-right-from-square" />
      </a>
    </div>
  );

  if (contained) return banner;

  return (
    <section className="container youtube-banner-section">
      {banner}
    </section>
  );
}

const stadiumMatchPreviews = [
  {
    city: 'Mexico City',
    stadium: 'Mexico City Stadium',
    match: 'Mexico vs South Africa',
    date: 'June 11',
    image: '/stadiums/mexico-city-opening.png',
    text: "The opening match of the tournament, and another World Cup chapter for one of football's most iconic stadiums.",
  },
  {
    city: 'Guadalajara',
    stadium: 'Guadalajara Stadium',
    match: 'Korea Republic vs Czechia',
    date: 'June 11',
    image: '/stadiums/guadalajara-opening.png',
    text: "Group A continues in Mexico at one of the country's most modern football venues.",
  },
  {
    city: 'Toronto',
    stadium: 'Toronto Stadium',
    match: 'Canada vs Bosnia and Herzegovina',
    date: 'June 12',
    image: '/stadiums/toronto-opening.png',
    text: "Canada's first match of the tournament, played on home soil in Toronto.",
  },
  {
    city: 'Los Angeles',
    stadium: 'Los Angeles Stadium',
    match: 'USA vs Paraguay',
    date: 'June 12',
    image: '/stadiums/los-angeles-opening.png',
    text: 'The United States begins its World Cup at one of the most spectacular stadiums in the tournament.',
  },
];

function StadiumPreviewBanner() {
  return (
    <section className="container stadium-preview-section">
      <div className="glass stadium-preview-banner">
        <div className="stadium-preview-copy">
          <div className="eyebrow"><i className="fa-solid fa-building-columns" /> WC 2026 Stadiums</div>
          <h2>Opening Match Stadium Previews</h2>
          <p>
            Preview the main stadiums that will launch the 2026 FIFA World Cup across Mexico, Canada, and the United
            States, with space for deeper venue notes as the tournament approaches.
          </p>
        </div>
        <div className="stadium-match-grid">
          {stadiumMatchPreviews.map((item) => (
            <article className="stadium-match-card" key={item.city}>
              <img alt={`${item.city} World Cup 2026 stadium preview`} loading="lazy" src={item.image} />
              <div className="stadium-match-content">
                <span><i className="fa-solid fa-calendar-days" /> {item.date}</span>
                <h3>{item.match}</h3>
                <strong><i className="fa-solid fa-location-dot" /> {item.stadium}</strong>
                <p>{item.text}</p>
              </div>
            </article>
          ))}
        </div>
        <div className="stadium-feature-card">
          <img alt="Toronto Stadium World Cup 2026 host venue" loading="lazy" src="/stadiums/toronto-stadium.jpg" />
          <div>
            <div className="eyebrow"><i className="fa-solid fa-circle-info" /> Venue Focus</div>
            <h3>Toronto Stadium</h3>
            <p>
              Located at Exhibition Place by Lake Ontario, Toronto Stadium is home to MLS club Toronto FC. Opened in
              2007 as Canada&apos;s first soccer-specific stadium, it is a modern, intimate bowl with excellent sightlines.
            </p>
            <div className="stadium-info-grid">
              <div>
                <strong>Capacity</strong>
                <span>45,000, the smallest venue in the tournament</span>
              </div>
              <div>
                <strong>Key Features</strong>
                <span>Hybrid grass pitch, hospitality suites, and enhanced broadcast facilities</span>
              </div>
              <div>
                <strong>World Cup Role</strong>
                <span>Six matches: five group-stage games and one Round of 32 fixture</span>
              </div>
              <div>
                <strong>Opening Match</strong>
                <span>Canada&apos;s first match on June 12</span>
              </div>
            </div>
            <Link to="/stadiums" className="slide-read">Preview Stadiums <i className="fa-solid fa-arrow-right-long" /></Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function XTimelineSidebar({contained = false}: {contained?: boolean}) {
  useEffect(() => {
    const existingScript = document.querySelector<HTMLScriptElement>('script[src="https://www.tiktok.com/embed.js"]');
    if (existingScript) {
      existingScript.remove();
    }

    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://www.tiktok.com/embed.js';
    document.body.appendChild(script);
  }, []);

  const timeline = (
    <aside className="home-sidebar x-profile-sidebar">
      <div className="glass sidebar-card tiktok-sidebar-card">
        <div className="eyebrow"><i className="fa-brands fa-tiktok" /> GoalSphere TikTok</div>
        <h3>Road to Glory</h3>
        <div className="tiktok-embed-frame">
          <blockquote
            className="tiktok-embed"
            cite="https://www.tiktok.com/@goalsphere26/video/7647776515697937671"
            data-video-id="7647776515697937671"
            style={{maxWidth: '605px', minWidth: '325px'}}
          >
            <section>
              <a target="_blank" title="@goalsphere26" href="https://www.tiktok.com/@goalsphere26?refer=embed" rel="noreferrer">@goalsphere26</a>
              <p>
                The Road to Glory Begins | Follow GoalSphere for Exclusive Coverage. The countdown is on. Get ready
                for the biggest football tournament in history with GoalSphere.
              </p>
              <a target="_blank" title="original sound - Goalsphere" href="https://www.tiktok.com/music/original-sound-Goalsphere-7647776571763952392?refer=embed" rel="noreferrer">
                original sound - Goalsphere
              </a>
            </section>
          </blockquote>
        </div>
      </div>
    </aside>
  );

  if (contained) return timeline;

  return (
    <section className="container x-timeline-section" aria-label="GoalSphere TikTok video">
      {timeline}
    </section>
  );
}

function SocialBannersWithTimeline() {
  return (
    <section className="container social-banners-section">
      <div className="social-banners-grid">
        <div className="social-banner-stack">
          <HistoryBanner contained />
          <YouTubeChannelBanner contained />
        </div>
        <XTimelineSidebar contained />
      </div>
    </section>
  );
}

const replaySteps = [
  ['fa-solid fa-play', 'Choose A Goal Simulation', 'Open a published GoalSphere 3D goal replay from the simulator library.'],
  ['fa-solid fa-futbol', 'Watch The Play On The Pitch', 'See the players, ball path, and attacking move recreated on our virtual football pitch.'],
  ['fa-solid fa-camera', 'Switch Camera Angles', 'View the same goal through broadcast, tactical, and top-down camera styles.'],
  ['fa-solid fa-route', 'Follow The Ball Path', 'Track the pass, run, shot, deflection, or finish through the 3D sequence.'],
  ['fa-solid fa-chart-simple', 'Read The Tactical Story', 'Understand the movement, space, timing, and decision that created the goal.'],
  ['fa-solid fa-cubes', 'Original 3D Models', 'Watch generic animated players and recreated stadium scenes, not official likenesses.'],
];

const replayOutputs = [
  ['3D Pitch Simulator', 'Watch the goal unfold on a virtual GoalSphere football pitch.'],
  ['Tactical View', 'See positions, movement, passing lanes, and ball path clearly.'],
  ['Broadcast View', 'Watch a cinematic replay angle built for football storytelling.'],
  ['Top-Down Analysis', 'Use the overhead view to understand the goal in seconds.'],
];

function GoalRecreationSection({compact = false}: {compact?: boolean}) {
  const shownSteps = compact ? replaySteps.slice(0, 4) : replaySteps;
  return (
    <section className={`goal-replay-section ${compact ? 'compact' : ''}`}>
      <div className="container">
        <div className="goal-replay-hero glass">
          <div className="goal-replay-copy">
            <div className="eyebrow"><i className="fa-solid fa-wand-magic-sparkles" /> 3D Pitch</div>
            <h2>Watch Football Goals Recreated In Our 3D Pitch Simulator.</h2>
            <p>
              GoalSphere publishes original 3D goal simulations on a virtual football pitch. Fans simply press play,
              switch views, and watch how the goal happened.
            </p>
            <div className="replay-simple-flow">
              <span><i className="fa-solid fa-play" /> Choose replay</span>
              <i className="fa-solid fa-arrow-right-long" />
              <span><i className="fa-solid fa-cube" /> Watch 3D pitch</span>
              <i className="fa-solid fa-arrow-right-long" />
              <span><i className="fa-solid fa-chart-line" /> Understand the goal</span>
            </div>
            <div className="replay-actions">
              <Link to="/3d-pitch" className="slide-read">Open 3D Pitch <i className="fa-solid fa-arrow-right-long" /></Link>
              <span><i className="fa-solid fa-shield-halved" /> Generic player models, no official likenesses</span>
            </div>
          </div>
          <div className="replay-visual" aria-hidden="true">
            <div className="pitch-lines">
              <span className="player-dot p1" />
              <span className="player-dot p2" />
              <span className="player-dot p3" />
              <span className="player-dot p4" />
              <span className="ball-dot" />
              <span className="ball-trail" />
            </div>
          </div>
        </div>
        <div className="replay-step-grid">
          {shownSteps.map(([icon, title, text]) => (
            <article className="glass replay-step" key={title}>
              <i className={icon} />
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function GoalRecreationPage() {
  return (
    <>
      <PageHero
        kicker="3D Pitch"
        title="Watch Goals In The GoalSphere 3D Pitch Simulator"
        text="Explore football goals as original 3D pitch simulations with tactical, broadcast, and top-down views."
      />
      <GoalPitchSimulator />
      <GoalRecreationSection />
      <section className="container replay-detail-section">
        <div className="replay-detail-grid">
          <div className="glass replay-panel">
            <div className="eyebrow"><i className="fa-solid fa-diagram-project" /> Simulator Experience</div>
            <h2>Users Just Watch The Finished Goal Simulation On Our Pitch.</h2>
            <p>
              The 3D Pitch page is a viewing experience. GoalSphere publishes recreated football goals, and visitors
              explore them through pitch-based camera views and tactical breakdowns.
            </p>
            <div className="pipeline-list">
              {replaySteps.map(([icon, title, text], index) => (
                <div className="pipeline-item" key={title}>
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  <i className={icon} />
                  <div>
                    <h3>{title}</h3>
                    <p>{text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <aside className="glass replay-output-card">
            <div className="eyebrow"><i className="fa-solid fa-display" /> Viewer Experience</div>
            <h2>What Viewers Can Watch</h2>
            <div className="replay-output-list">
              {replayOutputs.map(([title, text]) => (
                <div key={title}>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </div>
              ))}
            </div>
            <Link to="/news" className="slide-read replay-contact-cta">Watch Goal Stories</Link>
          </aside>
        </div>
      </section>
    </>
  );
}

function GoalPitchSimulator() {
  const [camera, setCamera] = useState<ReplayCamera>('broadcast');
  const [frameIndex, setFrameIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const frame = sampleReplay.frames[frameIndex];
  const previousFrame = sampleReplay.frames[Math.max(frameIndex - 1, 0)];

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => {
      setFrameIndex((value) => (value + 1) % sampleReplay.frames.length);
    }, 1200);
    return () => window.clearInterval(timer);
  }, [playing]);

  return (
    <section className="container simulator-section">
      <div className="simulator-shell glass">
        <div className="simulator-head">
          <div>
            <div className="eyebrow"><i className="fa-solid fa-cube" /> Live 3D Pitch Simulator</div>
            <h2>{sampleReplay.title}</h2>
            <p>{sampleReplay.description}</p>
          </div>
          <div className="sim-camera-tabs">
            {(['broadcast', 'tactical', 'top'] as ReplayCamera[]).map((mode) => (
              <button className={camera === mode ? 'active' : ''} key={mode} onClick={() => setCamera(mode)} type="button">
                {mode === 'top' ? 'Top Down' : mode}
              </button>
            ))}
          </div>
        </div>
        <div className={`sim-stage ${camera}`}>
          <div className="sim-stadium">
            <div className="sim-pitch">
              <div
                className="sim-ball-trail"
                style={{
                  left: `${previousFrame.ball.x}%`,
                  top: `${previousFrame.ball.y}%`,
                  width: `${Math.hypot(frame.ball.x - previousFrame.ball.x, frame.ball.y - previousFrame.ball.y)}%`,
                  transform: `rotate(${Math.atan2(frame.ball.y - previousFrame.ball.y, frame.ball.x - previousFrame.ball.x)}rad)`,
                }}
              />
              {frame.actors.map((actor) => (
                <div
                  className={`sim-player ${actor.team}`}
                  key={actor.id}
                  style={{left: `${actor.x}%`, top: `${actor.y}%`}}
                  title={actor.label}
                >
                  <span>{actor.label}</span>
                </div>
              ))}
              <div className="sim-ball" style={{left: `${frame.ball.x}%`, top: `${frame.ball.y}%`}} />
            </div>
          </div>
        </div>
        <div className="sim-controls">
          <button className="slide-read" onClick={() => setPlaying(!playing)} type="button">
            <i className={`fa-solid ${playing ? 'fa-pause' : 'fa-play'}`} /> {playing ? 'Pause' : 'Play'} Replay
          </button>
          <div className="sim-phase">
            <strong>{frame.time}</strong>
            <span>{frame.phase}</span>
          </div>
          <input
            aria-label="Replay timeline"
            max={sampleReplay.frames.length - 1}
            min={0}
            onChange={(event) => setFrameIndex(Number(event.target.value))}
            type="range"
            value={frameIndex}
          />
        </div>
        <div className="sim-timeline">
          {sampleReplay.frames.map((item, index) => (
            <button className={index === frameIndex ? 'active' : ''} key={`${item.time}-${item.phase}`} onClick={() => setFrameIndex(index)} type="button">
              <span>{item.time}</span>
              {item.phase}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

function StandingsSection({compact = false, data, loading, error}: {compact?: boolean; data: WorldCupData; loading: boolean; error: string | null}) {
  const groups = buildGroupStandings(data);
  const fallbackRows: Standing[] = data.standings.length ? data.standings : fallbackStandings;
  return (
    <section className="sp container">
      <SectionTitle icon="fa-solid fa-ranking-star">World Cup <span className="glow">Standings</span></SectionTitle>
      {loading ? <div className="glass table-card"><SkeletonTable /></div> : error ? <ErrorBox message={error} /> : groups.length ? (
        <GroupStandingsGrid groups={compact ? groups.slice(0, 3) : groups} />
      ) : fallbackRows.length ? (
        <div className="glass table-card">
          <StandingsTable standings={fallbackRows.slice(0, compact ? 12 : 48)} />
        </div>
      ) : <StateBox label="Standings will appear when group data is available." />}
    </section>
  );
}

function buildGroupStandings(data: WorldCupData): GroupStanding[] {
  const groups = new Map<string, Map<string, GroupStandingRow>>();

  const ensureTeam = (group: string, name: string, logo?: string) => {
    if (!groups.has(group)) groups.set(group, new Map());
    const groupRows = groups.get(group)!;
    if (!groupRows.has(name)) {
      groupRows.set(name, {
        rank: 0,
        team: name,
        logo,
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        points: 0,
        goalDiff: 0,
        goalsFor: 0,
        goalsAgainst: 0,
      });
    } else if (logo && !groupRows.get(name)!.logo) {
      groupRows.get(name)!.logo = logo;
    }
    return groupRows.get(name)!;
  };

  data.teams.forEach((team) => {
    if (team.group && team.group !== 'Knockout') ensureTeam(team.group, team.name, team.flag);
  });

  data.matches
    .filter((match) => match.group && match.group !== 'Knockout')
    .forEach((match) => {
      const home = ensureTeam(match.group, match.team1, match.team1Flag);
      const away = ensureTeam(match.group, match.team2, match.team2Flag);

      if (match.status !== 'Result' || typeof match.score1 !== 'number' || typeof match.score2 !== 'number') return;

      home.played += 1;
      away.played += 1;
      home.goalsFor += match.score1;
      home.goalsAgainst += match.score2;
      away.goalsFor += match.score2;
      away.goalsAgainst += match.score1;
      home.goalDiff = home.goalsFor - home.goalsAgainst;
      away.goalDiff = away.goalsFor - away.goalsAgainst;

      if (match.score1 > match.score2) {
        home.won += 1;
        away.lost += 1;
        home.points += 3;
      } else if (match.score1 < match.score2) {
        away.won += 1;
        home.lost += 1;
        away.points += 3;
      } else {
        home.drawn += 1;
        away.drawn += 1;
        home.points += 1;
        away.points += 1;
      }
    });

  return Array.from(groups.entries())
    .sort(([a], [b]) => a.localeCompare(b, undefined, {numeric: true}))
    .map(([group, rowMap]) => {
      const rows = Array.from(rowMap.values())
        .sort((a, b) => b.points - a.points || b.goalDiff - a.goalDiff || b.goalsFor - a.goalsFor || a.team.localeCompare(b.team))
        .map((row, index) => ({...row, rank: index + 1}));
      return {group, rows};
    });
}

function GroupStandingsGrid({groups}: {groups: GroupStanding[]}) {
  return (
    <div className="group-standings-grid">
      {groups.map((group) => <GroupStandingCard group={group} key={group.group} />)}
    </div>
  );
}

function GroupStandingCard({group}: {group: GroupStanding}) {
  return (
    <article className="glass group-standing-card">
      <div className="group-standing-head">
        <div>
          <span>World Cup 2026</span>
          <h3>{group.group}</h3>
        </div>
        <strong>{group.rows.reduce((total, row) => total + row.played, 0)} MP</strong>
      </div>
      <div className="group-standing-rows">
        <div className="group-standing-row group-standing-labels">
          <span>#</span><span>Team</span><span>P</span><span>GD</span><span>Pts</span>
        </div>
        {group.rows.map((row) => (
          <div className="group-standing-row" key={row.team}>
            <span className="rank-n">{row.rank}</span>
            <span className="group-team">{row.logo ? <img alt="" loading="lazy" src={row.logo} /> : null}{row.team}</span>
            <span>{row.played}</span>
            <span>{row.goalDiff > 0 ? `+${row.goalDiff}` : row.goalDiff}</span>
            <span className="pts">{row.points}</span>
          </div>
        ))}
      </div>
    </article>
  );
}

function StandingsTable({standings}: {standings: Standing[]}) {
  return (
    <table className="st-table">
      <thead>
        <tr><th>#</th><th>Team</th><th>P</th><th>W</th><th>D</th><th>L</th><th>Pts</th></tr>
      </thead>
      <tbody>
        {standings.map((row) => (
          <tr key={`${row.rank}-${row.team}`}>
            <td className="rank-n">{row.rank}</td>
            <td><div className="tm-cell">{row.logo && <img alt="" loading="lazy" src={row.logo} />}<span>{row.team}</span></div></td>
            <td>{row.played}</td><td>{row.won}</td><td>{row.drawn}</td><td>{row.lost}</td><td className="pts">{row.points}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Newsletter() {
  const [message, setMessage] = useState('');
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage('Thanks. You are on the GoalSphere update list.');
    event.currentTarget.reset();
  };
  return (
    <section className="container newsletter-section">
      <div className="nl-wrap">
        <h2>Never Miss a Goal</h2>
        <p>Daily World Cup 2026 updates, live score alerts, and tactical analysis straight to your inbox.</p>
        <form className="nl-form" onSubmit={submit}>
          <input placeholder="Your email address" required type="email" />
          <button type="submit">Subscribe Free</button>
        </form>
        {message && <p className="form-msg">{message}</p>}
      </div>
    </section>
  );
}

function HomePage({articles, liveState, worldCup, worldCupError, worldCupLoading}: {articles: Article[]; liveState: LiveMatchesState; worldCup: WorldCupData; worldCupError: string | null; worldCupLoading: boolean}) {
  return (
    <>
      <HeroSlider articles={articles} />
      <ScoresSection compact data={worldCup} error={worldCupError} liveState={liveState} loading={worldCupLoading} />
      <VideosSection limit={4} title={<>Watch Latest <span className="glow">Goals and Highlights</span></>} videos={highlightVideos} />
      <WorldCupSection articles={articles} data={worldCup} />
      <GoalRecreationSection compact />
      <HomeEditorialLayout articles={articles} />
      <StadiumPreviewBanner />
      <SocialBannersWithTimeline />
      <Newsletter />
    </>
  );
}

function WorldCup2026Page({articles, data, error, liveState, loading, streamState}: {articles: Article[]; data: WorldCupData; error: string | null; liveState: LiveMatchesState; loading: boolean; streamState: LiveStreamState}) {
  return (
    <>
      <WorldCupSection articles={articles} data={data} full />
      <WorldCupMatchdaySection data={data} error={error} liveState={liveState} loading={loading} streamState={streamState} />
      <StandingsSection data={data} error={error} loading={loading} />
      <StadiumPreviewBanner />
      <TeamsPage data={data} error={error} loading={loading} />
      <PlayersPage data={data} />
      <HostCitiesPage data={data} />
      <StadiumsPage data={data} />
      <HistoryBanner />
      <NewsSection articles={articles} title="World Cup" />
    </>
  );
}

const worldCupWinners = [
  ['1930', 'Uruguay', 'Uruguay', 'Argentina'],
  ['1934', 'Italy', 'Italy', 'Czechoslovakia'],
  ['1938', 'France', 'Italy', 'Hungary'],
  ['1950', 'Brazil', 'Uruguay', 'Brazil'],
  ['1954', 'Switzerland', 'West Germany', 'Hungary'],
  ['1958', 'Sweden', 'Brazil', 'Sweden'],
  ['1962', 'Chile', 'Brazil', 'Czechoslovakia'],
  ['1966', 'England', 'England', 'West Germany'],
  ['1970', 'Mexico', 'Brazil', 'Italy'],
  ['1974', 'West Germany', 'West Germany', 'Netherlands'],
  ['1978', 'Argentina', 'Argentina', 'Netherlands'],
  ['1982', 'Spain', 'Italy', 'West Germany'],
  ['1986', 'Mexico', 'Argentina', 'West Germany'],
  ['1990', 'Italy', 'West Germany', 'Argentina'],
  ['1994', 'United States', 'Brazil', 'Italy'],
  ['1998', 'France', 'France', 'Brazil'],
  ['2002', 'South Korea & Japan', 'Brazil', 'Germany'],
  ['2006', 'Germany', 'Italy', 'France'],
  ['2010', 'South Africa', 'Spain', 'Netherlands'],
  ['2014', 'Brazil', 'Germany', 'Argentina'],
  ['2018', 'Russia', 'France', 'Croatia'],
  ['2022', 'Qatar', 'Argentina', 'France'],
];

const successfulNations = [
  ['Brazil - 5 Titles', 'Brazil is the most successful nation in World Cup history, winning championships in 1958, 1962, 1970, 1994, and 2002. The country has produced some of football\'s greatest icons, including Pele, Ronaldo, Ronaldinho, and Neymar.'],
  ['Germany - 4 Titles', 'Germany has consistently been one of the strongest teams in international football. Known for discipline, efficiency, and tournament success, Germany has lifted the trophy four times.'],
  ['Italy - 4 Titles', 'Italy\'s football tradition is built on tactical excellence and defensive organization. The Azzurri have won four World Cups and remain one of the sport\'s most respected national teams.'],
  ['Argentina - 3 Titles', 'Argentina captured global attention through legends such as Diego Maradona and Lionel Messi. Their World Cup victories came in 1978, 1986, and 2022.'],
  ['France - 2 Titles', 'France has emerged as a modern football powerhouse, winning the World Cup in 1998 and 2018 while regularly competing at the highest level.'],
];

const legendaryPlayers = [
  ['Pele', 'Widely regarded as one of the greatest footballers of all time, Pele remains the only player to win three World Cups.'],
  ['Diego Maradona', 'The Argentine icon inspired his nation to victory in 1986 with some of the most memorable performances ever seen at the tournament.'],
  ['Zinedine Zidane', 'France\'s midfield genius led his country to World Cup glory in 1998 and became one of football\'s most admired figures.'],
  ['Ronaldo Nazario', 'The Brazilian striker dominated the early 2000s and finished as one of the greatest goal scorers in World Cup history.'],
  ['Lionel Messi', 'Messi completed his international legacy by leading Argentina to the 2022 World Cup title, adding football\'s most coveted trophy to an extraordinary career.'],
];

const greatestMoments = [
  ['Uruguay\'s Historic Victory (1930)', 'The first-ever World Cup final launched a tournament that would change global football forever.'],
  ['Pele\'s Rise (1958)', 'At just 17 years old, Pele announced himself to the world and helped Brazil secure its first title.'],
  ['England\'s Triumph (1966)', 'England lifted the trophy on home soil, winning their first and only World Cup.'],
  ['Maradona\'s Masterpiece (1986)', 'Maradona produced one of the greatest individual tournaments in football history.'],
  ['France\'s Home Glory (1998)', 'France won its first World Cup in front of home supporters.'],
  ['Spain\'s Golden Generation (2010)', 'Spain\'s possession-based football reached its peak with World Cup success in South Africa.'],
  ['Messi\'s Crowning Moment (2022)', 'Argentina defeated France in one of the greatest finals ever played, allowing Messi to finally lift the World Cup trophy.'],
];

const historyRecords = [
  'Most World Cup Titles: Brazil (5)',
  'Most Final Appearances: Germany (8)',
  'Most Goals in World Cup History: Miroslav Klose (16)',
  'Youngest World Cup Winner: Pele (17 years old)',
  'Most World Cup Appearances by a Player: Lionel Messi',
  'Largest Tournament Expansion: FIFA World Cup 2026 (48 teams)',
];

function WorldCupHistoryPage() {
  return (
    <section className="container world-cup-history-page">
      <div className="glass history-page-hero">
        <div className="eyebrow"><i className="fa-solid fa-clock-rotate-left" /> FIFA World Cup History</div>
        <h1>The Greatest Tournament in Football</h1>
        <p>
          The FIFA World Cup is the most prestigious competition in international football and one of the biggest sporting
          events on the planet. Since its first edition in 1930, the tournament has united nations, created legends, and
          produced some of the most unforgettable moments in sports history.
        </p>
        <p>
          Held every four years, the World Cup brings together the best national teams from around the globe in a quest
          for football&apos;s ultimate prize. Today, the tournament is watched by billions of fans worldwide and remains the
          dream stage for every footballer.
        </p>
      </div>

      <div className="glass history-section-card">
        <h2>Origins of the World Cup</h2>
        <p>
          The first FIFA World Cup was held in Uruguay in 1930. Thirteen teams participated, and Uruguay became the
          inaugural champions by defeating Argentina 4-2 in the final.
        </p>
        <p>
          The success of the tournament established a new era for international football. Despite interruptions caused by
          World War II, the World Cup returned stronger than ever and grew into the world&apos;s most celebrated sporting event.
        </p>
      </div>

      <div className="glass history-section-card">
        <h2>FIFA World Cup Winners</h2>
        <div className="history-table-wrap">
          <table className="history-table">
            <thead>
              <tr><th>Year</th><th>Host Nation</th><th>Champion</th><th>Runner-Up</th></tr>
            </thead>
            <tbody>
              {worldCupWinners.map(([year, host, champion, runnerUp]) => (
                <tr key={year}><td>{year}</td><td>{host}</td><td>{champion}</td><td>{runnerUp}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <HistoryInfoGrid title="Most Successful Nations" items={successfulNations} />
      <HistoryInfoGrid title="Legendary Players" items={legendaryPlayers} />
      <HistoryInfoGrid title="Greatest World Cup Moments" items={greatestMoments} />

      <div className="glass history-section-card">
        <h2>Records and Milestones</h2>
        <ul className="history-record-list">
          {historyRecords.map((record) => <li key={record}>{record}</li>)}
        </ul>
      </div>

      <div className="glass history-section-card">
        <h2>Looking Ahead to FIFA World Cup 2026</h2>
        <p>The 2026 FIFA World Cup will be the largest tournament in history.</p>
        <ul className="history-record-list">
          <li>48 national teams will participate.</li>
          <li>104 matches will be played.</li>
          <li>Three nations will host the event: United States, Canada, and Mexico.</li>
          <li>Sixteen host cities will welcome fans from around the world.</li>
        </ul>
        <p>
          The tournament represents a new chapter in football history while continuing the traditions established nearly a
          century ago.
        </p>
      </div>

      <div className="glass history-section-card history-legacy-card">
        <h2>The Legacy Continues</h2>
        <p>
          The FIFA World Cup is more than a football tournament. It is a celebration of culture, passion, and national
          pride. Every edition creates new heroes, unforgettable stories, and moments that unite billions of people across
          the globe.
        </p>
        <p>
          As the world looks ahead to 2026, the World Cup&apos;s remarkable history continues to grow, inspiring new
          generations of players and fans to dream of football&apos;s greatest stage.
        </p>
      </div>
    </section>
  );
}

function HistoryInfoGrid({items, title}: {items: string[][]; title: string}) {
  return (
    <div className="history-section-card">
      <h2>{title}</h2>
      <div className="history-info-grid">
        {items.map(([itemTitle, text]) => (
          <article className="glass history-info-card" key={itemTitle}>
            <h3>{itemTitle}</h3>
            <p>{text}</p>
          </article>
        ))}
      </div>
    </div>
  );
}

function NewsPage({articles}: {articles: Article[]}) {
  return (
    <>
      <PageHero kicker="Newsroom" title="Latest Football Stories" text="Breaking news, tactical analysis, tournament updates, and transfer intelligence from across the game." />
      <NewsSection articles={articles} title="All" />
    </>
  );
}

function ArticlesPage() {
  return (
    <>
      <PageHero
        kicker="Articles"
        title="Original Football Articles"
        text="Evergreen football explainers, tactical notes, and fan-friendly features written with clear structure, original wording, and useful context."
      />
      <section className="posts-section container articles-hub">
        <div className="section-head">
          <SectionTitle icon="fa-solid fa-pen-nib">GoalSphere <span className="glow">Articles</span></SectionTitle>
        </div>
        <div className="posts-grid">
          {siteArticles.map((article, index) => (
            <ArticleCard article={article} basePath="/articles" index={index} key={article.slug} />
          ))}
        </div>
      </section>
    </>
  );
}

function LinkedParagraph({text}: {text: string; key?: Key}) {
  const parts = text.split(/(https?:\/\/[^\s]+)/g);
  const isSectionHeading = text.length < 72 && !/[.!?]$/.test(text) && /^[A-Z0-9#]/.test(text);
  if (isSectionHeading) {
    return <h2 className="article-section-heading">{text}</h2>;
  }
  return (
    <p>
      {parts.map((part, index) => (
        part.startsWith('http') ? (
          <a href={part} key={`${part}-${index}`} rel="noreferrer" target="_blank">
            {part}
          </a>
        ) : part
      ))}
    </p>
  );
}

function ArticleBodyBlock({articleSlug, index, text}: {articleSlug: string; index: number; text: string; key?: Key}) {
  if (text.startsWith('IMAGE|')) {
    const [, src, caption = ''] = text.split('|');
    return (
      <figure className="article-inline-image">
        <img alt={caption || `Article image ${index + 1}`} loading="lazy" src={src} />
        {caption ? <figcaption>{caption}</figcaption> : null}
      </figure>
    );
  }

  if (text.startsWith('TWEET|')) {
    const [, tweetId] = text.split('|');
    return (
      <div className="article-tweet-embed">
        <iframe
          allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
          allowFullScreen
          className="x-embed-frame"
          src={`https://platform.twitter.com/embed/Tweet.html?id=${tweetId}&theme=dark&dnt=true`}
          title={`GoalSphere tweet ${tweetId}`}
        />
      </div>
    );
  }

  if (text.startsWith('VIDEO|')) {
    const [, src, poster = '', caption = ''] = text.split('|');
    return (
      <figure className="article-inline-video">
        <video controls playsInline poster={poster || undefined}>
          <source src={src} />
        </video>
        {caption ? <figcaption>{caption}</figcaption> : null}
      </figure>
    );
  }

  if (text.startsWith('IFRAME|')) {
    const [, src, title = 'GoalSphere live stream', caption = ''] = text.split('|');
    return (
      <figure className="article-inline-stream">
        <iframe
          allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
          allowFullScreen
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
          src={src}
          title={title}
        />
        {caption ? <figcaption>{caption}</figcaption> : null}
      </figure>
    );
  }

  return <LinkedParagraph key={`${articleSlug}-${index}`} text={text} />;
}

function ArticlePage({backLabel = 'Back to News', basePath = '/news', slug, articles}: {backLabel?: string; basePath?: string; slug: string; articles: Article[]}) {
  const article = articles.find((item) => item.slug === slug) || fallbackArticles.find((item) => item.slug === slug) || articles[0];
  if (!article) return <NotFound />;
  return (
    <article className="container article-page">
      <Link to={basePath} className="back-link"><i className="fa-solid fa-arrow-left" /> {backLabel}</Link>
      <div className="article-hero glass">
        <img alt={article.title} loading="lazy" onError={(event) => { event.currentTarget.src = fallbackArticleImage; }} src={article.image || fallbackArticleImage} />
        <div>
          <Badge>{article.category}</Badge>
          <h1>{article.title}</h1>
          <p>{article.description}</p>
          <div className="slide-meta"><span>{article.source}</span><span>{formatDate(article.publishedAt)}</span></div>
          <ShareLinks article={article} basePath={basePath} />
        </div>
      </div>
      <div className="article-body glass">
        <div className="article-label">
          <span><i className="fa-solid fa-newspaper" /> GoalSphere Feature</span>
          <span>{article.category}</span>
        </div>
        {article.content.split(/\n{2,}/).filter(Boolean).map((paragraph, index) => (
          <ArticleBodyBlock articleSlug={article.slug} index={index} key={`${article.slug}-${index}`} text={paragraph} />
        ))}
      </div>
    </article>
  );
}

function SearchPage({articles, data}: {articles: Article[]; data: WorldCupData}) {
  const [query, setQuery] = useState('');
  const records = [
    ...articles,
    ...siteArticles.map((article) => ({...article, slug: `/articles/${article.slug}`})),
    ...data.teams.map((team) => ({title: team.name, description: `${team.group} ${team.matches} matches`, slug: `/teams/${team.id}`, category: 'Team'})),
    ...data.players.map((player) => ({title: player.name, description: `${player.team} ${player.position}`, slug: `/players/${player.id}`, category: 'Player'})),
    ...data.stadiums.map((stadium) => ({title: stadium.name, description: `${stadium.city} ${stadium.country}`, slug: '/stadiums', category: 'Stadium'})),
  ];
  const results = records.filter((item) => `${item.title} ${item.description} ${item.category}`.toLowerCase().includes(query.toLowerCase()));
  return (
    <>
      <PageHero kicker="Search" title="Find Football Stories" text="Search articles, players, teams, and tournament coverage." />
      <section className="container sp">
        <input className="page-search" onChange={(event) => setQuery(event.target.value)} placeholder="Search GoalSphere..." value={query} />
        <div className="search-list">
          {results.map((item) => (
            <div className="glass search-list-item" key={item.slug}>
              <Badge tone="def">{item.category}</Badge>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
              <Link to={item.slug.startsWith('/') ? item.slug : `/news/${item.slug}`} className="slide-read">Open</Link>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

function TeamsPage({data, loading, error}: {data: WorldCupData; loading: boolean; error: string | null}) {
  return (
    <>
      <PageHero kicker="Teams" title="World Cup Team Tracker" text="Follow contenders, host nations, and qualification storylines before 2026." />
      <section className="sp container">
        {loading ? <SkeletonGrid count={6} /> : error ? <ErrorBox message={error} /> : data.teams.length ? (
          <div className="teams-grid">
            {data.teams.map((team) => <TeamCard key={team.id} team={team} />)}
          </div>
        ) : (
          <StateBox label="No World Cup 2026 teams available yet." />
        )}
      </section>
    </>
  );
}

function TeamCard({team}: {team: WorldCupTeam; key?: Key}) {
  return (
    <article className="glass team-card">
      <div className="team-logo-row">
        <img alt={team.name} loading="lazy" src={team.flag || `https://ui-avatars.com/api/?name=${encodeURIComponent(team.name)}&size=100&background=ffffff&color=131929&bold=true`} />
        <Badge tone="green">{team.group}</Badge>
      </div>
      <h3>{team.name}</h3>
      <p>{team.name} enters the 2026 tournament in {team.group}, with every group fixture mapped from the openfootball schedule.</p>
      <dl>
        <div><dt>Code</dt><dd>{team.code || 'TBD'}</dd></div>
        <div><dt>Matches</dt><dd>{team.matches}</dd></div>
        <div><dt>First Match</dt><dd>{team.firstMatch || 'TBD'}</dd></div>
      </dl>
      <Link to={`/teams/${team.id}`} className="slide-read">Team Page</Link>
    </article>
  );
}

function SchedulePage({data, loading, error}: {data: WorldCupData; loading: boolean; error: string | null}) {
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState('All');
  const [round, setRound] = useState('All');
  const [selectedMatch, setSelectedMatch] = useState<WorldCupMatch | null>(null);
  const groups = ['All', ...Array.from(new Set(data.matches.map((match) => match.group))).sort()];
  const rounds = ['All', ...Array.from(new Set(data.matches.map((match) => match.round)))];
  const matches = data.matches.filter((match) => {
    const haystack = `${match.team1} ${match.team2} ${match.ground} ${match.group} ${match.round}`.toLowerCase();
    return haystack.includes(query.toLowerCase()) && (group === 'All' || match.group === group) && (round === 'All' || match.round === round);
  });

  return (
    <>
      <PageHero kicker="Schedule" title="Match Schedule" text="Filter the full World Cup 2026 schedule by team, group, round, or host city." />
      <section className="sp container">
        <FilterBar query={query} setQuery={setQuery} group={group} setGroup={setGroup} groups={groups} round={round} setRound={setRound} rounds={rounds} />
        {loading ? <SkeletonGrid count={6} /> : error ? <ErrorBox message={error} /> : (
          <div className="matches-grid">{matches.map((match) => <WorldCupMatchCard key={match.id} match={match} onSelect={setSelectedMatch} />)}</div>
        )}
      </section>
      {selectedMatch && <MatchDetailsModal match={selectedMatch} onClose={() => setSelectedMatch(null)} />}
    </>
  );
}

function ResultsPage({data, loading, error}: {data: WorldCupData; loading: boolean; error: string | null}) {
  const results = data.matches.filter((match) => match.status === 'Result');
  return (
    <>
      <PageHero kicker="Results" title="World Cup Results" text="Completed matches and final scores will populate from the tournament feed." />
      <section className="sp container">
        <WorldCupMatchPanel emptyLabel="No official results yet." error={error} icon="fa-solid fa-square-poll-vertical" loading={loading} matches={results} onSelect={() => undefined} title={<>Tournament <span className="glow">Results</span></>} />
      </section>
    </>
  );
}

function FilterBar({
  group,
  groups,
  query,
  round,
  rounds,
  setGroup,
  setQuery,
  setRound,
}: {
  group: string;
  groups: string[];
  query: string;
  round: string;
  rounds: string[];
  setGroup: (value: string) => void;
  setQuery: (value: string) => void;
  setRound: (value: string) => void;
}) {
  return (
    <div className="filter-bar glass">
      <input onChange={(event) => setQuery(event.target.value)} placeholder="Search team, city, stadium..." value={query} />
      <select onChange={(event) => setGroup(event.target.value)} value={group}>
        {groups.map((item) => <option key={item}>{item}</option>)}
      </select>
      <select onChange={(event) => setRound(event.target.value)} value={round}>
        {rounds.map((item) => <option key={item}>{item}</option>)}
      </select>
    </div>
  );
}

function TeamDetailPage({slug, data}: {slug: string; data: WorldCupData}) {
  const team = data.teams.find((item) => item.id === slug);
  if (!team) return <NotFound />;
  const matches = data.matches.filter((match) => match.team1 === team.name || match.team2 === team.name);
  return (
    <>
      <PageHero kicker={team.group} title={team.name} text={`Team page for ${team.name}, including group fixtures and tournament context.`} />
      <section className="sp container">
        <div className="matches-grid">{matches.map((match) => <WorldCupMatchCard key={match.id} match={match} onSelect={() => undefined} />)}</div>
      </section>
    </>
  );
}

function PlayersPage({data: _data}: {data: WorldCupData}) {
  const shown = players.map((player) => ({
    age: 0,
    id: slugify(player.name),
    image: player.image,
    name: player.name,
    position: player.role,
    rating: player.rating,
    team: player.nation,
  }));

  return (
    <>
      <PageHero kicker="Players" title="Players to Watch" text="Featured tournament player profiles, ready to be replaced with official squad data when available." />
      <section className="sp container">
        <div className="players-grid players-scroll">{shown.map((player) => <PlayerCard key={player.id} player={player} />)}</div>
      </section>
    </>
  );
}

function PlayerCard({player}: {player: PlayerProfile; key?: Key}) {
  return (
    <article className="player-card player-cutout">
      <img alt={player.name} className={`p-avatar ${player.id === 'kylian-mbappe' ? 'p-avatar-mbappe' : ''}`} loading="lazy" src={player.image} />
      <h4>{player.name}</h4>
      <div className="p-nation">{player.team}</div>
      <p className="muted">{player.position}{player.age ? ` | Age ${player.age}` : ''}</p>
      <div className="p-stats"><div className="pstat"><span className="pstat-v">{player.rating}</span><span className="pstat-l">Rating</span></div></div>
      <Link to={`/players/${player.id}`} className="slide-read">Player Page</Link>
    </article>
  );
}

type PlayerBiographySection = {
  title: string;
  paragraphs: string[];
};

const ronaldoBiographySections: PlayerBiographySection[] = [
  {
    title: 'Cristiano Ronaldo: The Legendary Goal Machine Chasing One More World Cup Dream',
    paragraphs: [
      'Cristiano Ronaldo is one of the most iconic footballers in history. Across more than two decades at the highest level, the Portuguese superstar has broken records, won major trophies, and inspired millions of fans around the world.',
      'Known for his incredible athleticism, goal-scoring ability, leadership, and relentless determination, Ronaldo remains one of football\'s most influential figures. As the FIFA World Cup 2026 approaches, supporters continue to wonder whether the legendary forward can make one final impact on football\'s biggest stage.',
    ],
  },
  {
    title: 'Early Life and Rise to Stardom',
    paragraphs: [
      'Born on February 5, 1985, in Madeira, Portugal, Cristiano Ronaldo showed exceptional talent from a young age. He joined Sporting CP\'s academy before making his professional debut as a teenager.',
      'His breakthrough came in 2003 when he signed for Manchester United. Under the guidance of Sir Alex Ferguson, Ronaldo developed into one of the world\'s most exciting young players. His pace, dribbling skills, and eye for goal quickly made him a fan favorite.',
      'By 2008, Ronaldo had won his first Ballon d\'Or after helping Manchester United secure major domestic and European titles.',
    ],
  },
  {
    title: 'Club Career Success',
    paragraphs: [
      'Ronaldo\'s first spell at Manchester United transformed him from a promising talent into a global superstar. He won multiple Premier League titles, domestic cups, and the UEFA Champions League.',
      'In 2009, Ronaldo joined Real Madrid in a record-breaking transfer. During his time in Spain, he established himself as one of the greatest players of all time, winning four UEFA Champions League titles, two La Liga titles, multiple Club World Cups, and scoring hundreds of goals across all competitions.',
      'After leaving Spain, Ronaldo continued his success in Italy with Juventus, helping the club win domestic trophies while maintaining an extraordinary scoring record. His return to Manchester United in 2021 showed that his goal-scoring instincts remained sharp, and his later move to Saudi Arabia opened a new chapter while expanding football\'s popularity in the region.',
    ],
  },
  {
    title: 'Portugal Career',
    paragraphs: [
      'Cristiano Ronaldo\'s international journey has been equally remarkable. For many years, he has served as Portugal\'s captain and leader, guiding the national team through multiple generations of players.',
      'His major achievements include winning the UEFA European Championship in 2016, lifting the UEFA Nations League, becoming Portugal\'s all-time leading scorer, and setting records for the most international goals and appearances in men\'s football history.',
      'Ronaldo\'s impact on Portuguese football is unmatched, helping transform the nation into a consistent contender at major tournaments.',
    ],
  },
  {
    title: 'World Cup Journey',
    paragraphs: [
      'Ronaldo played in his first FIFA World Cup in Germany 2006 as a young star and helped Portugal reach the semi-finals. In South Africa 2010, Portugal advanced from the group stage as Ronaldo continued to establish himself among football\'s elite players.',
      'Brazil 2014 was difficult as Ronaldo battled injuries in a challenging group, but he remained Portugal\'s key figure. In Russia 2018, one of his greatest World Cup moments came against Spain, where he scored a stunning hat-trick in a thrilling 3-3 draw.',
      'At Qatar 2022, Ronaldo became one of the few players to participate in five World Cups. Portugal reached the quarter-finals before being eliminated by Morocco.',
    ],
  },
  {
    title: 'What Makes Ronaldo Special?',
    paragraphs: [
      'Few players in football history have scored goals with such consistency. Ronaldo has delivered in league matches, cup finals, European competitions, and international tournaments.',
      'Even in the later stages of his career, Ronaldo remains known for his fitness, strength, speed, and aerial ability. As captain, he has inspired teammates through his competitive mindset and determination to succeed.',
      'Perhaps his greatest strength is his mentality. Throughout his career, Ronaldo has constantly challenged himself to improve and compete at the highest level.',
    ],
  },
  {
    title: 'Records and Achievements',
    paragraphs: [
      'Cristiano Ronaldo has set numerous records, including most international goals in men\'s football, most international appearances in men\'s football, and the UEFA Champions League all-time scoring record.',
      'He is one of the highest goal scorers in football history, a multiple Ballon d\'Or winner, a league champion in England, Spain, and Italy, and a European Championship winner with Portugal.',
      'His collection of individual and team achievements places him among the greatest players the sport has ever seen.',
    ],
  },
  {
    title: 'Can Ronaldo Play at the 2026 World Cup?',
    paragraphs: [
      'One of the biggest questions in world football is whether Cristiano Ronaldo will feature at the FIFA World Cup 2026. If selected, he could become one of the oldest outfield players ever to compete in the tournament.',
      'While age presents challenges, Ronaldo\'s commitment to fitness and professional preparation makes the possibility realistic. Portugal also possesses a talented squad filled with experienced stars and emerging young players, giving the nation hope of making a deep tournament run.',
    ],
  },
  {
    title: 'Ronaldo\'s Legacy',
    paragraphs: [
      'Cristiano Ronaldo\'s legacy extends far beyond goals and trophies. He has inspired generations of footballers through his work ethic, ambition, and desire to achieve greatness.',
      'Whether or not he plays a major role in World Cup 2026, his place among football\'s all-time legends is already secure. For millions of fans around the world, Ronaldo represents dedication, excellence, and the belief that hard work can turn dreams into reality.',
    ],
  },
  {
    title: 'Looking Ahead',
    paragraphs: [
      'As football moves closer to FIFA World Cup 2026, Cristiano Ronaldo remains one of the sport\'s most recognizable figures. Every appearance attracts global attention, and every goal adds another chapter to an extraordinary career.',
      'The road to 2026 may offer one final opportunity for the Portuguese icon to shine on football\'s biggest stage and continue a story that has already become legendary.',
    ],
  },
];

const lamineYamalBiographySections: PlayerBiographySection[] = [
  {
    title: 'Lamine Yamal: Spain\'s Teenage Superstar Ready to Shine at the 2026 World Cup',
    paragraphs: [
      'At an age when most footballers are still developing in youth academies, Lamine Yamal has already become one of the biggest stars in world football. The Barcelona and Spain winger has broken countless records, won major trophies, and established himself as one of the most exciting young talents the game has ever seen.',
      'As the FIFA World Cup 2026 approaches, Yamal is expected to be one of the key players leading Spain\'s challenge for football\'s biggest prize.',
    ],
  },
  {
    title: 'Early Life and Background',
    paragraphs: [
      'Lamine Yamal was born on July 13, 2007, in Esplugues de Llobregat, Spain. He joined Barcelona\'s famous La Masia academy at a young age and quickly stood out as one of the club\'s brightest prospects.',
      'Coaches recognized his exceptional technical ability, creativity, and confidence on the ball long before he reached the first team. His rapid rise through Barcelona\'s youth ranks made him one of the most talked-about young players in Europe.',
    ],
  },
  {
    title: 'Barcelona Breakthrough',
    paragraphs: [
      'In April 2023, Yamal made his first-team debut for Barcelona at just 15 years old, becoming the youngest player to appear for the club\'s senior team. His combination of dribbling, vision, acceleration, and composure immediately caught the attention of football fans around the world.',
      'Since then, he has become a regular starter and one of Barcelona\'s most influential attacking players. His strengths include exceptional dribbling ability, creative passing and chance creation, intelligent movement between defensive lines, a dangerous left foot, and the ability to perform in high-pressure matches.',
      'Many analysts consider him one of the most naturally gifted attacking players of his generation.',
    ],
  },
  {
    title: 'Success with Spain',
    paragraphs: [
      'Yamal\'s impact has not been limited to club football. He became Spain\'s youngest-ever international player and youngest-ever goalscorer shortly after making his senior debut.',
      'His performances helped establish Spain as one of the strongest national teams in Europe. The young winger played a major role in Spain\'s UEFA Euro 2024 triumph and was named the tournament\'s Best Young Player after a series of outstanding performances.',
    ],
  },
  {
    title: 'Playing Style',
    paragraphs: [
      'Lamine Yamal is often deployed as a right winger, cutting inside onto his stronger left foot. However, his versatility allows him to play across multiple attacking positions.',
      'What makes him special is his ability to combine flair with efficiency. While many young attackers rely solely on skill moves, Yamal consistently makes intelligent decisions in the final third.',
      'His game is built around quick changes of direction, close ball control, creative passing, long-range shooting, one-on-one ability, and tactical awareness. Despite his age, he plays with the confidence of a seasoned professional.',
    ],
  },
  {
    title: 'Records and Achievements',
    paragraphs: [
      'By the age of 18, Yamal had already achieved milestones that many players never reach during their entire careers.',
      'His highlights include becoming the youngest player to debut for Barcelona\'s first team, the youngest player to score for Spain, the youngest player to appear at a European Championship, and the youngest goalscorer in UEFA European Championship history.',
      'He is also a UEFA Euro 2024 champion, the Euro 2024 Young Player of the Tournament, and a winner of multiple domestic trophies with Barcelona. His rapid rise has drawn comparisons with some of football\'s all-time greats.',
    ],
  },
  {
    title: 'Why He Matters for World Cup 2026',
    paragraphs: [
      'Spain enters the 2026 FIFA World Cup as one of the tournament favorites, and Lamine Yamal is expected to be one of their most important players. Football experts regularly include him among the young stars most likely to shape the competition.',
      'His ability to unlock defenses, create chances, and deliver decisive moments could be crucial for Spain\'s ambitions. Many supporters believe he has the talent to become one of the standout performers of the entire tournament.',
      'Community discussions among football fans frequently mention him as a leading candidate for major individual awards at the World Cup.',
    ],
  },
  {
    title: 'The Future of Football',
    paragraphs: [
      'Few players have generated as much excitement at such a young age as Lamine Yamal. He has already established himself as a key player for both Barcelona and Spain, while continuing to improve every season.',
      'Whether it is a spectacular dribble, a defense-splitting pass, or a match-winning goal, Yamal consistently demonstrates qualities associated with football\'s elite.',
      'As the road to FIFA World Cup 2026 continues, the Spanish wonderkid represents not only the future of his country but also one of the brightest talents in world football.',
    ],
  },
  {
    title: 'Quick Facts',
    paragraphs: [
      'Full Name: Lamine Yamal Nasraoui Ebana. Date of Birth: July 13, 2007. Nationality: Spain. Position: Right Winger / Forward. Club: FC Barcelona. National Team: Spain national football team. Strong Foot: Left.',
      'Major International Honor: UEFA Euro 2024 Champion and Young Player of the Tournament.',
      'GoalSphere Verdict: Lamine Yamal enters World Cup 2026 as one of the most exciting players on the planet. If Spain makes a deep run in the tournament, expect the teenage sensation to be at the center of the story.',
    ],
  },
];

const messiBiographySections: PlayerBiographySection[] = [
  {
    title: 'Lionel Messi: The Football Genius Still Chasing History at the 2026 World Cup',
    paragraphs: [
      'Few athletes have transformed their sport the way Lionel Messi has transformed football. Widely regarded as one of the greatest players of all time, the Argentine superstar has spent more than two decades dazzling fans with his extraordinary dribbling, vision, creativity, and goal-scoring ability.',
      'From his early days at Barcelona to leading Argentina to FIFA World Cup glory in 2022, Messi has built a legacy that few players can match. Yet as the road to FIFA World Cup 2026 continues, the football world still wonders whether one more historic chapter remains to be written.',
    ],
  },
  {
    title: 'Early Life and Childhood',
    paragraphs: [
      'Lionel Andres Messi was born on June 24, 1987, in Rosario, Argentina. From a young age, he displayed remarkable football talent, often playing against older children and standing out because of his exceptional ball control.',
      'At age 11, Messi was diagnosed with a growth hormone deficiency. The treatment was expensive, and his family faced uncertainty about his future. Everything changed when FC Barcelona offered him an opportunity to join their academy and support his medical treatment.',
      'That decision would change football history forever.',
    ],
  },
  {
    title: 'The Barcelona Era',
    paragraphs: [
      'Messi joined Barcelona\'s famous La Masia academy and quickly progressed through the youth system. After making his first-team debut in 2004, he became the centerpiece of one of the greatest football teams ever assembled.',
      'During his time at Barcelona, Messi won 10 La Liga titles, 7 Copa del Rey titles, 4 UEFA Champions League titles, 3 FIFA Club World Cups, and multiple domestic and international trophies.',
      'He also became Barcelona\'s all-time leading scorer and one of the most decorated players in football history. His partnership with players such as Xavi, Andres Iniesta, and Sergio Busquets helped define an era of dominance.',
    ],
  },
  {
    title: 'New Challenges Abroad',
    paragraphs: [
      'After leaving Barcelona in 2021, Messi joined Paris Saint-Germain, where he added further domestic titles to his collection.',
      'In 2023, he moved to Inter Miami in Major League Soccer, helping increase football\'s popularity in North America and attracting worldwide attention to the league.',
      'His arrival in the United States also created additional excitement ahead of the FIFA World Cup 2026, which will be hosted by the United States, Canada, and Mexico.',
    ],
  },
  {
    title: 'International Success with Argentina',
    paragraphs: [
      'For many years, critics questioned Messi\'s international record despite his brilliance at club level. That narrative changed dramatically.',
      'Messi led Argentina to victories in Copa America 2021, Finalissima 2022, and FIFA World Cup 2022.',
      'The World Cup triumph in Qatar completed one of football\'s greatest careers and fulfilled a lifelong dream for both Messi and millions of Argentine supporters.',
    ],
  },
  {
    title: 'World Cup Journey',
    paragraphs: [
      'Messi made his World Cup debut as a teenager in Germany 2006 and immediately impressed with a goal and an assist against Serbia and Montenegro. In South Africa 2010, Argentina reached the quarter-finals before elimination against Germany.',
      'Brazil 2014 brought one of the finest tournaments of Messi\'s career. He led Argentina to the final and won the Golden Ball as the tournament\'s best player. In Russia 2018, Argentina struggled for consistency and exited in the Round of 16 against eventual champions France.',
      'Qatar 2022 became the defining moment of Messi\'s career. He scored seven goals, delivered crucial assists, and inspired Argentina to an unforgettable World Cup victory after a dramatic final against France. Many consider it one of the greatest individual World Cup campaigns ever seen.',
    ],
  },
  {
    title: 'Playing Style',
    paragraphs: [
      'Lionel Messi is often described as football\'s ultimate playmaker and attacker. His strengths include world-class dribbling, exceptional passing range, vision and creativity, clinical finishing, free-kick accuracy, and tactical intelligence.',
      'What separates Messi from many great players is his ability to influence every aspect of the game.',
      'He can create chances, score goals, control tempo, and unlock defenses with a single moment of brilliance.',
    ],
  },
  {
    title: 'Records and Achievements',
    paragraphs: [
      'Messi\'s list of achievements is extraordinary. Among his most notable accomplishments are winning the FIFA World Cup, multiple Copa America titles, and a record number of Ballon d\'Or awards.',
      'He is Barcelona\'s all-time leading scorer, Argentina\'s all-time leading scorer, the player with the most World Cup appearances, and one of football\'s all-time leading assist providers.',
      'His collection of trophies and individual awards places him among the greatest athletes in sporting history.',
    ],
  },
  {
    title: 'Can Messi Play at the 2026 World Cup?',
    paragraphs: [
      'One of the biggest questions in football is whether Lionel Messi will participate in FIFA World Cup 2026. By the time the tournament begins, Messi will be 39 years old.',
      'While age presents challenges, his intelligence, technical quality, and ability to influence matches mean he could still play an important role.',
      'Argentina remains one of the strongest national teams in the world, with emerging stars such as Enzo Fernandez, Julian Alvarez, Alejandro Garnacho, and others supporting an experienced core. If Messi chooses to continue, he could become one of the few players ever to appear in six FIFA World Cups.',
    ],
  },
  {
    title: 'Messi\'s Legacy',
    paragraphs: [
      'Statistics tell only part of the story. Lionel Messi inspired millions through his humility, consistency, and extraordinary talent. His influence extends beyond trophies and records.',
      'For many football fans, Messi represents the beauty of the sport itself: creativity, imagination, teamwork, and joy.',
      'Whether he plays another World Cup or not, his place among football\'s greatest legends is already secure.',
    ],
  },
  {
    title: 'Looking Ahead to 2026',
    paragraphs: [
      'The FIFA World Cup 2026 could provide one final opportunity for Lionel Messi to perform on football\'s biggest stage.',
      'Argentina enters the tournament among the contenders, and supporters around the world will be watching closely to see whether the legendary captain can help write another unforgettable chapter in World Cup history.',
      'No matter what happens, Lionel Messi\'s story has already become one of the most remarkable journeys the game has ever witnessed.',
    ],
  },
  {
    title: 'Quick Facts',
    paragraphs: [
      'Full Name: Lionel Andres Messi. Date of Birth: June 24, 1987. Nationality: Argentina. Position: Forward / Attacking Midfielder. Club: Inter Miami CF. National Team: Argentina. Strong Foot: Left.',
      'Major Achievement: FIFA World Cup Champion (2022).',
      'GoalSphere Verdict: Lionel Messi has already conquered football, but the possibility of one final World Cup appearance makes him one of the most fascinating players to follow on the road to FIFA World Cup 2026.',
    ],
  },
];

const neymarBiographySections: PlayerBiographySection[] = [
  {
    title: 'Neymar Jr.: Brazil\'s Entertainer Still Dreaming of World Cup Glory',
    paragraphs: [
      'Neymar Jr. is one of the most gifted footballers of his generation. Known for his dazzling dribbling, creativity, flair, and eye for spectacular goals, the Brazilian superstar has captivated football fans around the world since his teenage years.',
      'Throughout his career, Neymar has won major trophies, broken records, and become one of Brazil\'s most recognizable athletes. Despite his many achievements, one dream remains unfinished: lifting the FIFA World Cup trophy with Brazil.',
      'As the countdown to FIFA World Cup 2026 continues, Neymar remains a player capable of influencing the biggest matches on football\'s grandest stage.',
    ],
  },
  {
    title: 'Early Life and Rise in Brazil',
    paragraphs: [
      'Neymar da Silva Santos Junior was born on February 5, 1992, in Mogi das Cruzes, Sao Paulo, Brazil.',
      'From a young age, he displayed extraordinary technical ability and quickly became one of the brightest prospects in Brazilian football. He joined Santos FC\'s youth academy and soon drew comparisons to legendary Brazilian stars who had worn the club\'s famous shirt before him.',
      'By his late teens, Neymar had become one of South America\'s most exciting talents, attracting attention from the biggest clubs in Europe.',
    ],
  },
  {
    title: 'Santos: The Beginning of a Superstar',
    paragraphs: [
      'At Santos, Neymar developed into a global sensation. His performances helped the club win major domestic titles and the Copa Libertadores, South America\'s most prestigious club competition.',
      'Fans were drawn to his explosive pace, incredible dribbling, creative flair, goal-scoring instinct, and confidence in one-on-one situations.',
      'Neymar\'s highlights at Santos quickly spread across the football world and made him one of the most sought-after young players on the planet.',
    ],
  },
  {
    title: 'Barcelona and the Famous MSN Era',
    paragraphs: [
      'In 2013, Neymar joined Barcelona and formed one of football\'s most iconic attacking trios alongside Lionel Messi and Luis Suarez. The trio became known as MSN and terrorized defenses across Europe.',
      'During his time at Barcelona, Neymar won the UEFA Champions League, La Liga titles, Copa del Rey titles, and the FIFA Club World Cup.',
      'One of the most memorable moments of his Barcelona career came during the historic comeback against Paris Saint-Germain, when Barcelona overturned a 4-0 first-leg deficit to win the tie 6-5 on aggregate.',
    ],
  },
  {
    title: 'Record Transfer to Paris Saint-Germain',
    paragraphs: [
      'In 2017, Neymar moved to Paris Saint-Germain in a world-record transfer. At PSG, he continued to showcase his talent while helping the club dominate French football.',
      'His achievements included multiple Ligue 1 titles, domestic cup victories, and a UEFA Champions League Final appearance.',
      'Despite injuries interrupting several seasons, Neymar remained one of the most productive attackers in world football.',
    ],
  },
  {
    title: 'International Career with Brazil',
    paragraphs: [
      'Neymar has been the face of Brazilian football for more than a decade. Representing one of football\'s most successful nations comes with enormous expectations, and Neymar has consistently delivered memorable performances for the Selecao.',
      'His international achievements include an Olympic Gold Medal in 2016, the FIFA Confederations Cup, Brazil\'s all-time goalscoring record, and multiple Copa America and World Cup appearances.',
      'He surpassed several Brazilian legends to become the country\'s highest-scoring player in international football.',
    ],
  },
  {
    title: 'World Cup Journey',
    paragraphs: [
      'Neymar was not selected for Brazil\'s South Africa 2010 squad, a decision that sparked debate among supporters and football experts.',
      'At Brazil 2014, he became the host nation\'s main star and scored crucial goals before suffering an injury in the quarter-finals that ended his tournament. Many fans believe Brazil\'s hopes of winning the title disappeared when Neymar was ruled out.',
      'In Russia 2018, Neymar entered the tournament as one of football\'s biggest names, but Brazil were eliminated by Belgium in the quarter-finals. At Qatar 2022, he produced several important performances before Brazil suffered a dramatic quarter-final exit against Croatia.',
    ],
  },
  {
    title: 'Playing Style',
    paragraphs: [
      'Neymar is widely regarded as one of the most entertaining footballers of the modern era. His strengths include elite dribbling ability, exceptional creativity, vision and passing, finishing inside and outside the box, quick acceleration, and set-piece quality.',
      'At his best, Neymar can change a match with a single moment of brilliance.',
      'His style reflects the traditional Brazilian football philosophy of skill, imagination, and attacking flair.',
    ],
  },
  {
    title: 'Records and Achievements',
    paragraphs: [
      'Neymar\'s career has been filled with remarkable accomplishments. Among his most notable achievements are becoming Brazil\'s all-time leading goalscorer, winning the UEFA Champions League, earning an Olympic Gold Medal, and lifting the Copa Libertadores.',
      'He has also won multiple league titles in Spain and France and is one of the highest-scoring Brazilian players in football history.',
      'His influence on the game extends beyond statistics, inspiring a new generation of players around the world.',
    ],
  },
  {
    title: 'Can Neymar Play at the 2026 World Cup?',
    paragraphs: [
      'As Brazil prepares for FIFA World Cup 2026, many fans hope Neymar will be part of the squad. By the time the tournament begins, he will be 34 years old, an age at which many elite players can still compete at the highest level.',
      'Brazil also possesses an exciting group of younger stars, including Vinicius Junior, Rodrygo, Endrick, Gabriel Martinelli, and Savinho.',
      'Neymar\'s experience and leadership could prove invaluable as Brazil pursues a sixth World Cup title.',
    ],
  },
  {
    title: 'Neymar\'s Legacy',
    paragraphs: [
      'Few players have combined skill, entertainment, and effectiveness quite like Neymar. His highlights, goals, and creativity have delighted football fans for more than a decade.',
      'Although injuries have sometimes limited his opportunities, Neymar remains one of the defining footballers of his era and one of Brazil\'s greatest modern players.',
      'Winning the FIFA World Cup would elevate his legacy even further and complete an already extraordinary career.',
    ],
  },
  {
    title: 'Looking Ahead to 2026',
    paragraphs: [
      'The road to FIFA World Cup 2026 may offer Neymar one final chance to achieve his biggest international ambition.',
      'Brazil enters every World Cup as a contender, and supporters across the globe will be eager to see whether Neymar can help guide the Selecao back to the top of world football.',
      'Regardless of what happens, his place among football\'s most talented and entertaining players is already secure.',
    ],
  },
  {
    title: 'Quick Facts',
    paragraphs: [
      'Full Name: Neymar da Silva Santos Junior. Date of Birth: February 5, 1992. Nationality: Brazil. Position: Forward / Winger / Attacking Midfielder. Club: Santos FC. National Team: Brazil. Strong Foot: Right.',
      'Major Achievement: Brazil\'s All-Time Leading Goalscorer.',
      'GoalSphere Verdict: Neymar remains one of football\'s biggest stars and one of the most exciting players to watch on the road to FIFA World Cup 2026. If fully fit and motivated, he could still play a decisive role in Brazil\'s quest for another world title.',
    ],
  },
];

const mbappeBiographySections: PlayerBiographySection[] = [
  {
    title: 'Kylian Mbappe: France\'s World Cup Superstar Chasing Football Immortality',
    paragraphs: [
      'Kylian Mbappe has already achieved more than most footballers could dream of in an entire career. Blessed with extraordinary speed, clinical finishing, and a fearless mentality, the French forward has become one of the defining players of modern football.',
      'From winning the FIFA World Cup as a teenager to becoming one of the sport\'s biggest global icons, Mbappe continues to set new standards for excellence. As the countdown to FIFA World Cup 2026 begins, many believe he could be the player most likely to dominate the tournament.',
    ],
  },
  {
    title: 'Early Life and Football Beginnings',
    paragraphs: [
      'Kylian Mbappe Lottin was born on December 20, 1998, in Bondy, a suburb of Paris, France.',
      'Football was part of his life from the beginning. His father worked as a football coach, while his mother was a professional handball player. Growing up in a sporting environment helped shape his competitive mindset and ambition.',
      'Mbappe quickly stood out in youth football thanks to his explosive pace, technical skill, and natural goal-scoring ability. By his mid-teens, Europe\'s biggest clubs were already monitoring his development.',
    ],
  },
  {
    title: 'Monaco: The Breakthrough',
    paragraphs: [
      'Mbappe\'s professional journey began at AS Monaco. During the 2016-17 season, he became one of the most exciting young players in Europe.',
      'His goals helped Monaco win the French league title and reach the UEFA Champions League semi-finals.',
      'His performances attracted worldwide attention and confirmed that a future superstar had arrived.',
    ],
  },
  {
    title: 'Paris Saint-Germain Era',
    paragraphs: [
      'In 2017, Mbappe joined Paris Saint-Germain and quickly became one of the club\'s most important players.',
      'At PSG, he won numerous domestic trophies while consistently ranking among Europe\'s top scorers. His achievements included multiple Ligue 1 titles, domestic cup victories, a UEFA Champions League Final appearance, and several Golden Boot awards in France.',
      'Mbappe\'s ability to decide matches in crucial moments made him one of football\'s most feared attackers.',
    ],
  },
  {
    title: 'A New Challenge at Real Madrid',
    paragraphs: [
      'After establishing himself as one of the world\'s elite players, Mbappe began a new chapter by joining Real Madrid.',
      'The move placed him at one of football\'s most successful clubs and provided another stage to compete for the biggest trophies in world football.',
      'Supporters expect him to become one of the key figures in the next generation of Real Madrid stars.',
    ],
  },
  {
    title: 'International Career with France',
    paragraphs: [
      'Mbappe\'s impact on international football has been extraordinary. He made his senior debut for France as a teenager and quickly became one of the national team\'s most important players.',
      'His major achievements include winning the FIFA World Cup in 2018, finishing as World Cup runner-up in 2022, winning the UEFA Nations League, and earning multiple major tournament awards.',
      'His performances have helped France remain among the strongest teams in world football.',
    ],
  },
  {
    title: 'World Cup Journey',
    paragraphs: [
      'At Russia 2018, Mbappe became one of the stars of the tournament at just 19 years old. His pace caused problems for every defense he faced, and he scored in the final as France defeated Croatia to lift the World Cup trophy.',
      'At Qatar 2022, Mbappe elevated his game to another level. He finished as the tournament\'s top scorer and produced one of the greatest performances in World Cup final history, scoring a remarkable hat-trick against Argentina.',
      'Although France narrowly lost on penalties, Mbappe left the tournament as one of its biggest stars.',
    ],
  },
  {
    title: 'Playing Style',
    paragraphs: [
      'Kylian Mbappe is widely regarded as one of the most complete attackers in football. His strengths include exceptional acceleration, elite finishing, intelligent movement, one-on-one ability, clinical counter-attacking play, and composure in big matches.',
      'Few players combine speed and technical quality as effectively as Mbappe.',
      'His ability to create and score goals makes him a constant threat against any opponent.',
    ],
  },
  {
    title: 'Records and Achievements',
    paragraphs: [
      'Mbappe has already collected an impressive list of accomplishments, including the FIFA World Cup, the FIFA World Cup Golden Boot, multiple Ligue 1 titles, and the UEFA Nations League.',
      'He is one of France\'s all-time leading goalscorers, the youngest French player to score in a World Cup, and one of the highest-scoring players in World Cup history before turning 25.',
      'Many football experts believe he is on course to become one of the greatest players the sport has ever seen.',
    ],
  },
  {
    title: 'Why Mbappe Could Dominate World Cup 2026',
    paragraphs: [
      'When FIFA World Cup 2026 begins, Mbappe will be entering what many consider the peak years of a footballer\'s career.',
      'France possesses an outstanding squad filled with talent across every position, including established stars and emerging young players.',
      'Mbappe\'s experience, leadership, pace, goal-scoring instinct, and big-match mentality could make him one of the favorites to win individual awards and lead France deep into the tournament. Many analysts already view him as a leading candidate for both the Golden Boot and Golden Ball.',
    ],
  },
  {
    title: 'Mbappe\'s Legacy',
    paragraphs: [
      'Although still relatively young, Mbappe has already built a legacy that most players can only dream about.',
      'He has won the World Cup, played in two World Cup finals, scored in World Cup finals, broken numerous records, and become one of football\'s most recognizable stars.',
      'Yet his ambition suggests he is far from finished. The possibility of adding another World Cup title could elevate him into an even higher category among football\'s all-time greats.',
    ],
  },
  {
    title: 'Looking Ahead to 2026',
    paragraphs: [
      'The FIFA World Cup 2026 may become the defining tournament of Kylian Mbappe\'s career.',
      'Already a champion, already a global superstar, and still improving, he enters the competition as one of the most dangerous players on the planet.',
      'For France, he represents the leader of a new generation. For football fans, he represents one of the most exciting talents of the modern era. For opponents, he remains the player they fear most when the biggest matches arrive.',
    ],
  },
  {
    title: 'Quick Facts',
    paragraphs: [
      'Full Name: Kylian Mbappe Lottin. Date of Birth: December 20, 1998. Nationality: France. Position: Forward / Winger. Club: Real Madrid. National Team: France. Strong Foot: Right.',
      'Major Achievement: FIFA World Cup Champion (2018).',
      'GoalSphere Verdict: Kylian Mbappe enters FIFA World Cup 2026 as one of the tournament\'s biggest stars. With his speed, experience, and goal-scoring ability, he could be the player who defines the next chapter of World Cup history.',
    ],
  },
];

const haalandBiographySections: PlayerBiographySection[] = [
  {
    title: 'Erling Haaland: Norway\'s Goal Machine Ready for the World Cup Spotlight',
    paragraphs: [
      'Erling Haaland has become one of the most feared strikers in world football. Known for his incredible strength, explosive speed, intelligent movement, and ruthless finishing, the Norwegian superstar has shattered scoring records across Europe and established himself as one of the game\'s elite forwards.',
      'Despite his remarkable success at club level, Haaland has yet to experience the FIFA World Cup. As Norway fights for qualification, World Cup 2026 could finally provide the stage many fans believe he deserves.',
    ],
  },
  {
    title: 'Early Life and Football Roots',
    paragraphs: [
      'Erling Braut Haaland was born on July 21, 2000, in Leeds, England, while his father, Alf-Inge Haaland, was playing professional football in the Premier League.',
      'Raised in Norway, Haaland quickly developed a passion for football and displayed exceptional athletic ability from a young age. His combination of physical power and technical skill helped him stand out among his peers.',
      'By his teenage years, scouts across Europe had already identified him as one of football\'s brightest young talents.',
    ],
  },
  {
    title: 'The Rise Through European Football',
    paragraphs: [
      'Haaland began his professional career with Norwegian club Molde, where he worked under former Manchester United striker Ole Gunnar Solskjaer. His performances attracted attention from clubs across Europe.',
      'The striker\'s breakthrough came in Austria with Red Bull Salzburg. His goals in domestic competitions and the UEFA Champions League announced his arrival on the international stage.',
      'One memorable performance saw him score a hat-trick on his Champions League debut, immediately becoming one of Europe\'s most talked-about players.',
    ],
  },
  {
    title: 'Borussia Dortmund',
    paragraphs: [
      'In January 2020, Haaland joined Borussia Dortmund and continued his incredible scoring rate.',
      'He became known for powerful finishing, exceptional positioning, clinical counter-attacking ability, and dominance inside the penalty area.',
      'His performances in Germany confirmed that he was among the best young strikers in the world.',
    ],
  },
  {
    title: 'Manchester City Success',
    paragraphs: [
      'Haaland\'s move to Manchester City elevated his career to another level. Under Pep Guardiola, he became the focal point of one of the strongest teams in world football.',
      'His achievements at Manchester City include Premier League titles, a UEFA Champions League triumph, domestic cup victories, and multiple scoring records.',
      'In his first Premier League season, Haaland broke the record for the most goals scored in a single campaign, further cementing his reputation as football\'s most prolific striker.',
    ],
  },
  {
    title: 'International Career with Norway',
    paragraphs: [
      'While Haaland has enjoyed enormous club success, international football has presented a different challenge. Norway has often found qualification for major tournaments difficult despite possessing talented players.',
      'Alongside captain Martin Odegaard and a new generation of emerging stars, Haaland is leading Norway\'s efforts to return to football\'s biggest competitions.',
      'For Norwegian supporters, qualifying for FIFA World Cup 2026 would represent a historic achievement.',
    ],
  },
  {
    title: 'Playing Style',
    paragraphs: [
      'Erling Haaland combines the qualities of a traditional center-forward with the athleticism of a modern attacker.',
      'His strengths include powerful finishing with both feet, outstanding pace for his size, aerial dominance, intelligent movement, physical strength, and clinical finishing inside the box.',
      'What makes Haaland unique is his ability to score in almost every situation. Whether through counter-attacks, crosses, set pieces, or long balls, he consistently finds ways to put the ball in the net.',
    ],
  },
  {
    title: 'Records and Achievements',
    paragraphs: [
      'Despite his relatively young age, Haaland has already accumulated an impressive list of accomplishments.',
      'Career highlights include winning the UEFA Champions League, becoming a Premier League champion, earning multiple Golden Boot awards, holding the Premier League single-season scoring record, reaching Champions League scoring milestones at a young age, and becoming Norway\'s leading attacking star.',
      'Many football analysts consider him one of the most complete strikers of the modern era.',
    ],
  },
  {
    title: 'Why World Cup 2026 Matters',
    paragraphs: [
      'The FIFA World Cup remains one of the few major achievements missing from Haaland\'s career. For years, football fans have wanted to see him compete against the world\'s best national teams on the biggest stage.',
      'If Norway qualifies, Haaland could become one of the tournament\'s most dangerous players.',
      'His combination of strength, speed, finishing, and big-match experience would make him a nightmare for defenders throughout the competition.',
    ],
  },
  {
    title: 'Norway\'s World Cup Ambitions',
    paragraphs: [
      'Norway possesses one of its most talented generations in decades, with key players such as Erling Haaland, Martin Odegaard, Alexander Sorloth, Oscar Bobb, and Antonio Nusa.',
      'The team has shown significant improvement in recent years and hopes to secure qualification for the expanded 48-team FIFA World Cup 2026.',
      'The new tournament format gives Norway its best opportunity in many years to return to the global stage.',
    ],
  },
  {
    title: 'Haaland\'s Legacy',
    paragraphs: [
      'Although his career is still unfolding, Haaland has already changed expectations for modern strikers.',
      'His remarkable consistency and record-breaking performances have made him one of football\'s biggest stars.',
      'Many believe he could finish his career among the greatest goal scorers in football history. Success at a World Cup would elevate his legacy even further.',
    ],
  },
  {
    title: 'Looking Ahead to 2026',
    paragraphs: [
      'The FIFA World Cup 2026 could mark a historic moment for both Erling Haaland and Norway.',
      'For Haaland, it would provide an opportunity to showcase his talent on football\'s biggest stage. For Norway, it would signal the return of a proud football nation to the world\'s premier tournament.',
      'If qualification is secured, expect Haaland to enter the competition as one of the most dangerous forwards and one of the leading contenders for the Golden Boot.',
    ],
  },
  {
    title: 'Quick Facts',
    paragraphs: [
      'Full Name: Erling Braut Haaland. Date of Birth: July 21, 2000. Nationality: Norway. Position: Striker. Club: Manchester City. National Team: Norway. Strong Foot: Left.',
      'Major Achievement: UEFA Champions League Winner.',
      'GoalSphere Verdict: Erling Haaland is one of the most complete strikers in modern football. If Norway reaches FIFA World Cup 2026, the Manchester City star could become one of the tournament\'s biggest attractions and a serious contender for the Golden Boot.',
    ],
  },
];

function PlayerDetailPage({slug, data}: {slug: string; data: WorldCupData}) {
  const player = data.players.find((item) => item.id === slug);
  if (!player) return <NotFound />;
  return (
    <>
      <PageHero kicker={player.team} title={player.name} text={`${player.position} profile for the World Cup 2026 tracker.`} />
      <section className="sp container narrow">
        <div className="glass legal-card">
          <img alt={player.name} className={`p-avatar ${player.id === 'kylian-mbappe' ? 'p-avatar-mbappe' : ''}`} loading="lazy" src={player.image} />
          <h2>{player.name}</h2>
          <p>Team: {player.team}. Position: {player.position}.{player.age ? ` Age: ${player.age}.` : ''} Current projection rating: {player.rating}.</p>
        </div>
        {player.id === 'cristiano-ronaldo' ? <PlayerBiography sections={ronaldoBiographySections} /> : null}
        {player.id === 'lamine-yamal' ? <PlayerBiography sections={lamineYamalBiographySections} /> : null}
        {player.id === 'lionel-messi' ? <PlayerBiography sections={messiBiographySections} /> : null}
        {player.id === 'neymar-jr' ? <PlayerBiography sections={neymarBiographySections} /> : null}
        {player.id === 'kylian-mbappe' ? <PlayerBiography sections={mbappeBiographySections} /> : null}
        {player.id === 'erling-haaland' ? <PlayerBiography sections={haalandBiographySections} /> : null}
      </section>
    </>
  );
}

function PlayerBiography({sections}: {sections: PlayerBiographySection[]}) {
  return (
    <div className="player-biography">
      {sections.map((section) => (
        <article className="glass player-bio-card" key={section.title}>
          <h2>{section.title}</h2>
          {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
        </article>
      ))}
    </div>
  );
}

function HostCitiesPage({data}: {data: WorldCupData}) {
  return (
    <>
      <PageHero kicker="Hosts" title="Host Cities" text="All World Cup 2026 host cities derived from the openfootball schedule." />
      <section className="sp container"><div className="feature-grid">{data.hostCities.map((city) => <Feature key={city.id} title={`${city.city}, ${city.country}`} text={`${city.matches} scheduled matches`} />)}</div></section>
    </>
  );
}

function StadiumsPage({data}: {data: WorldCupData}) {
  return (
    <>
      <PageHero kicker="Stadiums" title="World Cup Stadiums" text="Venues and match counts from the 2026 schedule feed." />
      <section className="sp container"><div className="feature-grid">{data.stadiums.map((stadium) => <Feature key={stadium.id} title={stadium.name} text={`${stadium.city}, ${stadium.country} | ${stadium.capacity?.toLocaleString() || 'TBD'} seats | ${stadium.matches} matches`} />)}</div></section>
    </>
  );
}

function ContactPage() {
  const [message, setMessage] = useState('');
  return (
    <>
      <PageHero kicker="Contact" title="Talk to GoalSphere" text="Send partnership, editorial, advertising, and product requests to the team." />
      <section className="sp container narrow">
        <form className="glass contact-form" onSubmit={(event) => { event.preventDefault(); setMessage('Message received. We will reply soon.'); event.currentTarget.reset(); }}>
          <label>Name<input required type="text" /></label>
          <label>Email<input required type="email" /></label>
          <label>Message<textarea required rows={5} /></label>
          <button className="btn-sub" type="submit">Send Message</button>
          {message && <p className="form-msg">{message}</p>}
        </form>
      </section>
    </>
  );
}

function InfoPage({type}: {type: 'about' | 'privacy' | 'terms'}) {
  const content = {
    about: {
      title: 'About GoalSphere',
      intro: 'GoalSphere brings live football data, tournament context, and sharp editorial coverage into one premium destination for global supporters.',
      paragraphs: [
        'GoalSphere publishes football news, World Cup 2026 coverage, original articles, match videos, schedule information, and analysis for fans who want clear tournament context.',
        'Our goal is to make football information easy to browse, useful to read, and transparent about sources, data availability, and editorial purpose.',
      ],
    },
    privacy: {
      title: 'Privacy Policy',
      intro: 'GoalSphere only collects information needed to operate forms, analytics, subscriptions, advertising, and live football data.',
      paragraphs: [
        'GoalSphere may use analytics tools such as Google Analytics to understand page views, popular content, device type, browser information, and general traffic behavior. This information helps improve site performance and editorial planning.',
        'If advertising is enabled, third-party vendors including Google may use cookies or similar technologies to serve and measure ads. Visitors can manage personalized advertising through their browser settings and Google advertising controls.',
        'Contact and subscription forms may ask for basic information such as name, email address, and message content. This information is used only to respond to requests or provide requested updates.',
      ],
    },
    terms: {
      title: 'Terms of Use',
      intro: 'GoalSphere content is provided for news, analysis, entertainment, and general football information.',
      paragraphs: [
        'GoalSphere articles, live data, videos, fixtures, and statistics are provided for informational purposes. Match data may depend on third-party providers and can change or become temporarily unavailable.',
        'Visitors may read and share GoalSphere pages, but may not copy, republish, or misrepresent original editorial content without permission.',
        'GoalSphere may update these terms, privacy information, advertising disclosures, or site features as the website grows and new services are added.',
      ],
    },
  }[type];
  return (
    <>
      <PageHero kicker={type} title={content.title} text={content.intro} />
      <section className="sp container narrow">
        <div className="glass legal-card">
          <h2>{content.title}</h2>
          <p>{content.intro}</p>
          {content.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
          <p>For questions, corrections, or rights requests, contact the GoalSphere editorial team through the contact page.</p>
        </div>
      </section>
    </>
  );
}

function PageHero(_props: {kicker: string; title: string; text: string}) {
  return null;
}

function Feature({title, text}: {title: string; text: string; key?: Key}) {
  return <article className="glass feature-card"><h3>{title}</h3><p>{text}</p></article>;
}

function StateBox({label, showSpinner = true}: {label: string; showSpinner?: boolean}) {
  return <div className="state-box">{showSpinner ? <div className="spin-sm" /> : null}<p>{label}</p></div>;
}

function ErrorBox({message}: {message: string}) {
  return (
    <div className="state-box error-box">
      <i className="fa-solid fa-triangle-exclamation" />
      <p>{message}</p>
    </div>
  );
}

function SkeletonGrid({count}: {count: number}) {
  return (
    <div className="matches-grid">
      {Array.from({length: count}).map((_, index) => (
        <div className="glass skeleton-card" key={index}>
          <div className="skel-line w40" />
          <div className="skel-teams">
            <span />
            <strong />
            <span />
          </div>
          <div className="skel-line w80" />
        </div>
      ))}
    </div>
  );
}

function SkeletonTable() {
  return (
    <div className="skeleton-table">
      {Array.from({length: 8}).map((_, index) => (
        <div className="skel-line w80" key={index} />
      ))}
    </div>
  );
}

function NotFound() {
  return (
    <section className="page-hero container">
      <div className="eyebrow">404</div>
      <h1>Page Not Found</h1>
      <p>The page you requested does not exist.</p>
      <Link to="/" className="slide-read">Return Home</Link>
    </section>
  );
}

function useCountdown(target: string) {
  const calculate = () => {
    const diff = Math.max(0, new Date(target).getTime() - Date.now());
    return {
      Days: String(Math.floor(diff / 86400000)).padStart(3, '0'),
      Hours: String(Math.floor((diff / 3600000) % 24)).padStart(2, '0'),
      Minutes: String(Math.floor((diff / 60000) % 60)).padStart(2, '0'),
      Seconds: String(Math.floor((diff / 1000) % 60)).padStart(2, '0'),
    };
  };
  const [value, setValue] = useState(calculate);
  useEffect(() => {
    const timer = window.setInterval(() => setValue(calculate()), 1000);
    return () => window.clearInterval(timer);
  }, [target]);
  return value;
}

function useRefreshingResource<T>(loader: () => Promise<T>, fallback: T, intervalMs = 60000) {
  const [data, setData] = useState<T>(fallback);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const next = await loader();
        if (!active) return;
        setData(next);
        setError(null);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Unable to load data from API-Football.');
      } finally {
        if (active) setLoading(false);
      }
    }

    setLoading(true);
    load();
    const timer = window.setInterval(load, intervalMs);

    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [intervalMs, loader]);

  return {data, error, loading};
}

function isUpcomingStatus(status: string) {
  return ['TBD', 'NS', 'PST'].includes(status.toUpperCase()) || status.toLowerCase().includes('not started');
}

function isResultStatus(status: string) {
  return ['FT', 'AET', 'PEN'].includes(status.toUpperCase()) || status.toLowerCase().includes('match finished');
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('en-US', {month: 'short', day: 'numeric'});
}

function formatMatchDate(match: WorldCupMatch) {
  return `${new Date(`${match.date}T00:00:00`).toLocaleDateString('en-US', {month: 'short', day: 'numeric', year: 'numeric'})} | ${match.time}`;
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString('en-US', {hour: '2-digit', minute: '2-digit'});
}

function setMeta(name: string, content: string, attribute: 'name' | 'property' = 'name') {
  let tag = document.querySelector(`meta[${attribute}="${name}"]`) as HTMLMetaElement | null;
  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute(attribute, name);
    document.head.appendChild(tag);
  }
  tag.content = content;
}

function setCanonical(url: string) {
  let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement('link');
    link.rel = 'canonical';
    document.head.appendChild(link);
  }
  link.href = url;
}

export default function App() {
  const path = useRoute();
  const [articles, setArticles] = useState<Article[]>(initialArticles);
  const [worldCup, setWorldCup] = useState<WorldCupData>(emptyWorldCupData);
  const [worldCupLoading, setWorldCupLoading] = useState(true);
  const [worldCupError, setWorldCupError] = useState<string | null>(null);
  const liveResource = useRefreshingResource(fetchLiveMatches, [] as LiveMatch[], 120000);
  const streamResource = useRefreshingResource(fetchLiveStream, null as LiveStream | null, 60000);
  const liveState: LiveMatchesState = {
    matches: liveResource.data,
    loading: liveResource.loading,
    error: liveResource.error,
  };
  const streamState: LiveStreamState = {
    stream: streamResource.data,
    loading: streamResource.loading,
    error: streamResource.error,
  };
  const hasLiveMatches = liveState.matches.length > 0;

  useEffect(() => {
    fetchArticles().then(setArticles);
  }, []);

  useEffect(() => {
    let active = true;
    async function loadWorldCup() {
      try {
        const data = await fetchWorldCupData();
        if (!active) return;
        setWorldCup(data);
        setWorldCupError(null);
      } catch (error) {
        if (!active) return;
        setWorldCupError(error instanceof Error ? error.message : 'Unable to load World Cup 2026 schedule.');
      } finally {
        if (active) setWorldCupLoading(false);
      }
    }
    loadWorldCup();
    const timer = window.setInterval(loadWorldCup, 60000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    initAnalytics();
  }, []);

  useEffect(() => {
    const newsArticle = path.startsWith('/news/') ? articles.find((item) => item.slug === path.replace('/news/', '')) : null;
    const siteArticle = path.startsWith('/articles/') ? siteArticles.find((item) => item.slug === path.replace('/articles/', '')) : null;
    const article = newsArticle || siteArticle;
    const meta = routeMeta[path];
    const pageName = article?.title || meta?.title || (path === '/articles' ? 'Original Football Articles' : path === '/' ? 'Football News & World Cup 2026' : path.split('/').filter(Boolean).join(' '));
    const description = article?.description || meta?.description || `GoalSphere ${pageName}: live scores, World Cup 2026 schedule, teams, players, stadiums, and football news.`;
    const canonicalUrl = `${siteUrl}${path === '/' ? '' : path}`;
    const image = article?.image?.startsWith('http') ? article.image : `${siteUrl}${article?.image || '/worldcup-identity.png'}`;

    document.title = `GoalSphere | ${pageName}`;
    setMeta('description', description);
    setMeta('robots', 'index, follow');
    setMeta('og:title', `GoalSphere | ${pageName}`, 'property');
    setMeta('og:description', description, 'property');
    setMeta('og:url', canonicalUrl, 'property');
    setMeta('og:image', image, 'property');
    setMeta('og:type', article ? 'article' : 'website', 'property');
    setMeta('twitter:card', 'summary_large_image');
    setMeta('twitter:title', `GoalSphere | ${pageName}`);
    setMeta('twitter:description', description);
    setMeta('twitter:image', image);
    setCanonical(canonicalUrl);
    trackPageView(path, `GoalSphere | ${pageName}`);
  }, [articles, path]);

  let page: ReactNode;
  if (path === '/') page = <HomePage articles={articles} liveState={liveState} worldCup={worldCup} worldCupError={worldCupError} worldCupLoading={worldCupLoading} />;
  else if (path === '/live') page = <LivePage liveState={liveState} streamState={streamState} />;
  else if (path === '/articles') page = <ArticlesPage />;
  else if (path.startsWith('/articles/')) page = <ArticlePage articles={siteArticles} backLabel="Back to Articles" basePath="/articles" slug={path.replace('/articles/', '')} />;
  else if (path === '/videos') page = <VideosPage />;
  else if (path === '/news') page = <NewsPage articles={articles} />;
  else if (path.startsWith('/news/')) page = <ArticlePage articles={articles} slug={path.replace('/news/', '')} />;
  else if (path === '/3d-pitch' || path === '/goal-recreation') page = <GoalRecreationPage />;
  else if (path === '/search') page = <SearchPage articles={articles} data={worldCup} />;
  else if (path === '/scores') page = <><PageHero kicker="Live Scores" title="Live And Upcoming Matches" text="Track fixtures, scorelines, venues, and status across major football competitions." /><ScoresSection data={worldCup} error={worldCupError} loading={worldCupLoading} /></>;
  else if (path === '/schedule') page = <SchedulePage data={worldCup} error={worldCupError} loading={worldCupLoading} />;
  else if (path === '/results' || path === '/world-cup-2026/results') page = <ResultsPage data={worldCup} error={worldCupError} loading={worldCupLoading} />;
  else if (path === '/standings' || path === '/world-cup-2026/standings') page = <><PageHero kicker="Tables" title="League Standings" text="Follow the table picture across World Cup groups." /><StandingsSection data={worldCup} error={worldCupError} loading={worldCupLoading} /></>;
  else if (path === '/world-cup-2026') page = <WorldCup2026Page articles={articles} data={worldCup} error={worldCupError} liveState={liveState} loading={worldCupLoading} streamState={streamState} />;
  else if (path === '/world-cup-2026/history') page = <WorldCupHistoryPage />;
  else if (path === '/stats' || path === '/world-cup-2026/stats') page = <><PageHero kicker="History" title="World Cup History" text="A dedicated World Cup history page is coming soon." /><HistoryBanner /></>;
  else if (path === '/players' || path === '/world-cup-2026/players') page = <PlayersPage data={worldCup} />;
  else if (path.startsWith('/players/')) page = <PlayerDetailPage data={worldCup} slug={path.replace('/players/', '')} />;
  else if (path === '/teams' || path === '/world-cup-2026/teams') page = <TeamsPage data={worldCup} error={worldCupError} loading={worldCupLoading} />;
  else if (path.startsWith('/teams/')) page = <TeamDetailPage data={worldCup} slug={path.replace('/teams/', '')} />;
  else if (path === '/host-cities') page = <HostCitiesPage data={worldCup} />;
  else if (path === '/stadiums') page = <StadiumsPage data={worldCup} />;
  else if (path === '/about') page = <InfoPage type="about" />;
  else if (path === '/contact') page = <ContactPage />;
  else if (path === '/privacy') page = <InfoPage type="privacy" />;
  else if (path === '/terms') page = <InfoPage type="terms" />;
  else page = <NotFound />;

  return <Layout articles={articles} hasLiveMatches={hasLiveMatches} path={path}>{page}</Layout>;
}
