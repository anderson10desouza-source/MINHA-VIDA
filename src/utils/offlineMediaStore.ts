import { OfflineMediaKind, OfflineMediaRecord } from '../types';

const DB_NAME = 'meu_mundo_offline_media_v1';
const DB_VERSION = 1;
const BLOB_STORE = 'blobs';
const RECORD_STORE = 'records';

const objectUrlCache = new Map<string, string>();
const offlineListeners = new Set<() => void>();

function notifyOfflineChange() {
  offlineListeners.forEach((cb) => {
    try {
      cb();
    } catch {
      // ignore listener errors
    }
  });
}

export function subscribeOfflineMedia(cb: () => void): () => void {
  offlineListeners.add(cb);
  return () => {
    offlineListeners.delete(cb);
  };
}

function openOfflineDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(BLOB_STORE)) {
        db.createObjectStore(BLOB_STORE);
      }
      if (!db.objectStoreNames.contains(RECORD_STORE)) {
        db.createObjectStore(RECORD_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('Failed to open offline IndexedDB'));
  });
}

export function buildOfflineKey(kind: OfflineMediaKind, itemId: string): string {
  return `${kind}:${itemId}`;
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 KB';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function sanitizeFilename(name: string, ext: string): string {
  const clean = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._ -]/g, '')
    .trim()
    .replace(/\s+/g, '_')
    .slice(0, 64);
  const safeBase = clean || 'arquivo';
  const cleanExt = ext.replace(/^\./, '');
  return safeBase.toLowerCase().endsWith(`.${cleanExt.toLowerCase()}`)
    ? safeBase
    : `${safeBase}.${cleanExt}`;
}

export function triggerBrowserDownloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export function buildProxyMediaUrl(url: string, downloadFilename?: string): string {
  if (
    url.startsWith('data:') ||
    url.startsWith('blob:') ||
    url.startsWith('/')
  ) {
    return url;
  }
  const qs = new URLSearchParams({ url });
  if (downloadFilename) {
    qs.set('download', '1');
    qs.set('filename', downloadFilename);
  }
  return `/api/media/proxy?${qs.toString()}`;
}

export async function fetchMediaAsBlob(rawUrl: string): Promise<Blob> {
  const targetUrl =
    rawUrl.startsWith('data:') ||
    rawUrl.startsWith('blob:') ||
    rawUrl.startsWith('/')
      ? rawUrl
      : buildProxyMediaUrl(rawUrl);

  const res = await fetch(targetUrl);
  if (!res.ok) {
    throw new Error(`Falha ao baixar mídia (${res.status})`);
  }
  const blob = await res.blob();
  if (!blob || blob.size === 0) {
    throw new Error('Arquivo de mídia vazio.');
  }
  return blob;
}

export async function saveOfflineMediaBlob(params: {
  key: string;
  kind: OfflineMediaKind;
  itemId: string;
  title: string;
  subtitle: string;
  blob: Blob;
  coverUrl?: string;
  extraJson?: string;
}): Promise<OfflineMediaRecord> {
  const record: OfflineMediaRecord = {
    key: params.key,
    kind: params.kind,
    itemId: params.itemId,
    title: params.title,
    subtitle: params.subtitle,
    coverUrl: params.coverUrl,
    mimeType: params.blob.type || 'application/octet-stream',
    sizeBytes: params.blob.size,
    downloadedAt: new Date().toISOString(),
    hasBlob: true,
    extraJson: params.extraJson,
  };

  const db = await openOfflineDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction([BLOB_STORE, RECORD_STORE], 'readwrite');
    tx.objectStore(BLOB_STORE).put(params.blob, params.key);
    tx.objectStore(RECORD_STORE).put(record, params.key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('Failed to store offline media'));
  });
  db.close();

  const existingUrl = objectUrlCache.get(params.key);
  if (existingUrl) {
    URL.revokeObjectURL(existingUrl);
    objectUrlCache.delete(params.key);
  }
  objectUrlCache.set(params.key, URL.createObjectURL(params.blob));

  notifyOfflineChange();
  return record;
}

