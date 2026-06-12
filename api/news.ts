const DEFAULT_QUERY = 'FIFA World Cup 2026';
const FOOTBALL_NEWS_BASE = 'https://football-news-api.vercel.app/api';
const GNEWS_API_KEY = process.env.GNEWS_API_KEY || 'YOUR_KEY';
const NEWS_API_KEY = process.env.NEWS_API_KEY || '';
const RSS_FEEDS = [
  {source: 'BBC Sport', url: 'https://feeds.bbci.co.uk/sport/football/rss.xml'},
  {source: 'The Guardian', url: 'https://www.theguardian.com/football/rss'},
  {source: 'ESPN', url: 'https://www.espn.com/espn/rss/soccer/news'},
];
const FALLBACK_IMAGES = [
  'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?q=80&w=1200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1517927033932-b3d18e61fb3a?q=80&w=1200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1522778119026-d647f0596c20?q=80&w=1200&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?q=80&w=1200&auto=format&fit=crop',
];

type NewsProviderArticle = {
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
  pubDate?: string;
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function mapArticle(article: NewsProviderArticle, index: number, source = 'Football News') {
  const title = article.title || 'World Cup update';
  const description = article.description || article.short_desc || article.short_descc || 'Current football article.';
  const image = article.image || article.img || article.news_img || article.urlToImage;

  return {
    title,
    slug: slugify(title) || `world-cup-news-${index}`,
    description,
    content: article.content || description || 'Read the complete story from the original source.',
    source: article.source?.name || source,
    publishedAt: article.publishedAt || new Date().toISOString(),
    image: normalizeImage(image, index),
    category: 'World Cup',
    url: article.url,
  };
}

type MappedArticle = ReturnType<typeof mapArticle>;

function decodeHtml(value: string) {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&rsquo;/g, "'")
    .replace(/&ldquo;|&rdquo;/g, '"')
    .replace(/&mdash;|&ndash;/g, '-');
}

function stripTags(value: string) {
  return decodeHtml(value).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function getXmlValue(item: string, tag: string) {
  const value = item.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'))?.[1]?.trim() || '';
  return decodeHtml(value.replace(/^<!\[CDATA\[/, '').replace(/\]\]>$/, '').trim());
}

function getMediaImage(item: string) {
  const mediaMatches = Array.from(item.matchAll(/<media:(?:thumbnail|content)\b[^>]*\burl="([^"]+)"/gi));
  const image = mediaMatches.at(-1)?.[1];
  return image ? decodeHtml(image) : '';
}

function cleanFeedDescription(value: string) {
  return stripTags(value)
    .replace(/\s*Continue reading\.\.\.\s*$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractArticleText(html: string) {
  const source = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, '');
  const articleBlock = source.match(/<article[\s\S]*?<\/article>/i)?.[0] || source;
  const paragraphs = Array.from(articleBlock.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi))
    .map((match) => decodeHtml(match[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()))
    .filter((text) => text.length > 55 && !/sign up|subscribe|cookie|advertisement|all rights reserved/i.test(text));

  return Array.from(new Set(paragraphs)).slice(0, 14).join('\n\n');
}

function extractOgImage(html: string) {
  const ogImage = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)?.[1]
    || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i)?.[1]
    || html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i)?.[1];
  return ogImage ? decodeHtml(ogImage) : '';
}

function normalizeImage(image: string | undefined, index: number) {
  if (!image || !/^https?:\/\//i.test(image)) return FALLBACK_IMAGES[index % FALLBACK_IMAGES.length];
  if (/placeholder|default|undefined|null|\.svg($|\?)/i.test(image)) return FALLBACK_IMAGES[index % FALLBACK_IMAGES.length];
  return image.replace(/^http:\/\//i, 'https://');
}

async function fetchArticleMeta(url?: string) {
  if (!url) return {content: '', image: ''};
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3500);
  try {
    const response = await fetch(url, {signal: controller.signal, headers: {'user-agent': 'GoalSphereBot/1.0'}});
    if (!response.ok) return {content: '', image: ''};
    const html = await response.text();
    return {
      content: extractArticleText(html),
      image: extractOgImage(html),
    };
  } catch {
    return {content: '', image: ''};
  } finally {
    clearTimeout(timer);
  }
}

async function enrichArticles(articles: MappedArticle[]) {
  const enriched = await Promise.all(articles.map(async (article) => {
    const meta = await fetchArticleMeta(article.url);
    const content = meta.content.length > article.content.length ? meta.content : article.content;
    const image = meta.image && article.image.startsWith('https://images.unsplash.com') ? normalizeImage(meta.image, 0) : article.image;
    return {
      ...article,
      content,
      image,
    };
  }));
  return enriched;
}

async function fetchWithTimeout(url: string, timeoutMs = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {signal: controller.signal});
    if (!response.ok) throw new Error(`Football News API failed with ${response.status}`);
    const data = await response.json();
    return Array.isArray(data) ? data as NewsProviderArticle[] : [];
  } finally {
    clearTimeout(timer);
  }
}

