import React, { useState } from 'react';
import {
  AppTab,
  DevotionalItem,
  HistoryItem,
  MusicTrack,
  PodcastEpisode,
  RadioStation,
} from '../types';
import { ResilientImage } from './ResilientImage';

interface FavoritesViewProps {
  devotionals: DevotionalItem[];
  tracks: MusicTrack[];
  podcasts: PodcastEpisode[];
  stations: RadioStation[];
  favoriteDevotionalIds: string[];
  favoriteTrackIds: string[];
  favoritePodcastIds: string[];
  favoriteRadioIds: string[];
  history: HistoryItem[];
  currentTrackId: string;
  activePodcastId: string | null;
  activeRadioId: string;
  isMusicPlaying: boolean;
  isPodcastPlaying: boolean;
  isRadioPlaying: boolean;
  onToggleFavoriteDevotional: (id: string) => void;
  onToggleFavoriteTrack: (id: string) => void;
  onToggleFavoritePodcast: (id: string) => void;
  onToggleFavoriteRadio: (id: string) => void;
  onSelectTrack: (trackId: string) => void;
  onTogglePodcast: (episode: PodcastEpisode) => void;
  onToggleRadio: (station: RadioStation) => void;
  onOpenHistoryItem: (item: HistoryItem) => void;
  onClearHistory: () => void;
  onNavigate: (tab: AppTab) => void;
  onGoExplore: () => void;
}

const HISTORY_KIND_LABELS: Record<HistoryItem['kind'], string> = {
  musica: 'Música',
  podcast: 'Podcast',
  radio: 'Rádio',
  devocional: 'Devocional',
  youtube: 'YouTube',
};

const HISTORY_KIND_ICONS: Record<HistoryItem['kind'], string> = {
  musica: 'music_note',
  podcast: 'podcasts',
  radio: 'radio',
  devocional: 'menu_book',
  youtube: 'smart_display',
};

