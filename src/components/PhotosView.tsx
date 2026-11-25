import React, { useEffect, useRef, useState } from 'react';
import { ImageSearchResult, OfflineMediaRecord, PhotoItem } from '../types';
import { compressImageFile } from '../utils/imageCompress';
import {
  buildOfflineKey,
  deleteOfflineMedia,
  downloadMediaFileToDevice,
  fetchMediaAsBlob,
  formatBytes,
  getOfflineMediaBlobUrl,
  listOfflineRecords,
  sanitizeFilename,
  saveOfflineMediaBlob,
  subscribeOfflineMedia,
} from '../utils/offlineMediaStore';
import { ResilientImage } from './ResilientImage';

interface PhotosViewProps {
  photos: PhotoItem[];
  onAddPhoto: (photo: Omit<PhotoItem, 'id'>) => void;
  onDeletePhoto?: (id: string) => void;
  onBack: () => void;
  onShowToast: (msg: string) => void;
}

const ALBUMS: ('Todas' | PhotoItem['album'])[] = [
  'Todas',
  'Família',
  'Igreja',
  'Natureza',
  'Momentos',
];

const ONLINE_IMAGE_CATEGORIES: { id: string; label: string }[] = [
  { id: 'destaques', label: 'Destaques' },
  { id: 'natureza', label: 'Natureza' },
  { id: 'fe', label: 'Fé & Igrejas' },
  { id: 'paisagens', label: 'Paisagens' },
  { id: 'familia', label: 'Família & Lar' },
  { id: 'arquitetura', label: 'Arquitetura' },
  { id: 'espaco', label: 'Espaço & Céu' },
];

const PresetArtwork: React.FC<{ preset: PhotoItem['artworkPreset']; title: string }> = ({
  preset,
  title,
}) => {
  if (preset === 'sunrise') {
    return (
      <div
        role="img"
        aria-label={title}
        className="w-full h-full bg-gradient-to-b from-[#0E2440] via-[#3A3B5C] to-[#D4A23E]/80 relative overflow-hidden flex items-end p-3"
      >
        <div className="w-20 h-20 rounded-full bg-[#F3BE57]/80 blur-md absolute top-4 right-6" />
        <svg viewBox="0 0 200 80" className="w-full h-14 text-[#051426]/85 relative z-10" preserveAspectRatio="none">
          <path d="M0 80 L0 45 Q45 20 95 45 T200 35 L200 80 Z" fill="currentColor" />
        </svg>
      </div>
    );
  }
  if (preset === 'mountains') {
    return (
      <div
        role="img"
        aria-label={title}
        className="w-full h-full bg-gradient-to-b from-[#081A30] via-[#1C3657] to-[#2E5F9D]/70 relative overflow-hidden flex items-end"
      >
        <svg viewBox="0 0 200 100" className="w-full h-24 text-[#051426]/80" preserveAspectRatio="none">
          <polygon points="0,100 55,30 115,100" fill="currentColor" />
          <polygon points="75,100 135,20 200,100" fill="#0E1C2F" />
        </svg>
      </div>
    );
  }
  return (
    <div
      role="img"
      aria-label={title}
      className="w-full h-full bg-gradient-to-br from-[#0E1C2F] via-[#1D2A3E] to-[#D4A23E]/40 flex items-center justify-center"
    >
      <span className="material-symbols-outlined text-4xl text-dark-primary/80" aria-hidden="true">
        photo_camera
      </span>
    </div>
  );
};

interface ModalPreviewItem {
  id: string;
  title: string;
  subtitle: string;
  imageUrl?: string;
  artworkPreset?: PhotoItem['artworkPreset'];
  offlineKey?: string;
  canDeleteFromGallery?: boolean;
  onlineItem?: ImageSearchResult;
}

