import express from 'express';
import { Buffer } from 'node:buffer';
import http from 'node:http';
import https from 'node:https';

const RADIO_MIRRORS = [
  'https://de1.api.radio-browser.info',
  'https://de2.api.radio-browser.info',
  'https://nl1.api.radio-browser.info',
];

function isPrivateOrBlockedHost(hostname: string): boolean {
  const lower = hostname.toLowerCase();
  if (
    lower === 'localhost' ||
    lower === '127.0.0.1' ||
    lower === '::1' ||
    lower === '0.0.0.0' ||
    lower.endsWith('.local') ||
    lower.endsWith('.internal')
  ) {
    return true;
  }
  if (/^(10\.|192\.168\.|169\.254\.|127\.)/.test(lower)) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(lower)) return true;
  return false;
}

interface NormalizedTrack {
  id: string;
  title: string;
  artist: string;
  album: string;
  durationSeconds: number;
  coverUrl: string;
  audioUrl?: string;
  youtubeId?: string;
  isRealAudio: boolean;
  isFullTrack: boolean;
}

function parseDurationText(text: string): number {
  const parts = text
    .trim()
    .split(':')
    .map((p) => parseInt(p, 10));
  if (parts.some((n) => Number.isNaN(n))) return 0;
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return 0;
}

async function searchYouTubeFullTracks(
  query: string,
  artistFilter?: string
): Promise<NormalizedTrack[]> {
  const searchQuery = artistFilter ? `${artistFilter} música oficial` : query;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(
      `https://www.youtube.com/results?search_query=${encodeURIComponent(searchQuery)}`,
      {
        signal: controller.signal,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept-Language': 'pt-BR,pt;q=0.9',
        },
      }
    );
    if (!res.ok) return [];
    const html = await res.text();
    const start = html.indexOf('var ytInitialData = ');
    if (start === -1) return [];
    const end = html.indexOf(';</script>', start);
    if (end === -1) return [];

    const jsonStr = html.slice(start + 'var ytInitialData = '.length, end);
    const data = JSON.parse(jsonStr) as unknown;

    const results: NormalizedTrack[] = [];
    const seen = new Set<string>();

    const walk = (node: unknown) => {
      if (!node || typeof node !== 'object' || results.length >= 24) return;
      const obj = node as Record<string, unknown>;
      if (
        typeof obj.videoId === 'string' &&
        obj.title &&
        obj.lengthText &&
        typeof obj.lengthText === 'object'
      ) {
        const videoId = obj.videoId;
        if (!seen.has(videoId)) {
          const lengthObj = obj.lengthText as { simpleText?: string };
          const durText = lengthObj.simpleText || '';
          const durationSeconds = parseDurationText(durText);

          // Keep real full songs (between 75s and 15 minutes)
          if (durationSeconds >= 75 && durationSeconds <= 900) {
            const titleObj = obj.title as {
              runs?: Array<{ text?: string }>;
              simpleText?: string;
            };
            const rawTitle =
              titleObj.runs?.map((r) => r.text || '').join('') ||
              titleObj.simpleText ||
              'Música Completa';

            const ownerObj = (obj.ownerText || obj.longBylineText) as
              | { runs?: Array<{ text?: string }> }
              | undefined;
            const channel =
              ownerObj?.runs?.[0]?.text?.trim() || artistFilter || 'YouTube Música';

            // Clean "Artista - Música" if present
            let cleanTitle = rawTitle.trim();
            let trackArtist = artistFilter || channel;
            const dashParts = cleanTitle.split(' - ');
            if (dashParts.length >= 2 && dashParts[0].length < 40) {
              if (!artistFilter) {
                trackArtist = dashParts[0].trim();
              }
              cleanTitle = dashParts.slice(1).join(' - ').trim();
            }

            seen.add(videoId);
            results.push({
              id: `yt-${videoId}`,
              title: cleanTitle,
              artist: trackArtist,
              album: 'Música Completa',
              durationSeconds,
              coverUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
              youtubeId: videoId,
              isRealAudio: true,
              isFullTrack: true,
            });
          }
        }
      }
      if (Array.isArray(node)) {
        for (const item of node) walk(item);
      } else {
        for (const val of Object.values(obj)) walk(val);
      }
    };

    walk(data);
    return results;
  } catch {
    return [];
  } finally {
    clearTimeout(timeout);
  }
}

interface NormalizedYouTubeVideo {
  id: string;
  videoId: string;
  title: string;
  channel: string;
  durationText: string;
  viewsText: string;
  publishedText: string;
  thumbnailUrl: string;
  isLive: boolean;
  category: string;
}

const YOUTUBE_CATEGORY_QUERIES: Record<string, string> = {
  destaques: 'Louvor adoração pregação cristã podcast brasil',
  louvor: 'Louvor e adoração ao vivo gospel brasil',
  palavra: 'Pregação palavra de Deus mensagem devocional hoje',
  podcasts: 'Podcast cristão brasil entrevista completo',
  financas: 'Educação financeira investimentos brasil iniciantes',
  aovivo: 'Ao vivo notícias rádio louvor brasil',
};

function extractYouTubeVideoId(input: string): string | null {
  const trimmed = input.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;
  try {
    const url = new URL(trimmed);
    const host = url.hostname.toLowerCase();
    if (!host.includes('youtube.com') && !host.includes('youtu.be')) return null;
    if (host.includes('youtu.be')) {
      const id = url.pathname.split('/').filter(Boolean)[0] || '';
      return /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
    }
    const vParam = url.searchParams.get('v');
    if (vParam && /^[a-zA-Z0-9_-]{11}$/.test(vParam)) return vParam;
    const parts = url.pathname.split('/').filter(Boolean);
    for (const seg of ['live', 'shorts', 'embed']) {
      const idx = parts.indexOf(seg);
      if (
        idx !== -1 &&
        parts[idx + 1] &&
        /^[a-zA-Z0-9_-]{11}$/.test(parts[idx + 1])
      ) {
        return parts[idx + 1];
      }
    }
    return null;
  } catch {
    return null;
  }
}

