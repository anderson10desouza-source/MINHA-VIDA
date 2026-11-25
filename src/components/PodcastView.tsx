import React, { useEffect, useState } from 'react';
import { OfflineMediaRecord, PodcastEpisode, PodcastShow } from '../types';
import {
  buildOfflineKey,
  deleteOfflineMedia,
  downloadMediaFileToDevice,
  formatBytes,
  listOfflineRecords,
  sanitizeFilename,
  saveOfflineMediaFromUrl,
  subscribeOfflineMedia,
} from '../utils/offlineMediaStore';
import { ResilientImage } from './ResilientImage';

export const PODCAST_CATEGORIES = [
  { id: 'destaques', label: 'Destaques BR' },
  { id: 'cristao', label: 'Cristão & Devocional' },
  { id: 'noticias', label: 'Notícias' },
  { id: 'negocios', label: 'Negócios & Finanças' },
  { id: 'tecnologia', label: 'Tecnologia' },
  { id: 'saude', label: 'Saúde & Bem-estar' },
  { id: 'historia', label: 'História & Educação' },
  { id: 'cultura', label: 'Cultura & Música' },
];

interface PodcastViewProps {
  shows: PodcastShow[];
  selectedShow: PodcastShow | null;
  episodes: PodcastEpisode[];
  activeAudioId: string | null;
  isPlaying: boolean;
  podcastElapsedSeconds: number;
  podcastTotalSeconds: number;
  selectedCategory: string;
  isSearchingShows: boolean;
  isLoadingEpisodes: boolean;
  hasMoreShows?: boolean;
  isLoadingMoreShows?: boolean;
  favoritePodcastIds?: string[];
  onToggleFavoritePodcast?: (ep: PodcastEpisode) => void;
  onSelectCategory: (categoryId: string) => void;
  onSearchPodcasts: (query: string) => void;
  onLoadMoreShows?: () => void;
  onOpenShow: (show: PodcastShow) => void;
  onCloseShow: () => void;
  onToggleEpisode: (episode: PodcastEpisode) => void;
  onSeekPodcast: (fraction: number) => void;
  onShowToast?: (msg: string) => void;
  onBack: () => void;
}

