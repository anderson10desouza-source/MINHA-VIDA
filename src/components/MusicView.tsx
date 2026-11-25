import React, { useEffect, useRef, useState } from 'react';
import { MusicTrack, OfflineMediaRecord } from '../types';
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

export const POPULAR_SINGERS = [
  'Todos',
  'Voz da Verdade',
  'Gabriela Rocha',
  'Aline Barros',
  'Fernandinho',
  'Isaías Saad',
  'Morada',
  'Preto no Branco',
  'Diante do Trono',
  'Davi Sacer',
  'Thalles Roberto',
  'Bruna Karla',
];

export type MusicSourceFilter = 'all' | 'youtube' | 'mp3' | 'catalogs';

interface MusicViewProps {
  tracks: MusicTrack[];
  currentTrack: MusicTrack;
  isPlaying: boolean;
  playbackProgress: number;
  selectedArtist: string;
  selectedSource?: MusicSourceFilter;
  isSearching: boolean;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  favoriteTrackIds: string[];
  onSelectArtist: (artist: string) => void;
  onSelectSource?: (source: MusicSourceFilter) => void;
  onSearchMusic: (query: string) => void;
  onLoadMore?: () => void;
  onSelectTrack: (trackId: string) => void;
  onPlayExternalTrack?: (track: MusicTrack) => void;
  onTogglePlay: () => void;
  onNextTrack: () => void;
  onPrevTrack: () => void;
  onSeek: (fraction: number) => void;
  onAddLocalTrack: (file: File) => void;
  onToggleFavoriteTrack: (trackId: string) => void;
  onShowToast?: (msg: string) => void;
  onBack: () => void;
  showMiniPip?: boolean;
  onToggleVideoPip?: () => void;
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export const MusicView: React.FC<MusicViewProps> = ({
  tracks,
  currentTrack,
  isPlaying,
  playbackProgress,
  selectedArtist,
  selectedSource = 'all',
  isSearching,
  hasMore = false,
  isLoadingMore = false,
  favoriteTrackIds,
  onSelectArtist,
  onSelectSource,
  onSearchMusic,
  onLoadMore,
  onSelectTrack,
  onPlayExternalTrack,
  onTogglePlay,
  onNextTrack,
  onPrevTrack,
  onSeek,
  onAddLocalTrack,
  onToggleFavoriteTrack,
  onShowToast,
  onBack,
  showMiniPip,
  onToggleVideoPip,
}) => {
  const [searchInput, setSearchInput] = useState('');
  const [viewMode, setViewMode] = useState<'online' | 'offline'>('online');
  const [offlineRecords, setOfflineRecords] = useState<OfflineMediaRecord[]>([]);
  const [downloadingIds, setDownloadingIds] = useState<Record<string, boolean>>({});
  const audioFileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const refresh = () => {
      void listOfflineRecords('music').then(setOfflineRecords);
    };
    refresh();
    return subscribeOfflineMedia(refresh);
  }, []);

  const offlineMap = new Map<string, OfflineMediaRecord>(
    offlineRecords.map((r) => [r.itemId, r])
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) {
      onAddLocalTrack(file);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setViewMode('online');
    onSearchMusic(searchInput);
  };

  const handleSaveTrackOffline = async (track: MusicTrack) => {
    const key = buildOfflineKey('music', track.id);
    if (offlineMap.has(track.id)) {
      await deleteOfflineMedia(key);
      onShowToast?.(`"${track.title}" removida do modo offline.`);
      return;
    }
    if (!track.audioUrl) {
      onShowToast?.('Esta faixa do YouTube reproduz apenas online. Busque ou use faixas MP3 para salvar offline.');
      return;
    }
    setDownloadingIds((prev) => ({ ...prev, [track.id]: true }));
    try {
      await saveOfflineMediaFromUrl({
        key,
        kind: 'music',
        itemId: track.id,
        title: track.title,
        subtitle: track.artist,
        url: track.audioUrl,
        coverUrl: track.coverUrl,
        extraJson: JSON.stringify(track),
      });
      onShowToast?.(`"${track.title}" salva para ouvir offline!`);
    } catch {
      onShowToast?.('Não foi possível baixar esta música agora.');
    } finally {
      setDownloadingIds((prev) => ({ ...prev, [track.id]: false }));
    }
  };

  const handleDownloadTrackFile = async (track: MusicTrack) => {
    const key = buildOfflineKey('music', track.id);
    const hasOffline = offlineMap.has(track.id);
    if (!hasOffline && !track.audioUrl) {
      onShowToast?.('Esta faixa reproduz via YouTube online. Selecione uma faixa com selo MP3 para baixar.');
      return;
    }
    setDownloadingIds((prev) => ({ ...prev, [track.id]: true }));
    try {
      await downloadMediaFileToDevice({
        key: hasOffline ? key : undefined,
        url: track.audioUrl,
        filename: sanitizeFilename(`${track.artist} - ${track.title}`, 'mp3'),
      });
      onShowToast?.(`Download de "${track.title}" iniciado!`);
    } catch {
      onShowToast?.('Erro ao baixar o arquivo MP3.');
    } finally {
      setDownloadingIds((prev) => ({ ...prev, [track.id]: false }));
    }
  };

  const offlineTracks: MusicTrack[] = offlineRecords.map((rec) => {
    if (rec.extraJson) {
      try {
        return JSON.parse(rec.extraJson) as MusicTrack;
      } catch {
        // fallback below
      }
    }
    return {
      id: rec.itemId,
      title: rec.title,
      artist: rec.subtitle,
      durationSeconds: 210,
      coverUrl: rec.coverUrl || '',
      frequencies: [261.63, 329.63, 392.0, 493.88],
      isRealAudio: true,
      isFullTrack: true,
      isDownloadable: true,
      sourceLabel: 'Offline',
    };
  });

  return (
    <div className="flex flex-col">
      <header className="px-4 lg:px-8 pt-6 pb-4 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={onBack}
              aria-label="Voltar"
              className="inline-flex items-center justify-center min-w-[44px] min-h-[44px] -ml-2 rounded-full text-light-on-surface dark:text-dark-on-surface hover:bg-light-surface-container-high dark:hover:bg-dark-surface-container-high transition-colors shrink-0"
            >
              <span className="material-symbols-outlined text-[20px]">arrow_back</span>
            </button>
            <div className="min-w-0">
              <h1 className="font-headline text-headline-md lg:text-headline-lg text-light-on-surface dark:text-dark-on-surface">
                Música
              </h1>
              <p className="font-body text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant truncate">
                Busque no YouTube, Deezer, Apple Music, Audius e Archive MP3 (online e offline).
              </p>
            </div>
          </div>

          <input
            ref={audioFileRef}
            type="file"
            accept="audio/*"
            className="hidden"
            onChange={handleFileChange}
          />
          <button
            type="button"
            onClick={() => audioFileRef.current?.click()}
            className="min-h-[40px] inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-light-outline-variant dark:border-dark-outline-variant bg-light-surface-container-low dark:bg-dark-surface-container-low text-light-on-surface dark:text-dark-on-surface font-body text-body-sm font-medium hover:border-light-primary dark:hover:border-dark-primary transition-colors whitespace-nowrap shrink-0"
          >
            <span className="material-symbols-outlined text-[18px]">upload_file</span>
            <span>Adicionar MP3</span>
          </button>
        </div>

        {/* Online / Offline Mode Tabs */}
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
            Catálogo Online ({tracks.length})
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
            Baixadas Offline ({offlineRecords.length})
          </button>
        </div>

        {/* Search any singer or song */}
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
              placeholder="Buscar música, cantor ou colar link do YouTube..."
              aria-label="Buscar cantor, música ou link do YouTube"
              className="w-full rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant text-light-on-surface dark:text-dark-on-surface font-body text-body-md pl-10 pr-4 py-2.5 focus:outline-none focus:border-light-primary dark:focus:border-dark-primary"
            />
          </div>
          <button
            type="submit"
            disabled={isSearching}
            className="min-h-[44px] px-4 py-2 rounded-lg bg-light-primary dark:bg-dark-primary text-light-on-primary dark:text-dark-on-primary font-body text-label-lg whitespace-nowrap disabled:opacity-60"
          >
            {isSearching ? 'Buscando...' : 'Buscar'}
          </button>
        </form>

        {/* Source Filter & Singer Picker */}
        {viewMode === 'online' && (
          <div className="flex flex-col gap-2">
            {onSelectSource && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
                {(
                  [
                    { id: 'all', label: 'Todas (YouTube + Outros)' },
                    { id: 'youtube', label: 'YouTube' },
                    { id: 'mp3', label: 'MP3 Completas' },
                    { id: 'catalogs', label: 'Deezer & Apple' },
                  ] as { id: MusicSourceFilter; label: string }[]
                ).map((src) => {
                  const active = selectedSource === src.id;
                  return (
                    <button
                      key={src.id}
                      type="button"
                      onClick={() => onSelectSource(src.id)}
                      className={`min-h-[34px] px-3 py-1 rounded-md border font-body text-label-sm whitespace-nowrap shrink-0 transition-colors ${
                        active
                          ? 'bg-light-secondary-container dark:bg-dark-primary/20 border-light-primary dark:border-dark-primary text-light-primary dark:text-dark-primary font-semibold'
                          : 'bg-light-surface-container-low dark:bg-dark-surface-container-low border-light-outline-variant dark:border-dark-outline-variant text-light-on-surface-variant dark:text-dark-on-surface-variant hover:border-light-primary/60 dark:hover:border-dark-primary/60'
                      }`}
                    >
                      {src.label}
                    </button>
                  );
                })}
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <span className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
                Escolher cantor
              </span>
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                {POPULAR_SINGERS.map((singer) => {
                  const active = selectedArtist === singer;
                  return (
                    <button
                      key={singer}
                      type="button"
                      onClick={() => onSelectArtist(singer)}
                      className={`min-h-[38px] px-3.5 py-1.5 rounded-md border font-body text-body-sm whitespace-nowrap shrink-0 transition-colors ${
                        active
                          ? 'bg-light-primary dark:bg-dark-primary border-light-primary dark:border-dark-primary text-light-on-primary dark:text-dark-on-primary font-semibold'
                          : 'bg-light-surface-container-low dark:bg-dark-surface-container-low border-light-outline-variant dark:border-dark-outline-variant text-light-on-surface dark:text-dark-on-surface hover:border-light-primary/60 dark:hover:border-dark-primary/60'
                      }`}
                    >
                      {singer}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </header>

      <main className="px-4 lg:px-8 pb-44 lg:pb-24 flex flex-col gap-4">
        {currentTrack.youtubeId && onToggleVideoPip && (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={onToggleVideoPip}
              className="min-h-[36px] inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-light-outline-variant dark:border-dark-outline-variant bg-light-surface-container-low dark:bg-dark-surface-container-low text-light-on-surface-variant dark:text-dark-on-surface-variant hover:text-light-primary dark:hover:text-dark-primary font-body text-body-sm"
            >
              <span className="material-symbols-outlined text-[16px]">
                {showMiniPip ? 'visibility_off' : 'smart_display'}
              </span>
              <span>{showMiniPip ? 'Minimizar vídeo' : 'Mostrar vídeo'}</span>
            </button>
          </div>
        )}

        {/* Featured Now Playing Card */}
        <section className="rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3.5 min-w-0 flex-1">
              <ResilientImage
                src={currentTrack.coverUrl}
                alt={currentTrack.title}
                fallbackType="album"
                className="w-16 h-16 rounded-md object-cover shrink-0 border border-light-outline-variant dark:border-dark-outline-variant"
              />
              <div className="min-w-0 flex-1">
                <span className="font-body text-label-sm text-light-primary dark:text-dark-primary">
                  {isPlaying ? 'Reproduzindo' : 'Selecionada'}
                  {offlineMap.has(currentTrack.id) ? ' · Disponível Offline' : ''}
                </span>
                <h2 className="font-headline text-title-md text-light-on-surface dark:text-dark-on-surface truncate">
                  {currentTrack.title}
                </h2>
                <p className="font-body text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant truncate">
                  {currentTrack.artist} · {formatDuration(currentTrack.durationSeconds)}
                  {currentTrack.sourceLabel ? ` · ${currentTrack.sourceLabel}` : ''}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={onPrevTrack}
                aria-label="Faixa anterior"
                className="inline-flex items-center justify-center min-w-[40px] min-h-[40px] rounded-full text-light-on-surface-variant dark:text-dark-on-surface-variant hover:bg-light-surface-container-high dark:hover:bg-dark-surface-container-high"
              >
                <span className="material-symbols-outlined text-[22px]">skip_previous</span>
              </button>
              <button
                type="button"
                onClick={onTogglePlay}
                aria-label={isPlaying ? 'Pausar' : 'Reproduzir'}
                className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-light-primary-container dark:bg-dark-primary-container text-light-on-primary-container dark:text-dark-on-primary transition-transform active:scale-95"
              >
                <span className="material-symbols-outlined material-symbols-filled text-[24px]">
                  {isPlaying ? 'pause' : 'play_arrow'}
                </span>
              </button>
              <button
                type="button"
                onClick={onNextTrack}
                aria-label="Próxima faixa"
                className="inline-flex items-center justify-center min-w-[40px] min-h-[40px] rounded-full text-light-on-surface-variant dark:text-dark-on-surface-variant hover:bg-light-surface-container-high dark:hover:bg-dark-surface-container-high"
              >
                <span className="material-symbols-outlined text-[22px]">skip_next</span>
              </button>
            </div>
          </div>

          {!currentTrack.youtubeId && (
            <div className="flex items-center gap-2">
              <span className="font-mono text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant tabular-nums">
                {formatDuration(Math.floor(playbackProgress * currentTrack.durationSeconds))}
              </span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={playbackProgress}
                onChange={(e) => onSeek(parseFloat(e.target.value))}
                aria-label="Progresso da música"
                className="flex-1 h-1.5 accent-accent-gold cursor-pointer"
              />
              <span className="font-mono text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant tabular-nums">
                {formatDuration(currentTrack.durationSeconds)}
              </span>
            </div>
          )}
        </section>

        {viewMode === 'offline' ? (
          <section className="rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-headline text-title-md text-light-on-surface dark:text-dark-on-surface">
                Músicas Salvas para Ouvir Offline
              </h2>
              <span className="font-mono text-label-sm text-cat-emerald tabular-nums">
                {offlineRecords.length} salvas
              </span>
            </div>

            {offlineTracks.length === 0 ? (
              <div className="py-8 text-center font-body text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
                Nenhuma música baixada ainda. No catálogo online, toque no ícone de nuvem/download nas faixas MP3 para salvar e ouvir sem internet.
              </div>
            ) : (
              <ul className="flex flex-col divide-y divide-light-outline-variant dark:divide-dark-outline-variant">
                {offlineTracks.map((track) => {
                  const rec = offlineMap.get(track.id);
                  const isSelected = track.id === currentTrack.id;
                  return (
                    <li
                      key={track.id}
                      className="py-2.5 flex items-center justify-between gap-3"
                    >
                      <button
                        type="button"
                        onClick={() =>
                          onPlayExternalTrack
                            ? onPlayExternalTrack(track)
                            : onSelectTrack(track.id)
                        }
                        className="flex-1 min-w-0 flex items-center gap-3 text-left min-h-[44px]"
                      >
                        <ResilientImage
                          src={track.coverUrl}
                          alt={track.title}
                          fallbackType="album"
                          className="w-12 h-12 rounded object-cover shrink-0 border border-light-outline-variant dark:border-dark-outline-variant"
                        />
                        <div className="min-w-0 flex-1">
                          <p
                            className={`font-body text-label-lg truncate ${
                              isSelected
                                ? 'text-light-primary dark:text-dark-primary'
                                : 'text-light-on-surface dark:text-dark-on-surface'
                            }`}
                          >
                            {track.title}
                          </p>
                          <p className="font-body text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant truncate tabular-nums">
                            {track.artist} · {rec ? formatBytes(rec.sizeBytes) : 'Offline'}
                          </p>
                        </div>
                      </button>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => void handleDownloadTrackFile(track)}
                          aria-label={`Baixar arquivo MP3 de ${track.title}`}
                          title="Baixar MP3 para o aparelho"
                          className="inline-flex items-center justify-center min-w-[38px] min-h-[38px] rounded-full text-light-primary dark:text-dark-primary hover:bg-light-surface-container-high dark:hover:bg-dark-surface-container-high"
                        >
                          <span className="material-symbols-outlined text-[20px]">download</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleSaveTrackOffline(track)}
                          aria-label={`Remover ${track.title} do offline`}
                          title="Remover cópia offline"
                          className="inline-flex items-center justify-center min-w-[38px] min-h-[38px] rounded-full text-light-error dark:text-dark-error hover:bg-light-surface-container-high dark:hover:bg-dark-surface-container-high"
                        >
                          <span className="material-symbols-outlined text-[20px]">delete</span>
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            onPlayExternalTrack
                              ? onPlayExternalTrack(track)
                              : onSelectTrack(track.id)
                          }
                          aria-label={isSelected && isPlaying ? 'Pausar' : 'Reproduzir offline'}
                          className="inline-flex items-center justify-center min-w-[40px] min-h-[40px] rounded-full bg-light-primary-container dark:bg-dark-primary-container text-light-on-primary-container dark:text-dark-on-primary"
                        >
                          <span className="material-symbols-outlined material-symbols-filled text-[22px]">
                            {isSelected && isPlaying ? 'pause' : 'play_arrow'}
                          </span>
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        ) : (
          /* Playlist */
          <section className="rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2 pb-1">
              <h2 className="font-headline text-title-md text-light-on-surface dark:text-dark-on-surface">
                {selectedArtist === 'Todos'
                  ? 'Músicas Completas'
                  : `Músicas de ${selectedArtist}`}
              </h2>
              <span className="font-mono text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant tabular-nums">
                {tracks.length} faixas
              </span>
            </div>

            {isSearching ? (
              <div className="py-8 text-center font-body text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
                Buscando músicas completas...
              </div>
            ) : tracks.length === 0 ? (
              <div className="py-8 text-center font-body text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
                Nenhuma música encontrada para essa busca.
              </div>
            ) : (
              <>
                <ul className="flex flex-col divide-y divide-light-outline-variant dark:divide-dark-outline-variant">
                  {tracks.map((track) => {
                    const isSelected = track.id === currentTrack.id;
                    const isFav = favoriteTrackIds.includes(track.id);
                    const isSavedOffline = offlineMap.has(track.id);
                    const isBusy = Boolean(downloadingIds[track.id]);
                    const canDownloadMp3 = Boolean(track.audioUrl);

                    return (
                      <li
                        key={track.id}
                        className="py-2.5 first:pt-1 last:pb-1 flex items-center justify-between gap-2"
                      >
                        <button
                          type="button"
                          onClick={() => onSelectTrack(track.id)}
                          className="flex-1 min-w-0 flex items-center gap-3 text-left min-h-[44px]"
                        >
                          <ResilientImage
                            src={track.coverUrl}
                            alt={track.title}
                            fallbackType="album"
                            className="w-12 h-12 rounded object-cover shrink-0 border border-light-outline-variant dark:border-dark-outline-variant"
                          />
                          <div className="min-w-0 flex-1">
                            <p
                              className={`font-body text-label-lg truncate ${
                                isSelected
                                  ? 'text-light-primary dark:text-dark-primary'
                                  : 'text-light-on-surface dark:text-dark-on-surface'
                              }`}
                            >
                              {track.title}
                            </p>
                            <p className="font-body text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant truncate tabular-nums">
                              {track.artist} · {formatDuration(track.durationSeconds)}
                              {isSavedOffline
                                ? ' · Offline ✓'
                                : track.sourceLabel
                                  ? ` · ${track.sourceLabel}${track.youtubeId ? ' (Online)' : ''}`
                                  : canDownloadMp3
                                    ? ' · MP3 Baixável'
                                    : ' · Online'}
                            </p>
                          </div>
                        </button>

                        <div className="flex items-center gap-0.5 shrink-0">
                          {canDownloadMp3 && (
                            <>
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => void handleSaveTrackOffline(track)}
                                aria-label={
                                  isSavedOffline
                                    ? 'Remover do offline'
                                    : 'Salvar para ouvir offline'
                                }
                                title={
                                  isSavedOffline
                                    ? 'Salva offline (toque para remover)'
                                    : 'Salvar no app para ouvir offline'
                                }
                                className={`inline-flex items-center justify-center min-w-[36px] min-h-[36px] rounded-full ${
                                  isSavedOffline
                                    ? 'text-cat-emerald'
                                    : 'text-light-on-surface-variant dark:text-dark-on-surface-variant hover:text-light-primary dark:hover:text-dark-primary'
                                } disabled:opacity-50`}
                              >
                                <span className="material-symbols-outlined text-[20px]">
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
                                onClick={() => void handleDownloadTrackFile(track)}
                                aria-label={`Baixar MP3 de ${track.title}`}
                                title="Baixar MP3 para o aparelho"
                                className="inline-flex items-center justify-center min-w-[36px] min-h-[36px] rounded-full text-light-on-surface-variant dark:text-dark-on-surface-variant hover:text-light-primary dark:hover:text-dark-primary disabled:opacity-50"
                              >
                                <span className="material-symbols-outlined text-[20px]">
                                  download
                                </span>
                              </button>
                            </>
                          )}
                          <button
                            type="button"
                            onClick={() => onToggleFavoriteTrack(track.id)}
                            aria-label={isFav ? 'Remover dos favoritos' : 'Salvar nos favoritos'}
                            className={`inline-flex items-center justify-center min-w-[36px] min-h-[36px] rounded-full ${
                              isFav
                                ? 'text-accent-gold'
                                : 'text-light-on-surface-variant dark:text-dark-on-surface-variant'
                            }`}
                          >
                            <span
                              className={`material-symbols-outlined text-[20px] ${
                                isFav ? 'material-symbols-filled' : ''
                              }`}
                            >
                              favorite
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() => onSelectTrack(track.id)}
                            aria-label={isSelected && isPlaying ? 'Pausar' : 'Reproduzir'}
                            className="inline-flex items-center justify-center min-w-[38px] min-h-[38px] rounded-full text-light-on-surface dark:text-dark-on-surface hover:bg-light-surface-container-high dark:hover:bg-dark-surface-container-high"
                          >
                            <span className="material-symbols-outlined material-symbols-filled text-[22px]">
                              {isSelected && isPlaying ? 'pause' : 'play_arrow'}
                            </span>
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>

                {hasMore && onLoadMore && (
                  <button
                    type="button"
                    onClick={onLoadMore}
                    disabled={isLoadingMore}
                    className="min-h-[44px] w-full rounded-full border border-light-primary/60 dark:border-dark-primary/60 text-light-primary dark:text-dark-primary font-body text-label-lg hover:bg-light-primary/10 dark:hover:bg-dark-primary/10 transition-colors disabled:opacity-60"
                  >
                    {isLoadingMore ? 'Carregando mais músicas...' : 'Carregar mais músicas'}
                  </button>
                )}
              </>
            )}
          </section>
        )}
      </main>
    </div>
  );
};
