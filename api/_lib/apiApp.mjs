import express from "express";
import { Buffer } from "node:buffer";
import http from "node:http";
import https from "node:https";
import { GoogleGenAI } from "@google/genai";
import {
  getPublicSupabaseConfig,
  getSupabaseAdminClient,
  verifySupabaseAccessToken
} from "./supabase.mjs";
const RADIO_MIRRORS = [
  "https://de1.api.radio-browser.info",
  "https://de2.api.radio-browser.info",
  "https://nl1.api.radio-browser.info"
];
function isPrivateOrBlockedHost(hostname) {
  const lower = hostname.toLowerCase();
  if (lower === "localhost" || lower === "127.0.0.1" || lower === "::1" || lower === "0.0.0.0" || lower.endsWith(".local") || lower.endsWith(".internal")) {
    return true;
  }
  if (/^(10\.|192\.168\.|169\.254\.|127\.)/.test(lower)) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(lower)) return true;
  return false;
}
function parseDurationText(text) {
  const parts = text.trim().split(":").map((p) => parseInt(p, 10));
  if (parts.some((n) => Number.isNaN(n))) return 0;
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return 0;
}
async function searchYouTubeFullTracks(query, artistFilter) {
  const searchQuery = artistFilter ? `${artistFilter} m\xFAsica oficial` : query;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8e3);
  try {
    const res = await fetch(
      `https://www.youtube.com/results?search_query=${encodeURIComponent(searchQuery)}`,
      {
        signal: controller.signal,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
          "Accept-Language": "pt-BR,pt;q=0.9"
        }
      }
    );
    if (!res.ok) return [];
    const html = await res.text();
    const start = html.indexOf("var ytInitialData = ");
    if (start === -1) return [];
    const end = html.indexOf(";<\/script>", start);
    if (end === -1) return [];
    const jsonStr = html.slice(start + "var ytInitialData = ".length, end);
    const data = JSON.parse(jsonStr);
    const results = [];
    const seen = /* @__PURE__ */ new Set();
    const walk = (node) => {
      if (!node || typeof node !== "object" || results.length >= 24) return;
      const obj = node;
      if (typeof obj.videoId === "string" && obj.title && obj.lengthText && typeof obj.lengthText === "object") {
        const videoId = obj.videoId;
        if (!seen.has(videoId)) {
          const lengthObj = obj.lengthText;
          const durText = lengthObj.simpleText || "";
          const durationSeconds = parseDurationText(durText);
          if (durationSeconds >= 75 && durationSeconds <= 900) {
            const titleObj = obj.title;
            const rawTitle = titleObj.runs?.map((r) => r.text || "").join("") || titleObj.simpleText || "M\xFAsica Completa";
            const ownerObj = obj.ownerText || obj.longBylineText;
            const channel = ownerObj?.runs?.[0]?.text?.trim() || artistFilter || "YouTube M\xFAsica";
            let cleanTitle = rawTitle.trim();
            let trackArtist = artistFilter || channel;
            const dashParts = cleanTitle.split(" - ");
            if (dashParts.length >= 2 && dashParts[0].length < 40) {
              if (!artistFilter) {
                trackArtist = dashParts[0].trim();
              }
              cleanTitle = dashParts.slice(1).join(" - ").trim();
            }
            seen.add(videoId);
            results.push({
              id: `yt-${videoId}`,
              title: cleanTitle,
              artist: trackArtist,
              album: "M\xFAsica Completa",
              durationSeconds,
              coverUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
              youtubeId: videoId,
              isRealAudio: true,
              isFullTrack: true
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
const YOUTUBE_CATEGORY_QUERIES = {
  destaques: "Louvor adora\xE7\xE3o prega\xE7\xE3o crist\xE3 podcast brasil",
  louvor: "Louvor e adora\xE7\xE3o ao vivo gospel brasil",
  palavra: "Prega\xE7\xE3o palavra de Deus mensagem devocional hoje",
  podcasts: "Podcast crist\xE3o brasil entrevista completo",
  financas: "Educa\xE7\xE3o financeira investimentos brasil iniciantes",
  aovivo: "Ao vivo not\xEDcias r\xE1dio louvor brasil"
};
function extractYouTubeVideoId(input) {
  const trimmed = input.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;
  try {
    const url = new URL(trimmed);
    const host = url.hostname.toLowerCase();
    if (!host.includes("youtube.com") && !host.includes("youtu.be")) return null;
    if (host.includes("youtu.be")) {
      const id = url.pathname.split("/").filter(Boolean)[0] || "";
      return /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
    }
    const vParam = url.searchParams.get("v");
    if (vParam && /^[a-zA-Z0-9_-]{11}$/.test(vParam)) return vParam;
    const parts = url.pathname.split("/").filter(Boolean);
    for (const seg of ["live", "shorts", "embed"]) {
      const idx = parts.indexOf(seg);
      if (idx !== -1 && parts[idx + 1] && /^[a-zA-Z0-9_-]{11}$/.test(parts[idx + 1])) {
        return parts[idx + 1];
      }
    }
    return null;
  } catch {
    return null;
  }
}
async function searchYouTubeVideos(query, category = "destaques") {
  const searchQuery = query.trim() || YOUTUBE_CATEGORY_QUERIES[category] || YOUTUBE_CATEGORY_QUERIES.destaques;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8e3);
  try {
    const res = await fetch(
      `https://www.youtube.com/results?search_query=${encodeURIComponent(searchQuery)}`,
      {
        signal: controller.signal,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
          "Accept-Language": "pt-BR,pt;q=0.9"
        }
      }
    );
    if (!res.ok) return [];
    const html = await res.text();
    const start = html.indexOf("var ytInitialData = ");
    if (start === -1) return [];
    const end = html.indexOf(";<\/script>", start);
    if (end === -1) return [];
    const jsonStr = html.slice(start + "var ytInitialData = ".length, end);
    const data = JSON.parse(jsonStr);
    const results = [];
    const seen = /* @__PURE__ */ new Set();
    const walk = (node) => {
      if (!node || typeof node !== "object" || results.length >= 24) return;
      const obj = node;
      if (typeof obj.videoId === "string" && obj.title && (obj.ownerText || obj.longBylineText)) {
        const videoId = obj.videoId;
        if (/^[a-zA-Z0-9_-]{11}$/.test(videoId) && !seen.has(videoId)) {
          const titleObj = obj.title;
          const rawTitle = titleObj.runs?.map((r) => r.text || "").join("") || titleObj.simpleText || "";
          if (rawTitle.trim()) {
            const ownerObj = obj.ownerText || obj.longBylineText;
            const channel = ownerObj?.runs?.[0]?.text?.trim() || "YouTube";
            const lengthObj = obj.lengthText;
            const badges = Array.isArray(obj.badges) ? obj.badges : [];
            const isLive = !lengthObj?.simpleText && JSON.stringify(badges).toUpperCase().includes("LIVE");
            const durationText = lengthObj?.simpleText?.trim() || (isLive ? "AO VIVO" : "V\xEDdeo");
            const viewsObj = obj.shortViewCountText || obj.viewCountText;
            const viewsText = viewsObj?.simpleText || viewsObj?.runs?.map((r) => r.text || "").join("") || "";
            const pubObj = obj.publishedTimeText;
            const publishedText = pubObj?.simpleText || "";
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
              category
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
async function resolveYouTubeVideoMeta(urlOrId) {
  const videoId = extractYouTubeVideoId(urlOrId);
  if (!videoId) return null;
  const oembed = await fetchJsonWithTimeout(
    `https://www.youtube.com/oembed?url=${encodeURIComponent(
      `https://www.youtube.com/watch?v=${videoId}`
    )}&format=json`,
    4500
  );
  return {
    id: `ytv-${videoId}`,
    videoId,
    title: oembed?.title?.trim() || `V\xEDdeo YouTube (${videoId})`,
    channel: oembed?.author_name?.trim() || "YouTube",
    durationText: "V\xEDdeo",
    viewsText: "",
    publishedText: "",
    thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    isLive: false,
    category: "direto"
  };
}
async function searchAudiusFullTracks(query) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5e3);
  try {
    const res = await fetch(
      `https://discoveryprovider.audius.co/v1/tracks/search?query=${encodeURIComponent(
        query
      )}&app_name=MeuMundoMinhaVida`,
      { signal: controller.signal }
    );
    if (!res.ok) return [];
    const json = await res.json();
    if (!Array.isArray(json.data)) return [];
    return json.data.filter((t) => typeof t.id === "string" && (t.duration || 0) >= 60).slice(0, 8).map((t) => ({
      id: `audius-${t.id}`,
      title: t.title || "Faixa Completa",
      artist: t.user?.name || "Artista",
      album: "\xC1udio Completo",
      durationSeconds: t.duration || 210,
      coverUrl: t.artwork?.["480x480"] || t.artwork?.["150x150"] || "",
      audioUrl: `https://discoveryprovider.audius.co/v1/tracks/${t.id}/stream?app_name=MeuMundoMinhaVida`,
      isRealAudio: true,
      isFullTrack: true
    }));
  } catch {
    return [];
  } finally {
    clearTimeout(timeout);
  }
}
async function fetchRadioStations(query, tag) {
  const params = new URLSearchParams({
    countrycode: "BR",
    hidebroken: "true",
    order: "clickcount",
    reverse: "true",
    limit: "30"
  });
  if (query) {
    params.set("name", query);
  }
  if (tag && tag !== "todas") {
    params.set("tag", tag);
  }
  for (const base of RADIO_MIRRORS) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6e3);
    try {
      const res = await fetch(`${base}/json/stations/search?${params.toString()}`, {
        signal: controller.signal,
        headers: { "User-Agent": "MeuMundoMinhaVida/1.0" }
      });
      clearTimeout(timeout);
      if (!res.ok) continue;
      const data = await res.json();
      if (!Array.isArray(data)) continue;
      const stations = data.filter((s) => s.hls !== 1).map((s) => {
        const streamUrl = (s.url_resolved || s.url || "").trim();
        if (!streamUrl.startsWith("http")) return null;
        const cleanName = (s.name || "R\xE1dio Online").trim();
        const fmMatch = cleanName.match(/(\d{2,3}[.,]\d)\s*(?:fm)?/i);
        const frequency = fmMatch ? `${fmMatch[1].replace(",", ".")} FM` : s.bitrate ? `${s.bitrate} kbps` : "Web FM";
        const rawTags = (s.tags || "").split(",").map((t) => t.trim()).filter(Boolean).slice(0, 2).join(" \xB7 ");
        return {
          id: s.stationuuid || `rad-${Math.random().toString(36).slice(2)}`,
          name: cleanName,
          frequency,
          program: s.state ? `${s.state}, Brasil` : "Brasil \xB7 Transmiss\xE3o ao vivo",
          genre: rawTags || (tag && tag !== "todas" ? tag : "R\xE1dio Brasil"),
          favicon: s.favicon && s.favicon.startsWith("https://") ? s.favicon : void 0,
          streamUrl,
          bitrate: s.bitrate || 128,
          codec: s.codec || "MP3",
          isLiveReal: true
        };
      }).filter((s) => s !== null);
      return stations;
    } catch {
      clearTimeout(timeout);
    }
  }
  return [];
}
const PODCAST_CATEGORY_QUERIES = {
  destaques: "__top__",
  cristao: "devocional cristao biblia gospel",
  noticias: "noticias brasil jornalismo",
  negocios: "negocios financas empreendedorismo",
  tecnologia: "tecnologia programacao inovacao",
  saude: "saude psicologia bem estar",
  historia: "historia ciencia educacao",
  cultura: "musica cultura cinema literatura"
};
function decodeHtmlEntities(input) {
  return input.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
}
function extractXmlTag(block, tagName) {
  const escaped = tagName.replace(":", "\\:");
  const match = block.match(
    new RegExp(`<${escaped}(?:\\s[^>]*)?>([\\s\\S]*?)</${escaped}>`, "i")
  );
  return match ? decodeHtmlEntities(match[1]) : "";
}
function parseItunesDuration(raw) {
  const clean = raw.trim();
  if (!clean) return 0;
  if (/^\d+$/.test(clean)) return parseInt(clean, 10);
  const parts = clean.split(":").map((n) => parseInt(n, 10));
  if (parts.some((n) => Number.isNaN(n))) return 0;
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return 0;
}
function formatRssDate(rawDate) {
  if (!rawDate) return "Recente";
  const parsed = new Date(rawDate);
  if (Number.isNaN(parsed.getTime())) return rawDate.slice(0, 16);
  try {
    return parsed.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
  } catch {
    return rawDate.slice(0, 16);
  }
}
async function searchPodcastShows(query, category) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8e3);
  try {
    if (!query && (!category || category === "destaques")) {
      const topRes = await fetch(
        "https://itunes.apple.com/br/rss/toppodcasts/limit=25/json",
        { signal: controller.signal }
      );
      if (topRes.ok) {
        const topJson = await topRes.json();
        const entries = topJson.feed?.entry ?? [];
        const ids = entries.map((e) => e.id?.attributes?.["im:id"]).filter((id) => Boolean(id));
        if (ids.length > 0) {
          const lookupRes = await fetch(
            `https://itunes.apple.com/lookup?id=${ids.join(",")}&entity=podcast`,
            { signal: controller.signal }
          );
          if (lookupRes.ok) {
            const lookupJson = await lookupRes.json();
            const shows = (lookupJson.results ?? []).filter((r) => Boolean(r.feedUrl)).map((r) => ({
              id: String(r.collectionId || ""),
              title: r.collectionName || "Podcast",
              host: r.artistName || "Apresentador",
              genre: r.primaryGenreName || "Podcast",
              coverUrl: r.artworkUrl600 || r.artworkUrl100 || "",
              feedUrl: r.feedUrl || "",
              episodeCount: r.trackCount || 0
            }));
            if (shows.length > 0) return shows;
          }
        }
      }
    }
    const mappedCategory = PODCAST_CATEGORY_QUERIES[category] || "";
    const term = query || (mappedCategory && mappedCategory !== "__top__" ? mappedCategory : "podcast brasil");
    const [brRes, usRes] = await Promise.all([
      fetch(
        `https://itunes.apple.com/search?media=podcast&country=BR&term=${encodeURIComponent(
          term
        )}&limit=30`,
        { signal: controller.signal }
      ),
      query ? fetch(
        `https://itunes.apple.com/search?media=podcast&country=US&term=${encodeURIComponent(
          term
        )}&limit=15`,
        { signal: controller.signal }
      ).catch(() => null) : Promise.resolve(null)
    ]);
    const seen = /* @__PURE__ */ new Set();
    const combined = [];
    for (const res of [brRes, usRes]) {
      if (!res || !res.ok) continue;
      const json = await res.json();
      for (const r of json.results ?? []) {
        if (!r.feedUrl || !r.collectionId) continue;
        const idStr = String(r.collectionId);
        if (seen.has(idStr)) continue;
        seen.add(idStr);
        combined.push({
          id: idStr,
          title: r.collectionName || "Podcast",
          host: r.artistName || "Apresentador",
          genre: r.primaryGenreName || "Podcast",
          coverUrl: r.artworkUrl600 || r.artworkUrl100 || "",
          feedUrl: r.feedUrl,
          episodeCount: r.trackCount || 0
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
async function fetchPodcastEpisodesFromRss(feedUrl, fallbackShowTitle, fallbackHost, fallbackCover) {
  let parsedUrl;
  try {
    parsedUrl = new URL(feedUrl);
  } catch {
    return [];
  }
  if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:" || isPrivateOrBlockedHost(parsedUrl.hostname)) {
    return [];
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 9e3);
  try {
    const res = await fetch(parsedUrl.toString(), {
      signal: controller.signal,
      headers: {
        "User-Agent": "MeuMundoMinhaVida/1.0 (Podcast Reader)",
        Accept: "application/rss+xml, application/xml, text/xml, */*"
      }
    });
    if (!res.ok) return [];
    const xml = await res.text();
    const channelHeader = xml.split(/<item[\s>]/i)[0] || "";
    const channelTitle = extractXmlTag(channelHeader, "title") || fallbackShowTitle;
    const channelAuthor = extractXmlTag(channelHeader, "itunes:author") || extractXmlTag(channelHeader, "author") || fallbackHost;
    const channelImgMatch = channelHeader.match(
      /<itunes:image[^>]+href=["']([^"']+)["']/i
    );
    const channelCover = channelImgMatch?.[1] || fallbackCover;
    const itemMatches = xml.match(/<item[\s>][\s\S]*?<\/item>/gi) ?? [];
    const episodes = [];
    for (let i = 0; i < Math.min(itemMatches.length, 40); i += 1) {
      const itemXml = itemMatches[i];
      const enclosureMatch = itemXml.match(/<enclosure[^>]+url=["']([^"']+)["'][^>]*>/i) || itemXml.match(/<media:content[^>]+url=["']([^"']+)["'][^>]*>/i);
      const audioUrl = enclosureMatch?.[1]?.replace(/&amp;/g, "&").trim() || "";
      if (!audioUrl.startsWith("http")) continue;
      const title = extractXmlTag(itemXml, "title") || `Epis\xF3dio ${i + 1}`;
      const rawDesc = extractXmlTag(itemXml, "itunes:summary") || extractXmlTag(itemXml, "description") || extractXmlTag(itemXml, "content:encoded") || "Epis\xF3dio oficial via feed RSS.";
      const summary = rawDesc.length > 220 ? `${rawDesc.slice(0, 217).trim()}...` : rawDesc;
      const durRaw = extractXmlTag(itemXml, "itunes:duration");
      const parsedSec = parseItunesDuration(durRaw);
      const durationSeconds = parsedSec > 0 ? parsedSec : 1800;
      const durationMinutes = Math.max(1, Math.round(durationSeconds / 60));
      const pubDate = formatRssDate(extractXmlTag(itemXml, "pubDate"));
      const epAuthor = extractXmlTag(itemXml, "itunes:author") || channelAuthor;
      const epImgMatch = itemXml.match(
        /<itunes:image[^>]+href=["']([^"']+)["']/i
      );
      const coverUrl = epImgMatch?.[1] || channelCover;
      const guid = extractXmlTag(itemXml, "guid") || `${i}-${title.slice(0, 16)}`;
      episodes.push({
        id: `rss-${Buffer.from(guid).toString("base64").replace(/[^a-zA-Z0-9]/g, "").slice(0, 18)}-${i}`,
        title,
        series: channelTitle,
        host: epAuthor,
        durationMinutes,
        durationSeconds,
        publishedAt: pubDate,
        summary,
        audioUrl,
        coverUrl,
        isRealAudio: true
      });
    }
    return episodes;
  } catch {
    return [];
  } finally {
    clearTimeout(timeout);
  }
}
const FALLBACK_RATES = {
  selic: 13.75,
  cdi: 13.65,
  ipca: 4.63,
  poupancaAnual: 6.17,
  usdBrl: 5.75,
  eurBrl: 6.18,
  btcBrl: 351e3,
  btcChange24h: 0,
  ethBrl: 9650,
  ethChange24h: 0,
  updatedAt: (/* @__PURE__ */ new Date()).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit"
  }),
  isLive: false
};
async function fetchJsonWithTimeout(url, timeoutMs = 4500) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "MeuMundoMinhaVida/1.0 (https://meumundominhavida.local; leitor-livros)",
        "Api-User-Agent": "MeuMundoMinhaVida/1.0 (https://meumundominhavida.local)"
      }
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
async function fetchLiveMarketRates() {
  const [taxasData, fxData, cryptoData] = await Promise.all([
    fetchJsonWithTimeout(
      "https://brasilapi.com.br/api/taxas/v1"
    ),
    fetchJsonWithTimeout(
      "https://open.er-api.com/v6/latest/USD"
    ),
    fetchJsonWithTimeout(
      "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=brl&include_24hr_change=true"
    )
  ]);
  let selic = FALLBACK_RATES.selic;
  let cdi = FALLBACK_RATES.cdi;
  let ipca = FALLBACK_RATES.ipca;
  let hasLiveSource = false;
  if (Array.isArray(taxasData)) {
    hasLiveSource = true;
    for (const item of taxasData) {
      const name = (item.nome || "").toLowerCase();
      if (name === "selic" && typeof item.valor === "number") selic = item.valor;
      if (name === "cdi" && typeof item.valor === "number") cdi = item.valor;
      if (name === "ipca" && typeof item.valor === "number") ipca = item.valor;
    }
  }
  const poupancaAnual = selic > 8.5 ? 6.17 : Number((selic * 0.7).toFixed(2));
  let usdBrl = FALLBACK_RATES.usdBrl;
  let eurBrl = FALLBACK_RATES.eurBrl;
  if (fxData?.rates && typeof fxData.rates.BRL === "number") {
    hasLiveSource = true;
    usdBrl = Number(fxData.rates.BRL.toFixed(2));
    if (typeof fxData.rates.EUR === "number" && fxData.rates.EUR > 0) {
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
    updatedAt: (/* @__PURE__ */ new Date()).toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit"
    }),
    isLive: hasLiveSource
  };
}
const BOOK_CATEGORY_QUERIES = {
  destaques: "financas habitos lideranca",
  financas: "investimentos educacao financeira",
  cristao: "devocional teologia crista cs lewis",
  produtividade: "habitos produtividade foco",
  classicos: "literatura brasileira machado de assis",
  tecnologia: "tecnologia programacao design"
};
async function searchBooksCatalog(query, category) {
  const term = query || BOOK_CATEGORY_QUERIES[category] || "investimentos financas";
  const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(
    term
  )}&limit=24`;
  const json = await fetchJsonWithTimeout(url, 6500);
  if (!json || !Array.isArray(json.docs)) return [];
  const seen = /* @__PURE__ */ new Set();
  const results = [];
  for (const doc of json.docs) {
    const title = (doc.title || "").trim();
    if (!title) continue;
    const key = doc.key || title.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const author = Array.isArray(doc.author_name) && doc.author_name.length > 0 ? doc.author_name.slice(0, 2).join(", ") : "Autor desconhecido";
    const coverUrl = typeof doc.cover_i === "number" ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg` : "";
    const subject = Array.isArray(doc.subject) && doc.subject.length > 0 ? doc.subject[0] : category && category !== "destaques" ? category : "Geral";
    results.push({
      id: `ol-${key.replace(/[^a-zA-Z0-9]/g, "")}`,
      title,
      author,
      year: doc.first_publish_year,
      pages: typeof doc.number_of_pages_median === "number" && doc.number_of_pages_median > 20 ? doc.number_of_pages_median : 220,
      coverUrl,
      subject,
      openLibraryKey: doc.key
    });
  }
  return results;
}
async function searchAudiobooksCatalog(query) {
  const cleanQ = query.trim();
  const luceneQuery = cleanQ ? `collection:librivoxaudio AND (${cleanQ.replace(/[():"]/g, " ")})` : `collection:librivoxaudio AND (portuguese OR portugues OR brasil)`;
  const url = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(
    luceneQuery
  )}&fl[]=identifier,title,creator,description&rows=24&output=json`;
  const json = await fetchJsonWithTimeout(url, 6500);
  const docs = json?.response?.docs;
  if (!Array.isArray(docs)) return [];
  return docs.filter((d) => typeof d.identifier === "string" && d.identifier.length > 0).map((d) => {
    const identifier = d.identifier;
    const author = Array.isArray(d.creator) ? d.creator.join(", ") : d.creator || "LibriVox";
    const rawDesc = Array.isArray(d.description) ? d.description.join(" ") : d.description || "Audiolivro p\xFAblico gratuito (LibriVox / Internet Archive).";
    const cleanDesc = decodeHtmlEntities(rawDesc);
    return {
      id: `ab-${identifier}`,
      identifier,
      title: (d.title || "Audiolivro").trim(),
      author: author.trim(),
      description: cleanDesc.length > 200 ? `${cleanDesc.slice(0, 197).trim()}...` : cleanDesc,
      coverUrl: `https://archive.org/services/img/${encodeURIComponent(identifier)}`
    };
  });
}
async function fetchAudiobookTracks(identifier) {
  const cleanId = identifier.trim();
  if (!cleanId || /[^a-zA-Z0-9_.-]/.test(cleanId)) return [];
  const json = await fetchJsonWithTimeout(`https://archive.org/metadata/${encodeURIComponent(cleanId)}/files`, 6500);
  const files = json?.result;
  if (!Array.isArray(files)) return [];
  const mp3Files = files.filter(
    (f) => typeof f.name === "string" && f.name.toLowerCase().endsWith(".mp3") && (f.format === "128Kbps MP3" || f.format === "64Kbps MP3" || f.format === "VBR MP3")
  );
  const byTitleOrBase = /* @__PURE__ */ new Map();
  for (const f of mp3Files) {
    const baseName = (f.name || "").replace(/(_128kb|_64kb)?\.mp3$/i, "").toLowerCase();
    const priority = f.format === "128Kbps MP3" ? 3 : f.format === "VBR MP3" ? 2 : 1;
    const existing = byTitleOrBase.get(baseName);
    if (!existing || priority > existing.priority) {
      byTitleOrBase.set(baseName, { file: f, priority });
    }
  }
  const tracks = Array.from(byTitleOrBase.values()).map(({ file }, idx) => {
    const trackNum = parseInt(file.track || "", 10);
    const num = Number.isFinite(trackNum) && trackNum > 0 ? trackNum : idx + 1;
    const rawLen = (file.length || "").trim();
    let durationLabel = "";
    if (/^\d+(\.\d+)?$/.test(rawLen)) {
      const totalSec = Math.round(parseFloat(rawLen));
      const m = Math.floor(totalSec / 60);
      const s = totalSec % 60;
      durationLabel = `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    } else if (rawLen.includes(":")) {
      durationLabel = rawLen;
    }
    return {
      id: `${cleanId}-${num}-${file.name}`,
      title: (file.title || file.name || `Cap\xEDtulo ${num}`).replace(/\.mp3$/i, ""),
      trackNumber: num,
      durationLabel: durationLabel || "\xC1udio MP3",
      audioUrl: `https://archive.org/download/${encodeURIComponent(
        cleanId
      )}/${encodeURIComponent(file.name || "")}`
    };
  });
  tracks.sort((a, b) => a.trackNumber - b.trackNumber);
  return tracks;
}
function decodeHtmlWithLineBreaks(html) {
  return html.replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<script[\s\S]*?<\/script>/gi, " ").replace(
    /<div[^>]*class=["'][^"']*ws-noexport[^"']*["'][^>]*>[\s\S]*?<\/div>/gi,
    " "
  ).replace(/&#32;/g, " ").replace(/&#160;|&nbsp;/g, " ").replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/\s+/g, " ").trim();
}
function extractParagraphsFromWikisourceHtml(html) {
  const cleaned = html.replace(
    /<div[^>]*id=["']navigationHeader["'][\s\S]*?<\/div>\s*<\/div>\s*<\/div>/gi,
    ""
  ).replace(/<style[\s\S]*?<\/style>/gi, "");
  const matches = [...cleaned.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)];
  return matches.map((m) => decodeHtmlWithLineBreaks(m[1])).filter(
    (p) => p.length > 2 && !p.startsWith("\u2190") && !p.includes("Digitaliza\xE7\xE3o")
  );
}
function romanToNumber(roman) {
  const map = {
    I: 1,
    V: 5,
    X: 10,
    L: 50,
    C: 100,
    D: 500,
    M: 1e3
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
function sortChapterTitles(titles, baseTitle) {
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
async function fetchWikisourceBookText(title) {
  const cleanTitle = title.replace(/\([^)]*\)/g, "").trim();
  if (!cleanTitle) return null;
  const searchRes = await fetchJsonWithTimeout(
    `https://pt.wikisource.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
      cleanTitle
    )}&srlimit=5&format=json`,
    5e3
  );
  const hits = searchRes?.query?.search ?? [];
  if (hits.length === 0) return null;
  const lowerClean = cleanTitle.toLowerCase();
  const baseHit = hits.find((h) => (h.title || "").toLowerCase() === lowerClean) || hits.find((h) => !(h.title || "").includes("/")) || hits[0];
  const baseTitle = (baseHit?.title || "").split("/")[0].trim();
  if (!baseTitle) return null;
  const prefixRes = await fetchJsonWithTimeout(
    `https://pt.wikisource.org/w/api.php?action=query&list=prefixsearch&pssearch=${encodeURIComponent(
      `${baseTitle}/`
    )}&pslimit=25&format=json`,
    5e3
  );
  const subTitles = (prefixRes?.query?.prefixsearch ?? []).map((p) => p.title || "").filter(Boolean);
  const pagesToFetch = subTitles.length > 0 ? sortChapterTitles(subTitles, baseTitle).slice(0, 6) : [baseTitle];
  const chapters = [];
  for (let start = 0; start < pagesToFetch.length; start += 2) {
    const batch = pagesToFetch.slice(start, start + 2);
    const parsedPages = await Promise.all(
      batch.map(
        (pageTitle) => fetchJsonWithTimeout(
          `https://pt.wikisource.org/w/api.php?action=parse&page=${encodeURIComponent(
            pageTitle
          )}&prop=text&format=json`,
          5500
        )
      )
    );
    for (let i = 0; i < parsedPages.length; i += 1) {
      const parsed = parsedPages[i]?.parse;
      const html = parsed?.text?.["*"] || "";
      if (!html) continue;
      const paragraphs = extractParagraphsFromWikisourceHtml(html);
      if (paragraphs.length === 0) continue;
      const chLabel = parsed?.title?.includes("/") ? `Cap\xEDtulo ${parsed.title.split("/").slice(1).join("/")}` : parsed?.title || `Cap\xEDtulo ${start + i + 1}`;
      chapters.push(`# ${chLabel}