async function searchYouTubeVideos(
  query: string,
  category = 'destaques'
): Promise<NormalizedYouTubeVideo[]> {
  const searchQuery =
    query.trim() ||
    YOUTUBE_CATEGORY_QUERIES[category] ||
    YOUTUBE_CATEGORY_QUERIES.destaques;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(
      `https://www.youtube.com/results?search_query=${encodeURIComponent(searchQuery)}`,
      {
        signal: controller.signal,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept-Language': 'pt-BR,pt;q=0.9',
        },
      }
    );
    if (!res.ok) return [];
    const html = await res.text();
    const start = html.indexOf('var ytInitialData = ');
    if (start === -1) return [];
    const end = html.indexOf(';</script>', start);
    if (end === -1) return [];

    const jsonStr = html.slice(start + 'var ytInitialData = '.length, end);
    const data = JSON.parse(jsonStr) as unknown;

    const results: NormalizedYouTubeVideo[] = [];
    const seen = new Set<string>();

    const walk = (node: unknown) => {
      if (!node || typeof node !== 'object' || results.length >= 24) return;
      const obj = node as Record<string, unknown>;

      if (
        typeof obj.videoId === 'string' &&
        obj.title &&
        (obj.ownerText || obj.longBylineText)
      ) {
        const videoId = obj.videoId;
        if (/^[a-zA-Z0-9_-]{11}$/.test(videoId) && !seen.has(videoId)) {
          const titleObj = obj.title as {
            runs?: Array<{ text?: string }>;
            simpleText?: string;
          };
          const rawTitle =
            titleObj.runs?.map((r) => r.text || '').join('') ||
            titleObj.simpleText ||
            '';
          if (rawTitle.trim()) {
            const ownerObj = (obj.ownerText || obj.longBylineText) as
              | { runs?: Array<{ text?: string }> }
              | undefined;
            const channel = ownerObj?.runs?.[0]?.text?.trim() || 'YouTube';

            const lengthObj = obj.lengthText as { simpleText?: string } | undefined;
            const badges = Array.isArray(obj.badges) ? obj.badges : [];
            const isLive =
              !lengthObj?.simpleText &&
              JSON.stringify(badges).toUpperCase().includes('LIVE');
            const durationText =
              lengthObj?.simpleText?.trim() || (isLive ? 'AO VIVO' : 'Vídeo');

            const viewsObj = (obj.shortViewCountText || obj.viewCountText) as
              | { simpleText?: string; runs?: Array<{ text?: string }> }
              | undefined;
            const viewsText =
              viewsObj?.simpleText ||
              viewsObj?.runs?.map((r) => r.text || '').join('') ||
              '';

            const pubObj = obj.publishedTimeText as { simpleText?: string } | undefined;
            const publishedText = pubObj?.simpleText || '';

            seen.add(videoId);
            results.push({
              id: `ytv-${videoId}`,
              videoId,
              title: rawTitle.trim(),
              channel,
              durationText,
              viewsText: viewsText.trim(),
              publishedText: publishedText.trim(),
              thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
              isLive,
              category,
            });
          }
        }
      }

      if (Array.isArray(node)) {
        for (const item of node) walk(item);
      } else {
        for (const val of Object.values(obj)) walk(val);
      }
    };

    walk(data);
    return results;
  } catch {
    return [];
  } finally {
    clearTimeout(timeout);
  }
}

async function resolveYouTubeVideoMeta(
  urlOrId: string
): Promise<NormalizedYouTubeVideo | null> {
  const videoId = extractYouTubeVideoId(urlOrId);
  if (!videoId) return null;
  const oembed = await fetchJsonWithTimeout<{
    title?: string;
    author_name?: string;
  }>(
    `https://www.youtube.com/oembed?url=${encodeURIComponent(
      `https://www.youtube.com/watch?v=${videoId}`
    )}&format=json`,
    4500
  );
  return {
    id: `ytv-${videoId}`,
    videoId,
    title: oembed?.title?.trim() || `Vídeo YouTube (${videoId})`,
    channel: oembed?.author_name?.trim() || 'YouTube',
    durationText: 'Vídeo',
    viewsText: '',
    publishedText: '',
    thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    isLive: false,
    category: 'direto',
  };
}

async function searchAudiusFullTracks(query: string): Promise<NormalizedTrack[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(
      `https://discoveryprovider.audius.co/v1/tracks/search?query=${encodeURIComponent(
        query
      )}&app_name=MeuMundoMinhaVida`,
      { signal: controller.signal }
    );
    if (!res.ok) return [];
    const json = (await res.json()) as {
      data?: Array<{
        id?: string;
        title?: string;
        duration?: number;
        user?: { name?: string };
        artwork?: { '480x480'?: string; '150x150'?: string };
      }>;
    };
    if (!Array.isArray(json.data)) return [];
    return json.data
      .filter((t) => typeof t.id === 'string' && (t.duration || 0) >= 60)
      .slice(0, 8)
      .map((t) => ({
        id: `audius-${t.id}`,
        title: t.title || 'Faixa Completa',
        artist: t.user?.name || 'Artista',
        album: 'Áudio Completo',
        durationSeconds: t.duration || 210,
        coverUrl: t.artwork?.['480x480'] || t.artwork?.['150x150'] || '',
        audioUrl: `https://discoveryprovider.audius.co/v1/tracks/${t.id}/stream?app_name=MeuMundoMinhaVida`,
        isRealAudio: true,
        isFullTrack: true,
      }));
  } catch {
    return [];
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchRadioStations(query: string, tag: string) {
  const params = new URLSearchParams({
    countrycode: 'BR',
    hidebroken: 'true',
    order: 'clickcount',
    reverse: 'true',
    limit: '30',
  });
  if (query) {
    params.set('name', query);
  }
  if (tag && tag !== 'todas') {
    params.set('tag', tag);
  }

  for (const base of RADIO_MIRRORS) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    try {
      const res = await fetch(`${base}/json/stations/search?${params.toString()}`, {
        signal: controller.signal,
        headers: { 'User-Agent': 'MeuMundoMinhaVida/1.0' },
      });
      clearTimeout(timeout);
      if (!res.ok) continue;

      const data = (await res.json()) as Array<{
        stationuuid?: string;
        name?: string;
        url_resolved?: string;
        url?: string;
        favicon?: string;
        tags?: string;
        state?: string;
        bitrate?: number;
        codec?: string;
        hls?: number;
      }>;

      if (!Array.isArray(data)) continue;

      const stations = data
        .filter((s) => s.hls !== 1)
        .map((s) => {
          const streamUrl = (s.url_resolved || s.url || '').trim();
          if (!streamUrl.startsWith('http')) return null;

          const cleanName = (s.name || 'Rádio Online').trim();
          const fmMatch = cleanName.match(/(\d{2,3}[.,]\d)\s*(?:fm)?/i);
          const frequency = fmMatch
            ? `${fmMatch[1].replace(',', '.')} FM`
            : s.bitrate
              ? `${s.bitrate} kbps`
              : 'Web FM';

          const rawTags = (s.tags || '')
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean)
            .slice(0, 2)
            .join(' · ');

          return {
            id: s.stationuuid || `rad-${Math.random().toString(36).slice(2)}`,
            name: cleanName,
            frequency,
            program: s.state ? `${s.state}, Brasil` : 'Brasil · Transmissão ao vivo',
            genre: rawTags || (tag && tag !== 'todas' ? tag : 'Rádio Brasil'),
            favicon:
              s.favicon && s.favicon.startsWith('https://') ? s.favicon : undefined,
            streamUrl,
            bitrate: s.bitrate || 128,
            codec: s.codec || 'MP3',
            isLiveReal: true,
          };
        })
        .filter((s): s is NonNullable<typeof s> => s !== null);

      return stations;
    } catch {
      clearTimeout(timeout);
    }
  }
  return [];
}

