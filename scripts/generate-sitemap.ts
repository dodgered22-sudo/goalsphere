import fs from 'fs';
import path from 'path';
import {manualPosts} from '../src/data/manualPosts';
import {siteArticles} from '../src/data/siteArticles';

const siteUrl = 'https://goal-sphere.live';

const staticPaths = [
  '/',
  '/news',
  '/articles',
  '/live',
  '/videos',
  '/world-cup-2026',
  '/scores',
  '/schedule',
  '/world-cup-2026/results',
  '/world-cup-2026/standings',
  '/world-cup-2026/teams',
  '/world-cup-2026/players',
  '/world-cup-2026/stats',
  '/world-cup-2026/history',
  '/stadiums',
  '/host-cities',
  '/3d-pitch',
  '/about',
  '/privacy',
  '/terms',
  '/contact',
];

const urls = new Set<string>();
staticPaths.forEach((p) => urls.add(`${siteUrl}${p}`));

manualPosts.forEach((post) => {
  if (post && post.slug) urls.add(`${siteUrl}/news/${post.slug}`);
});

siteArticles.forEach((article) => {
  if (article && article.slug) urls.add(`${siteUrl}/articles/${article.slug}`);
});

const now = new Date().toISOString();

const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${Array.from(urls)
  .map((loc) => `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${now}</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>0.8</priority>\n  </url>`)
  .join('\n')}\n</urlset>`;

const out = path.resolve(process.cwd(), 'public', 'sitemap.xml');
fs.writeFileSync(out, xml, 'utf8');
console.log(`Sitemap written with ${urls.size} URLs to ${out}`);
