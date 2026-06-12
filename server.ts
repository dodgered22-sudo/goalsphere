import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createServer as createViteServer} from 'vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const port = Number(process.env.PORT || 3000);
const isProduction = process.env.NODE_ENV === 'production';
const espnSite = 'https://site.api.espn.com/apis/site/v2/sports/soccer';
const espnCore = 'https://site.api.espn.com/apis/v2/sports/soccer';
const footballNewsBase = 'https://football-news-api.vercel.app/api';

type NewsArticle = {
  title?: string;
  description?: string;
  content?: string;
  url?: string;
  image?: string;
  img?: string;
  news_img?: string;
  urlToImage?: string;
  publishedAt?: string;
  source?: {name?: string};
  short_desc?: string;
  short_descc?: string;
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  if (!response.ok) {
    throw new Error(`Upstream request failed: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

async function fetchJsonWithTimeout<T>(url: string, timeoutMs = 8000): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetchJson<T>(url, {signal: controller.signal});
  } finally {
    clearTimeout(timer);
  }
}

app.get('/api/news', async (request, response) => {
  try {
    const q = String(request.query.q || 'FIFA World Cup 2026');
    const mapArticle = (article: NewsArticle, index: number, source = 'Football News') => {
      const title = article.title || 'World Cup update';
      const description = article.description || article.short_desc || article.short_descc || 'Current football article.';
      return {
        title,
        slug: slugify(title) || `world-cup-news-${index}`,
        description,
        content: article.content || description || 'Read the complete story from the original source.',
        source: article.source?.name || source,
        publishedAt: article.publishedAt || new Date().toISOString(),
        image: article.image || article.img || article.news_img || article.urlToImage || 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?q=80&w=1200&auto=format&fit=crop',
        category: 'World Cup',
        url: article.url,
      };
    };

    const sources = [
      ['ESPN', 'espn'],
      ['GOAL', 'goal'],
      ['90min', '90mins'],
      ['OneFootball', 'onefootball'],
    ] as const;
    const footballNewsResults = await Promise.allSettled(
      sources.map(async ([source, endpoint]) => {
        const data = await fetchJsonWithTimeout<NewsArticle[]>(`${footballNewsBase}/news/${endpoint}`);
        return data.filter((article) => article.title).map((article, index) => mapArticle(article, index, source));
      }),
    );
    const seen = new Set<string>();
    const footballNewsArticles = footballNewsResults
      .flatMap((result) => result.status === 'fulfilled' ? result.value : [])
      .filter((article) => {
        if (seen.has(article.slug)) return false;
        seen.add(article.slug);
        return true;
      })
      .slice(0, 12);
    if (footballNewsArticles.length) return response.json(footballNewsArticles);

    const gnewsKey = process.env.GNEWS_API_KEY;
    if (gnewsKey) {
      const params = new URLSearchParams({
        apikey: gnewsKey,
        lang: 'en',
        max: '10',
        q,
      });
      const data = await fetchJson<{articles?: NewsArticle[]}>(`https://gnews.io/api/v4/search?${params}`);
      const articles = (data.articles || []).filter((article) => article.title).map((article, index) => mapArticle(article, index));
      if (articles.length) return response.json(articles);
    }

    const newsApiKey = process.env.NEWS_API_KEY;
    if (!newsApiKey) return response.json([]);

    const params = new URLSearchParams({
      apiKey: newsApiKey,
      language: 'en',
      pageSize: '10',
      q,
      sortBy: 'publishedAt',
    });
    const data = await fetchJson<{articles?: NewsArticle[]}>(`https://newsapi.org/v2/everything?${params}`);
    const articles = (data.articles || []).filter((article) => article.title).map((article, index) => mapArticle(article, index));
    response.json(articles);
  } catch (error) {
    response.status(502).json({error: error instanceof Error ? error.message : 'Unable to load news'});
  }
});

app.get('/api/scores', async (request, response) => {
  try {
    const league = String(request.query.league || 'eng.1');
    const data = await fetchJson<{events?: any[]}>(`${espnSite}/${encodeURIComponent(league)}/scoreboard`);
    const matches = (data.events || []).slice(0, 12).map((event) => {
      const competition = event.competitions?.[0];
      const competitors = competition?.competitors || [];
      const home = competitors.find((item: any) => item.homeAway === 'home') || competitors[0];
      const away = competitors.find((item: any) => item.homeAway === 'away') || competitors[1];
      const status = competition?.status?.type?.description || competition?.status?.type?.shortDetail || 'Scheduled';
      return {
        id: event.id || `${home?.team?.displayName}-${away?.team?.displayName}`,
        league: data.events?.[0]?.season?.slug || league,
        status,
        venue: competition?.venue?.fullName || 'Venue TBD',
        startTime: event.date || new Date().toISOString(),
        home: {
          name: home?.team?.displayName || 'Home',
          logo: home?.team?.logo,
          score: home?.score ?? '-',
        },
        away: {
          name: away?.team?.displayName || 'Away',
          logo: away?.team?.logo,
          score: away?.score ?? '-',
        },
      };
    });
    response.json(matches);
  } catch (error) {
    response.status(502).json({error: error instanceof Error ? error.message : 'Unable to load scores'});
  }
});

app.get('/api/standings', async (request, response) => {
  try {
    const league = String(request.query.league || 'eng.1');
    const data = await fetchJson<{standings?: {entries?: any[]}[]}>(`${espnCore}/${encodeURIComponent(league)}/standings`);
    const rows = data.standings?.[0]?.entries || [];
    response.json(rows.slice(0, 20).map((entry, index) => {
      const stats = new Map((entry.stats || []).map((stat: any) => [stat.type, Number(stat.value || 0)]));
      return {
        rank: index + 1,
        team: entry.team?.shortDisplayName || entry.team?.displayName || entry.team?.name || 'Team',
        played: stats.get('gamesPlayed') || stats.get('matchesPlayed') || 0,
        won: stats.get('wins') || 0,
        drawn: stats.get('ties') || stats.get('draws') || 0,
        lost: stats.get('losses') || 0,
        points: stats.get('points') || 0,
      };
    }));
  } catch (error) {
    response.status(502).json({error: error instanceof Error ? error.message : 'Unable to load standings'});
  }
});

app.get('/api/world-cup', async (_request, response) => {
  try {
    const apiKey = process.env.API_FOOTBALL_KEY;
    if (!apiKey) return response.json({configured: false, fixtures: []});

    const data = await fetchJson('https://v3.football.api-sports.io/fixtures?league=1&season=2026', {
      headers: {'x-apisports-key': apiKey},
    });
    response.json({configured: true, data});
  } catch (error) {
    response.status(502).json({error: error instanceof Error ? error.message : 'Unable to load World Cup data'});
  }
});

if (isProduction) {
  app.use(express.static(path.join(__dirname, 'dist')));
  app.get('*', (_request, response) => {
    response.sendFile(path.join(__dirname, 'dist', 'index.html'));
  });
} else {
  const vite = await createViteServer({
    appType: 'spa',
    server: {middlewareMode: true},
  });
  app.use(vite.middlewares);
}

app.listen(port, '0.0.0.0', () => {
  console.log(`GoalSphere running on http://localhost:${port}`);
});