interface NormalizedPodcastShow {
  id: string;
  title: string;
  host: string;
  genre: string;
  coverUrl: string;
  feedUrl: string;
  episodeCount: number;
}

interface NormalizedPodcastEpisode {
  id: string;
  title: string;
  series: string;
  host: string;
  durationMinutes: number;
  durationSeconds: number;
  publishedAt: string;
  summary: string;
  audioUrl: string;
  coverUrl?: string;
  isRealAudio: boolean;
}

const PODCAST_CATEGORY_QUERIES: Record<string, string> = {
  destaques: '__top__',
  cristao: 'devocional cristao biblia gospel',
  noticias: 'noticias brasil jornalismo',
  negocios: 'negocios financas empreendedorismo',
  tecnologia: 'tecnologia programacao inovacao',
  saude: 'saude psicologia bem estar',
  historia: 'historia ciencia educacao',
  cultura: 'musica cultura cinema literatura',
};

function decodeHtmlEntities(input: string): string {
  return input
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractXmlTag(block: string, tagName: string): string {
  const escaped = tagName.replace(':', '\\:');
  const match = block.match(
    new RegExp(`<${escaped}(?:\\s[^>]*)?>([\\s\\S]*?)</${escaped}>`, 'i')
  );
  return match ? decodeHtmlEntities(match[1]) : '';
}

function parseItunesDuration(raw: string): number {
  const clean = raw.trim();
  if (!clean) return 0;
  if (/^\d+$/.test(clean)) return parseInt(clean, 10);
  const parts = clean.split(':').map((n) => parseInt(n, 10));
  if (parts.some((n) => Number.isNaN(n))) return 0;
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return 0;
}

function formatRssDate(rawDate: string): string {
  if (!rawDate) return 'Recente';
  const parsed = new Date(rawDate);
  if (Number.isNaN(parsed.getTime())) return rawDate.slice(0, 16);
  try {
    return parsed.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return rawDate.slice(0, 16);
  }
}

async function searchPodcastShows(
  query: string,
  category: string
): Promise<NormalizedPodcastShow[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    if (!query && (!category || category === 'destaques')) {
      const topRes = await fetch(
        'https://itunes.apple.com/br/rss/toppodcasts/limit=25/json',
        { signal: controller.signal }
      );
      if (topRes.ok) {
        const topJson = (await topRes.json()) as {
          feed?: {
            entry?: Array<{
              id?: { attributes?: { 'im:id'?: string } };
            }>;
          };
        };
        const entries = topJson.feed?.entry ?? [];
        const ids = entries
          .map((e) => e.id?.attributes?.['im:id'])
          .filter((id): id is string => Boolean(id));

        if (ids.length > 0) {
          const lookupRes = await fetch(
            `https://itunes.apple.com/lookup?id=${ids.join(',')}&entity=podcast`,
            { signal: controller.signal }
          );
          if (lookupRes.ok) {
            const lookupJson = (await lookupRes.json()) as {
              results?: Array<{
                collectionId?: number;
                collectionName?: string;
                artistName?: string;
                primaryGenreName?: string;
                artworkUrl600?: string;
                artworkUrl100?: string;
                feedUrl?: string;
                trackCount?: number;
              }>;
            };
            const shows = (lookupJson.results ?? [])
              .filter((r) => Boolean(r.feedUrl))
              .map((r) => ({
                id: String(r.collectionId || ''),
                title: r.collectionName || 'Podcast',
                host: r.artistName || 'Apresentador',
                genre: r.primaryGenreName || 'Podcast',
                coverUrl: r.artworkUrl600 || r.artworkUrl100 || '',
                feedUrl: r.feedUrl || '',
                episodeCount: r.trackCount || 0,
              }));
            if (shows.length > 0) return shows;
          }
        }
      }
    }

    const mappedCategory = PODCAST_CATEGORY_QUERIES[category] || '';
    const term =
      query ||
      (mappedCategory && mappedCategory !== '__top__'
        ? mappedCategory
        : 'podcast brasil');

    const [brRes, usRes] = await Promise.all([
      fetch(
        `https://itunes.apple.com/search?media=podcast&country=BR&term=${encodeURIComponent(
          term
        )}&limit=30`,
        { signal: controller.signal }
      ),
      query
        ? fetch(
            `https://itunes.apple.com/search?media=podcast&country=US&term=${encodeURIComponent(
              term
            )}&limit=15`,
            { signal: controller.signal }
          ).catch(() => null)
        : Promise.resolve(null),
    ]);

    const seen = new Set<string>();
    const combined: NormalizedPodcastShow[] = [];

    for (const res of [brRes, usRes]) {
      if (!res || !res.ok) continue;
      const json = (await res.json()) as {
        results?: Array<{
          collectionId?: number;
          collectionName?: string;
          artistName?: string;
          primaryGenreName?: string;
          artworkUrl600?: string;
          artworkUrl100?: string;
          feedUrl?: string;
          trackCount?: number;
        }>;
      };
      for (const r of json.results ?? []) {
        if (!r.feedUrl || !r.collectionId) continue;
        const idStr = String(r.collectionId);
        if (seen.has(idStr)) continue;
        seen.add(idStr);
        combined.push({
          id: idStr,
          title: r.collectionName || 'Podcast',
          host: r.artistName || 'Apresentador',
          genre: r.primaryGenreName || 'Podcast',
          coverUrl: r.artworkUrl600 || r.artworkUrl100 || '',
          feedUrl: r.feedUrl,
          episodeCount: r.trackCount || 0,
        });
      }
    }

    return combined;
  } catch {
    return [];
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchPodcastEpisodesFromRss(
  feedUrl: string,
  fallbackShowTitle: string,
  fallbackHost: string,
  fallbackCover: string
): Promise<NormalizedPodcastEpisode[]> {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(feedUrl);
  } catch {
    return [];
  }
  if (
    (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') ||
    isPrivateOrBlockedHost(parsedUrl.hostname)
  ) {
    return [];
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 9000);

  try {
    const res = await fetch(parsedUrl.toString(), {
      signal: controller.signal,
      headers: {
        'User-Agent': 'MeuMundoMinhaVida/1.0 (Podcast Reader)',
        Accept: 'application/rss+xml, application/xml, text/xml, */*',
      },
    });
    if (!res.ok) return [];
    const xml = await res.text();

    const channelHeader = xml.split(/<item[\s>]/i)[0] || '';
    const channelTitle =
      extractXmlTag(channelHeader, 'title') || fallbackShowTitle;
    const channelAuthor =
      extractXmlTag(channelHeader, 'itunes:author') ||
      extractXmlTag(channelHeader, 'author') ||
      fallbackHost;
    const channelImgMatch = channelHeader.match(
      /<itunes:image[^>]+href=["']([^"']+)["']/i
    );
    const channelCover = channelImgMatch?.[1] || fallbackCover;

    const itemMatches = xml.match(/<item[\s>][\s\S]*?<\/item>/gi) ?? [];
    const episodes: NormalizedPodcastEpisode[] = [];

    for (let i = 0; i < Math.min(itemMatches.length, 40); i += 1) {
      const itemXml = itemMatches[i];
      const enclosureMatch =
        itemXml.match(/<enclosure[^>]+url=["']([^"']+)["'][^>]*>/i) ||
        itemXml.match(/<media:content[^>]+url=["']([^"']+)["'][^>]*>/i);
      const audioUrl =
        enclosureMatch?.[1]?.replace(/&amp;/g, '&').trim() || '';
      if (!audioUrl.startsWith('http')) continue;

      const title = extractXmlTag(itemXml, 'title') || `Episódio ${i + 1}`;
      const rawDesc =
        extractXmlTag(itemXml, 'itunes:summary') ||
        extractXmlTag(itemXml, 'description') ||
        extractXmlTag(itemXml, 'content:encoded') ||
        'Episódio oficial via feed RSS.';
      const summary =
        rawDesc.length > 220 ? `${rawDesc.slice(0, 217).trim()}...` : rawDesc;

      const durRaw = extractXmlTag(itemXml, 'itunes:duration');
      const parsedSec = parseItunesDuration(durRaw);
      const durationSeconds = parsedSec > 0 ? parsedSec : 1800;
      const durationMinutes = Math.max(1, Math.round(durationSeconds / 60));

      const pubDate = formatRssDate(extractXmlTag(itemXml, 'pubDate'));
      const epAuthor =
        extractXmlTag(itemXml, 'itunes:author') || channelAuthor;
      const epImgMatch = itemXml.match(
        /<itunes:image[^>]+href=["']([^"']+)["']/i
      );
      const coverUrl = epImgMatch?.[1] || channelCover;
      const guid = extractXmlTag(itemXml, 'guid') || `${i}-${title.slice(0, 16)}`;

      episodes.push({
        id: `rss-${Buffer.from(guid)
          .toString('base64')
          .replace(/[^a-zA-Z0-9]/g, '')
          .slice(0, 18)}-${i}`,
        title,
        series: channelTitle,
        host: epAuthor,
        durationMinutes,
        durationSeconds,
        publishedAt: pubDate,
        summary,
        audioUrl,
        coverUrl,
        isRealAudio: true,
      });
    }

    return episodes;
  } catch {
    return [];
  } finally {
    clearTimeout(timeout);
  }
}

interface MarketRatesResponse {
  selic: number;
  cdi: number;
  ipca: number;
  poupancaAnual: number;
  usdBrl: number;
  eurBrl: number;
  btcBrl: number;
  btcChange24h: number;
  ethBrl: number;
  ethChange24h: number;
  updatedAt: string;
  isLive: boolean;
}

const FALLBACK_RATES: MarketRatesResponse = {
  selic: 13.75,
  cdi: 13.65,
  ipca: 4.63,
  poupancaAnual: 6.17,
  usdBrl: 5.75,
  eurBrl: 6.18,
  btcBrl: 351000,
  btcChange24h: 0,
  ethBrl: 9650,
  ethChange24h: 0,
  updatedAt: new Date().toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  }),
  isLive: false,
};