export const PhotosView: React.FC<PhotosViewProps> = ({
  photos,
  onAddPhoto,
  onDeletePhoto,
  onBack,
  onShowToast,
}) => {
  const [subTab, setSubTab] = useState<'galeria' | 'online' | 'offline'>('galeria');
  const [albumFilter, setAlbumFilter] = useState<'Todas' | PhotoItem['album']>('Todas');
  const [selectedModal, setSelectedModal] = useState<ModalPreviewItem | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Online image search (unlimited pagination)
  const [onlineQuery, setOnlineQuery] = useState('');
  const [onlineCategory, setOnlineCategory] = useState('destaques');
  const [onlineResults, setOnlineResults] = useState<ImageSearchResult[]>([]);
  const [onlinePage, setOnlinePage] = useState(1);
  const [onlineHasMore, setOnlineHasMore] = useState(false);
  const [isSearchingOnline, setIsSearchingOnline] = useState(false);
  const [isLoadingMoreOnline, setIsLoadingMoreOnline] = useState(false);
  const [hasSearchedOnline, setHasSearchedOnline] = useState(false);

  // Offline image storage (IndexedDB)
  const [offlineRecords, setOfflineRecords] = useState<OfflineMediaRecord[]>([]);
  const [offlineBlobUrls, setOfflineBlobUrls] = useState<Record<string, string>>({});
  const [busyOfflineIds, setBusyOfflineIds] = useState<Record<string, boolean>>({});
  const [downloadingIds, setDownloadingIds] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let active = true;
    const loadOffline = async () => {
      const list = await listOfflineRecords('image');
      if (!active) return;
      setOfflineRecords(list);
      const urlPairs = await Promise.all(
        list.map(async (rec) => {
          const url = await getOfflineMediaBlobUrl(rec.key);
          return [rec.key, url || ''] as const;
        })
      );
      if (!active) return;
      const nextMap: Record<string, string> = {};
      for (const [k, u] of urlPairs) {
        if (u) nextMap[k] = u;
      }
      setOfflineBlobUrls(nextMap);
    };
    void loadOffline();
    const unsub = subscribeOfflineMedia(() => {
      void loadOffline();
    });
    return () => {
      active = false;
      unsub();
    };
  }, []);

  const offlineKeys = new Set(offlineRecords.map((r) => r.key));

  const filtered =
    albumFilter === 'Todas'
      ? photos
      : photos.filter((p) => p.album === albumFilter);

  const fetchOnlineImages = async (params: {
    q?: string;
    category?: string;
    page?: number;
    append?: boolean;
  }) => {
    const page = params.page ?? 1;
    if (params.append) {
      setIsLoadingMoreOnline(true);
    } else {
      setIsSearchingOnline(true);
    }
    setHasSearchedOnline(true);

    try {
      const qs = new URLSearchParams();
      if (params.q) qs.set('q', params.q);
      if (params.category) qs.set('category', params.category);
      qs.set('page', String(page));

      const res = await fetch(`/api/images/search?${qs.toString()}`);
      if (!res.ok) throw new Error('Image search failed');
      const data = (await res.json()) as {
        images?: ImageSearchResult[];
        hasMore?: boolean;
      };
      const incoming = Array.isArray(data.images) ? data.images : [];
      if (params.append) {
        setOnlineResults((prev) => {
          const seen = new Set(prev.map((p) => p.fullUrl));
          return [...prev, ...incoming.filter((item) => !seen.has(item.fullUrl))];
        });
      } else {
        setOnlineResults(incoming);
      }
      setOnlinePage(page);
      setOnlineHasMore(Boolean(data.hasMore) && incoming.length > 0);
    } catch {
      onShowToast('Não foi possível consultar imagens online agora.');
    } finally {
      setIsSearchingOnline(false);
      setIsLoadingMoreOnline(false);
    }
  };

  const handleOpenOnlineTab = () => {
    setSubTab('online');
    if (!hasSearchedOnline && onlineResults.length === 0) {
      void fetchOnlineImages({ category: onlineCategory, page: 1 });
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const compressedUrl = await compressImageFile(file, 1080, 0.82);
      const title = file.name.replace(/\.[^/.]+$/, '') || 'Nova Foto';
      const itemId = `pho-${Date.now()}`;
      await saveOfflineMediaBlob({
        key: buildOfflineKey('image', itemId),
        kind: 'image',
        itemId,
        title,
        subtitle: albumFilter === 'Todas' ? 'Momentos · Dispositivo' : `${albumFilter} · Dispositivo`,
        blob: file,
      });
      onAddPhoto({
        title,
        album: albumFilter === 'Todas' ? 'Momentos' : albumFilter,
        date: 'Hoje',
        imageUrl: compressedUrl,
        artworkPreset: 'fellowship',
      });
      onShowToast('Foto adicionada à sua galeria e salva offline.');
    } catch {
      onShowToast('Não foi possível processar esta foto.');
    }
  };

  const handleSaveOnlineImageOffline = async (img: ImageSearchResult) => {
    const key = buildOfflineKey('image', img.id);
    if (offlineKeys.has(key)) {
      await deleteOfflineMedia(key);
      onShowToast('Imagem removida do armazenamento offline.');
      return;
    }

    setBusyOfflineIds((prev) => ({ ...prev, [img.id]: true }));
    try {
      let blob: Blob;
      try {
        blob = await fetchMediaAsBlob(img.fullUrl);
      } catch {
        blob = await fetchMediaAsBlob(img.thumbUrl);
      }

      await saveOfflineMediaBlob({
        key,
        kind: 'image',
        itemId: img.id,
        title: img.title,
        subtitle: `${img.author} · ${img.source}`,
        blob,
        coverUrl: img.thumbUrl,
      });

      // Also save a compact preview into the user's Galeria if not already present
      const alreadyInGallery = photos.some(
        (p) => p.title.toLowerCase() === img.title.toLowerCase()
      );
      if (!alreadyInGallery) {
        try {
          const fileFromBlob = new File([blob], `${sanitizeFilename(img.title, 'jpg')}`, {
            type: blob.type || 'image/jpeg',
          });
          const compactThumb = await compressImageFile(fileFromBlob, 720, 0.78);
          onAddPhoto({
            title: img.title,
            album: 'Momentos',
            date: 'Offline',
            imageUrl: compactThumb,
            artworkPreset: 'fellowship',
          });
        } catch {
          onAddPhoto({
            title: img.title,
            album: 'Momentos',
            date: 'Offline',
            imageUrl: img.thumbUrl,
            artworkPreset: 'fellowship',
          });
        }
      }

      onShowToast(`"${img.title}" salva para ver offline e na galeria!`);
    } catch {
      onShowToast('Não foi possível baixar esta imagem para modo offline.');
    } finally {
      setBusyOfflineIds((prev) => ({ ...prev, [img.id]: false }));
    }
  };

  const handleSaveGalleryPhotoOffline = async (photo: PhotoItem) => {
    if (!photo.imageUrl) {
      onShowToast('Esta imagem já é arte interna e funciona offline.');
      return;
    }
    const key = buildOfflineKey('image', photo.id);
    if (offlineKeys.has(key)) {
      await deleteOfflineMedia(key);
      onShowToast('Cópia offline removida.');
      return;
    }
    setBusyOfflineIds((prev) => ({ ...prev, [photo.id]: true }));
    try {
      const blob = await fetchMediaAsBlob(photo.imageUrl);
      await saveOfflineMediaBlob({
        key,
        kind: 'image',
        itemId: photo.id,
        title: photo.title,
        subtitle: `${photo.album} · ${photo.date}`,
        blob,
        coverUrl: photo.imageUrl,
      });
      onShowToast(`"${photo.title}" salva no cofre offline!`);
    } catch {
      onShowToast('Não foi possível salvar esta foto offline.');
    } finally {
      setBusyOfflineIds((prev) => ({ ...prev, [photo.id]: false }));
    }
  };

  const handleDownloadImageToDevice = async (params: {
    id: string;
    title: string;
    url?: string;
    offlineKey?: string;
  }) => {
    setDownloadingIds((prev) => ({ ...prev, [params.id]: true }));
    try {
      await downloadMediaFileToDevice({
        key: params.offlineKey,
        url: params.url,
        filename: sanitizeFilename(params.title, 'jpg'),
      });
      onShowToast(`Baixando "${params.title}" para o dispositivo.`);
    } catch {
      onShowToast('Não foi possível baixar o arquivo de imagem.');
    } finally {
      setDownloadingIds((prev) => ({ ...prev, [params.id]: false }));
    }
  };

  return (
    <div className="flex flex-col">
      <header className="px-4 lg:px-8 pt-6 pb-4 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={onBack}
              aria-label="Voltar"
              className="inline-flex items-center justify-center min-w-[44px] min-h-[44px] -ml-2 rounded-full text-light-on-surface dark:text-dark-on-surface hover:bg-light-surface-container-high dark:hover:bg-dark-surface-container-high transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]">arrow_back</span>
            </button>
            <div className="min-w-0">
              <h1 className="font-headline text-headline-md lg:text-headline-lg text-light-on-surface dark:text-dark-on-surface">
                Fotos e Imagens
              </h1>
              <p className="font-body text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant truncate">
                Busque imagens sem limites, baixe para o aparelho e use online ou offline.
              </p>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleUpload}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="min-h-[44px] inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-light-primary dark:bg-dark-primary text-light-on-primary dark:text-dark-on-primary font-body text-label-lg whitespace-nowrap shrink-0"
          >
            <span className="material-symbols-outlined text-[18px]">add_a_photo</span>
            <span>Adicionar</span>
          </button>
        </div>

        {/* Sub-Tabs */}
        <div className="flex items-center gap-1 p-1 rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant overflow-x-auto w-fit max-w-full">
          <button
            type="button"
            onClick={() => setSubTab('galeria')}
            className={`min-h-[38px] px-3.5 py-1.5 rounded-md font-body text-body-sm font-semibold whitespace-nowrap transition-colors ${
              subTab === 'galeria'
                ? 'bg-light-primary dark:bg-dark-primary text-light-on-primary dark:text-dark-on-primary'
                : 'text-light-on-surface-variant dark:text-dark-on-surface-variant'
            }`}
          >
            Minha Galeria ({photos.length})
          </button>
          <button
            type="button"
            onClick={handleOpenOnlineTab}
            className={`min-h-[38px] px-3.5 py-1.5 rounded-md font-body text-body-sm font-semibold whitespace-nowrap transition-colors ${
              subTab === 'online'
                ? 'bg-light-primary dark:bg-dark-primary text-light-on-primary dark:text-dark-on-primary'
                : 'text-light-on-surface-variant dark:text-dark-on-surface-variant'
            }`}
          >
            Buscar Imagens Online
          </button>
          <button
            type="button"
            onClick={() => setSubTab('offline')}
            className={`min-h-[38px] px-3.5 py-1.5 rounded-md font-body text-body-sm font-semibold whitespace-nowrap transition-colors ${
              subTab === 'offline'
                ? 'bg-light-primary dark:bg-dark-primary text-light-on-primary dark:text-dark-on-primary'
                : 'text-light-on-surface-variant dark:text-dark-on-surface-variant'
            }`}
          >
            Baixadas Offline ({offlineRecords.length})
          </button>
        </div>

        {subTab === 'galeria' && (
          <div className="flex items-center gap-1 p-1 rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant overflow-x-auto">
            {ALBUMS.map((alb) => (
              <button
                key={alb}
                type="button"
                onClick={() => setAlbumFilter(alb)}
                className={`min-h-[38px] px-3 py-1.5 rounded-md font-body text-body-sm whitespace-nowrap transition-colors ${
                  albumFilter === alb
                    ? 'bg-light-primary dark:bg-dark-primary text-light-on-primary dark:text-dark-on-primary font-semibold'
                    : 'text-light-on-surface-variant dark:text-dark-on-surface-variant'
                }`}
              >
                {alb}
              </button>
            ))}
          </div>
        )}
      </header>

      <main className="px-4 lg:px-8 pb-24 lg:pb-10 flex flex-col gap-4">
        {subTab === 'galeria' && (
          <>
            {filtered.length === 0 ? (
              <div className="rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant p-8 text-center flex flex-col items-center gap-3">
                <p className="font-body text-body-md text-light-on-surface-variant dark:text-dark-on-surface-variant">
                  Nenhuma foto neste álbum ainda. Adicione do seu aparelho ou busque online.
                </p>
                <button
                  type="button"
                  onClick={handleOpenOnlineTab}
                  className="min-h-[42px] px-4 py-2 rounded-full bg-light-primary dark:bg-dark-primary text-light-on-primary dark:text-dark-on-primary font-body text-label-lg"
                >
                  Buscar Imagens Online
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {filtered.map((photo) => {
                  const offlineKey = buildOfflineKey('image', photo.id);
                  const isSavedOffline = offlineKeys.has(offlineKey);
                  const isBusy = Boolean(busyOfflineIds[photo.id]);
                  const resolvedUrl = offlineBlobUrls[offlineKey] || photo.imageUrl;

                  return (
                    <article
                      key={photo.id}
                      className="group rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant overflow-hidden flex flex-col hover:border-light-primary dark:hover:border-dark-primary transition-colors"
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedModal({
                            id: photo.id,
                            title: photo.title,
                            subtitle: `${photo.album} · ${photo.date}`,
                            imageUrl: resolvedUrl,
                            artworkPreset: photo.artworkPreset,
                            offlineKey,
                            canDeleteFromGallery: true,
                          })
                        }
                        className="aspect-[4/3] w-full overflow-hidden bg-dark-surface-container text-left relative"
                      >
                        {resolvedUrl ? (
                          <ResilientImage
                            src={resolvedUrl}
                            alt={photo.title}
                            fallbackType="album"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                          />
                        ) : (
                          <PresetArtwork preset={photo.artworkPreset} title={photo.title} />
                        )}
                        {isSavedOffline && (
                          <span className="absolute top-2 right-2 px-2 py-0.5 rounded bg-black/70 text-cat-emerald font-mono text-[11px] font-semibold">
                            Offline ✓
                          </span>
                        )}
                      </button>

                      <div className="p-3 flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <h2 className="font-headline text-label-lg text-light-on-surface dark:text-dark-on-surface truncate">
                            {photo.title}
                          </h2>
                          <p className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant tabular-nums truncate">
                            {photo.album} · {photo.date}
                          </p>
                        </div>

                        {photo.imageUrl && (
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => void handleSaveGalleryPhotoOffline(photo)}
                              disabled={isBusy}
                              aria-label={isSavedOffline ? 'Remover offline' : 'Salvar offline'}
                              title={isSavedOffline ? 'Salva offline' : 'Salvar offline'}
                              className={`inline-flex items-center justify-center min-w-[34px] min-h-[34px] rounded-full ${
                                isSavedOffline
                                  ? 'text-cat-emerald'
                                  : 'text-light-on-surface-variant dark:text-dark-on-surface-variant hover:text-light-primary dark:hover:text-dark-primary'
                              }`}
                            >
                              <span className="material-symbols-outlined text-[18px]">
                                {isBusy ? 'downloading' : isSavedOffline ? 'cloud_done' : 'cloud_download'}
                              </span>
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                void handleDownloadImageToDevice({
                                  id: photo.id,
                                  title: photo.title,
                                  url: resolvedUrl,
                                  offlineKey,
                                })
                              }
                              aria-label={`Baixar ${photo.title}`}
                              title="Baixar imagem"
                              className="inline-flex items-center justify-center min-w-[34px] min-h-[34px] rounded-full text-light-on-surface-variant dark:text-dark-on-surface-variant hover:text-light-primary dark:hover:text-dark-primary"
                            >
                              <span className="material-symbols-outlined text-[18px]">download</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </>
        )}

        {subTab === 'online' && (
          <div className="flex flex-col gap-4">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void fetchOnlineImages({
                  q: onlineQuery.trim() || undefined,
                  category: onlineCategory,
                  page: 1,
                });
              }}
              className="flex items-center gap-2"
            >
              <div className="relative flex-1">
                <span
                  className="material-symbols-outlined text-[20px] text-light-on-surface-variant dark:text-dark-on-surface-variant absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                  aria-hidden="true"
                >
                  search
                </span>
                <input
                  type="search"
                  value={onlineQuery}
                  onChange={(e) => setOnlineQuery(e.target.value)}
                  placeholder="Buscar imagens sem limites (ex: pôr do sol, cachoeira, bíblia, flores)..."
                  aria-label="Buscar imagens online"
                  className="w-full rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant pl-10 pr-4 py-2.5 text-body-md text-light-on-surface dark:text-dark-on-surface focus:outline-none focus:border-light-primary dark:focus:border-dark-primary"
                />
              </div>
              <button
                type="submit"
                disabled={isSearchingOnline}
                className="min-h-[44px] px-5 py-2 rounded-full bg-light-primary dark:bg-dark-primary text-light-on-primary dark:text-dark-on-primary font-body text-label-lg whitespace-nowrap disabled:opacity-60"
              >
                {isSearchingOnline ? 'Buscando...' : 'Buscar'}
              </button>
            </form>

            <div className="flex items-center gap-1 p-1 rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant overflow-x-auto">
              {ONLINE_IMAGE_CATEGORIES.map((cat) => {
                const active = onlineCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      setOnlineCategory(cat.id);
                      void fetchOnlineImages({
                        q: onlineQuery.trim() || undefined,
                        category: cat.id,
                        page: 1,
                      });
                    }}
                    className={`min-h-[38px] px-3 py-1 rounded-md font-body text-body-sm whitespace-nowrap transition-colors ${
                      active
                        ? 'bg-light-primary dark:bg-dark-primary text-light-on-primary dark:text-dark-on-primary font-semibold'
                        : 'text-light-on-surface-variant dark:text-dark-on-surface-variant hover:text-light-on-surface dark:hover:text-dark-on-surface'
                    }`}
                  >
                    {cat.label}
                  </button>
                );
              })}
            </div>

            {isSearchingOnline ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <div
                    key={n}
                    className="aspect-[4/3] rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant"
                  />
                ))}
              </div>
            ) : onlineResults.length === 0 ? (
              <p className="font-body text-body-md text-light-on-surface-variant dark:text-dark-on-surface-variant py-8 text-center">
                Nenhuma imagem encontrada para esta busca. Tente outro tema.
              </p>
            ) : (
              <>
                <div className="flex items-center justify-between text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
                  <span>{onlineResults.length} imagens carregadas (página {onlinePage})</span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {onlineResults.map((img) => {
                    const offlineKey = buildOfflineKey('image', img.id);
                    const isSavedOffline = offlineKeys.has(offlineKey);
                    const isBusy = Boolean(busyOfflineIds[img.id]);
                    const isDownloading = Boolean(downloadingIds[img.id]);
                    const displaySrc = offlineBlobUrls[offlineKey] || img.thumbUrl;

                    return (
                      <article
                        key={img.id}
                        className="group rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant overflow-hidden flex flex-col justify-between"
                      >
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedModal({
                              id: img.id,
                              title: img.title,
                              subtitle: `${img.author} · ${img.source}`,
                              imageUrl: offlineBlobUrls[offlineKey] || img.fullUrl,
                              offlineKey,
                              onlineItem: img,
                            })
                          }
                          className="aspect-[4/3] w-full overflow-hidden bg-dark-surface-container text-left relative"
                        >
                          <ResilientImage
                            src={displaySrc}
                            alt={img.title}
                            fallbackType="album"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                          />
                          {isSavedOffline && (
                            <span className="absolute top-2 right-2 px-2 py-0.5 rounded bg-black/70 text-cat-emerald font-mono text-[11px] font-semibold">
                              Offline ✓
                            </span>
                          )}
                        </button>

                        <div className="p-3 flex flex-col gap-2">
                          <div className="min-w-0">
                            <h2 className="font-headline text-label-lg text-light-on-surface dark:text-dark-on-surface truncate">
                              {img.title}
                            </h2>
                            <p className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant truncate">
                              {img.author} · {img.source}
                            </p>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => void handleSaveOnlineImageOffline(img)}
                              disabled={isBusy}
                              className={`flex-1 inline-flex items-center justify-center gap-1 min-h-[36px] px-2.5 rounded-full font-body text-label-sm font-semibold ${
                                isSavedOffline
                                  ? 'bg-cat-emerald/15 text-cat-emerald border border-cat-emerald/40'
                                  : 'bg-light-primary dark:bg-dark-primary text-light-on-primary dark:text-dark-on-primary'
                              } disabled:opacity-50`}
                            >
                              <span className="material-symbols-outlined text-[16px]">
                                {isBusy ? 'downloading' : isSavedOffline ? 'cloud_done' : 'cloud_download'}
                              </span>
                              <span>
                                {isBusy ? 'Salvando...' : isSavedOffline ? 'Offline ✓' : 'Salvar Offline'}
                              </span>
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                void handleDownloadImageToDevice({
                                  id: img.id,
                                  title: img.title,
                                  url: img.fullUrl,
                                  offlineKey,
                                })
                              }
                              disabled={isDownloading}
                              aria-label={`Baixar ${img.title}`}
                              title="Baixar imagem para o dispositivo"
                              className="inline-flex items-center justify-center min-w-[36px] min-h-[36px] rounded-full border border-light-outline-variant dark:border-dark-outline-variant text-light-on-surface dark:text-dark-on-surface hover:border-light-primary dark:hover:border-dark-primary disabled:opacity-50"
                            >
                              <span className="material-symbols-outlined text-[18px]">
                                {isDownloading ? 'hourglass_top' : 'download'}
                              </span>
                            </button>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>

                {onlineHasMore && (
                  <div className="flex justify-center pt-2">
                    <button
                      type="button"
                      onClick={() =>
                        void fetchOnlineImages({
                          q: onlineQuery.trim() || undefined,
                          category: onlineCategory,
                          page: onlinePage + 1,
                          append: true,
                        })
                      }
                      disabled={isLoadingMoreOnline}
                      className="min-h-[44px] px-6 py-2 rounded-full border border-light-primary dark:border-dark-primary text-light-primary dark:text-dark-primary font-body text-label-lg font-semibold hover:bg-light-primary/10 dark:hover:bg-dark-primary/10 disabled:opacity-60"
                    >
                      {isLoadingMoreOnline ? 'Carregando mais imagens...' : 'Carregar mais imagens'}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {subTab === 'offline' && (
          <div className="flex flex-col gap-4">
            {offlineRecords.length === 0 ? (
              <div className="rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant p-8 text-center flex flex-col items-center gap-3">
                <span className="material-symbols-outlined text-4xl text-light-on-surface-variant dark:text-dark-on-surface-variant">
                  cloud_off
                </span>
                <p className="font-body text-body-md text-light-on-surface-variant dark:text-dark-on-surface-variant">
                  Nenhuma imagem salva no armazenamento offline ainda. Busque imagens online ou envie da sua galeria.
                </p>
                <button
                  type="button"
                  onClick={handleOpenOnlineTab}
                  className="min-h-[42px] px-4 py-2 rounded-full bg-light-primary dark:bg-dark-primary text-light-on-primary dark:text-dark-on-primary font-body text-label-lg"
                >
                  Buscar Imagens Online
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {offlineRecords.map((rec) => {
                  const blobUrl = offlineBlobUrls[rec.key] || rec.coverUrl || '';
                  return (
                    <article
                      key={rec.key}
                      className="rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant overflow-hidden flex flex-col"
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedModal({
                            id: rec.itemId,
                            title: rec.title,
                            subtitle: `${rec.subtitle} · ${formatBytes(rec.sizeBytes)}`,
                            imageUrl: blobUrl,
                            offlineKey: rec.key,
                          })
                        }
                        className="aspect-[4/3] w-full overflow-hidden bg-dark-surface-container relative"
                      >
                        <ResilientImage
                          src={blobUrl}
                          alt={rec.title}
                          fallbackType="album"
                          className="w-full h-full object-cover"
                        />
                        <span className="absolute top-2 right-2 px-2 py-0.5 rounded bg-black/70 text-cat-emerald font-mono text-[11px] font-semibold">
                          {formatBytes(rec.sizeBytes)}
                        </span>
                      </button>
                      <div className="p-3 flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <h2 className="font-headline text-label-lg text-light-on-surface dark:text-dark-on-surface truncate">
                            {rec.title}
                          </h2>
                          <p className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant truncate">
                            {rec.subtitle}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() =>
                              void handleDownloadImageToDevice({
                                id: rec.itemId,
                                title: rec.title,
                                offlineKey: rec.key,
                              })
                            }
                            aria-label={`Baixar ${rec.title}`}
                            className="inline-flex items-center justify-center min-w-[34px] min-h-[34px] rounded-full text-light-primary dark:text-dark-primary"
                          >
                            <span className="material-symbols-outlined text-[18px]">download</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              void deleteOfflineMedia(rec.key);
                              onShowToast('Imagem removida do armazenamento offline.');
                            }}
                            aria-label={`Excluir ${rec.title} offline`}
                            className="inline-flex items-center justify-center min-w-[34px] min-h-[34px] rounded-full text-light-error dark:text-dark-error"
                          >
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>

      {selectedModal && (
        <div
          className="fixed inset-0 z-40 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label={selectedModal.title}
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedModal(null);
          }}
        >
          <div className="w-full max-w-2xl rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant overflow-hidden flex flex-col">
            <div className="max-h-[65vh] w-full bg-dark-surface-container flex items-center justify-center overflow-hidden">
              {selectedModal.imageUrl ? (
                <ResilientImage
                  src={selectedModal.imageUrl}
                  alt={selectedModal.title}
                  fallbackType="album"
                  className="w-full h-full max-h-[65vh] object-contain"
                />
              ) : (
                <div className="w-full aspect-[4/3]">
                  <PresetArtwork
                    preset={selectedModal.artworkPreset || 'fellowship'}
                    title={selectedModal.title}
                  />
                </div>
              )}
            </div>
            <div className="p-4 flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h3 className="font-headline text-title-md text-light-on-surface dark:text-dark-on-surface truncate">
                  {selectedModal.title}
                </h3>
                <p className="font-body text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant truncate">
                  {selectedModal.subtitle}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {selectedModal.onlineItem && (
                  <button
                    type="button"
                    onClick={() => void handleSaveOnlineImageOffline(selectedModal.onlineItem!)}
                    className="min-h-[40px] px-4 py-1.5 rounded-full bg-light-primary dark:bg-dark-primary text-light-on-primary dark:text-dark-on-primary font-body text-body-sm font-semibold"
                  >
                    {selectedModal.offlineKey && offlineKeys.has(selectedModal.offlineKey)
                      ? 'Remover Offline'
                      : 'Salvar Offline'}
                  </button>
                )}
                {selectedModal.imageUrl && (
                  <button
                    type="button"
                    onClick={() =>
                      void handleDownloadImageToDevice({
                        id: selectedModal.id,
                        title: selectedModal.title,
                        url: selectedModal.imageUrl,
                        offlineKey: selectedModal.offlineKey,
                      })
                    }
                    className="min-h-[40px] px-4 py-1.5 rounded-full border border-light-primary dark:border-dark-primary text-light-primary dark:text-dark-primary font-body text-body-sm font-semibold"
                  >
                    Baixar Imagem
                  </button>
                )}
                {selectedModal.canDeleteFromGallery && onDeletePhoto && (
                  <button
                    type="button"
                    onClick={() => {
                      onDeletePhoto(selectedModal.id);
                      if (selectedModal.offlineKey) {
                        void deleteOfflineMedia(selectedModal.offlineKey);
                      }
                      setSelectedModal(null);
                      onShowToast('Foto removida da galeria.');
                    }}
                    className="min-h-[40px] px-3.5 py-1.5 rounded-full border border-light-error/50 text-light-error dark:text-dark-error font-body text-body-sm"
                  >
                    Excluir
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setSelectedModal(null)}
                  className="min-h-[40px] px-4 py-1.5 rounded-full bg-light-surface-container-high dark:bg-dark-surface-container-high text-light-on-surface dark:text-dark-on-surface font-body text-body-sm"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