async function fetchFootballNews() {
  const sources = [
    ['ESPN', 'espn'],
    ['GOAL', 'goal'],
    ['90min', '90mins'],
    ['OneFootball', 'onefootball'],
  ] as const;

  const results = await Promise.allSettled(
    sources.map(async ([source, endpoint]) => {
      const articles = await fetchWithTimeout(`${FOOTBALL_NEWS_BASE}/news/${endpoint}`);
      return articles.filter((article) => article.title).map((article, index) => mapArticle(article, index, source));
    }),
  );

  const seen = new Set<string>();
  return results
    .flatMap((result) => result.status === 'fulfilled' ? result.value : [])
    .filter((article) => {
      if (seen.has(article.slug)) return false;
      seen.add(article.slug);
      return true;
    })
    .slice(0, 12);
}

async function fetchRssFeeds() {
  const results = await Promise.allSettled(
    RSS_FEEDS.map(async (feed) => {
      const response = await fetch(feed.url);
      if (!response.ok) throw new Error(`${feed.source} RSS failed with ${response.status}`);
      const xml = await response.text();

      return Array.from(xml.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi))
        .slice(0, 8)
        .map((match, index) => {
          const item = match[1];
          const title = stripTags(getXmlValue(item, 'title'));
          const description = cleanFeedDescription(getXmlValue(item, 'description')) || title;
          return mapArticle({
            title,
            description,
            content: description,
            publishedAt: new Date(getXmlValue(item, 'pubDate') || Date.now()).toISOString(),
            image: getMediaImage(item),
            url: decodeHtml(stripTags(getXmlValue(item, 'link'))),
          }, index, feed.source);
        })
        .filter((article) => article.title && article.url);
    }),
  );

  const sourceGroups = results
    .map((result) => result.status === 'fulfilled' ? result.value : [])
    .filter((articles) => articles.length);
  const interleaved = Array.from({length: Math.max(...sourceGroups.map((articles) => articles.length), 0)})
    .flatMap((_, index) => sourceGroups.map((articles) => articles[index]).filter(Boolean));
  const seen = new Set<string>();
  return interleaved
    .filter((article) => {
      if (seen.has(article.slug)) return false;
      seen.add(article.slug);
      return true;
    })
    .slice(0, 12);
}

function isGeneratedByGoogleNews(url?: string) {
  return Boolean(url && /news\.google\.com\/rss\/articles/i.test(url));
}

async function fetchGNews(query: string) {
  if (!GNEWS_API_KEY || GNEWS_API_KEY === 'YOUR_KEY') return [];

  const params = new URLSearchParams({
    apikey: GNEWS_API_KEY,
    lang: 'en',
    max: '10',
    q: query,
  });
  const response = await fetch(`https://gnews.io/api/v4/search?${params}`);
  if (!response.ok) throw new Error(`GNews failed with ${response.status}`);

  const data = await response.json();
  return Array.isArray(data.articles) ? data.articles.map((article: NewsProviderArticle, index: number) => mapArticle(article, index, 'GNews')) : [];
}

async function fetchNewsApi(query: string) {
  if (!NEWS_API_KEY) return [];

  const params = new URLSearchParams({
    apiKey: NEWS_API_KEY,
    language: 'en',
    pageSize: '10',
    q: query,
    sortBy: 'publishedAt',
  });
  const response = await fetch(`https://newsapi.org/v2/everything?${params}`);
  if (!response.ok) throw new Error(`NewsAPI failed with ${response.status}`);

  const data = await response.json();
  return Array.isArray(data.articles) ? data.articles.map((article: NewsProviderArticle, index: number) => mapArticle(article, index, 'NewsAPI')) : [];
}

async function fetchGoogleNewsRss(query: string) {
  const params = new URLSearchParams({
    ceid: 'US:en',
    gl: 'US',
    hl: 'en-US',
    q: `${query} football`,
  });
  const response = await fetch(`https://news.google.com/rss/search?${params}`);
  if (!response.ok) throw new Error(`Google News RSS failed with ${response.status}`);

  const xml = await response.text();
  return Array.from(xml.matchAll(/<item>([\s\S]*?)<\/item>/gi))
    .slice(0, 10)
    .map((match, index) => {
      const item = match[1];
      const rawTitle = decodeHtml(getXmlValue(item, 'title'));
      const [title, sourceFromTitle] = rawTitle.split(/\s+-\s+(?=[^-]+$)/);
      const description = stripTags(decodeHtml(getXmlValue(item, 'description'))) || title;
      return mapArticle({
        title: title || rawTitle,
        description,
        content: description,
        publishedAt: new Date(getXmlValue(item, 'pubDate') || Date.now()).toISOString(),
        url: decodeHtml(getXmlValue(item, 'link')),
      }, index, sourceFromTitle || 'Google News');
    });
}

export default async function handler(request: any, response: any) {
  const query = String(request.query?.q || DEFAULT_QUERY);

  const providers = [
    () => fetchGNews(query),
    () => fetchNewsApi(query),
    () => fetchRssFeeds(),
    () => fetchFootballNews(),
    () => fetchGoogleNewsRss(query),
  ];

  for (const provider of providers) {
    try {
      const articles = await provider();
      const nonGoogleArticles = articles.filter((article) => !isGeneratedByGoogleNews(article.url));
      const usableArticles = nonGoogleArticles.length ? nonGoogleArticles : articles;
      if (usableArticles.length) return response.status(200).json(await enrichArticles(usableArticles));
    } catch {
      // Try the next provider before giving up.
    }
  }

  return response.status(200).json([]);
}