export async function saveOfflineMediaFromUrl(params: {
  key: string;
  kind: OfflineMediaKind;
  itemId: string;
  title: string;
  subtitle: string;
  url: string;
  coverUrl?: string;
  extraJson?: string;
}): Promise<OfflineMediaRecord> {
  const blob = await fetchMediaAsBlob(params.url);
  return saveOfflineMediaBlob({
    key: params.key,
    kind: params.kind,
    itemId: params.itemId,
    title: params.title,
    subtitle: params.subtitle,
    blob,
    coverUrl: params.coverUrl,
    extraJson: params.extraJson,
  });
}

export async function getOfflineMediaBlobUrl(key: string): Promise<string | null> {
  const cached = objectUrlCache.get(key);
  if (cached) return cached;

  try {
    const db = await openOfflineDb();
    const blob = await new Promise<Blob | null>((resolve, reject) => {
      const tx = db.transaction(BLOB_STORE, 'readonly');
      const req = tx.objectStore(BLOB_STORE).get(key);
      req.onsuccess = () => resolve(req.result instanceof Blob ? req.result : null);
      req.onerror = () => reject(req.error);
    });
    db.close();
    if (!blob) return null;
    const url = URL.createObjectURL(blob);
    objectUrlCache.set(key, url);
    return url;
  } catch {
    return null;
  }
}

export async function getOfflineMediaBlob(key: string): Promise<Blob | null> {
  try {
    const db = await openOfflineDb();
    const blob = await new Promise<Blob | null>((resolve, reject) => {
      const tx = db.transaction(BLOB_STORE, 'readonly');
      const req = tx.objectStore(BLOB_STORE).get(key);
      req.onsuccess = () => resolve(req.result instanceof Blob ? req.result : null);
      req.onerror = () => reject(req.error);
    });
    db.close();
    return blob;
  } catch {
    return null;
  }
}

export async function listOfflineRecords(
  kind?: OfflineMediaKind
): Promise<OfflineMediaRecord[]> {
  try {
    const db = await openOfflineDb();
    const records = await new Promise<OfflineMediaRecord[]>((resolve, reject) => {
      const tx = db.transaction(RECORD_STORE, 'readonly');
      const req = tx.objectStore(RECORD_STORE).getAll();
      req.onsuccess = () => {
        const list = Array.isArray(req.result) ? (req.result as OfflineMediaRecord[]) : [];
        resolve(list);
      };
      req.onerror = () => reject(req.error);
    });
    db.close();
    const filtered = kind ? records.filter((r) => r.kind === kind) : records;
    return filtered.sort((a, b) => b.downloadedAt.localeCompare(a.downloadedAt));
  } catch {
    return [];
  }
}

export async function deleteOfflineMedia(key: string): Promise<void> {
  try {
    const db = await openOfflineDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction([BLOB_STORE, RECORD_STORE], 'readwrite');
      tx.objectStore(BLOB_STORE).delete(key);
      tx.objectStore(RECORD_STORE).delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    // ignore
  }
  const existingUrl = objectUrlCache.get(key);
  if (existingUrl) {
    URL.revokeObjectURL(existingUrl);
    objectUrlCache.delete(key);
  }
  notifyOfflineChange();
}

export async function downloadMediaFileToDevice(params: {
  key?: string;
  url?: string;
  filename: string;
}): Promise<void> {
  if (params.key) {
    const existingBlob = await getOfflineMediaBlob(params.key);
    if (existingBlob) {
      triggerBrowserDownloadBlob(existingBlob, params.filename);
      return;
    }
  }
  if (!params.url) {
    throw new Error('Fonte de download indisponível.');
  }
  const blob = await fetchMediaAsBlob(params.url);
  triggerBrowserDownloadBlob(blob, params.filename);
}
