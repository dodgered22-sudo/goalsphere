const CACHE_TTL_MS = 60 * 1000;
const CURRENT_MATCH_EMBED_URL = 'https://dma.zeworad.site/albaplayer/mexa1/?serv=0';
const WAITING_SCREEN_IMAGE = '/post-images/south-korea-czech-republic-live.png';

type LiveStreamPayload = {
  title: string;
  match: string;
  status: 'live' | 'scheduled' | 'offline';
  provider: string;
  embedUrl?: string;
  posterImage?: string;
  message?: string;
  updatedAt: string;
};

let streamCache: {expiresAt: number; payload: LiveStreamPayload} | null = null;

function pickString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function normalizeProviderPayload(data: any): Partial<LiveStreamPayload> {
  const stream = data?.stream || data?.data || data;
  return {
    title: pickString(stream?.title),
    match: pickString(stream?.match),
    status: ['live', 'scheduled', 'offline'].includes(stream?.status) ? stream.status : undefined,
    provider: pickString(stream?.provider || stream?.source),
    embedUrl: pickString(stream?.embedUrl || stream?.embed_url || stream?.iframeUrl || stream?.iframe_url || stream?.playerUrl || stream?.player_url || stream?.url),
    posterImage: pickString(stream?.posterImage || stream?.poster_image || stream?.image),
    message: pickString(stream?.message),
  };
}

async function fetchProviderStream() {
  const apiUrl = process.env.OPENING_MATCH_STREAM_API_URL || process.env.LIVE_STREAM_API_URL;
  if (!apiUrl) return {};

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4500);

  try {
    const response = await fetch(apiUrl, {signal: controller.signal});
    if (!response.ok) throw new Error(`Live stream API failed with ${response.status}`);
    return normalizeProviderPayload(await response.json());
  } finally {
    clearTimeout(timeout);
  }
}

async function buildLiveStreamPayload(): Promise<LiveStreamPayload> {
  const providerPayload = await fetchProviderStream();
  const embedUrl =
    providerPayload.embedUrl ||
    process.env.OPENING_MATCH_STREAM_EMBED_URL ||
    process.env.LIVE_STREAM_EMBED_URL ||
    CURRENT_MATCH_EMBED_URL;

  return {
    title: providerPayload.title || 'South Korea vs Czech Republic Live Stream',
    match: providerPayload.match || 'South Korea vs Czech Republic',
    status: providerPayload.status || (embedUrl ? 'live' : 'scheduled'),
    provider: providerPayload.provider || (embedUrl ? 'Live player' : 'GoalSphere Live'),
    embedUrl,
    posterImage: providerPayload.posterImage || WAITING_SCREEN_IMAGE,
    message: providerPayload.message || (embedUrl ? 'Watch South Korea vs Czech Republic live on GoalSphere.' : 'The live player will appear here when the broadcast source is available.'),
    updatedAt: new Date().toISOString(),
  };
}

export default async function handler(_request: any, response: any) {
  if (streamCache && streamCache.expiresAt > Date.now()) {
    return response.status(200).json({stream: streamCache.payload});
  }

  try {
    const payload = await buildLiveStreamPayload();
    streamCache = {expiresAt: Date.now() + CACHE_TTL_MS, payload};
    return response.status(200).json({stream: payload});
  } catch (error) {
    const payload: LiveStreamPayload = {
      title: 'South Korea vs Czech Republic Live Stream',
      match: 'South Korea vs Czech Republic',
      status: 'offline',
      provider: 'Stream source unavailable',
      posterImage: WAITING_SCREEN_IMAGE,
      message: error instanceof Error ? error.message : 'Unable to load live stream metadata.',
      updatedAt: new Date().toISOString(),
    };
    streamCache = {expiresAt: Date.now() + 30 * 1000, payload};
    return response.status(200).json({stream: payload});
  }
}