async function fetchJsonWithTimeout<T>(
  url: string,
  timeoutMs = 4500
): Promise<T | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'MeuMundoMinhaVida/1.0 (https://meumundominhavida.local; leitor-livros)',
        'Api-User-Agent': 'MeuMundoMinhaVida/1.0 (https://meumundominhavida.local)',
      },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchLiveMarketRates(): Promise<MarketRatesResponse> {
  const [taxasData, fxData, cryptoData] = await Promise.all([
    fetchJsonWithTimeout<Array<{ nome?: string; valor?: number }>>(
      'https://brasilapi.com.br/api/taxas/v1'
    ),
    fetchJsonWithTimeout<{ rates?: Record<string, number> }>(
      'https://open.er-api.com/v6/latest/USD'
    ),
    fetchJsonWithTimeout<{
      bitcoin?: { brl?: number; brl_24h_change?: number };
      ethereum?: { brl?: number; brl_24h_change?: number };
    }>(
      'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=brl&include_24hr_change=true'
    ),
  ]);

  let selic = FALLBACK_RATES.selic;
  let cdi = FALLBACK_RATES.cdi;
  let ipca = FALLBACK_RATES.ipca;
  let hasLiveSource = false;

  if (Array.isArray(taxasData)) {
    hasLiveSource = true;
    for (const item of taxasData) {
      const name = (item.nome || '').toLowerCase();
      if (name === 'selic' && typeof item.valor === 'number') selic = item.valor;
      if (name === 'cdi' && typeof item.valor === 'number') cdi = item.valor;
      if (name === 'ipca' && typeof item.valor === 'number') ipca = item.valor;
    }
  }

  const poupancaAnual =
    selic > 8.5 ? 6.17 : Number((selic * 0.7).toFixed(2));

  let usdBrl = FALLBACK_RATES.usdBrl;
  let eurBrl = FALLBACK_RATES.eurBrl;
  if (fxData?.rates && typeof fxData.rates.BRL === 'number') {
    hasLiveSource = true;
    usdBrl = Number(fxData.rates.BRL.toFixed(2));
    if (typeof fxData.rates.EUR === 'number' && fxData.rates.EUR > 0) {
      eurBrl = Number((fxData.rates.BRL / fxData.rates.EUR).toFixed(2));
    }
  }

  let btcBrl = FALLBACK_RATES.btcBrl;
  let btcChange24h = 0;
  let ethBrl = FALLBACK_RATES.ethBrl;
  let ethChange24h = 0;
  if (cryptoData?.bitcoin?.brl) {
    hasLiveSource = true;
    btcBrl = Math.round(cryptoData.bitcoin.brl);
    btcChange24h = Number((cryptoData.bitcoin.brl_24h_change || 0).toFixed(2));
  }
  if (cryptoData?.ethereum?.brl) {
    hasLiveSource = true;
    ethBrl = Math.round(cryptoData.ethereum.brl);
    ethChange24h = Number((cryptoData.ethereum.brl_24h_change || 0).toFixed(2));
  }

  return {
    selic,
    cdi,
    ipca,
    poupancaAnual,
    usdBrl,
    eurBrl,
    btcBrl,
    btcChange24h,
    ethBrl,
    ethChange24h,
    updatedAt: new Date().toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    }),
    isLive: hasLiveSource,
  };
}

interface NormalizedBookResult {
  id: string;
  title: string;
  author: string;
  year?: number;
  pages: number;
  coverUrl: string;
  subject: string;
  openLibraryKey?: string;
}

const BOOK_CATEGORY_QUERIES: Record<string, string> = {
  destaques: 'financas habitos lideranca',
  financas: 'investimentos educacao financeira',
  cristao: 'devocional teologia crista cs lewis',
  produtividade: 'habitos produtividade foco',
  classicos: 'literatura brasileira machado de assis',
  tecnologia: 'tecnologia programacao design',
};