${paragraphs.join("\n\n")}`);
    }
  }
  if (chapters.length === 0) return null;
  return chapters.join("\n\n---\n\n");
}
async function fetchWikipediaAndOpenLibraryText(title, author, openLibraryKey) {
  const cleanTitle = title.replace(/\([^)]*\)/g, "").trim();
  let resolvedKey = openLibraryKey && openLibraryKey.startsWith("/works/") ? openLibraryKey : "";
  if (!resolvedKey) {
    const olLookup = await fetchJsonWithTimeout(
      `https://openlibrary.org/search.json?q=${encodeURIComponent(
        `${cleanTitle} ${author}`.trim()
      )}&fields=key&limit=2`,
      4500
    );
    resolvedKey = olLookup?.docs?.[0]?.key || "";
  }
  const [wikiPtSearch, wikiTitleOnly, olWork] = await Promise.all([
    fetchJsonWithTimeout(
      `https://pt.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
        `${cleanTitle} ${author}`.trim()
      )}&srlimit=3&format=json`,
      5e3
    ),
    fetchJsonWithTimeout(
      `https://pt.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
        cleanTitle
      )}&srlimit=3&format=json`,
      5e3
    ),
    resolvedKey && resolvedKey.startsWith("/works/") ? fetchJsonWithTimeout(`https://openlibrary.org${resolvedKey}.json`, 4500) : Promise.resolve(null)
  ]);
  const sections = [];
  if (olWork) {
    const desc = typeof olWork.description === "string" ? olWork.description : olWork.description?.value || "";
    const firstSent = typeof olWork.first_sentence === "string" ? olWork.first_sentence : olWork.first_sentence?.value || "";
    if (desc.trim()) {
      sections.push(`# Sobre a Obra
${desc.trim()}`);
    }
    if (firstSent.trim()) {
      sections.push(`# Abertura do Livro
\u201C${firstSent.trim()}\u201D`);
    }
    if (Array.isArray(olWork.excerpts) && olWork.excerpts.length > 0) {
      const excText = olWork.excerpts.map((e) => e.excerpt || "").filter(Boolean).slice(0, 3).join("\n\n");
      if (excText) {
        sections.push(`# Trechos Selecionados
${excText}`);
      }
    }
  }
  const wikiHit = wikiPtSearch?.query?.search?.[0] || wikiTitleOnly?.query?.search?.[0];
  if (wikiHit?.pageid) {
    const extractRes = await fetchJsonWithTimeout(
      `https://pt.wikipedia.org/w/api.php?action=query&pageids=${wikiHit.pageid}&prop=extracts&explaintext=1&format=json`,
      5e3
    );
    const pageObj = extractRes?.query?.pages?.[String(wikiHit.pageid)];
    const extract = (pageObj?.extract || "").trim();
    if (extract) {
      const rawBlocks = extract.split(/\n==+\s*/);
      for (let i = 0; i < Math.min(rawBlocks.length, 6); i += 1) {
        const block = rawBlocks[i].replace(/\s*==+\n/, "\n").trim();
        if (!block || block.toLowerCase().startsWith("refer\xEAncias") || block.toLowerCase().startsWith("ver tamb\xE9m")) {
          continue;
        }
        if (i === 0) {
          sections.push(
            `# Resumo e Contexto (${pageObj?.title || cleanTitle})
${block}`
          );
        } else {
          const lines = block.split("\n");
          const heading = lines[0].replace(/==+/g, "").trim();
          const body = lines.slice(1).join("\n").trim();
          if (body) {
            sections.push(`# ${heading}
${body}`);
          }
        }
      }
    }
  }
  if (sections.length === 0) return null;
  return sections.join("\n\n---\n\n");
}
function createApiApp() {
  const app = express();
  app.use(express.json({ limit: "4mb" }));
  app.get(["/api", "/api/health"], (_req, res) => {
    res.json({
      ok: true,
      service: "meu-mundo-minha-vida",
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  });
  app.get("/api/supabase/config", (_req, res) => {
    res.json(getPublicSupabaseConfig());
  });
  app.post("/api/supabase/signup", async (req, res) => {
    const admin = getSupabaseAdminClient();
    if (!admin) {
      res.status(503).json({
        ok: false,
        needsAdminFallback: true,
        error: "Supabase server credentials not configured"
      });
      return;
    }
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const rawIdentifier = typeof body.email === "string" && body.email.trim() ? body.email.trim() : typeof body.login === "string" ? body.login.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const fullName = typeof body.fullName === "string" ? body.fullName.trim() : "";
    if (!rawIdentifier || rawIdentifier.length < 2) {
      res.status(400).json({ ok: false, error: "Informe um usuário ou login válido (mínimo 2 caracteres)." });
      return;
    }
    if (password.length < 6) {
      res.status(400).json({ ok: false, error: "A senha deve ter no mínimo 6 caracteres." });
      return;
    }
    let resolvedEmail = rawIdentifier.toLowerCase();
    if (!resolvedEmail.includes("@")) {
      const slug = resolvedEmail
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, ".")
        .replace(/[^a-z0-9._-]/g, "")
        .replace(/\.{2,}/g, ".")
        .replace(/^\.+|\.+$/g, "");
      if (slug.length < 2) {
        res.status(400).json({ ok: false, error: "Use letras ou números para criar o seu usuário." });
        return;
      }
      resolvedEmail = `${slug}@login.meumundominhavida.app`;
    }
    const { data, error } = await admin.auth.admin.createUser({
      email: resolvedEmail,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName || rawIdentifier,
        login_name: rawIdentifier
      }
    });
    if (error) {
      const msg = (error.message || "").toLowerCase();
      if (msg.includes("already") || msg.includes("exists") || error.status === 422) {
        res.status(409).json({
          ok: false,
          error: "Este login ou e-mail já possui cadastro. Use a aba Entrar."
        });
        return;
      }
      if (msg.includes("email")) {
        res.status(400).json({ ok: false, error: "Informe um login ou e-mail válido." });
        return;
      }
      res.status(400).json({ ok: false, error: error.message || "Não foi possível criar sua conta." });
      return;
    }
    res.status(201).json({
      ok: true,
      email: resolvedEmail,
      userId: data.user?.id || null
    });
  });
  app.get("/api/supabase/state", async (req, res) => {
    const authHeader = typeof req.headers.authorization === "string" ? req.headers.authorization : "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
    if (!token) {
      res.status(401).json({ error: "Missing access token" });
      return;
    }
    const authUser = await verifySupabaseAccessToken(token);
    if (!authUser) {
      res.status(401).json({ error: "Invalid or expired session token" });
      return;
    }
    const admin = getSupabaseAdminClient();
    if (!admin) {
      res.status(503).json({ error: "Supabase server credentials not configured" });
      return;
    }
    const [stateRes, profileRes] = await Promise.all([
      admin.from("user_app_states").select("state_json, updated_at").eq("user_id", authUser.id).maybeSingle(),
      admin.from("profiles").select("*").eq("id", authUser.id).maybeSingle()
    ]);
    const dbError = stateRes.error || profileRes.error;
    if (dbError) {
      const code = dbError.code || "";
      const needsSchema = code === "42P01" || code === "PGRST205" || (dbError.message || "").includes("does not exist") || (dbError.message || "").includes("schema cache");
      res.status(needsSchema ? 503 : 500).json({
        error: needsSchema ? "Tabelas do Supabase ainda não criadas. Execute o script supabase/schema.sql no SQL Editor." : "Falha ao ler dados no Supabase.",
        needsSchema
      });
      return;
    }
    res.json({
      state: stateRes.data?.state_json || null,
      profile: profileRes.data || null,
      updatedAt: stateRes.data?.updated_at || null
    });
  });
  app.put("/api/supabase/state", async (req, res) => {
    const authHeader = typeof req.headers.authorization === "string" ? req.headers.authorization : "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
    if (!token) {
      res.status(401).json({ error: "Missing access token" });
      return;
    }
    const authUser = await verifySupabaseAccessToken(token);
    if (!authUser) {
      res.status(401).json({ error: "Invalid or expired session token" });
      return;
    }
    const admin = getSupabaseAdminClient();
    if (!admin) {
      res.status(503).json({ error: "Supabase server credentials not configured" });
      return;
    }
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const statePayload = body.state && typeof body.state === "object" ? body.state : null;
    if (!statePayload) {
      res.status(400).json({ error: "Missing state payload" });
      return;
    }
    const nowIso = (/* @__PURE__ */ new Date()).toISOString();
    const profileObj = statePayload.profile && typeof statePayload.profile === "object" ? statePayload.profile : {};
    const [stateUpsert, profileUpsert] = await Promise.all([
      admin.from("user_app_states").upsert({
        user_id: authUser.id,
        state_json: statePayload,
        updated_at: nowIso
      }, { onConflict: "user_id" }),
      admin.from("profiles").upsert({
        id: authUser.id,
        email: typeof profileObj.email === "string" && profileObj.email ? profileObj.email : authUser.email,
        full_name: typeof profileObj.fullName === "string" ? profileObj.fullName : "",
        phone: typeof profileObj.phone === "string" ? profileObj.phone : "",
        birthdate: typeof profileObj.birthdate === "string" ? profileObj.birthdate : "",
        city: typeof profileObj.city === "string" ? profileObj.city : "",
        avatar_url: typeof profileObj.avatarUrl === "string" ? profileObj.avatarUrl : "",
        member_since: typeof profileObj.memberSince === "string" ? profileObj.memberSince : "",
        daily_devotional_reminder: typeof profileObj.dailyDevotionalReminder === "boolean" ? profileObj.dailyDevotionalReminder : true,
        agenda_alerts: typeof profileObj.agendaAlerts === "boolean" ? profileObj.agendaAlerts : true,
        updated_at: nowIso
      }, { onConflict: "id" })
    ]);
    const dbError = stateUpsert.error || profileUpsert.error;
    if (dbError) {
      const code = dbError.code || "";
      const needsSchema = code === "42P01" || code === "PGRST205" || (dbError.message || "").includes("does not exist") || (dbError.message || "").includes("schema cache");
      res.status(needsSchema ? 503 : 500).json({
        error: needsSchema ? "Tabelas do Supabase ainda não criadas. Execute o script supabase/schema.sql no SQL Editor." : "Falha ao salvar dados no Supabase.",
        needsSchema
      });
      return;
    }
    res.json({ ok: true, updatedAt: nowIso });
  });
  app.get("/api/music/search", async (req, res) => {
    const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
    const artist = typeof req.query.artist === "string" ? req.query.artist.trim() : "";
    const searchTerm = artist || q || "Louvor Gospel Brasil";
    const [ytTracks, audiusTracks] = await Promise.all([
      searchYouTubeFullTracks(searchTerm, artist || void 0),
      !artist && q ? searchAudiusFullTracks(q) : Promise.resolve([])
    ]);
    const tracks = [...ytTracks, ...audiusTracks];
    res.json({ tracks });
  });
  app.get("/api/youtube/search", async (req, res) => {
    const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
    const category = typeof req.query.category === "string" ? req.query.category.trim().toLowerCase() : "destaques";
    const videos = await searchYouTubeVideos(q, category);
    res.json({ videos });
  });
  app.get("/api/youtube/video", async (req, res) => {
    const urlOrId = typeof req.query.urlOrId === "string" ? req.query.urlOrId.trim() : "";
    if (!urlOrId) {
      res.status(400).json({ error: "Missing urlOrId", video: null });
      return;
    }
    const video = await resolveYouTubeVideoMeta(urlOrId);
    if (!video) {
      res.status(404).json({ error: "Invalid YouTube URL or ID", video: null });
      return;
    }
    res.json({ video });
  });
  app.get("/api/podcast/search", async (req, res) => {
    const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
    const category = typeof req.query.category === "string" ? req.query.category.trim().toLowerCase() : "destaques";
    const shows = await searchPodcastShows(q, category);
    res.json({ shows });
  });
  app.get("/api/podcast/episodes", async (req, res) => {
    let feedUrl = typeof req.query.feedUrl === "string" ? req.query.feedUrl.trim() : "";
    const showId = typeof req.query.id === "string" ? req.query.id.trim() : "";
    const title = typeof req.query.title === "string" ? req.query.title.trim() : "Podcast";
    const host = typeof req.query.host === "string" ? req.query.host.trim() : "Apresentador";
    const cover = typeof req.query.cover === "string" ? req.query.cover.trim() : "";
    if (!feedUrl && showId) {
      try {
        const lookup = await fetch(
          `https://itunes.apple.com/lookup?id=${encodeURIComponent(
            showId
          )}&entity=podcast`
        );
        if (lookup.ok) {
          const json = await lookup.json();
          feedUrl = json.results?.[0]?.feedUrl || "";
        }
      } catch {
      }
    }
    if (!feedUrl) {
      res.status(400).json({ error: "Missing podcast feedUrl", episodes: [] });
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
  app.get("/api/podcast/audio", (req, res) => {
    const rawUrl = typeof req.query.url === "string" ? req.query.url.trim() : "";
    if (!rawUrl) {
      res.status(400).json({ error: "Missing podcast audio URL" });
      return;
    }
    let parsed;
    try {
      parsed = new URL(rawUrl);
    } catch {
      res.status(400).json({ error: "Invalid URL" });
      return;
    }
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:" || isPrivateOrBlockedHost(parsed.hostname)) {
      res.status(403).json({ error: "Blocked audio host" });
      return;
    }
    let upstreamReq = null;
    let closed = false;
    const proxyAudio = (targetUrl, redirectsLeft) => {
      if (closed) return;
      const client = targetUrl.protocol === "https:" ? https : http;
      const headers = {
        "User-Agent": "MeuMundoMinhaVida/1.0",
        Accept: "*/*"
      };
      if (typeof req.headers.range === "string") {
        headers.Range = req.headers.range;
      }
      upstreamReq = client.get(
        targetUrl,
        { headers, timeout: 12e3 },
        (upstreamRes) => {
          const status = upstreamRes.statusCode ?? 200;
          if (status >= 300 && status < 400 && upstreamRes.headers.location && redirectsLeft > 0) {
            upstreamRes.resume();
            try {
              const nextUrl = new URL(upstreamRes.headers.location, targetUrl);
              if ((nextUrl.protocol === "http:" || nextUrl.protocol === "https:") && !isPrivateOrBlockedHost(nextUrl.hostname)) {
                proxyAudio(nextUrl, redirectsLeft - 1);
                return;
              }
            } catch {
            }
          }
          if (status >= 400) {
            upstreamRes.resume();
            if (!res.headersSent) res.status(502).end();
            return;
          }
          res.status(status);
          res.setHeader(
            "Content-Type",
            upstreamRes.headers["content-type"] || "audio/mpeg"
          );
          if (upstreamRes.headers["content-length"]) {
            res.setHeader(
              "Content-Length",
              upstreamRes.headers["content-length"]
            );
          }
          if (upstreamRes.headers["content-range"]) {
            res.setHeader(
              "Content-Range",
              upstreamRes.headers["content-range"]
            );
          }
          if (upstreamRes.headers["accept-ranges"]) {
            res.setHeader(
              "Accept-Ranges",
              upstreamRes.headers["accept-ranges"]
            );
          } else {
            res.setHeader("Accept-Ranges", "bytes");
          }
          res.setHeader("Access-Control-Allow-Origin", "*");
          upstreamRes.pipe(res);
          upstreamRes.on("error", () => {
            if (!res.writableEnded) res.end();
          });
        }
      );
      upstreamReq.on("timeout", () => {
        upstreamReq?.destroy();
        if (!res.headersSent) res.status(504).end();
      });
      upstreamReq.on("error", () => {
        if (!res.headersSent) res.status(502).end();
      });
    };
    req.on("close", () => {
      closed = true;
      upstreamReq?.destroy();
    });
    proxyAudio(parsed, 5);
  });
  app.get("/api/radio/search", async (req, res) => {
    const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
    const tag = typeof req.query.tag === "string" ? req.query.tag.trim().toLowerCase() : "gospel";
    const stations = await fetchRadioStations(q, tag);
    res.json({ stations });
  });
  app.get("/api/radio/stream", (req, res) => {
    const rawUrl = typeof req.query.url === "string" ? req.query.url.trim() : "";
    if (!rawUrl) {
      res.status(400).json({ error: "Missing stream URL" });
      return;
    }
    let parsed;
    try {
      parsed = new URL(rawUrl);
    } catch {
      res.status(400).json({ error: "Invalid URL" });
      return;
    }
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:" || isPrivateOrBlockedHost(parsed.hostname)) {
      res.status(403).json({ error: "Blocked stream host" });
      return;
    }
    let upstreamReq = null;
    let closed = false;
    const proxyRequest = (targetUrl, redirectsLeft) => {
      if (closed) return;
      const client = targetUrl.protocol === "https:" ? https : http;
      upstreamReq = client.get(
        targetUrl,
        {
          headers: {
            "User-Agent": "MeuMundoMinhaVida/1.0",
            Accept: "*/*"
          },
          timeout: 8e3
        },
        (upstreamRes) => {
          const status = upstreamRes.statusCode ?? 200;
          if (status >= 300 && status < 400 && upstreamRes.headers.location && redirectsLeft > 0) {
            upstreamRes.resume();
            try {
              const nextUrl = new URL(upstreamRes.headers.location, targetUrl);
              if ((nextUrl.protocol === "http:" || nextUrl.protocol === "https:") && !isPrivateOrBlockedHost(nextUrl.hostname)) {
                proxyRequest(nextUrl, redirectsLeft - 1);
                return;
              }
            } catch {
            }
          }
          if (status >= 400) {
            upstreamRes.resume();
            if (!res.headersSent) {
              res.status(502).end();
            }
            return;
          }
          const contentType = upstreamRes.headers["content-type"] || "audio/mpeg";
          res.setHeader("Content-Type", contentType);
          res.setHeader("Cache-Control", "no-cache, no-store");
          res.setHeader("Access-Control-Allow-Origin", "*");
          upstreamRes.pipe(res);
          upstreamRes.on("error", () => {
            if (!res.writableEnded) res.end();
          });
        }
      );
      upstreamReq.on("timeout", () => {
        upstreamReq?.destroy();
        if (!res.headersSent) {
          res.status(504).end();
        }
      });
      upstreamReq.on("error", () => {
        if (!res.headersSent) {
          res.status(502).end();
        }
      });
    };
    req.on("close", () => {
      closed = true;
      upstreamReq?.destroy();
    });
    proxyRequest(parsed, 3);
  });
  app.get("/api/finance/rates", async (_req, res) => {
    const rates = await fetchLiveMarketRates();
    res.json(rates);
  });
  app.get("/api/books/search", async (req, res) => {
    const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
    const category = typeof req.query.category === "string" ? req.query.category.trim().toLowerCase() : "destaques";
    const books = await searchBooksCatalog(q, category);
    res.json({ books });
  });
  app.get("/api/books/audiobooks", async (req, res) => {
    const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
    const audiobooks = await searchAudiobooksCatalog(q);
    res.json({ audiobooks });
  });
  app.get("/api/books/audiobook-tracks", async (req, res) => {
    const identifier = typeof req.query.identifier === "string" ? req.query.identifier.trim() : "";
    if (!identifier) {
      res.status(400).json({ error: "Missing identifier", tracks: [] });
      return;
    }
    const tracks = await fetchAudiobookTracks(identifier);
    res.json({ tracks });
  });
  const bookTextCache = /* @__PURE__ */ new Map();
  app.get("/api/books/read-text", async (req, res) => {
    const title = typeof req.query.title === "string" ? req.query.title.trim() : "";
    const author = typeof req.query.author === "string" ? req.query.author.trim() : "";
    const openLibraryKey = typeof req.query.openLibraryKey === "string" ? req.query.openLibraryKey.trim() : "";
    if (!title) {
      res.status(400).json({ error: "Missing title", contentText: "" });
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
        sourceLabel: "Texto integral (Wikisource PT)",
        isFullPublicText: true
      };
      bookTextCache.set(cacheKey, payload);
      res.json(payload);
      return;
    }
    const fallbackText = await fetchWikipediaAndOpenLibraryText(
      title,
      author,
      openLibraryKey || void 0
    );
    if (fallbackText) {
      const payload = {
        contentText: fallbackText,
        sourceLabel: "Sinopse, cap\xEDtulos e trechos (Open Library / Wikip\xE9dia)",
        isFullPublicText: false
      };
      bookTextCache.set(cacheKey, payload);
      res.json(payload);
      return;
    }
    res.json({
      contentText: "",
      sourceLabel: "Edi\xE7\xE3o manual ou importa\xE7\xE3o .TXT",
      isFullPublicText: false
    });
  });
  app.post("/api/assistant/chat", async (req, res) => {
    const apiKey = (process.env.GEMINI_API_KEY || "").trim();
    if (!apiKey) {
      res.status(503).json({
        ok: false,
        error: "Serviço de inteligência artificial indisponível no servidor (chave não configurada)."
      });
      return;
    }

    const body = req.body && typeof req.body === "object" ? req.body : {};
    const message = typeof body.message === "string" ? body.message.trim() : "";
    if (!message) {
      res.status(400).json({ ok: false, error: "Envie uma pergunta ou solicitação para o assistente." });
      return;
    }

    const history = Array.isArray(body.history) ? body.history.slice(-10) : [];
    const contextSummary = typeof body.contextSummary === "string" ? body.contextSummary.slice(0, 4000) : "";

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build"
        }
      }
    });

    const systemInstruction = [
      "Você é o 'Meu Assistente Inteligente' integrado ao aplicativo pessoal 'Meu Mundo Minha Vida'.",
      "Responda sempre em Português do Brasil (pt-BR), com tom acolhedor, objetivo, prático e organizado.",
      "Ajude o usuário com planejamento do dia, hábitos e rotinas, reflexões de diário, desempenho pessoal, organização financeira, estudos, metas e bem-estar.",
      "Quando o usuário pedir análises ou sugestões, use os dados reais do resumo do aplicativo fornecido abaixo sem inventar números que não existam.",
      "Mantenha as respostas bem estruturadas, fáceis de ler no celular, usando listas curtas quando fizer sentido.",
      contextSummary ? `\nContexto atual do usuário no aplicativo:\n${contextSummary}` : ""
    ].filter(Boolean).join("\n");

    const contents = [];
    for (const item of history) {
      if (!item || typeof item !== "object") continue;
      const text = typeof item.text === "string" ? item.text.trim() : "";
      if (!text) continue;
      const role = item.role === "assistant" ? "model" : "user";
      contents.push({ role, parts: [{ text }] });
    }
    contents.push({ role: "user", parts: [{ text: message }] });

    try {
      const response = await ai.models.generateContent({
        model: "gemini-4-hydrogen",
        contents,
        config: {
          systemInstruction
        }
      });
      const reply = (response.text || "").trim();
      if (!reply) {
        res.status(502).json({
          ok: false,
          error: "O assistente não retornou resposta desta vez. Tente reformular sua pergunta."
        });
        return;
      }
      res.json({ ok: true, reply });
    } catch (err) {
      const rawMsg = err instanceof Error ? err.message : "";
      let friendlyMsg = "Não foi possível obter resposta do assistente agora. Tente novamente em instantes.";
      if (rawMsg.includes("503") || rawMsg.includes("UNAVAILABLE") || rawMsg.toLowerCase().includes("high demand")) {
        friendlyMsg = "O serviço de IA está com alta demanda neste momento. Aguarde alguns segundos e tente novamente.";
      } else if (rawMsg.includes("429") || rawMsg.toLowerCase().includes("quota")) {
        friendlyMsg = "Limite temporário de solicitações atingido. Tente novamente em alguns instantes.";
      }
      res.status(502).json({ ok: false, error: friendlyMsg });
    }
  });
  app.use("/api", (_req, res) => {
    res.status(404).json({ error: "API route not found" });
  });
  return app;
}
export {
  createApiApp
};
