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
const MUSIC_PAGE_SUFFIXES = ["", "ao vivo", "oficial", "completo", "acústico", "álbum", "clipe", "louvor"];
async function searchYouTubeFullTracks(query, artistFilter, page = 1) {
  const safePage = Math.max(1, page);
  const suffix = MUSIC_PAGE_SUFFIXES[(safePage - 1) % MUSIC_PAGE_SUFFIXES.length];
  const baseQuery = artistFilter ? `${artistFilter} música oficial` : query;
  const searchQuery = suffix ? `${baseQuery} ${suffix}` : baseQuery;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8e3);
  try {
    const res = await fetch(
      `https://www.youtube.com/results?search_query=${encodeURIComponent(searchQuery)}&hl=pt&gl=BR`,
      {
        signal: controller.signal,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
          "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
          "Cookie": "SOCS=CAESHAgBEhJnd3NfMjAyMzA4MTAtMF9SQzIaAmVuIAEaBgiA_LyaBg; CONSENT=YES+cb"
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
      if (!node || typeof node !== "object" || results.length >= 50) return;
      const obj = node;
      if (typeof obj.videoId === "string" && obj.title && obj.lengthText && typeof obj.lengthText === "object") {
        const videoId = obj.videoId;
        if (/^[a-zA-Z0-9_-]{11}$/.test(videoId) && !seen.has(videoId)) {
          const lengthObj = obj.lengthText;
          const durText = lengthObj.simpleText || (Array.isArray(lengthObj.runs) ? lengthObj.runs.map((r) => r.text || "").join("") : "");
          const durationSeconds = parseDurationText(durText);
          if (durationSeconds >= 30 && durationSeconds <= 14400) {
            const titleObj = obj.title;
            const rawTitle = titleObj.runs?.map((r) => r.text || "").join("") || titleObj.simpleText || "Música Completa";
            const ownerObj = obj.ownerText || obj.longBylineText;
            const channel = ownerObj?.runs?.[0]?.text?.trim() || artistFilter || "YouTube";
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
              album: `YouTube · ${channel}`,
              durationSeconds,
              coverUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
              youtubeId: videoId,
              isRealAudio: true,
              isFullTrack: true,
              isDownloadable: false,
              sourceLabel: "YouTube"
            });
          }
        }
      } else if (
        typeof obj.contentId === "string" &&
        /^[a-zA-Z0-9_-]{11}$/.test(obj.contentId) &&
        obj.metadata?.lockupMetadataViewModel?.title?.content &&
        !seen.has(obj.contentId)
      ) {
        const videoId = obj.contentId;
        const rawTitle = String(obj.metadata.lockupMetadataViewModel.title.content).trim();
        const metaRows = obj.metadata?.lockupMetadataViewModel?.metadata?.contentMetadataViewModel?.metadataRows;
        const channel = Array.isArray(metaRows) && metaRows[0]?.metadataParts?.[0]?.text?.content
          ? String(metaRows[0].metadataParts[0].text.content).trim()
          : artistFilter || "YouTube";
        seen.add(videoId);
        results.push({
          id: `yt-${videoId}`,
          title: rawTitle,
          artist: artistFilter || channel,
          album: `YouTube · ${channel}`,
          durationSeconds: 240,
          coverUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
          youtubeId: videoId,
          isRealAudio: true,
          isFullTrack: true,
          isDownloadable: false,
          sourceLabel: "YouTube"
        });
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
async function searchDeezerTracks(query, page = 1) {
  const safePage = Math.max(1, page);
  const limit = 16;
  const index = (safePage - 1) * limit;
  const json = await fetchJsonWithTimeout(
    `https://api.deezer.com/search?q=${encodeURIComponent(query)}&limit=${limit}&index=${index}`,
    4500
  );
  if (!Array.isArray(json?.data)) return [];
  return json.data.filter((t) => typeof t?.id !== "undefined" && typeof t?.preview === "string" && t.preview.startsWith("http")).map((t) => ({
    id: `dz-${t.id}`,
    title: String(t.title || "Música").trim(),
    artist: String(t.artist?.name || "Artista").trim(),
    album: t.album?.title ? `${t.album.title} (Deezer · Prévia MP3)` : "Deezer · Prévia MP3",
    durationSeconds: 30,
    coverUrl: t.album?.cover_xl || t.album?.cover_medium || t.artist?.picture_medium || "",
    audioUrl: t.preview,
    isRealAudio: true,
    isFullTrack: false,
    isDownloadable: true,
    sourceLabel: "Deezer"
  }));
}
async function searchItunesTracks(query, page = 1) {
  const safePage = Math.max(1, page);
  const limit = 16;
  const offset = (safePage - 1) * limit;
  const json = await fetchJsonWithTimeout(
    `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&country=BR&limit=${limit}&offset=${offset}`,
    4500
  );
  if (!Array.isArray(json?.results)) return [];
  return json.results.filter((t) => typeof t?.trackId !== "undefined" && typeof t?.previewUrl === "string" && t.previewUrl.startsWith("http")).map((t) => ({
    id: `itunes-${t.trackId}`,
    title: String(t.trackName || "Música").trim(),
    artist: String(t.artistName || "Artista").trim(),
    album: t.collectionName ? `${t.collectionName} (Apple Music · Prévia)` : "Apple Music · Prévia",
    durationSeconds: 30,
    coverUrl: typeof t.artworkUrl100 === "string" ? t.artworkUrl100.replace("100x100bb", "400x400bb") : "",
    audioUrl: t.previewUrl,
    isRealAudio: true,
    isFullTrack: false,
    isDownloadable: true,
    sourceLabel: "Apple Music"
  }));
}
async function searchAudiusFullTracks(query, page = 1) {
  const safePage = Math.max(1, page);
  const limit = 24;
  const offset = (safePage - 1) * limit;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5500);
  try {
    const res = await fetch(
      `https://discoveryprovider.audius.co/v1/tracks/search?query=${encodeURIComponent(
        query
      )}&limit=${limit}&offset=${offset}&app_name=MeuMundoMinhaVida`,
      { signal: controller.signal }
    );
    if (!res.ok) return [];
    const json = await res.json();
    if (!Array.isArray(json.data)) return [];
    return json.data.filter((t) => typeof t.id === "string" && (t.duration || 0) >= 30).map((t) => ({
      id: `audius-${t.id}`,
      title: t.title || "Faixa Completa",
      artist: t.user?.name || "Artista",
      album: "MP3 Completo · Audius",
      durationSeconds: t.duration || 210,
      coverUrl: t.artwork?.["480x480"] || t.artwork?.["150x150"] || "",
      audioUrl: `https://discoveryprovider.audius.co/v1/tracks/${t.id}/stream?app_name=MeuMundoMinhaVida`,
      isRealAudio: true,
      isFullTrack: true,
      isDownloadable: true,
      sourceLabel: "Audius · MP3"
    }));
  } catch {
    return [];
  } finally {
    clearTimeout(timeout);
  }
}
async function searchArchiveMusicTracks(query, page = 1) {
  const safePage = Math.max(1, page);
  const cleanQ = query.replace(/[():"]/g, " ").trim();
  const lucene = cleanQ
    ? `mediatype:audio AND format:MP3 AND (${cleanQ})`
    : `mediatype:audio AND format:MP3 AND (music OR gospel OR instrumental)`;
  const searchJson = await fetchJsonWithTimeout(
    `https://archive.org/advancedsearch.php?q=${encodeURIComponent(
      lucene
    )}&fl[]=identifier,title,creator&rows=12&page=${safePage}&output=json`,
    5500
  );
  const docs = searchJson?.response?.docs;
  if (!Array.isArray(docs) || docs.length === 0) return [];
  const resolved = await Promise.all(
    docs.slice(0, 8).map(async (d) => {
      const identifier = typeof d.identifier === "string" ? d.identifier.trim() : "";
      if (!identifier || /[^a-zA-Z0-9_.-]/.test(identifier)) return null;
      const meta = await fetchJsonWithTimeout(
        `https://archive.org/metadata/${encodeURIComponent(identifier)}/files`,
        4e3
      );
      const files = Array.isArray(meta?.result) ? meta.result : [];
      const mp3 = files.find(
        (f) => typeof f.name === "string" && f.name.toLowerCase().endsWith(".mp3")
      );
      if (!mp3?.name) return null;
      const rawLen = parseFloat(mp3.length || "0");
      const creator = Array.isArray(d.creator) ? d.creator[0] : d.creator;
      return {
        id: `arc-${identifier}`,
        title: String(d.title || mp3.title || "Áudio MP3").trim(),
        artist: String(creator || "Arquivo Público").trim(),
        album: "MP3 Completo · Archive",
        durationSeconds: Number.isFinite(rawLen) && rawLen > 20 ? Math.round(rawLen) : 240,
        coverUrl: `https://archive.org/services/img/${encodeURIComponent(identifier)}`,
        audioUrl: `https://archive.org/download/${encodeURIComponent(identifier)}/${encodeURIComponent(mp3.name)}`,
        isRealAudio: true,
        isFullTrack: true,
        isDownloadable: true,
        sourceLabel: "Archive · MP3"
      };
    })
  );
  return resolved.filter((t) => t !== null);
}
function mapRadioBrowserStation(s, fallbackTag, forceWebRadio = false) {
  if (!s || s.hls === 1) return null;
  const streamUrl = (s.url_resolved || s.url || "").trim();
  if (!streamUrl.startsWith("http")) return null;
  const cleanName = (s.name || "Rádio Online").trim();
  const rawTags = (s.tags || "").split(",").map((t) => t.trim()).filter(Boolean);
  const tagString = rawTags.join(" ").toLowerCase();
  const isWeb = forceWebRadio || tagString.includes("web") || cleanName.toLowerCase().includes("web");
  const fmMatch = cleanName.match(/(\d{2,3}[.,]\d)\s*(?:fm)?/i);
  const frequency = isWeb && !fmMatch
    ? `Web · ${s.bitrate || 128} kbps`
    : fmMatch
      ? `${fmMatch[1].replace(",", ".")} FM`
      : s.bitrate
        ? `${s.bitrate} kbps`
        : "Web Radio";
  const locationLabel = s.countrycode && s.countrycode !== "BR"
    ? `${s.country || s.countrycode} · Ao vivo`
    : s.state
      ? `${s.state}, Brasil`
      : isWeb
        ? "Rádio Web · Ao vivo"
        : "Brasil · Transmissão ao vivo";
  return {
    id: s.stationuuid || `rad-${Math.random().toString(36).slice(2)}`,
    name: cleanName,
    frequency,
    program: locationLabel,
    genre: rawTags.slice(0, 2).join(" · ") || (fallbackTag && fallbackTag !== "todas" ? (fallbackTag === "webradio" ? "Rádio Web" : fallbackTag) : "Rádio Ao Vivo"),
    favicon: s.favicon && s.favicon.startsWith("https://") ? s.favicon : void 0,
    streamUrl,
    bitrate: s.bitrate || 128,
    codec: s.codec || "MP3",
    isLiveReal: true,
    isWebRadio: isWeb
  };
}
const BRAZIL_STATE_DEFS = [
  { uf: "AC", name: "Acre", stateTerms: ["acre", "ac"], cityTerms: ["rio branco", "cruzeiro do sul"], tuneInIds: ["r101758"] },
  { uf: "AL", name: "Alagoas", stateTerms: ["alagoas", "al"], cityTerms: ["maceio", "arapiraca"], tuneInIds: ["r100584"] },
  { uf: "AP", name: "Amapá", stateTerms: ["amapa", "ap"], cityTerms: ["macapa", "santana"], tuneInIds: ["r101759", "r102292"] },
  { uf: "AM", name: "Amazonas", stateTerms: ["amazonas", "am"], cityTerms: ["manaus", "parintins", "itacoatiara"], tuneInIds: ["r100574"] },
  { uf: "BA", name: "Bahia", stateTerms: ["bahia", "ba"], cityTerms: ["salvador", "feira de santana", "vitoria da conquista", "ilheus", "itabuna", "barreiras", "juazeiro"], tuneInIds: ["r100563"] },
  { uf: "CE", name: "Ceará", stateTerms: ["ceara", "ce"], cityTerms: ["fortaleza", "juazeiro do norte", "sobral"], tuneInIds: ["r100565"] },
  { uf: "DF", name: "Distrito Federal", stateTerms: ["distrito federal", "df", "brasilia"], cityTerms: ["taguatinga", "ceilandia"], tuneInIds: ["r100559"] },
  { uf: "ES", name: "Espírito Santo", stateTerms: ["espirito santo", "espirio", "es"], cityTerms: ["vila velha", "cariacica", "cachoeiro de itapemirim", "linhares"], tuneInIds: ["r100582"] },
  { uf: "GO", name: "Goiás", stateTerms: ["goias", "go"], cityTerms: ["goiania", "anapolis", "rio verde", "aparecida de goiania"], tuneInIds: ["r100566"] },
  { uf: "MA", name: "Maranhão", stateTerms: ["maranhao", "ma"], cityTerms: ["sao luis", "imperatriz", "caxias"], tuneInIds: ["r100572"] },
  { uf: "MT", name: "Mato Grosso", stateTerms: ["mato grosso", "mt"], cityTerms: ["cuiaba", "varzea grande", "rondonopolis", "sinop"], tuneInIds: ["r100575"] },
  { uf: "MS", name: "Mato Grosso do Sul", stateTerms: ["mato grosso do sul", "ms"], cityTerms: ["campo grande", "dourados", "tres lagoas"], tuneInIds: ["r100576"] },
  { uf: "MG", name: "Minas Gerais", stateTerms: ["minas gerais", "mg"], cityTerms: ["belo horizonte", "uberlandia", "juiz de fora", "contagem", "montes claros", "uberaba"], tuneInIds: ["r100585"] },
  { uf: "PA", name: "Pará", stateTerms: ["para", "pa"], cityTerms: ["belem", "santarem", "maraba", "castanhal", "ananindeua"], tuneInIds: ["r100558"] },
  { uf: "PB", name: "Paraíba", stateTerms: ["paraiba", "pb"], cityTerms: ["joao pessoa", "campina grande", "patos", "cajazeiras"], tuneInIds: ["r100570"] },
  { uf: "PR", name: "Paraná", stateTerms: ["parana", "pr"], cityTerms: ["curitiba", "londrina", "maringa", "cascavel", "foz do iguacu", "ponta grossa"], tuneInIds: ["r100560"] },
  { uf: "PE", name: "Pernambuco", stateTerms: ["pernambuco", "pe"], cityTerms: ["recife", "olinda", "caruaru", "petrolina"], tuneInIds: ["r100569"] },
  { uf: "PI", name: "Piauí", stateTerms: ["piaui", "pi"], cityTerms: ["teresina", "parnaiba", "picos"], tuneInIds: ["r100571"] },
  { uf: "RJ", name: "Rio de Janeiro", stateTerms: ["rio de janeiro", "rj"], cityTerms: ["niteroi", "campos dos goytacazes", "petropolis", "volta redonda", "duque de caxias"], tuneInIds: ["r100562"] },
  { uf: "RN", name: "Rio Grande do Norte", stateTerms: ["rio grande do norte", "rn"], cityTerms: ["natal", "mossoro"], tuneInIds: ["r100580"] },
  { uf: "RS", name: "Rio Grande do Sul", stateTerms: ["rio grande do sul", "rs"], cityTerms: ["porto alegre", "caxias do sul", "pelotas", "santa maria", "canoas"], tuneInIds: ["r100561"] },
  { uf: "RO", name: "Rondônia", stateTerms: ["rondonia", "ro"], cityTerms: ["porto velho", "ji-parana", "ariquemes"], tuneInIds: ["r101760"] },
  { uf: "RR", name: "Roraima", stateTerms: ["roraima", "rr"], cityTerms: ["boa vista"], tuneInIds: ["r101921"] },
  { uf: "SC", name: "Santa Catarina", stateTerms: ["santa catarina", "sc"], cityTerms: ["florianopolis", "joinville", "blumenau", "chapeco", "criciuma", "itajai"], tuneInIds: ["r100568"] },
  { uf: "SP", name: "São Paulo", stateTerms: ["sao paulo", "sp"], cityTerms: ["campinas", "santos", "ribeirao preto", "sorocaba", "sao jose dos campos", "bauru", "piracicaba", "guarulhos"], tuneInIds: ["r100564"] },
  { uf: "SE", name: "Sergipe", stateTerms: ["sergipe", "se"], cityTerms: ["aracaju"], tuneInIds: ["r100583"] },
  { uf: "TO", name: "Tocantins", stateTerms: ["tocantins", "to"], cityTerms: ["palmas", "araguaina", "gurupi"], tuneInIds: ["r101922"] }
];
let cachedBrStations = null;
let cachedBrStationsAt = 0;
const tuneInStateCache = /* @__PURE__ */ new Map();
function normGeoText(str) {
  return String(str || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}
function findBrStateDef(input) {
  const n = normGeoText(input).trim();
  if (!n || n === "todos" || n === "all") return null;
  return BRAZIL_STATE_DEFS.find(
    (d) => d.uf.toLowerCase() === n || normGeoText(d.name) === n || d.stateTerms.includes(n)
  ) || null;
}
function hasWholeWord(haystack, term) {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?:^|[^a-z0-9])${escaped}(?:$|[^a-z0-9])`).test(haystack);
}
function stationMatchesBrState(raw, def) {
  const st = normGeoText(raw.state);
  const nm = normGeoText(raw.name);
  const tg = normGeoText(raw.tags);
  if (def.uf === "MT" && st.includes("mato grosso do sul")) return false;
  if (def.uf === "PA" && (st.includes("parana") || st.includes("paraiba") || nm.includes("parana") || nm.includes("paraiba"))) {
    if (!hasWholeWord(st, "para") && !hasWholeWord(st, "pa")) return false;
  }
  const ufLower = def.uf.toLowerCase();
  if (hasWholeWord(st, ufLower)) return true;
  for (const term of def.stateTerms) {
    if (term.length <= 2) continue;
    if (hasWholeWord(st, term) || hasWholeWord(nm, term) || hasWholeWord(tg, term)) return true;
  }
  for (const city of def.cityTerms) {
    if (hasWholeWord(st, city) || hasWholeWord(nm, city) || hasWholeWord(tg, city)) return true;
  }
  if (ufLower !== "am" && new RegExp(`[-,/\\(\\s]${ufLower}(?:$|[^a-z0-9])`).test(nm)) {
    return true;
  }
  return false;
}
async function getAllBrazilStationsCached() {
  if (cachedBrStations && Date.now() - cachedBrStationsAt < 10 * 60 * 1e3) {
    return cachedBrStations;
  }
  for (const base of RADIO_MIRRORS) {
    const data = await fetchJsonWithTimeout(
      `${base}/json/stations/search?countrycode=BR&hidebroken=true&order=clickcount&reverse=true&limit=2500`,
      8500,
      { "User-Agent": "MeuMundoMinhaVida/1.0" }
    );
    if (Array.isArray(data) && data.length > 0) {
      cachedBrStations = data;
      cachedBrStationsAt = Date.now();
      return data;
    }
  }
  return cachedBrStations || [];
}
async function fetchTuneInStationsForBrState(def) {
  const cached = tuneInStateCache.get(def.uf);
  if (cached && Date.now() - cached.at < 15 * 60 * 1e3) {
    return cached.stations;
  }
  const collected = [];
  const seenAudio = /* @__PURE__ */ new Set();
  for (const gid of def.tuneInIds || []) {
    const json = await fetchJsonWithTimeout(
      `https://opml.radiotime.com/Browse.ashx?id=${encodeURIComponent(gid)}&render=json`,
      5e3
    );
    const walk = (arr) => {
      if (!Array.isArray(arr)) return;
      for (const item of arr) {
        if (item?.type === "audio" && typeof item.URL === "string" && item.guide_id && !seenAudio.has(item.guide_id)) {
          seenAudio.add(item.guide_id);
          collected.push(item);
        }
        if (Array.isArray(item?.children)) walk(item.children);
      }
    };
    walk(json?.body);
    if (collected.length >= 12) break;
  }
  const resolved = await Promise.all(
    collected.slice(0, 10).map(async (item) => {
      const tuneUrl = item.URL.replace(/^http:\/\//i, "https://") + (item.URL.includes("?") ? "&" : "?") + "render=json";
      const tuneJson = await fetchJsonWithTimeout(tuneUrl, 4500);
      const streams = Array.isArray(tuneJson?.body) ? tuneJson.body : [];
      const pick = streams.find((s) => typeof s?.url === "string" && s.url.startsWith("http") && s.is_hls_advanced !== "true") || streams.find((s) => typeof s?.url === "string" && s.url.startsWith("http"));
      if (!pick?.url) return null;
      const cleanName = String(item.text || "Rádio Ao Vivo").trim();
      const fmMatch = cleanName.match(/(\d{2,3}[.,]\d)/);
      const isWeb = cleanName.toLowerCase().includes("web");
      return {
        id: `ti-${item.guide_id}`,
        name: cleanName,
        frequency: fmMatch ? `${fmMatch[1].replace(",", ".")} FM` : pick.bitrate ? `${pick.bitrate} kbps` : "Web FM",
        program: `${def.name} (${def.uf}), Brasil`,
        genre: String(item.subtext || "Rádio Ao Vivo").trim().slice(0, 48),
        favicon: typeof item.image === "string" && item.image.startsWith("https://") ? item.image : void 0,
        streamUrl: pick.url.trim(),
        bitrate: Number(pick.bitrate) || 128,
        codec: String(pick.media_type || "MP3").toUpperCase(),
        isLiveReal: true,
        isWebRadio: isWeb
      };
    })
  );
  const valid = resolved.filter((s) => s !== null);
  tuneInStateCache.set(def.uf, { at: Date.now(), stations: valid });
  return valid;
}
async function fetchRadioStations(query, tag, page = 1, scope = "br", state = "") {
  const safePage = Math.max(1, page);
  const limit = 80;
  const offset = (safePage - 1) * limit;
  const isWebMode = tag === "webradio";
  const cleanState = String(state || "").trim();
  const brStateDef = scope !== "global" ? findBrStateDef(cleanState) : null;
  const queryBrStateDef = !brStateDef && scope !== "global" && query ? findBrStateDef(query) : null;

  if (scope !== "global" && (brStateDef || queryBrStateDef)) {
    const activeDef = brStateDef || queryBrStateDef;
    const allBr = await getAllBrazilStationsCached();
    const normQ = normGeoText(query);
    const matchesState = allBr.filter((raw) => raw.hls !== 1 && (raw.url_resolved || raw.url || "").startsWith("http") && stationMatchesBrState(raw, activeDef));
    const mappedState = matchesState.map((raw) => mapRadioBrowserStation(raw, tag, isWebMode && normGeoText(`${raw.name} ${raw.tags}`).includes("web"))).filter((s) => s !== null);

    let extraTuneIn = [];
    if (safePage === 1 && mappedState.length < 10) {
      extraTuneIn = await fetchTuneInStationsForBrState(activeDef);
    }
    const mergedByKey = /* @__PURE__ */ new Map();
    for (const s of [...mappedState, ...extraTuneIn]) {
      const k = normGeoText(s.name).slice(0, 28);
      if (!mergedByKey.has(k)) mergedByKey.set(k, s);
    }
    let pool = [...mergedByKey.values()];

    if (query && !queryBrStateDef) {
      const filteredQ = pool.filter(
        (s) => normGeoText(s.name).includes(normQ) || normGeoText(s.genre).includes(normQ) || normGeoText(s.program).includes(normQ)
      );
      pool = filteredQ;
    }
    if (isWebMode) {
      const webOnly = pool.filter((s) => s.isWebRadio || normGeoText(`${s.name} ${s.genre}`).includes("web"));
      if (webOnly.length > 0) pool = webOnly;
    } else if (tag && tag !== "todas" && tag !== "mundo") {
      const tagMatches = pool.filter(
        (s) => normGeoText(s.genre).includes(normGeoText(tag)) || normGeoText(s.name).includes(normGeoText(tag))
      );
      if (tagMatches.length > 0 || query) {
        pool = tagMatches;
      }
    }
    const pageSlice = pool.slice(offset, offset + limit);
    return { stations: pageSlice, hasMore: offset + pageSlice.length < pool.length };
  }

  if (isWebMode) {
    for (const base of RADIO_MIRRORS) {
      try {
        const buildQs = (extra) => {
          const p = new URLSearchParams({
            hidebroken: "true",
            order: "clickcount",
            reverse: "true",
            limit: "50",
            offset: String((safePage - 1) * 50)
          });
          if (scope !== "global") p.set("countrycode", "BR");
          if (cleanState) p.set("state", cleanState);
          for (const [k, v] of Object.entries(extra)) {
            if (v) p.set(k, v);
          }
          return p.toString();
        };
        const hdrs = { "User-Agent": "MeuMundoMinhaVida/1.0" };
        const urls = query
          ? [
              `${base}/json/stations/search?${buildQs({ name: query, tag: "webradio" })}`,
              `${base}/json/stations/search?${buildQs({ name: query, tag: "web radio" })}`,
              `${base}/json/stations/search?${buildQs({ name: query })}`
            ]
          : [
              `${base}/json/stations/search?${buildQs({ tag: "webradio" })}`,
              `${base}/json/stations/search?${buildQs({ tag: "web radio" })}`,
              `${base}/json/stations/search?${buildQs({ name: "web" })}`
            ];
        const lists = await Promise.all(urls.map((u) => fetchJsonWithTimeout(u, 5500, hdrs)));
        const seen = /* @__PURE__ */ new Set();
        const combined = [];
        for (const list of lists) {
          if (!Array.isArray(list)) continue;
          for (const raw of list) {
            const mapped = mapRadioBrowserStation(raw, "webradio", true);
            if (!mapped || seen.has(mapped.id)) continue;
            seen.add(mapped.id);
            combined.push(mapped);
          }
        }
        if (combined.length > 0) return { stations: combined, hasMore: combined.length >= 25 };
      } catch {
      }
    }
    return { stations: [], hasMore: false };
  }

  const params = new URLSearchParams({
    hidebroken: "true",
    order: "clickcount",
    reverse: "true",
    limit: String(limit),
    offset: String(offset)
  });
  if (scope !== "global" && tag !== "mundo") {
    params.set("countrycode", "BR");
  }
  if (cleanState) {
    params.set("state", cleanState);
  }
  if (query) {
    params.set("name", query);
  }
  if (tag && tag !== "todas" && tag !== "mundo") {
    params.set("tag", tag);
  }
  for (const base of RADIO_MIRRORS) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6500);
    try {
      const res = await fetch(`${base}/json/stations/search?${params.toString()}`, {
        signal: controller.signal,
        headers: { "User-Agent": "MeuMundoMinhaVida/1.0" }
      });
      clearTimeout(timeout);
      if (!res.ok) continue;
      const data = await res.json();
      if (!Array.isArray(data)) continue;
      const stations = data.map((s) => mapRadioBrowserStation(s, tag, false)).filter((s) => s !== null);
      if (stations.length === 0 && cleanState && !query) {
        const fbParams = new URLSearchParams(params);
        fbParams.delete("state");
        fbParams.set("name", cleanState);
        const fbData = await fetchJsonWithTimeout(`${base}/json/stations/search?${fbParams.toString()}`, 5e3, {
          "User-Agent": "MeuMundoMinhaVida/1.0"
        });
        if (Array.isArray(fbData)) {
          const fbStations = fbData.map((s) => mapRadioBrowserStation(s, tag, false)).filter((s) => s !== null);
          return { stations: fbStations, hasMore: fbStations.length >= 25 };
        }
      }
      return { stations, hasMore: stations.length >= 25 };
    } catch {
      clearTimeout(timeout);
    }
  }
  return { stations: [], hasMore: false };
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
async function searchPodcastShows(query, category, page = 1) {
  const safePage = Math.max(1, page);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8500);
  try {
    if (!query && (!category || category === "destaques") && safePage === 1) {
      const topRes = await fetch(
        "https://itunes.apple.com/br/rss/toppodcasts/limit=100/json",
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
    const brOffset = safePage === 1 ? 0 : (safePage - 1) * 50;
    const usOffset = safePage === 1 ? 0 : (safePage - 1) * 30;
    const [brRes, usRes] = await Promise.all([
      fetch(
        `https://itunes.apple.com/search?media=podcast&country=BR&term=${encodeURIComponent(
          term
        )}&limit=50&offset=${brOffset}`,
        { signal: controller.signal }
      ),
      (query || safePage > 1) ? fetch(
        `https://itunes.apple.com/search?media=podcast&country=US&term=${encodeURIComponent(
          term
        )}&limit=30&offset=${usOffset}`,
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
  const timeout = setTimeout(() => controller.abort(), 11e3);
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
    for (let i = 0; i < Math.min(itemMatches.length, 400); i += 1) {
      const itemXml = itemMatches[i];
      const enclosureMatch = itemXml.match(/<enclosure[^>]+url=["']([^"']+)["'][^>]*>/i) || itemXml.match(/<media:content[^>]+url=["']([^"']+)["'][^>]*>/i);
      const audioUrl = enclosureMatch?.[1]?.replace(/&amp;/g, "&").trim() || "";
      if (!audioUrl.startsWith("http")) continue;
      const title = extractXmlTag(itemXml, "title") || `Episódio ${i + 1}`;
      const rawDesc = extractXmlTag(itemXml, "itunes:summary") || extractXmlTag(itemXml, "description") || extractXmlTag(itemXml, "content:encoded") || "Episódio oficial via feed RSS.";
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
async function searchBooksCatalog(query, category, page = 1) {
  const safePage = Math.max(1, page);
  const term = query || BOOK_CATEGORY_QUERIES[category] || "investimentos financas";
  const cleanTerm = term.replace(/[():"]/g, " ").trim() || "books";
  const words = cleanTerm.split(/\s+/).filter(Boolean);
  const archiveExpr = !query && words.length > 1 ? words.join(" OR ") : cleanTerm;
  const wikiTerm = !query && words.length > 2 ? words.slice(0, 2).join(" ") : cleanTerm;
  const olUrl = `https://openlibrary.org/search.json?q=${encodeURIComponent(
    term
  )}&limit=40&page=${safePage}`;
  const gutenUrl = `https://gutendex.com/books/?search=${encodeURIComponent(
    term
  )}&page=${safePage}`;
  const archiveUrl = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(
    `mediatype:texts AND (${archiveExpr})`
  )}&fl[]=identifier,title,creator,year,subject&rows=30&page=${safePage}&output=json`;
  const wikiUrl = `https://pt.wikisource.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
    wikiTerm
  )}&srlimit=15&sroffset=${(safePage - 1) * 15}&format=json`;

  const [olJson, gutenJson, archiveJson, wikiJson] = await Promise.all([
    fetchJsonWithTimeout(olUrl, 4500),
    fetchJsonWithTimeout(gutenUrl, 3500),
    fetchJsonWithTimeout(archiveUrl, 5000),
    fetchJsonWithTimeout(wikiUrl, 4000)
  ]);
  const seen = /* @__PURE__ */ new Set();
  const results = [];
  if (Array.isArray(gutenJson?.results)) {
    for (const g of gutenJson.results) {
      const title = (g.title || "").trim();
      if (!title) continue;
      const dedupeKey = title.toLowerCase();
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);
      const formats = g.formats || {};
      const textUrl = formats["text/plain; charset=utf-8"] || formats["text/plain; charset=us-ascii"] || formats["text/plain"] || "";
      const coverUrl = formats["image/jpeg"] || "";
      const author = Array.isArray(g.authors) && g.authors.length > 0
        ? g.authors.slice(0, 2).map((a) => a.name).filter(Boolean).join(", ")
        : "Domínio Público";
      const subject = Array.isArray(g.subjects) && g.subjects.length > 0 ? g.subjects[0].split(" -- ")[0] : "Clássico";
      results.push({
        id: `gt-${g.id}`,
        title,
        author,
        pages: 240,
        coverUrl,
        subject,
        textUrl: typeof textUrl === "string" && textUrl.startsWith("http") ? textUrl : void 0
      });
    }
  }
  if (Array.isArray(archiveJson?.response?.docs)) {
    for (const doc of archiveJson.response.docs) {
      const identifier = typeof doc.identifier === "string" ? doc.identifier.trim() : "";
      const title = String(doc.title || "").trim();
      if (!identifier || !title) continue;
      const dedupeKey = title.toLowerCase();
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);
      const creatorRaw = Array.isArray(doc.creator) ? doc.creator[0] : doc.creator;
      const author = String(creatorRaw || "Domínio Público").trim();
      const subjRaw = Array.isArray(doc.subject) ? doc.subject[0] : doc.subject;
      const subject = String(subjRaw || (category && category !== "destaques" ? category : "Acervo Digital")).split(";")[0].trim();
      const yearNum = typeof doc.year === "string" || typeof doc.year === "number" ? parseInt(String(doc.year), 10) : void 0;
      results.push({
        id: `arcbook-${identifier}`,
        title,
        author,
        year: Number.isFinite(yearNum) ? yearNum : void 0,
        pages: 220,
        coverUrl: `https://archive.org/services/img/${encodeURIComponent(identifier)}`,
        subject,
        textUrl: `https://archive.org/download/${encodeURIComponent(identifier)}/${encodeURIComponent(identifier)}_djvu.txt`
      });
    }
  }
  if (Array.isArray(wikiJson?.query?.search)) {
    for (const w of wikiJson.query.search) {
      const rawTitle = String(w.title || "").trim();
      const cleanTitle = rawTitle.split("/")[0].trim();
      if (!cleanTitle) continue;
      const dedupeKey = cleanTitle.toLowerCase();
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);
      results.push({
        id: `ws-${w.pageid || results.length}`,
        title: cleanTitle,
        author: "Wikisource PT",
        pages: 180,
        coverUrl: "",
        subject: category && category !== "destaques" ? category : "Literatura"
      });
    }
  }
  if (Array.isArray(olJson?.docs)) {
    for (const doc of olJson.docs) {
      const title = (doc.title || "").trim();
      if (!title) continue;
      const key = doc.key || title.toLowerCase();
      const dedupeKey = title.toLowerCase();
      if (seen.has(key) || seen.has(dedupeKey)) continue;
      seen.add(key);
      seen.add(dedupeKey);
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
  }
  return results;
}
async function searchAudiobooksCatalog(query, page = 1) {
  const safePage = Math.max(1, page);
  const cleanQ = query.trim();
  const luceneQuery = cleanQ
    ? `collection:librivoxaudio AND (${cleanQ.replace(/[():"]/g, " ")})`
    : safePage === 1
      ? `collection:librivoxaudio AND (portuguese OR portugues OR brasil)`
      : `collection:librivoxaudio`;
  const url = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(
    luceneQuery
  )}&fl[]=identifier,title,creator,description&rows=40&page=${safePage}&output=json`;
  const json = await fetchJsonWithTimeout(url, 6500);
  const docs = json?.response?.docs;
  if (!Array.isArray(docs)) return [];
  return docs.filter((d) => typeof d.identifier === "string" && d.identifier.length > 0).map((d) => {
    const identifier = d.identifier;
    const author = Array.isArray(d.creator) ? d.creator.join(", ") : d.creator || "LibriVox";
    const rawDesc = Array.isArray(d.description) ? d.description.join(" ") : d.description || "Audiolivro público gratuito (LibriVox / Internet Archive).";
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
    )}&pslimit=100&format=json`,
    5e3
  );
  const subTitles = (prefixRes?.query?.prefixsearch ?? []).map((p) => p.title || "").filter(Boolean);
  const pagesToFetch = subTitles.length > 0 ? sortChapterTitles(subTitles, baseTitle).slice(0, 40) : [baseTitle];
  const chapters = [];
  for (let start = 0; start < pagesToFetch.length; start += 4) {
    const batch = pagesToFetch.slice(start, start + 4);
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
    const source = typeof req.query.source === "string" ? req.query.source.trim().toLowerCase() : "all";
    const pageRaw = parseInt(typeof req.query.page === "string" ? req.query.page : "1", 10);
    const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;
    const searchTerm = artist || q || "Louvor Gospel Brasil";

    const wantYt = source === "all" || source === "youtube";
    const wantMp3 = source === "all" || source === "mp3";
    const wantCatalogs = source === "all" || source === "catalogs" || source === "outros";

    const [ytTracks, deezerTracks, itunesTracks, audiusTracks, archiveTracks] = await Promise.all([
      wantYt ? searchYouTubeFullTracks(searchTerm, artist || void 0, page) : Promise.resolve([]),
      wantCatalogs ? searchDeezerTracks(searchTerm, page) : Promise.resolve([]),
      wantCatalogs ? searchItunesTracks(searchTerm, page) : Promise.resolve([]),
      wantMp3 ? searchAudiusFullTracks(searchTerm, page) : Promise.resolve([]),
      wantMp3 ? searchArchiveMusicTracks(searchTerm, page) : Promise.resolve([])
    ]);

    let ordered = [];
    if (source === "youtube") {
      ordered = ytTracks;
    } else if (source === "mp3") {
      const maxLen = Math.max(audiusTracks.length, archiveTracks.length);
      for (let i = 0; i < maxLen; i += 1) {
        if (audiusTracks[i]) ordered.push(audiusTracks[i]);
        if (archiveTracks[i]) ordered.push(archiveTracks[i]);
      }
    } else if (source === "catalogs" || source === "outros") {
      const maxLen = Math.max(deezerTracks.length, itunesTracks.length);
      for (let i = 0; i < maxLen; i += 1) {
        if (deezerTracks[i]) ordered.push(deezerTracks[i]);
        if (itunesTracks[i]) ordered.push(itunesTracks[i]);
      }
    } else {
      // Top YouTube matches first (like YouTube search), then fair interleaving across YouTube, Deezer, Apple Music, Audius, and Archive
      ordered.push(...ytTracks.slice(0, 5));
      const ytRest = ytTracks.slice(5);
      const maxLen = Math.max(
        ytRest.length,
        deezerTracks.length,
        itunesTracks.length,
        audiusTracks.length,
        archiveTracks.length
      );
      for (let i = 0; i < maxLen; i += 1) {
        if (deezerTracks[i]) ordered.push(deezerTracks[i]);
        if (ytRest[i]) ordered.push(ytRest[i]);
        if (itunesTracks[i]) ordered.push(itunesTracks[i]);
        if (audiusTracks[i]) ordered.push(audiusTracks[i]);
        if (archiveTracks[i]) ordered.push(archiveTracks[i]);
      }
    }

    const seenIds = /* @__PURE__ */ new Set();
    const tracks = [];
    for (const tr of ordered) {
      if (!seenIds.has(tr.id)) {
        seenIds.add(tr.id);
        tracks.push(tr);
      }
    }
    res.json({ tracks, page, source, hasMore: tracks.length >= 8 });
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
    const pageRaw = parseInt(typeof req.query.page === "string" ? req.query.page : "1", 10);
    const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;
    const shows = await searchPodcastShows(q, category, page);
    res.json({ shows, page, hasMore: shows.length >= 20 });
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
    const scope = typeof req.query.scope === "string" && req.query.scope.toLowerCase() === "global" ? "global" : "br";
    const state = typeof req.query.state === "string" ? req.query.state.trim() : "";
    const pageRaw = parseInt(typeof req.query.page === "string" ? req.query.page : "1", 10);
    const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;
    const { stations, hasMore } = await fetchRadioStations(q, tag, page, scope, state);
    res.json({ stations, page, state, hasMore });
  });
  app.get("/api/images/search", async (req, res) => {
    const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
    const category = typeof req.query.category === "string" ? req.query.category.trim().toLowerCase() : "destaques";
    const pageRaw = parseInt(typeof req.query.page === "string" ? req.query.page : "1", 10);
    const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;
    const IMAGE_CAT_MAP = {
      destaques: "nature sunrise mountain landscape",
      natureza: "nature forest waterfall flowers",
      fe: "church stained glass bible cross",
      paisagens: "mountain ocean sunset sky",
      familia: "family home coffee warm",
      arquitetura: "architecture city bridge",
      espaco: "galaxy stars earth nebula"
    };
    const term = q || IMAGE_CAT_MAP[category] || "nature landscape";
    const [openverseJson, archiveJson] = await Promise.all([
      fetchJsonWithTimeout(
        `https://api.openverse.org/v1/images/?q=${encodeURIComponent(term)}&page_size=36&page=${page}`,
        6500
      ),
      fetchJsonWithTimeout(
        `https://archive.org/advancedsearch.php?q=${encodeURIComponent(
          `mediatype:image AND (${term.replace(/[():"]/g, " ")})`
        )}&fl[]=identifier,title,creator&rows=24&page=${page}&output=json`,
        5500
      )
    ]);
    const images = [];
    const seen = /* @__PURE__ */ new Set();
    if (Array.isArray(openverseJson?.results)) {
      for (const item of openverseJson.results) {
        const fullUrl = typeof item.url === "string" ? item.url.trim() : "";
        if (!fullUrl.startsWith("http") || seen.has(fullUrl)) continue;
        seen.add(fullUrl);
        const thumbUrl = typeof item.thumbnail === "string" && item.thumbnail.startsWith("http")
          ? item.thumbnail
          : fullUrl;
        images.push({
          id: `ov-${item.id || seen.size}`,
          title: (item.title || term).trim().slice(0, 90),
          author: (item.creator || "Openverse").trim(),
          thumbUrl,
          fullUrl,
          width: typeof item.width === "number" ? item.width : void 0,
          height: typeof item.height === "number" ? item.height : void 0,
          source: "Openverse"
        });
      }
    }
    if (Array.isArray(archiveJson?.response?.docs)) {
      for (const doc of archiveJson.response.docs) {
        const identifier = typeof doc.identifier === "string" ? doc.identifier.trim() : "";
        if (!identifier) continue;
        const thumbUrl = `https://archive.org/services/img/${encodeURIComponent(identifier)}`;
        if (seen.has(thumbUrl)) continue;
        seen.add(thumbUrl);
        const creator = Array.isArray(doc.creator) ? doc.creator[0] : doc.creator;
        images.push({
          id: `arcimg-${identifier}`,
          title: String(doc.title || term).trim().slice(0, 90),
          author: String(creator || "Internet Archive").trim(),
          thumbUrl,
          fullUrl: thumbUrl,
          source: "Archive.org"
        });
      }
    }
    res.json({ images, page, hasMore: images.length >= 12 });
  });
  app.get("/api/media/proxy", (req, res) => {
    const rawUrl = typeof req.query.url === "string" ? req.query.url.trim() : "";
    const forceDownload = req.query.download === "1";
    const filename = typeof req.query.filename === "string" ? req.query.filename.replace(/[^a-zA-Z0-9._-]/g, "_") : "";
    if (!rawUrl) {
      res.status(400).json({ error: "Missing media URL" });
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
      res.status(403).json({ error: "Blocked media host" });
      return;
    }
    let upstreamReq = null;
    let closed = false;
    const proxyMedia = (targetUrl, redirectsLeft) => {
      if (closed) return;
      const client = targetUrl.protocol === "https:" ? https : http;
      upstreamReq = client.get(
        targetUrl,
        {
          headers: {
            "User-Agent": "MeuMundoMinhaVida/1.0",
            Accept: "*/*"
          },
          timeout: 2e4
        },
        (upstreamRes) => {
          const status = upstreamRes.statusCode ?? 200;
          if (status >= 300 && status < 400 && upstreamRes.headers.location && redirectsLeft > 0) {
            upstreamRes.resume();
            try {
              const nextUrl = new URL(upstreamRes.headers.location, targetUrl);
              if ((nextUrl.protocol === "http:" || nextUrl.protocol === "https:") && !isPrivateOrBlockedHost(nextUrl.hostname)) {
                proxyMedia(nextUrl, redirectsLeft - 1);
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
          res.setHeader("Content-Type", upstreamRes.headers["content-type"] || "application/octet-stream");
          if (upstreamRes.headers["content-length"]) {
            res.setHeader("Content-Length", upstreamRes.headers["content-length"]);
          }
          if (forceDownload && filename) {
            res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
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
    proxyMedia(parsed, 5);
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
    const pageRaw = parseInt(typeof req.query.page === "string" ? req.query.page : "1", 10);
    const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;
    const books = await searchBooksCatalog(q, category, page);
    res.json({ books, page, hasMore: books.length >= 12 });
  });
  app.get("/api/books/audiobooks", async (req, res) => {
    const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
    const pageRaw = parseInt(typeof req.query.page === "string" ? req.query.page : "1", 10);
    const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;
    const audiobooks = await searchAudiobooksCatalog(q, page);
    res.json({ audiobooks, page, hasMore: audiobooks.length >= 12 });
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
    const textUrl = typeof req.query.textUrl === "string" ? req.query.textUrl.trim() : "";
    if (!title) {
      res.status(400).json({ error: "Missing title", contentText: "" });
      return;
    }
    const cacheKey = `${title.toLowerCase()}::${author.toLowerCase()}::${openLibraryKey}::${textUrl}`;
    const cached = bookTextCache.get(cacheKey);
    if (cached) {
      res.json(cached);
      return;
    }
    if (textUrl && textUrl.startsWith("http")) {
      try {
        const parsedTxt = new URL(textUrl);
        if (!isPrivateOrBlockedHost(parsedTxt.hostname)) {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 7500);
          const txtRes = await fetch(parsedTxt.toString(), {
            signal: controller.signal,
            headers: { "User-Agent": "MeuMundoMinhaVida/1.0" }
          });
          clearTimeout(timer);
          if (txtRes.ok) {
            const rawText = (await txtRes.text()).replace(/\r\n/g, "\n").trim();
            if (rawText.length > 200) {
              const sliced = rawText.slice(0, 180000);
              const chunks = sliced.match(/[\s\S]{1,3200}(?:\n|$)/g) || [sliced];
              const formatted = chunks
                .slice(0, 60)
                .map((c, idx) => `# Parte ${idx + 1}\n${c.trim()}`)
                .join("\n\n---\n\n");
              const payload = {
                contentText: formatted,
                sourceLabel: textUrl.includes("archive.org")
                  ? "Livro Integral (Internet Archive)"
                  : "Livro Integral (Project Gutenberg)",
                isFullPublicText: true
              };
              bookTextCache.set(cacheKey, payload);
              res.json(payload);
              return;
            }
          }
        }
      } catch {
      }
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
        sourceLabel: "Sinopse, capítulos e trechos (Open Library / Wikipédia)",
        isFullPublicText: false
      };
      bookTextCache.set(cacheKey, payload);
      res.json(payload);
      return;
    }
    res.json({
      contentText: "",
      sourceLabel: "Edição manual ou importação .TXT",
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