async function searchBooksCatalog(
  query: string,
  category: string
): Promise<NormalizedBookResult[]> {
  const term = query || BOOK_CATEGORY_QUERIES[category] || 'investimentos financas';
  const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(
    term
  )}&limit=24`;

  const json = await fetchJsonWithTimeout<{
    docs?: Array<{
      key?: string;
      title?: string;
      author_name?: string[];
      first_publish_year?: number;
      number_of_pages_median?: number;
      cover_i?: number;
      subject?: string[];
    }>;
  }>(url, 6500);

  if (!json || !Array.isArray(json.docs)) return [];

  const seen = new Set<string>();
  const results: NormalizedBookResult[] = [];

  for (const doc of json.docs) {
    const title = (doc.title || '').trim();
    if (!title) continue;
    const key = doc.key || title.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    const author =
      Array.isArray(doc.author_name) && doc.author_name.length > 0
        ? doc.author_name.slice(0, 2).join(', ')
        : 'Autor desconhecido';

    const coverUrl =
      typeof doc.cover_i === 'number'
        ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`
        : '';

    const subject =
      Array.isArray(doc.subject) && doc.subject.length > 0
        ? doc.subject[0]
        : category && category !== 'destaques'
          ? category
          : 'Geral';

    results.push({
      id: `ol-${key.replace(/[^a-zA-Z0-9]/g, '')}`,
      title,
      author,
      year: doc.first_publish_year,
      pages:
        typeof doc.number_of_pages_median === 'number' &&
        doc.number_of_pages_median > 20
          ? doc.number_of_pages_median
          : 220,
      coverUrl,
      subject,
      openLibraryKey: doc.key,
    });
  }

  return results;
}

interface NormalizedAudiobook {
  id: string;
  identifier: string;
  title: string;
  author: string;
  description: string;
  coverUrl: string;
}

interface AudiobookTrack {
  id: string;
  title: string;
  trackNumber: number;
  durationLabel: string;
  audioUrl: string;
}

async function searchAudiobooksCatalog(
  query: string
): Promise<NormalizedAudiobook[]> {
  const cleanQ = query.trim();
  const luceneQuery = cleanQ
    ? `collection:librivoxaudio AND (${cleanQ.replace(/[():"]/g, ' ')})`
    : `collection:librivoxaudio AND (portuguese OR portugues OR brasil)`;

  const url = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(
    luceneQuery
  )}&fl[]=identifier,title,creator,description&rows=24&output=json`;

  const json = await fetchJsonWithTimeout<{
    response?: {
      docs?: Array<{
        identifier?: string;
        title?: string;
        creator?: string | string[];
        description?: string | string[];
      }>;
    };
  }>(url, 6500);

  const docs = json?.response?.docs;
  if (!Array.isArray(docs)) return [];

  return docs
    .filter((d) => typeof d.identifier === 'string' && d.identifier.length > 0)
    .map((d) => {
      const identifier = d.identifier as string;
      const author = Array.isArray(d.creator)
        ? d.creator.join(', ')
        : d.creator || 'LibriVox';
      const rawDesc = Array.isArray(d.description)
        ? d.description.join(' ')
        : d.description ||
          'Audiolivro público gratuito (LibriVox / Internet Archive).';
      const cleanDesc = decodeHtmlEntities(rawDesc);
      return {
        id: `ab-${identifier}`,
        identifier,
        title: (d.title || 'Audiolivro').trim(),
        author: author.trim(),
        description:
          cleanDesc.length > 200
            ? `${cleanDesc.slice(0, 197).trim()}...`
            : cleanDesc,
        coverUrl: `https://archive.org/services/img/${encodeURIComponent(identifier)}`,
      };
    });
}

async function fetchAudiobookTracks(identifier: string): Promise<AudiobookTrack[]> {
  const cleanId = identifier.trim();
  if (!cleanId || /[^a-zA-Z0-9_.-]/.test(cleanId)) return [];

  const json = await fetchJsonWithTimeout<{
    result?: Array<{
      name?: string;
      title?: string;
      track?: string;
      length?: string;
      format?: string;
    }>;
  }>(`https://archive.org/metadata/${encodeURIComponent(cleanId)}/files`, 6500);

  const files = json?.result;
  if (!Array.isArray(files)) return [];

  const mp3Files = files.filter(
    (f) =>
      typeof f.name === 'string' &&
      f.name.toLowerCase().endsWith('.mp3') &&
      (f.format === '128Kbps MP3' ||
        f.format === '64Kbps MP3' ||
        f.format === 'VBR MP3')
  );

  const byTitleOrBase = new Map<
    string,
    {
      file: (typeof mp3Files)[number];
      priority: number;
    }
  >();

  for (const f of mp3Files) {
    const baseName = (f.name || '')
      .replace(/(_128kb|_64kb)?\.mp3$/i, '')
      .toLowerCase();
    const priority =
      f.format === '128Kbps MP3' ? 3 : f.format === 'VBR MP3' ? 2 : 1;
    const existing = byTitleOrBase.get(baseName);
    if (!existing || priority > existing.priority) {
      byTitleOrBase.set(baseName, { file: f, priority });
    }
  }

  const tracks = Array.from(byTitleOrBase.values()).map(({ file }, idx) => {
    const trackNum = parseInt(file.track || '', 10);
    const num = Number.isFinite(trackNum) && trackNum > 0 ? trackNum : idx + 1;
    const rawLen = (file.length || '').trim();
    let durationLabel = '';
    if (/^\d+(\.\d+)?$/.test(rawLen)) {
      const totalSec = Math.round(parseFloat(rawLen));
      const m = Math.floor(totalSec / 60);
      const s = totalSec % 60;
      durationLabel = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    } else if (rawLen.includes(':')) {
      durationLabel = rawLen;
    }

    return {
      id: `${cleanId}-${num}-${file.name}`,
      title: (file.title || file.name || `Capítulo ${num}`).replace(/\.mp3$/i, ''),
      trackNumber: num,
      durationLabel: durationLabel || 'Áudio MP3',
      audioUrl: `https://archive.org/download/${encodeURIComponent(
        cleanId
      )}/${encodeURIComponent(file.name || '')}`,
    };
  });

  tracks.sort((a, b) => a.trackNumber - b.trackNumber);
  return tracks;
}