export const FavoritesView: React.FC<FavoritesViewProps> = ({
  devotionals,
  tracks,
  podcasts,
  stations,
  favoriteDevotionalIds,
  favoriteTrackIds,
  favoritePodcastIds,
  favoriteRadioIds,
  history,
  currentTrackId,
  activePodcastId,
  activeRadioId,
  isMusicPlaying,
  isPodcastPlaying,
  isRadioPlaying,
  onToggleFavoriteDevotional,
  onToggleFavoriteTrack,
  onToggleFavoritePodcast,
  onToggleFavoriteRadio,
  onSelectTrack,
  onTogglePodcast,
  onToggleRadio,
  onOpenHistoryItem,
  onClearHistory,
  onNavigate,
  onGoExplore,
}) => {
  const [subTab, setSubTab] = useState<'favoritos' | 'historico'>('favoritos');
  const [historyFilter, setHistoryFilter] = useState<'todos' | HistoryItem['kind']>('todos');

  const savedDevotionals = devotionals.filter((d) => favoriteDevotionalIds.includes(d.id));
  const savedTracks = tracks.filter((t) => favoriteTrackIds.includes(t.id));
  const savedPodcasts = podcasts.filter((p) => favoritePodcastIds.includes(p.id));
  const savedStations = stations.filter((s) => favoriteRadioIds.includes(s.id));

  const totalFavorites =
    savedDevotionals.length +
    savedTracks.length +
    savedPodcasts.length +
    savedStations.length;

  const filteredHistory =
    historyFilter === 'todos'
      ? history
      : history.filter((h) => h.kind === historyFilter);

  return (
    <div className="flex flex-col">
      <header className="px-4 lg:px-8 pt-6 pb-4 flex flex-col gap-3">
        <div>
          <h1 className="font-headline text-headline-lg text-light-on-surface dark:text-dark-on-surface">
            Favoritos e Histórico
          </h1>
          <p className="font-body text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
            Seus conteúdos salvos e tudo o que você ouviu ou leu recentemente.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-1 p-1 rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant">
          <button
            type="button"
            onClick={() => setSubTab('favoritos')}
            className={`min-h-[40px] rounded-md font-body text-body-sm transition-colors ${
              subTab === 'favoritos'
                ? 'bg-light-primary dark:bg-dark-primary text-light-on-primary dark:text-dark-on-primary font-semibold'
                : 'text-light-on-surface-variant dark:text-dark-on-surface-variant'
            }`}
          >
            Favoritos ({totalFavorites})
          </button>
          <button
            type="button"
            onClick={() => setSubTab('historico')}
            className={`min-h-[40px] rounded-md font-body text-body-sm transition-colors ${
              subTab === 'historico'
                ? 'bg-light-primary dark:bg-dark-primary text-light-on-primary dark:text-dark-on-primary font-semibold'
                : 'text-light-on-surface-variant dark:text-dark-on-surface-variant'
            }`}
          >
            Histórico ({history.length})
          </button>
        </div>
      </header>

      {subTab === 'favoritos' ? (
        <main className="px-4 lg:px-8 pb-28 lg:pb-12 flex flex-col gap-5">
          {totalFavorites === 0 ? (
            <section className="rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant p-8 flex flex-col items-center text-center gap-3">
              <span
                className="material-symbols-outlined text-4xl text-light-primary dark:text-dark-primary"
                aria-hidden="true"
              >
                favorite
              </span>
              <h2 className="font-headline text-title-md text-light-on-surface dark:text-dark-on-surface">
                Nenhum favorito salvo ainda
              </h2>
              <p className="font-body text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant max-w-sm">
                Toque no ícone de coração nos devocionais, músicas, podcasts ou rádios para guardá-los aqui.
              </p>
              <button
                type="button"
                onClick={onGoExplore}
                className="min-h-[44px] px-5 py-2 rounded-full bg-light-primary dark:bg-dark-primary text-light-on-primary dark:text-dark-on-primary font-body text-label-lg"
              >
                Explorar conteúdos
              </button>
            </section>
          ) : (
            <>
              {savedDevotionals.length > 0 && (
                <section className="flex flex-col gap-3">
                  <h2 className="font-headline text-title-md text-light-on-surface dark:text-dark-on-surface">
                    Versículos Salvos
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {savedDevotionals.map((item) => (
                      <article
                        key={item.id}
                        className="rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant p-4 flex flex-col gap-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => onNavigate('devocional')}
                            className="font-body text-label-sm text-light-primary dark:text-dark-primary hover:underline text-left"
                          >
                            {item.reference} · {item.theme}
                          </button>
                          <button
                            type="button"
                            onClick={() => onToggleFavoriteDevotional(item.id)}
                            aria-label="Remover dos favoritos"
                            className="inline-flex items-center justify-center min-w-[38px] min-h-[38px] rounded-full text-accent-gold"
                          >
                            <span className="material-symbols-outlined material-symbols-filled text-[20px]">
                              favorite
                            </span>
                          </button>
                        </div>
                        <p className="font-body text-body-md text-light-on-surface dark:text-dark-on-surface">
                          {item.quote}
                        </p>
                      </article>
                    ))}
                  </div>
                </section>
              )}

              {savedTracks.length > 0 && (
                <section className="flex flex-col gap-3">
                  <h2 className="font-headline text-title-md text-light-on-surface dark:text-dark-on-surface">
                    Músicas Salvas
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {savedTracks.map((track) => {
                      const active = currentTrackId === track.id && isMusicPlaying;
                      return (
                        <article
                          key={track.id}
                          className="rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant p-3 flex items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <ResilientImage
                              src={track.coverUrl}
                              alt={track.title}
                              fallbackType="album"
                              className="w-12 h-12 rounded-md object-cover shrink-0 border border-light-outline-variant dark:border-dark-outline-variant"
                            />
                            <div className="min-w-0 flex-1">
                              <h3 className="font-body text-label-lg text-light-on-surface dark:text-dark-on-surface truncate">
                                {track.title}
                              </h3>
                              <p className="font-body text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant truncate">
                                {track.artist}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => onToggleFavoriteTrack(track.id)}
                              aria-label="Remover música dos favoritos"
                              className="inline-flex items-center justify-center min-w-[40px] min-h-[40px] rounded-full text-accent-gold"
                            >
                              <span className="material-symbols-outlined material-symbols-filled text-[20px]">
                                favorite
                              </span>
                            </button>
                            <button
                              type="button"
                              onClick={() => onSelectTrack(track.id)}
                              aria-label={active ? 'Pausar' : 'Reproduzir'}
                              className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-light-primary-container dark:bg-dark-primary-container text-light-on-primary-container dark:text-dark-on-primary"
                            >
                              <span className="material-symbols-outlined material-symbols-filled text-[20px]">
                                {active ? 'pause' : 'play_arrow'}
                              </span>
                            </button>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </section>
              )}

              {savedPodcasts.length > 0 && (
                <section className="flex flex-col gap-3">
                  <h2 className="font-headline text-title-md text-light-on-surface dark:text-dark-on-surface">
                    Podcasts Salvos
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {savedPodcasts.map((ep) => {
                      const active = activePodcastId === ep.id && isPodcastPlaying;
                      return (
                        <article
                          key={ep.id}
                          className="rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant p-3 flex items-center justify-between gap-3"
                        >
                          <div className="min-w-0 flex-1">
                            <span className="font-body text-label-sm text-light-primary dark:text-dark-primary truncate block">
                              {ep.series}
                            </span>
                            <h3 className="font-body text-label-lg text-light-on-surface dark:text-dark-on-surface truncate">
                              {ep.title}
                            </h3>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => onToggleFavoritePodcast(ep.id)}
                              aria-label="Remover podcast dos favoritos"
                              className="inline-flex items-center justify-center min-w-[40px] min-h-[40px] rounded-full text-accent-gold"
                            >
                              <span className="material-symbols-outlined material-symbols-filled text-[20px]">
                                favorite
                              </span>
                            </button>
                            <button
                              type="button"
                              onClick={() => onTogglePodcast(ep)}
                              aria-label={active ? 'Pausar' : 'Ouvir'}
                              className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-light-primary-container dark:bg-dark-primary-container text-light-on-primary-container dark:text-dark-on-primary"
                            >
                              <span className="material-symbols-outlined material-symbols-filled text-[20px]">
                                {active ? 'pause' : 'play_arrow'}
                              </span>
                            </button>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </section>
              )}

              {savedStations.length > 0 && (
                <section className="flex flex-col gap-3">
                  <h2 className="font-headline text-title-md text-light-on-surface dark:text-dark-on-surface">
                    Rádios Salvas
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {savedStations.map((st) => {
                      const active = activeRadioId === st.id && isRadioPlaying;
                      return (
                        <article
                          key={st.id}
                          className="rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant p-3 flex items-center justify-between gap-3"
                        >
                          <div className="min-w-0 flex-1">
                            <span className="font-mono text-label-sm text-light-primary dark:text-dark-primary">
                              {st.frequency}
                            </span>
                            <h3 className="font-body text-label-lg text-light-on-surface dark:text-dark-on-surface truncate">
                              {st.name}
                            </h3>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => onToggleFavoriteRadio(st.id)}
                              aria-label="Remover rádio dos favoritos"
                              className="inline-flex items-center justify-center min-w-[40px] min-h-[40px] rounded-full text-accent-gold"
                            >
                              <span className="material-symbols-outlined material-symbols-filled text-[20px]">
                                favorite
                              </span>
                            </button>
                            <button
                              type="button"
                              onClick={() => onToggleRadio(st)}
                              aria-label={active ? 'Pausar' : 'Ouvir'}
                              className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-light-primary-container dark:bg-dark-primary-container text-light-on-primary-container dark:text-dark-on-primary"
                            >
                              <span className="material-symbols-outlined material-symbols-filled text-[20px]">
                                {active ? 'pause' : 'play_arrow'}
                              </span>
                            </button>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </section>
              )}
            </>
          )}
        </main>
      ) : (
        <main className="px-4 lg:px-8 pb-28 lg:pb-12 flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              {(
                [
                  { id: 'todos', label: 'Tudo' },
                  { id: 'musica', label: 'Músicas' },
                  { id: 'podcast', label: 'Podcasts' },
                  { id: 'radio', label: 'Rádios' },
                  { id: 'youtube', label: 'YouTube' },
                  { id: 'devocional', label: 'Devocionais' },
                ] as const
              ).map((chip) => (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => setHistoryFilter(chip.id)}
                  className={`min-h-[34px] px-3 py-1 rounded-md border font-body text-label-sm whitespace-nowrap transition-colors ${
                    historyFilter === chip.id
                      ? 'bg-light-primary dark:bg-dark-primary border-light-primary dark:border-dark-primary text-light-on-primary dark:text-dark-on-primary font-semibold'
                      : 'bg-light-surface-container-low dark:bg-dark-surface-container-low border-light-outline-variant dark:border-dark-outline-variant text-light-on-surface-variant dark:text-dark-on-surface-variant'
                  }`}
                >
                  {chip.label}
                </button>
              ))}
            </div>

            {history.length > 0 && (
              <button
                type="button"
                onClick={onClearHistory}
                className="font-body text-label-sm text-light-error dark:text-dark-error hover:underline"
              >
                Limpar histórico
              </button>
            )}
          </div>

          {filteredHistory.length === 0 ? (
            <section className="rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant p-8 flex flex-col items-center text-center gap-2">
              <span className="material-symbols-outlined text-4xl text-light-primary dark:text-dark-primary">
                history
              </span>
              <h2 className="font-headline text-title-md text-light-on-surface dark:text-dark-on-surface">
                Histórico vazio
              </h2>
              <p className="font-body text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant max-w-sm">
                Suas músicas, episódios de podcast, rádios e devocionais acessados recentemente aparecem aqui.
              </p>
            </section>
          ) : (
            <ul className="rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant divide-y divide-light-outline-variant dark:divide-dark-outline-variant">
              {filteredHistory.map((item) => (
                <li
                  key={item.id}
                  className="p-3.5 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <span className="w-10 h-10 rounded-md bg-light-surface-container dark:bg-dark-surface-container border border-light-outline-variant dark:border-dark-outline-variant flex items-center justify-center text-light-primary dark:text-dark-primary shrink-0">
                      <span className="material-symbols-outlined text-[20px]">
                        {HISTORY_KIND_ICONS[item.kind]}
                      </span>
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-body text-label-sm text-light-primary dark:text-dark-primary">
                          {HISTORY_KIND_LABELS[item.kind]}
                        </span>
                        <span className="font-mono text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant tabular-nums">
                          {item.timestamp}
                        </span>
                      </div>
                      <h3 className="font-body text-label-lg text-light-on-surface dark:text-dark-on-surface truncate">
                        {item.title}
                      </h3>
                      <p className="font-body text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant truncate">
                        {item.subtitle}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onOpenHistoryItem(item)}
                    className="min-h-[38px] px-3.5 py-1.5 rounded-full bg-light-primary-container dark:bg-dark-primary-container text-light-on-primary-container dark:text-dark-on-primary font-body text-label-sm font-semibold whitespace-nowrap shrink-0"
                  >
                    Abrir
                  </button>
                </li>
              ))}
            </ul>
          )}
        </main>
      )}
    </div>
  );
};
