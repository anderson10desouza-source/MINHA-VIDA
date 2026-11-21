import React, { useRef, useState } from 'react';
import { MusicTrack } from '../types';
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

interface MusicViewProps {
  tracks: MusicTrack[];
  currentTrack: MusicTrack;
  isPlaying: boolean;
  playbackProgress: number;
  selectedArtist: string;
  isSearching: boolean;
  favoriteTrackIds: string[];
  onSelectArtist: (artist: string) => void;
  onSearchMusic: (query: string) => void;
  onSelectTrack: (trackId: string) => void;
  onTogglePlay: () => void;
  onNextTrack: () => void;
  onPrevTrack: () => void;
  onSeek: (fraction: number) => void;
  onAddLocalTrack: (file: File) => void;
  onToggleFavoriteTrack: (trackId: string) => void;
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
  isSearching,
  favoriteTrackIds,
  onSelectArtist,
  onSearchMusic,
  onSelectTrack,
  onTogglePlay,
  onNextTrack,
  onPrevTrack,
  onSeek,
  onAddLocalTrack,
  onToggleFavoriteTrack,
  onBack,
  showMiniPip,
  onToggleVideoPip,
}) => {
  const [searchInput, setSearchInput] = useState('');
  const audioFileRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) {
      onAddLocalTrack(file);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearchMusic(searchInput);
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
              className="inline-flex items-center justify-center min-w-[44px] min-h-[44px] -ml-2 rounded-full text-light-on-surface dark:text-dark-on-surface hover:bg-light-surface-container-high dark:hover:bg-dark-surface-container-high transition-colors shrink-0"
            >
              <span className="material-symbols-outlined text-[20px]">arrow_back</span>
            </button>
            <div className="min-w-0">
              <h1 className="font-headline text-headline-md lg:text-headline-lg text-light-on-surface dark:text-dark-on-surface">
                Música
              </h1>
              <p className="font-body text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant truncate">
                Escolha o cantor e ouça músicas completas.
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
              placeholder="Buscar cantor ou música completa (ex: Aline Barros)..."
              aria-label="Buscar cantor ou música"
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

        {/* Singer Picker */}
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
                  {isPlaying ? 'Reproduzindo música completa' : 'Selecionada'}
                </span>
                <h2 className="font-headline text-title-md text-light-on-surface dark:text-dark-on-surface truncate">
                  {currentTrack.title}
                </h2>
                <p className="font-body text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant truncate">
                  {currentTrack.artist} · {formatDuration(currentTrack.durationSeconds)}
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

        {/* Playlist */}
        <section className="rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant p-4 flex flex-col gap-2">
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
            <ul className="flex flex-col divide-y divide-light-outline-variant dark:divide-dark-outline-variant">
              {tracks.map((track) => {
                const isSelected = track.id === currentTrack.id;
                const isFav = favoriteTrackIds.includes(track.id);
                return (
                  <li
                    key={track.id}
                    className="py-2.5 first:pt-1 last:pb-1 flex items-center justify-between gap-3"
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
                        </p>
                      </div>
                    </button>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => onToggleFavoriteTrack(track.id)}
                        aria-label={isFav ? 'Remover dos favoritos' : 'Salvar nos favoritos'}
                        className={`inline-flex items-center justify-center min-w-[40px] min-h-[40px] rounded-full ${
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
                        className="inline-flex items-center justify-center min-w-[40px] min-h-[40px] rounded-full text-light-on-surface dark:text-dark-on-surface hover:bg-light-surface-container-high dark:hover:bg-dark-surface-container-high"
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
      </main>
    </div>
  );
};