function decodeHtmlWithLineBreaks(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(
      /<div[^>]*class=["'][^"']*ws-noexport[^"']*["'][^>]*>[\s\S]*?<\/div>/gi,
      ' '
    )
    .replace(/&#32;/g, ' ')
    .replace(/&#160;|&nbsp;/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function extractParagraphsFromWikisourceHtml(html: string): string[] {
  const cleaned = html
    .replace(
      /<div[^>]*id=["']navigationHeader["'][\s\S]*?<\/div>\s*<\/div>\s*<\/div>/gi,
      ''
    )
    .replace(/<style[\s\S]*?<\/style>/gi, '');
  const matches = [...cleaned.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)];
  return matches
    .map((m) => decodeHtmlWithLineBreaks(m[1]))
    .filter(
      (p) => p.length > 2 && !p.startsWith('←') && !p.includes('Digitalização')
    );
}

function romanToNumber(roman: string): number {
  const map: Record<string, number> = {
    I: 1,
    V: 5,
    X: 10,
    L: 50,
    C: 100,
    D: 500,
    M: 1000,
  };
  let sum = 0;
  const upper = roman.toUpperCase().trim();
  if (!/^[IVXLCDM]+$/.test(upper)) return Number.MAX_SAFE_INTEGER;
  for (let i = 0; i < upper.length; i += 1) {
    const cur = map[upper[i]] || 0;
    const next = map[upper[i + 1]] || 0;
    sum += cur < next ? -cur : cur;
  }
  return sum;
}

function sortChapterTitles(titles: string[], baseTitle: string): string[] {
  const prefix = `${baseTitle}/`;
  return [...titles].sort((a, b) => {
    const subA = a.startsWith(prefix) ? a.slice(prefix.length).trim() : a;
    const subB = b.startsWith(prefix) ? b.slice(prefix.length).trim() : b;
    const numA = /^\d+$/.test(subA) ? parseInt(subA, 10) : romanToNumber(subA);
    const numB = /^\d+$/.test(subB) ? parseInt(subB, 10) : romanToNumber(subB);
    if (numA !== numB) return numA - numB;
    return a.localeCompare(b);
  });
}

async function fetchWikisourceBookText(title: string): Promise<string | null> {
  const cleanTitle = title.replace(/\([^)]*\)/g, '').trim();
  if (!cleanTitle) return null;

  const searchRes = await fetchJsonWithTimeout<{
    query?: { search?: Array<{ title?: string }> };
  }>(
    `https://pt.wikisource.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
      cleanTitle
    )}&srlimit=5&format=json`,
    5000
  );

  const hits = searchRes?.query?.search ?? [];
  if (hits.length === 0) return null;

  const lowerClean = cleanTitle.toLowerCase();
  const baseHit =
    hits.find((h) => (h.title || '').toLowerCase() === lowerClean) ||
    hits.find((h) => !(h.title || '').includes('/')) ||
    hits[0];
  const baseTitle = (baseHit?.title || '').split('/')[0].trim();
  if (!baseTitle) return null;

  const prefixRes = await fetchJsonWithTimeout<{
    query?: { prefixsearch?: Array<{ title?: string }> };
  }>(
    `https://pt.wikisource.org/w/api.php?action=query&list=prefixsearch&pssearch=${encodeURIComponent(
      `${baseTitle}/`
    )}&pslimit=25&format=json`,
    5000
  );

  const subTitles = (prefixRes?.query?.prefixsearch ?? [])
    .map((p) => p.title || '')
    .filter(Boolean);

  const pagesToFetch =
    subTitles.length > 0
      ? sortChapterTitles(subTitles, baseTitle).slice(0, 6)
      : [baseTitle];

  const chapters: string[] = [];
  for (let start = 0; start < pagesToFetch.length; start += 2) {
    const batch = pagesToFetch.slice(start, start + 2);
    const parsedPages = await Promise.all(
      batch.map((pageTitle) =>
        fetchJsonWithTimeout<{
          parse?: { title?: string; text?: { '*': string } };
        }>(
          `https://pt.wikisource.org/w/api.php?action=parse&page=${encodeURIComponent(
            pageTitle
          )}&prop=text&format=json`,
          5500
        )
      )
    );

    for (let i = 0; i < parsedPages.length; i += 1) {
      const parsed = parsedPages[i]?.parse;
      const html = parsed?.text?.['*'] || '';
      if (!html) continue;
      const paragraphs = extractParagraphsFromWikisourceHtml(html);
      if (paragraphs.length === 0) continue;
      const chLabel = parsed?.title?.includes('/')
        ? `Capítulo ${parsed.title.split('/').slice(1).join('/')}`
        : parsed?.title || `Capítulo ${start + i + 1}`;
      chapters.push(`# ${chLabel}\n${paragraphs.join('\n\n')}`);
    }
  }

  if (chapters.length === 0) return null;
  return chapters.join('\n\n---\n\n');
}

async function fetchWikipediaAndOpenLibraryText(
  title: string,
  author: string,
  openLibraryKey?: string
): Promise<string | null> {
  const cleanTitle = title.replace(/\([^)]*\)/g, '').trim();

  let resolvedKey =
    openLibraryKey && openLibraryKey.startsWith('/works/') ? openLibraryKey : '';
  if (!resolvedKey) {
    const olLookup = await fetchJsonWithTimeout<{
      docs?: Array<{ key?: string }>;
    }>(
      `https://openlibrary.org/search.json?q=${encodeURIComponent(
        `${cleanTitle} ${author}`.trim()
      )}&fields=key&limit=2`,
      4500
    );
    resolvedKey = olLookup?.docs?.[0]?.key || '';
  }

  const [wikiPtSearch, wikiTitleOnly, olWork] = await Promise.all([
    fetchJsonWithTimeout<{
      query?: { search?: Array<{ pageid?: number; title?: string }> };
    }>(
      `https://pt.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
        `${cleanTitle} ${author}`.trim()
      )}&srlimit=3&format=json`,
      5000
    ),
    fetchJsonWithTimeout<{
      query?: { search?: Array<{ pageid?: number; title?: string }> };
    }>(
      `https://pt.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
        cleanTitle
      )}&srlimit=3&format=json`,
      5000
    ),
    resolvedKey && resolvedKey.startsWith('/works/')
      ? fetchJsonWithTimeout<{
          description?: string | { value?: string };
          excerpts?: Array<{ excerpt?: string; comment?: string }>;
          first_sentence?: string | { value?: string };
        }>(`https://openlibrary.org${resolvedKey}.json`, 4500)
      : Promise.resolve(null),
  ]);

  const sections: string[] = [];

  if (olWork) {
    const desc =
      typeof olWork.description === 'string'
        ? olWork.description
        : olWork.description?.value || '';
    const firstSent =
      typeof olWork.first_sentence === 'string'
        ? olWork.first_sentence
        : olWork.first_sentence?.value || '';
    if (desc.trim()) {
      sections.push(`# Sobre a Obra\n${desc.trim()}`);
    }
    if (firstSent.trim()) {
      sections.push(`# Abertura do Livro\n“${firstSent.trim()}”`);
    }
    if (Array.isArray(olWork.excerpts) && olWork.excerpts.length > 0) {
      const excText = olWork.excerpts
        .map((e) => e.excerpt || '')
        .filter(Boolean)
        .slice(0, 3)
        .join('\n\n');
      if (excText) {
        sections.push(`# Trechos Selecionados\n${excText}`);
      }
    }
  }

  const wikiHit =
    wikiPtSearch?.query?.search?.[0] || wikiTitleOnly?.query?.search?.[0];
  if (wikiHit?.pageid) {
    const extractRes = await fetchJsonWithTimeout<{
      query?: { pages?: Record<string, { title?: string; extract?: string }> };
    }>(
      `https://pt.wikipedia.org/w/api.php?action=query&pageids=${wikiHit.pageid}&prop=extracts&explaintext=1&format=json`,
      5000
    );
    const pageObj = extractRes?.query?.pages?.[String(wikiHit.pageid)];
    const extract = (pageObj?.extract || '').trim();
    if (extract) {
      const rawBlocks = extract.split(/\n==+\s*/);
      for (let i = 0; i < Math.min(rawBlocks.length, 6); i += 1) {
        const block = rawBlocks[i].replace(/\s*==+\n/, '\n').trim();
        if (
          !block ||
          block.toLowerCase().startsWith('referências') ||
          block.toLowerCase().startsWith('ver também')
        ) {
          continue;
        }
        if (i === 0) {
          sections.push(
            `# Resumo e Contexto (${pageObj?.title || cleanTitle})\n${block}`
          );
        } else {
          const lines = block.split('\n');
          const heading = lines[0].replace(/==+/g, '').trim();
          const body = lines.slice(1).join('\n').trim();
          if (body) {
            sections.push(`# ${heading}\n${body}`);
          }
        }
      }
    }
  }

  if (sections.length === 0) return null;
  return sections.join('\n\n---\n\n');
}

export function createApiApp(): express.Express {
  const app = express();

  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      service: 'meu-mundo-minha-vida',
      timestamp: new Date().toISOString(),
    });
  });

  // Search full-length real songs by title or singer/artist
  app.get('/api/music/search', async (req, res) => {
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const artist =
      typeof req.query.artist === 'string' ? req.query.artist.trim() : '';

    const searchTerm = artist || q || 'Louvor Gospel Brasil';
    const [ytTracks, audiusTracks] = await Promise.all([
      searchYouTubeFullTracks(searchTerm, artist || undefined),
      !artist && q ? searchAudiusFullTracks(q) : Promise.resolve([]),
    ]);

    const tracks = [...ytTracks, ...audiusTracks];
    res.json({ tracks });
  });

  // Integrated YouTube search (sermons, worship, podcasts, finance, live streams)
  app.get('/api/youtube/search', async (req, res) => {
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const category =
      typeof req.query.category === 'string'
        ? req.query.category.trim().toLowerCase()
        : 'destaques';
    const videos = await searchYouTubeVideos(q, category);
    res.json({ videos });
  });

  // Resolve a pasted YouTube link or Video ID into embeddable metadata
  app.get('/api/youtube/video', async (req, res) => {
    const urlOrId =
      typeof req.query.urlOrId === 'string' ? req.query.urlOrId.trim() : '';
    if (!urlOrId) {
      res.status(400).json({ error: 'Missing urlOrId', video: null });
      return;
    }
    const video = await resolveYouTubeVideoMeta(urlOrId);
    if (!video) {
      res.status(404).json({ error: 'Invalid YouTube URL or ID', video: null });
      return;
    }
    res.json({ video });
  });

  // Search real podcasts (Brazilian Top Charts + iTunes BR & Global Catalog)
  app.get('/api/podcast/search', async (req, res) => {
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const category =
      typeof req.query.category === 'string'
        ? req.query.category.trim().toLowerCase()
        : 'destaques';
    const shows = await searchPodcastShows(q, category);
    res.json({ shows });
  });

  // Load real episodes from a podcast RSS feed
  app.get('/api/podcast/episodes', async (req, res) => {
    let feedUrl =
      typeof req.query.feedUrl === 'string' ? req.query.feedUrl.trim() : '';
    const showId = typeof req.query.id === 'string' ? req.query.id.trim() : '';
    const title =
      typeof req.query.title === 'string' ? req.query.title.trim() : 'Podcast';
    const host =
      typeof req.query.host === 'string' ? req.query.host.trim() : 'Apresentador';
    const cover =
      typeof req.query.cover === 'string' ? req.query.cover.trim() : '';

    if (!feedUrl && showId) {
      try {
        const lookup = await fetch(
          `https://itunes.apple.com/lookup?id=${encodeURIComponent(
            showId
          )}&entity=podcast`
        );
        if (lookup.ok) {
          const json = (await lookup.json()) as {
            results?: Array<{ feedUrl?: string }>;
          };
          feedUrl = json.results?.[0]?.feedUrl || '';
        }
      } catch {
        // ignore lookup failure
      }
    }

    if (!feedUrl) {
      res.status(400).json({ error: 'Missing podcast feedUrl', episodes: [] });
      return;
    }

    const episodes = await fetchPodcastEpisodesFromRss(
      feedUrl,
      title,
      host,
      cover
    );
    res.json({ episodes });
  });

  // Range-capable proxy for real podcast MP3/M4A audio files (avoids CORS/Mixed-Content issues)
  app.get('/api/podcast/audio', (req, res) => {
    const rawUrl = typeof req.query.url === 'string' ? req.query.url.trim() : '';
    if (!rawUrl) {
      res.status(400).json({ error: 'Missing podcast audio URL' });
      return;
    }

    let parsed: URL;
    try {
      parsed = new URL(rawUrl);
    } catch {
      res.status(400).json({ error: 'Invalid URL' });
      return;
    }

    if (
      (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') ||
      isPrivateOrBlockedHost(parsed.hostname)
    ) {
      res.status(403).json({ error: 'Blocked audio host' });
      return;
    }

    let upstreamReq: http.ClientRequest | null = null;
    let closed = false;

    const proxyAudio = (targetUrl: URL, redirectsLeft: number) => {
      if (closed) return;
      const client = targetUrl.protocol === 'https:' ? https : http;
      const headers: Record<string, string> = {
        'User-Agent': 'MeuMundoMinhaVida/1.0',
        Accept: '*/*',
      };
      if (typeof req.headers.range === 'string') {
        headers.Range = req.headers.range;
      }

      upstreamReq = client.get(
        targetUrl,
        { headers, timeout: 12000 },
        (upstreamRes) => {
          const status = upstreamRes.statusCode ?? 200;
          if (
            status >= 300 &&
            status < 400 &&
            upstreamRes.headers.location &&
            redirectsLeft > 0
          ) {
            upstreamRes.resume();
            try {
              const nextUrl = new URL(upstreamRes.headers.location, targetUrl);
              if (
                (nextUrl.protocol === 'http:' || nextUrl.protocol === 'https:') &&
                !isPrivateOrBlockedHost(nextUrl.hostname)
              ) {
                proxyAudio(nextUrl, redirectsLeft - 1);
                return;
              }
            } catch {
              // fall through
            }
          }

          if (status >= 400) {
            upstreamRes.resume();
            if (!res.headersSent) res.status(502).end();
            return;
          }

          res.status(status);
          res.setHeader(
            'Content-Type',
            upstreamRes.headers['content-type'] || 'audio/mpeg'
          );
          if (upstreamRes.headers['content-length']) {
            res.setHeader(
              'Content-Length',
              upstreamRes.headers['content-length']
            );
          }
          if (upstreamRes.headers['content-range']) {
            res.setHeader(
              'Content-Range',
              upstreamRes.headers['content-range']
            );
          }
          if (upstreamRes.headers['accept-ranges']) {
            res.setHeader(
              'Accept-Ranges',
              upstreamRes.headers['accept-ranges']
            );
          } else {
            res.setHeader('Accept-Ranges', 'bytes');
          }
          res.setHeader('Access-Control-Allow-Origin', '*');

          upstreamRes.pipe(res);
          upstreamRes.on('error', () => {
            if (!res.writableEnded) res.end();
          });
        }
      );

      upstreamReq.on('timeout', () => {
        upstreamReq?.destroy();
        if (!res.headersSent) res.status(504).end();
      });

      upstreamReq.on('error', () => {
        if (!res.headersSent) res.status(502).end();
      });
    };

    req.on('close', () => {
      closed = true;
      upstreamReq?.destroy();
    });

    proxyAudio(parsed, 5);
  });

  // Search real Brazilian radio stations via Radio-Browser
  app.get('/api/radio/search', async (req, res) => {
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const tag =
      typeof req.query.tag === 'string'
        ? req.query.tag.trim().toLowerCase()
        : 'gospel';
    const stations = await fetchRadioStations(q, tag);
    res.json({ stations });
  });

  // Proxy live HTTP/HTTPS radio audio streams
  app.get('/api/radio/stream', (req, res) => {
    const rawUrl = typeof req.query.url === 'string' ? req.query.url.trim() : '';
    if (!rawUrl) {
      res.status(400).json({ error: 'Missing stream URL' });
      return;
    }

    let parsed: URL;
    try {
      parsed = new URL(rawUrl);
    } catch {
      res.status(400).json({ error: 'Invalid URL' });
      return;
    }

    if (
      (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') ||
      isPrivateOrBlockedHost(parsed.hostname)
    ) {
      res.status(403).json({ error: 'Blocked stream host' });
      return;
    }

    let upstreamReq: http.ClientRequest | null = null;
    let closed = false;

    const proxyRequest = (targetUrl: URL, redirectsLeft: number) => {
      if (closed) return;
      const client = targetUrl.protocol === 'https:' ? https : http;

      upstreamReq = client.get(
        targetUrl,
        {
          headers: {
            'User-Agent': 'MeuMundoMinhaVida/1.0',
            Accept: '*/*',
          },
          timeout: 8000,
        },
        (upstreamRes) => {
          const status = upstreamRes.statusCode ?? 200;
          if (
            status >= 300 &&
            status < 400 &&
            upstreamRes.headers.location &&
            redirectsLeft > 0
          ) {
            upstreamRes.resume();
            try {
              const nextUrl = new URL(upstreamRes.headers.location, targetUrl);
              if (
                (nextUrl.protocol === 'http:' || nextUrl.protocol === 'https:') &&
                !isPrivateOrBlockedHost(nextUrl.hostname)
              ) {
                proxyRequest(nextUrl, redirectsLeft - 1);
                return;
              }
            } catch {
              // fall through
            }
          }

          if (status >= 400) {
            upstreamRes.resume();
            if (!res.headersSent) {
              res.status(502).end();
            }
            return;
          }

          const contentType =
            upstreamRes.headers['content-type'] || 'audio/mpeg';
          res.setHeader('Content-Type', contentType);
          res.setHeader('Cache-Control', 'no-cache, no-store');
          res.setHeader('Access-Control-Allow-Origin', '*');

          upstreamRes.pipe(res);
          upstreamRes.on('error', () => {
            if (!res.writableEnded) res.end();
          });
        }
      );

      upstreamReq.on('timeout', () => {
        upstreamReq?.destroy();
        if (!res.headersSent) {
          res.status(504).end();
        }
      });

      upstreamReq.on('error', () => {
        if (!res.headersSent) {
          res.status(502).end();
        }
      });
    };

    req.on('close', () => {
      closed = true;
      upstreamReq?.destroy();
    });

    proxyRequest(parsed, 3);
  });

  // Live Brazilian interest rates (Selic, CDI, IPCA), FX (USD/EUR -> BRL) & Crypto (BTC/ETH -> BRL)
  app.get('/api/finance/rates', async (_req, res) => {
    const rates = await fetchLiveMarketRates();
    res.json(rates);
  });

  // Search real books via Open Library API
  app.get('/api/books/search', async (req, res) => {
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const category =
      typeof req.query.category === 'string'
        ? req.query.category.trim().toLowerCase()
        : 'destaques';
    const books = await searchBooksCatalog(q, category);
    res.json({ books });
  });

  // Search real public-domain audiobooks (Portuguese & global via LibriVox / Internet Archive)
  app.get('/api/books/audiobooks', async (req, res) => {
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const audiobooks = await searchAudiobooksCatalog(q);
    res.json({ audiobooks });
  });

  // Load real MP3 chapters for an audiobook identifier
  app.get('/api/books/audiobook-tracks', async (req, res) => {
    const identifier =
      typeof req.query.identifier === 'string' ? req.query.identifier.trim() : '';
    if (!identifier) {
      res.status(400).json({ error: 'Missing identifier', tracks: [] });
      return;
    }
    const tracks = await fetchAudiobookTracks(identifier);
    res.json({ tracks });
  });

  const bookTextCache = new Map<
    string,
    { contentText: string; sourceLabel: string; isFullPublicText: boolean }
  >();

  // Load real written text/chapters for a book (Wikisource PT -> Open Library Work / Wikipedia PT)
  app.get('/api/books/read-text', async (req, res) => {
    const title = typeof req.query.title === 'string' ? req.query.title.trim() : '';
    const author =
      typeof req.query.author === 'string' ? req.query.author.trim() : '';
    const openLibraryKey =
      typeof req.query.openLibraryKey === 'string'
        ? req.query.openLibraryKey.trim()
        : '';

    if (!title) {
      res.status(400).json({ error: 'Missing title', contentText: '' });
      return;
    }

    const cacheKey = `${title.toLowerCase()}::${author.toLowerCase()}::${openLibraryKey}`;
    const cached = bookTextCache.get(cacheKey);
    if (cached) {
      res.json(cached);
      return;
    }

    const wikisourceText = await fetchWikisourceBookText(title);
    if (wikisourceText) {
      const payload = {
        contentText: wikisourceText,
        sourceLabel: 'Texto integral (Wikisource PT)',
        isFullPublicText: true,
      };
      bookTextCache.set(cacheKey, payload);
      res.json(payload);
      return;
    }

    const fallbackText = await fetchWikipediaAndOpenLibraryText(
      title,
      author,
      openLibraryKey || undefined
    );
    if (fallbackText) {
      const payload = {
        contentText: fallbackText,
        sourceLabel: 'Sinopse, capítulos e trechos (Open Library / Wikipédia)',
        isFullPublicText: false,
      };
      bookTextCache.set(cacheKey, payload);
      res.json(payload);
      return;
    }

    res.json({
      contentText: '',
      sourceLabel: 'Edição manual ou importação .TXT',
      isFullPublicText: false,
    });
  });

  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'API route not found' });
  });

  return app;
}