function formatSeconds(sec: number): string {
  const safe = Math.max(0, Math.floor(sec));
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = safe % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export const PodcastView: React.FC<PodcastViewProps> = ({
  shows,
  selectedShow,
  episodes,
  activeAudioId,
  isPlaying,
  podcastElapsedSeconds,
  podcastTotalSeconds,
  selectedCategory,
  isSearchingShows,
  isLoadingEpisodes,
  hasMoreShows = false,
  isLoadingMoreShows = false,
  favoritePodcastIds = [],
  onToggleFavoritePodcast,
  onSelectCategory,
  onSearchPodcasts,
  onLoadMoreShows,
  onOpenShow,
  onCloseShow,
  onToggleEpisode,
  onSeekPodcast,
  onShowToast,
  onBack,
}) => {
  const [searchInput, setSearchInput] = useState('');
  const [episodeFilter, setEpisodeFilter] = useState('');
  const [viewMode, setViewMode] = useState<'online' | 'offline'>('online');
  const [episodeLimit, setEpisodeLimit] = useState(40);
  const [offlineRecords, setOfflineRecords] = useState<OfflineMediaRecord[]>([]);
  const [downloadingIds, setDownloadingIds] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const refresh = () => {
      void listOfflineRecords('podcast').then(setOfflineRecords);
    };
    refresh();
    return subscribeOfflineMedia(refresh);
  }, []);

  useEffect(() => {
    setEpisodeLimit(40);
  }, [selectedShow?.id]);

  const offlineMap = new Map<string, OfflineMediaRecord>(
    offlineRecords.map((r) => [r.itemId, r])
  );

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setViewMode('online');
    onSearchPodcasts(searchInput);
  };

  const handleSaveEpisodeOffline = async (ep: PodcastEpisode) => {
    const key = buildOfflineKey('podcast', ep.id);
    if (offlineMap.has(ep.id)) {
      await deleteOfflineMedia(key);
      onShowToast?.(`"${ep.title}" removido do modo offline.`);
      return;
    }
    if (!ep.audioUrl) {
      onShowToast?.('Este episódio não possui link direto de áudio MP3.');
      return;
    }
    setDownloadingIds((prev) => ({ ...prev, [ep.id]: true }));
    try {
      await saveOfflineMediaFromUrl({
        key,
        kind: 'podcast',
        itemId: ep.id,
        title: ep.title,
        subtitle: `${ep.series} · ${ep.host}`,
        url: ep.audioUrl,
        coverUrl: ep.coverUrl,
        extraJson: JSON.stringify(ep),
      });
      onShowToast?.(`Episódio "${ep.title}" salvo para ouvir offline!`);
    } catch {
      onShowToast?.('Não foi possível baixar este episódio agora.');
    } finally {
      setDownloadingIds((prev) => ({ ...prev, [ep.id]: false }));
    }
  };

  const handleDownloadEpisodeFile = async (ep: PodcastEpisode) => {
    const key = buildOfflineKey('podcast', ep.id);
    const hasOffline = offlineMap.has(ep.id);
    if (!hasOffline && !ep.audioUrl) {
      onShowToast?.('Arquivo de áudio indisponível para download.');
      return;
    }
    setDownloadingIds((prev) => ({ ...prev, [ep.id]: true }));
    try {
      await downloadMediaFileToDevice({
        key: hasOffline ? key : undefined,
        url: ep.audioUrl,
        filename: sanitizeFilename(`${ep.series} - ${ep.title}`, 'mp3'),
      });
      onShowToast?.(`Download de "${ep.title}" iniciado!`);
    } catch {
      onShowToast?.('Falha ao baixar o arquivo MP3 deste episódio.');
    } finally {
      setDownloadingIds((prev) => ({ ...prev, [ep.id]: false }));
    }
  };

  const offlineEpisodes: PodcastEpisode[] = offlineRecords.map((rec) => {
    if (rec.extraJson) {
      try {
        return JSON.parse(rec.extraJson) as PodcastEpisode;
      } catch {
        // fallback
      }
    }
    return {
      id: rec.itemId,
      title: rec.title,
      series: rec.subtitle,
      host: 'Episódio Offline',
      durationMinutes: 30,
      publishedAt: 'Salvo offline',
      summary: 'Episódio salvo no dispositivo para ouvir sem internet.',
      frequencies: [220, 277.18, 329.63],
      coverUrl: rec.coverUrl,
      isRealAudio: true,
    };
  });

  const filteredEpisodes = episodeFilter.trim()
    ? episodes.filter(
        (ep) =>
          ep.title.toLowerCase().includes(episodeFilter.toLowerCase()) ||
          ep.summary.toLowerCase().includes(episodeFilter.toLowerCase())
      )
    : episodes;

  const visibleEpisodes = filteredEpisodes.slice(0, episodeLimit);

  return (
    <div className="flex flex-col">
      <header className="px-4 lg:px-8 pt-6 pb-4 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={selectedShow ? onCloseShow : onBack}
              aria-label="Voltar"
              className="inline-flex items-center justify-center min-w-[44px] min-h-[44px] -ml-2 rounded-full text-light-on-surface dark:text-dark-on-surface hover:bg-light-surface-container-high dark:hover:bg-dark-surface-container-high transition-colors shrink-0"
            >
              <span className="material-symbols-outlined text-[20px]">arrow_back</span>
            </button>
            <div className="min-w-0">
              <h1 className="font-headline text-headline-md lg:text-headline-lg text-light-on-surface dark:text-dark-on-surface truncate">
                {selectedShow ? selectedShow.title : 'Podcasts Reais'}
              </h1>
              <p className="font-body text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant truncate">
                {selectedShow
                  ? `${selectedShow.host} · ${selectedShow.genre}`
                  : 'Busca sem limites, baixe episódios e ouça online ou offline.'}
              </p>
            </div>
          </div>

          {selectedShow && (
            <button
              type="button"
              onClick={onCloseShow}
              className="min-h-[38px] px-3 py-1.5 rounded-full border border-light-outline-variant dark:border-dark-outline-variant bg-light-surface-container-low dark:bg-dark-surface-container-low font-body text-body-sm text-light-on-surface dark:text-dark-on-surface whitespace-nowrap shrink-0"
            >
              Todos os programas
            </button>
          )}
        </div>

        {!selectedShow && (
          <div className="flex items-center gap-1 p-1 rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant w-fit">
            <button
              type="button"
              onClick={() => setViewMode('online')}
              className={`min-h-[38px] px-3.5 py-1.5 rounded-md font-body text-body-sm font-semibold transition-colors ${
                viewMode === 'online'
                  ? 'bg-light-primary dark:bg-dark-primary text-light-on-primary dark:text-dark-on-primary'
                  : 'text-light-on-surface-variant dark:text-dark-on-surface-variant'
              }`}
            >
              Programas ({shows.length})
            </button>
            <button
              type="button"
              onClick={() => setViewMode('offline')}
              className={`min-h-[38px] px-3.5 py-1.5 rounded-md font-body text-body-sm font-semibold transition-colors ${
                viewMode === 'offline'
                  ? 'bg-light-primary dark:bg-dark-primary text-light-on-primary dark:text-dark-on-primary'
                  : 'text-light-on-surface-variant dark:text-dark-on-surface-variant'
              }`}
            >
              Baixados Offline ({offlineRecords.length})
            </button>
          </div>
        )}

        {/* Search All Real Podcasts */}
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
          <div className="relative flex-1">
            <span
              className="material-symbols-outlined text-[20px] text-light-on-surface-variant dark:text-dark-on-surface-variant absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            >
              search
            </span>
            <input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Buscar qualquer podcast no mundo inteiro..."
              aria-label="Buscar podcast real"
              className="w-full rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant text-light-on-surface dark:text-dark-on-surface font-body text-body-md pl-10 pr-4 py-2.5 focus:outline-none focus:border-light-primary dark:focus:border-dark-primary"
            />
          </div>
          <button
            type="submit"
            disabled={isSearchingShows}
            className="min-h-[44px] px-4 py-2 rounded-lg bg-light-primary dark:bg-dark-primary text-light-on-primary dark:text-dark-on-primary font-body text-label-lg whitespace-nowrap disabled:opacity-60"
          >
            {isSearchingShows ? 'Buscando...' : 'Buscar'}
          </button>
        </form>

        {/* Category Filter Strip */}
        {!selectedShow && viewMode === 'online' && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {PODCAST_CATEGORIES.map((cat) => {
              const active = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => onSelectCategory(cat.id)}
                  className={`min-h-[38px] px-3.5 py-1.5 rounded-md border font-body text-body-sm whitespace-nowrap shrink-0 transition-colors ${
                    active
                      ? 'bg-light-primary dark:bg-dark-primary border-light-primary dark:border-dark-primary text-light-on-primary dark:text-dark-on-primary font-semibold'
                      : 'bg-light-surface-container-low dark:bg-dark-surface-container-low border-light-outline-variant dark:border-dark-outline-variant text-light-on-surface dark:text-dark-on-surface hover:border-light-primary/60 dark:hover:border-dark-primary/60'
                  }`}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>
        )}
      </header>

      {selectedShow ? (
        <main className="px-4 lg:px-8 pb-40 lg:pb-20 flex flex-col gap-4">
          {/* Show Banner */}
          <section className="rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <ResilientImage
              src={selectedShow.coverUrl}
              alt={selectedShow.title}
              fallbackType="album"
              className="w-20 h-20 rounded-lg object-cover shrink-0 border border-light-outline-variant dark:border-dark-outline-variant"
            />
            <div className="min-w-0 flex-1 flex flex-col gap-1">
              <span className="font-body text-label-sm text-light-primary dark:text-dark-primary">
                {selectedShow.genre}
              </span>
              <h2 className="font-headline text-title-lg text-light-on-surface dark:text-dark-on-surface">
                {selectedShow.title}
              </h2>
              <p className="font-body text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
                {selectedShow.host} · {filteredEpisodes.length} episódios disponíveis
              </p>
            </div>
            <input
              type="search"
              value={episodeFilter}
              onChange={(e) => setEpisodeFilter(e.target.value)}
              placeholder="Filtrar episódios..."
              aria-label="Filtrar episódios deste podcast"
              className="w-full sm:w-56 rounded-md bg-light-surface-container dark:bg-dark-surface-container border border-light-outline-variant dark:border-dark-outline-variant text-light-on-surface dark:text-dark-on-surface font-body text-body-sm px-3 py-2 focus:outline-none focus:border-light-primary dark:focus:border-dark-primary"
            />
          </section>

          {isLoadingEpisodes ? (
            <div className="rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant p-8 text-center font-body text-body-md text-light-on-surface-variant dark:text-dark-on-surface-variant">
              Carregando todos os episódios do feed RSS...
            </div>
          ) : visibleEpisodes.length === 0 ? (
            <div className="rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant p-8 text-center flex flex-col items-center gap-2">
              <p className="font-body text-body-md text-light-on-surface dark:text-dark-on-surface">
                Não encontramos episódios disponíveis neste feed no momento.
              </p>
              <button
                type="button"
                onClick={onCloseShow}
                className="min-h-[40px] px-4 py-2 rounded-full bg-light-primary dark:bg-dark-primary text-light-on-primary dark:text-dark-on-primary font-body text-label-lg"
              >
                Voltar aos programas
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {visibleEpisodes.map((ep) => {
                  const isSelected = activeAudioId === ep.id;
                  const playingThis = isSelected && isPlaying;
                  const isSavedOffline = offlineMap.has(ep.id);
                  const isBusy = Boolean(downloadingIds[ep.id]);
                  const totalSec =
                    isSelected && podcastTotalSeconds > 0
                      ? podcastTotalSeconds
                      : ep.durationSeconds || ep.durationMinutes * 60;
                  const fraction =
                    isSelected && totalSec > 0
                      ? Math.min(1, podcastElapsedSeconds / totalSec)
                      : 0;

                  return (
                    <article
                      key={ep.id}
                      className={`rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border p-4 flex flex-col justify-between gap-3 transition-colors ${
                        playingThis
                          ? 'border-light-primary dark:border-dark-primary'
                          : 'border-light-outline-variant dark:border-dark-outline-variant'
                      }`}
                    >
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center justify-between gap-2 text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
                          <span className="font-body text-light-primary dark:text-dark-primary font-medium truncate">
                            {ep.series}
                            {isSavedOffline ? ' · Offline ✓' : ''}
                          </span>
                          <span className="font-mono tabular-nums whitespace-nowrap">
                            {ep.durationMinutes} min · {ep.publishedAt}
                          </span>
                        </div>

                        <h3 className="font-headline text-title-md text-light-on-surface dark:text-dark-on-surface">
                          {ep.title}
                        </h3>
                        <p className="font-body text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
                          {ep.summary}
                        </p>
                      </div>

                      {isSelected && (
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-label-sm text-light-primary dark:text-dark-primary tabular-nums">
                            {formatSeconds(podcastElapsedSeconds)}
                          </span>
                          <input
                            type="range"
                            min={0}
                            max={1}
                            step={0.005}
                            value={fraction}
                            onChange={(e) => onSeekPodcast(parseFloat(e.target.value))}
                            aria-label="Progresso do episódio"
                            className="flex-1 h-1.5 accent-accent-gold cursor-pointer"
                          />
                          <span className="font-mono text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant tabular-nums">
                            {formatSeconds(totalSec)}
                          </span>
                        </div>
                      )}

                      <div className="flex items-center justify-between gap-2 pt-1 border-t border-light-outline-variant/60 dark:border-dark-outline-variant/60">
                        <span className="font-body text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant truncate">
                          {ep.host}
                        </span>
                        <div className="flex items-center gap-1 shrink-0">
                          {ep.audioUrl && (
                            <>
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => void handleSaveEpisodeOffline(ep)}
                                aria-label={
                                  isSavedOffline
                                    ? 'Remover episódio do offline'
                                    : 'Salvar episódio para ouvir offline'
                                }
                                title={
                                  isSavedOffline
                                    ? 'Salvo offline (toque para remover)'
                                    : 'Salvar no app para ouvir offline'
                                }
                                className={`inline-flex items-center justify-center min-w-[36px] min-h-[36px] rounded-full ${
                                  isSavedOffline
                                    ? 'text-cat-emerald'
                                    : 'text-light-on-surface-variant dark:text-dark-on-surface-variant hover:text-light-primary dark:hover:text-dark-primary'
                                } disabled:opacity-50`}
                              >
                                <span className="material-symbols-outlined text-[19px]">
                                  {isBusy
                                    ? 'downloading'
                                    : isSavedOffline
                                      ? 'cloud_done'
                                      : 'cloud_download'}
                                </span>
                              </button>
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => void handleDownloadEpisodeFile(ep)}
                                aria-label={`Baixar MP3 de ${ep.title}`}
                                title="Baixar arquivo MP3"
                                className="inline-flex items-center justify-center min-w-[36px] min-h-[36px] rounded-full text-light-on-surface-variant dark:text-dark-on-surface-variant hover:text-light-primary dark:hover:text-dark-primary disabled:opacity-50"
                              >
                                <span className="material-symbols-outlined text-[19px]">
                                  download
                                </span>
                              </button>
                            </>
                          )}
                          {onToggleFavoritePodcast && (
                            <button
                              type="button"
                              onClick={() => onToggleFavoritePodcast(ep)}
                              aria-label={
                                favoritePodcastIds.includes(ep.id)
                                  ? 'Remover episódio dos favoritos'
                                  : 'Favoritar episódio'
                              }
                              className={`inline-flex items-center justify-center min-w-[36px] min-h-[36px] rounded-full ${
                                favoritePodcastIds.includes(ep.id)
                                  ? 'text-accent-gold'
                                  : 'text-light-on-surface-variant dark:text-dark-on-surface-variant'
                              }`}
                            >
                              <span
                                className={`material-symbols-outlined text-[19px] ${
                                  favoritePodcastIds.includes(ep.id)
                                    ? 'material-symbols-filled'
                                    : ''
                                }`}
                              >
                                favorite
                              </span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => onToggleEpisode(ep)}
                            aria-pressed={playingThis}
                            className="min-h-[40px] inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-light-primary-container dark:bg-dark-primary-container text-light-on-primary-container dark:text-dark-on-primary font-body text-label-lg whitespace-nowrap transition-transform active:scale-95"
                          >
                            <span className="material-symbols-outlined material-symbols-filled text-[18px]">
                              {playingThis ? 'pause' : 'play_arrow'}
                            </span>
                            <span>{playingThis ? 'Pausar' : 'Ouvir'}</span>
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>

              {filteredEpisodes.length > episodeLimit && (
                <button
                  type="button"
                  onClick={() => setEpisodeLimit((prev) => prev + 50)}
                  className="min-h-[44px] w-full rounded-full border border-light-primary/60 dark:border-dark-primary/60 text-light-primary dark:text-dark-primary font-body text-label-lg hover:bg-light-primary/10 dark:hover:bg-dark-primary/10 transition-colors"
                >
                  Mostrar mais episódios ({filteredEpisodes.length - episodeLimit} restantes)
                </button>
              )}
            </>
          )}
        </main>
      ) : viewMode === 'offline' ? (
        <main className="px-4 lg:px-8 pb-40 lg:pb-20 flex flex-col gap-3">
          {offlineEpisodes.length === 0 ? (
            <div className="rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant p-8 text-center font-body text-body-md text-light-on-surface-variant dark:text-dark-on-surface-variant">
              Nenhum episódio baixado ainda. Abra qualquer podcast e toque no ícone de nuvem para salvar e ouvir sem internet.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {offlineEpisodes.map((ep) => {
                const rec = offlineMap.get(ep.id);
                const isSelected = activeAudioId === ep.id;
                const playingThis = isSelected && isPlaying;
                return (
                  <article
                    key={ep.id}
                    className={`rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border p-4 flex flex-col justify-between gap-3 ${
                      playingThis
                        ? 'border-light-primary dark:border-dark-primary'
                        : 'border-light-outline-variant dark:border-dark-outline-variant'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <ResilientImage
                        src={ep.coverUrl || ''}
                        alt={ep.title}
                        fallbackType="album"
                        className="w-14 h-14 rounded-md object-cover shrink-0 border border-light-outline-variant dark:border-dark-outline-variant"
                      />
                      <div className="min-w-0 flex-1">
                        <span className="font-body text-label-sm text-cat-emerald block truncate">
                          Offline · {rec ? formatBytes(rec.sizeBytes) : 'Salvo'}
                        </span>
                        <h3 className="font-headline text-title-md text-light-on-surface dark:text-dark-on-surface line-clamp-2">
                          {ep.title}
                        </h3>
                        <p className="font-body text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant truncate">
                          {ep.series}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-light-outline-variant/60 dark:border-dark-outline-variant/60">
                      <button
                        type="button"
                        onClick={() => void handleDownloadEpisodeFile(ep)}
                        aria-label={`Baixar MP3 de ${ep.title}`}
                        className="min-h-[38px] px-3 rounded-full border border-light-outline-variant dark:border-dark-outline-variant font-body text-label-sm inline-flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-[16px]">download</span>
                        <span>MP3</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleSaveEpisodeOffline(ep)}
                        aria-label={`Remover ${ep.title} do offline`}
                        className="inline-flex items-center justify-center min-w-[38px] min-h-[38px] rounded-full text-light-error dark:text-dark-error"
                      >
                        <span className="material-symbols-outlined text-[19px]">delete</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onToggleEpisode(ep)}
                        className="min-h-[38px] inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-light-primary-container dark:bg-dark-primary-container text-light-on-primary-container dark:text-dark-on-primary font-body text-label-lg"
                      >
                        <span className="material-symbols-outlined material-symbols-filled text-[18px]">
                          {playingThis ? 'pause' : 'play_arrow'}
                        </span>
                        <span>{playingThis ? 'Pausar' : 'Ouvir Offline'}</span>
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </main>
      ) : (
        <main className="px-4 lg:px-8 pb-40 lg:pb-20 flex flex-col gap-4">
          {isSearchingShows ? (
            <div className="rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant p-8 text-center font-body text-body-md text-light-on-surface-variant dark:text-dark-on-surface-variant">
              Buscando podcasts reais no catálogo oficial...
            </div>
          ) : shows.length === 0 ? (
            <div className="rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant p-8 text-center font-body text-body-md text-light-on-surface-variant dark:text-dark-on-surface-variant">
              Nenhum podcast encontrado para esta busca. Tente outro tema ou nome.
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {shows.map((show) => (
                  <button
                    key={show.id}
                    type="button"
                    onClick={() => onOpenShow(show)}
                    className="rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant hover:border-light-primary dark:hover:border-dark-primary p-3.5 flex items-center gap-3.5 text-left transition-colors"
                  >
                    <ResilientImage
                      src={show.coverUrl}
                      alt={show.title}
                      fallbackType="album"
                      className="w-16 h-16 rounded-md object-cover shrink-0 border border-light-outline-variant dark:border-dark-outline-variant"
                    />
                    <div className="min-w-0 flex-1 flex flex-col gap-0.5">
                      <span className="font-body text-label-sm text-light-primary dark:text-dark-primary truncate">
                        {show.genre}
                      </span>
                      <h2 className="font-headline text-title-md text-light-on-surface dark:text-dark-on-surface line-clamp-2">
                        {show.title}
                      </h2>
                      <p className="font-body text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant truncate tabular-nums">
                        {show.host}
                        {show.episodeCount > 0 ? ` · ${show.episodeCount} ep.` : ''}
                      </p>
                    </div>
                    <span
                      className="material-symbols-outlined text-[20px] text-light-on-surface-variant dark:text-dark-on-surface-variant shrink-0"
                      aria-hidden="true"
                    >
                      chevron_right
                    </span>
                  </button>
                ))}
              </div>

              {hasMoreShows && onLoadMoreShows && (
                <button
                  type="button"
                  onClick={onLoadMoreShows}
                  disabled={isLoadingMoreShows}
                  className="min-h-[44px] w-full rounded-full border border-light-primary/60 dark:border-dark-primary/60 text-light-primary dark:text-dark-primary font-body text-label-lg hover:bg-light-primary/10 dark:hover:bg-dark-primary/10 transition-colors disabled:opacity-60"
                >
                  {isLoadingMoreShows ? 'Carregando mais podcasts...' : 'Carregar mais podcasts'}
                </button>
              )}
            </>
          )}

          {/* Quick curated offline/recent episodes fallback */}
          {episodes.length > 0 && (
            <section className="pt-2 flex flex-col gap-2">
              <h2 className="font-headline text-title-md text-light-on-surface dark:text-dark-on-surface">
                Episódios em Destaque ({episodes.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {episodes.slice(0, 20).map((ep) => {
                  const isSelected = activeAudioId === ep.id;
                  const playingThis = isSelected && isPlaying;
                  const isSavedOffline = offlineMap.has(ep.id);
                  const isBusy = Boolean(downloadingIds[ep.id]);
                  return (
                    <article
                      key={ep.id}
                      className="rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant p-3.5 flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0 flex-1">
                        <span className="font-body text-label-sm text-light-primary dark:text-dark-primary truncate block">
                          {ep.series} · {ep.durationMinutes} min
                          {isSavedOffline ? ' · Offline ✓' : ''}
                        </span>
                        <h3 className="font-headline text-title-md text-light-on-surface dark:text-dark-on-surface truncate">
                          {ep.title}
                        </h3>
                        <p className="font-body text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant truncate">
                          {ep.host}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {ep.audioUrl && (
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => void handleSaveEpisodeOffline(ep)}
                            aria-label="Salvar episódio offline"
                            className={`inline-flex items-center justify-center w-9 h-9 rounded-full ${
                              isSavedOffline
                                ? 'text-cat-emerald'
                                : 'text-light-on-surface-variant dark:text-dark-on-surface-variant'
                            }`}
                          >
                            <span className="material-symbols-outlined text-[19px]">
                              {isBusy
                                ? 'downloading'
                                : isSavedOffline
                                  ? 'cloud_done'
                                  : 'cloud_download'}
                            </span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => onToggleEpisode(ep)}
                          aria-label={playingThis ? 'Pausar episódio' : 'Ouvir episódio'}
                          className="inline-flex items-center justify-center w-11 h-11 rounded-full bg-light-primary-container dark:bg-dark-primary-container text-light-on-primary-container dark:text-dark-on-primary shrink-0"
                        >
                          <span className="material-symbols-outlined material-symbols-filled text-[22px]">
                            {playingThis ? 'pause' : 'play_arrow'}
                          </span>
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          )}
        </main>
      )}
    </div>
  );
};
