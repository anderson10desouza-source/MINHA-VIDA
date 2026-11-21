import React, { useState } from 'react';
import {
  AgendaCategory,
  AgendaItem,
  AppTab,
  BookItem,
  ContactItem,
  DevotionalItem,
  FinanceTransaction,
  GoalItem,
  GroceryItem,
  InvestmentAsset,
  MusicTrack,
  NoteEntry,
  PantryItem,
  PersonalDevotional,
  PodcastEpisode,
  RadioStation,
  StudySubject,
  StudyTopic,
  TripItem,
  YouTubeVideoItem,
} from '../types';
import { ResilientImage } from './ResilientImage';

interface ExploreViewProps {
  devotionals: DevotionalItem[];
  personalDevotionals: PersonalDevotional[];
  tracks: MusicTrack[];
  podcasts: PodcastEpisode[];
  stations: RadioStation[];
  youtubeVideos: YouTubeVideoItem[];
  agenda: AgendaItem[];
  contacts: ContactItem[];
  financeTransactions: FinanceTransaction[];
  investments: InvestmentAsset[];
  books: BookItem[];
  studySubjects: StudySubject[];
  studyTopics: StudyTopic[];
  groceryItems: GroceryItem[];
  pantryItems: PantryItem[];
  notes: NoteEntry[];
  goals: GoalItem[];
  trips: TripItem[];
  favoriteDevotionalIds: string[];
  favoriteTrackIds: string[];
  currentTrackId: string;
  activePodcastId: string | null;
  activeRadioId: string;
  isPlaying: boolean;
  isPodcastPlaying: boolean;
  isRadioPlaying: boolean;
  onToggleFavoriteDevotional: (id: string) => void;
  onToggleFavoriteTrack: (id: string) => void;
  onSelectTrack: (trackId: string) => void;
  onTogglePodcast: (ep: PodcastEpisode) => void;
  onToggleRadio: (station: RadioStation) => void;
  onPlayYouTubeVideo: (video: YouTubeVideoItem) => void;
  onAddRoutineToAgenda: (item: { time: string; title: string; category: AgendaCategory }) => void;
  onNavigate: (tab: AppTab) => void;
}

type ExploreFilter =
  | 'tudo'
  | 'devocionais'
  | 'musicas'
  | 'podcasts'
  | 'radios'
  | 'youtube'
  | 'financas'
  | 'supermercado'
  | 'investimentos'
  | 'livros'
  | 'estudar'
  | 'notas'
  | 'metas'
  | 'viagens'
  | 'agenda'
  | 'rotinas';

const SUGGESTED_ROUTINES: {
  id: string;
  title: string;
  description: string;
  time: string;
  category: AgendaCategory;
}[] = [
  {
    id: 'rot-1',
    title: 'Oração e Gratidão Matinal',
    description: '15 minutos de silêncio e anotação de gratidão ao acordar.',
    time: '07:00',
    category: 'gold',
  },
  {
    id: 'rot-2',
    title: 'Bloco de Estudo Focado',
    description: 'Sessão de leitura aprofundada sem distrações.',
    time: '16:00',
    category: 'emerald',
  },
  {
    id: 'rot-3',
    title: 'Caminhada ao Ar Livre',
    description: '30 minutos de movimento para renovar energia e foco.',
    time: '18:30',
    category: 'violet',
  },
];

export const ExploreView: React.FC<ExploreViewProps> = ({
  devotionals,
  personalDevotionals,
  tracks,
  podcasts,
  stations,
  youtubeVideos,
  agenda,
  contacts,
  financeTransactions,
  investments,
  books,
  studySubjects,
  studyTopics,
  groceryItems,
  pantryItems,
  notes,
  goals,
  trips,
  favoriteDevotionalIds,
  favoriteTrackIds,
  currentTrackId,
  activePodcastId,
  activeRadioId,
  isPlaying,
  isPodcastPlaying,
  isRadioPlaying,
  onToggleFavoriteDevotional,
  onToggleFavoriteTrack,
  onSelectTrack,
  onTogglePodcast,
  onToggleRadio,
  onPlayYouTubeVideo,
  onAddRoutineToAgenda,
  onNavigate,
}) => {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<ExploreFilter>('tudo');

  const q = query.trim().toLowerCase();

  const filteredDevotionals = devotionals.filter(
    (d) =>
      d.quote.toLowerCase().includes(q) ||
      d.reference.toLowerCase().includes(q) ||
      d.theme.toLowerCase().includes(q)
  );

  const filteredPersonal = personalDevotionals.filter(
    (p) =>
      p.title.toLowerCase().includes(q) ||
      p.reference.toLowerCase().includes(q) ||
      p.writtenText.toLowerCase().includes(q)
  );

  const filteredTracks = tracks.filter(
    (t) => t.title.toLowerCase().includes(q) || t.artist.toLowerCase().includes(q)
  );

  const filteredPodcasts = podcasts.filter(
    (p) =>
      p.title.toLowerCase().includes(q) ||
      p.series.toLowerCase().includes(q) ||
      p.host.toLowerCase().includes(q)
  );

  const filteredStations = stations.filter(
    (s) =>
      s.name.toLowerCase().includes(q) ||
      s.genre.toLowerCase().includes(q) ||
      s.program.toLowerCase().includes(q)
  );

  const filteredAgenda = agenda.filter(
    (a) => a.title.toLowerCase().includes(q) || a.time.toLowerCase().includes(q)
  );

  const filteredContacts = contacts.filter(
    (c) =>
      c.name.toLowerCase().includes(q) ||
      c.role.toLowerCase().includes(q) ||
      c.group.toLowerCase().includes(q)
  );

  const filteredRoutines = SUGGESTED_ROUTINES.filter(
    (r) => r.title.toLowerCase().includes(q) || r.description.toLowerCase().includes(q)
  );

  const filteredInvestments = investments.filter(
    (inv) =>
      inv.name.toLowerCase().includes(q) ||
      (inv.ticker || '').toLowerCase().includes(q) ||
      inv.category.toLowerCase().includes(q)
  );

  const filteredBooks = books.filter(
    (bk) =>
      bk.title.toLowerCase().includes(q) ||
      bk.author.toLowerCase().includes(q) ||
      bk.category.toLowerCase().includes(q)
  );

  const filteredYouTube = youtubeVideos.filter(
    (v) =>
      v.title.toLowerCase().includes(q) ||
      v.channel.toLowerCase().includes(q)
  );

  const filteredFinance = financeTransactions.filter(
    (tx) =>
      tx.title.toLowerCase().includes(q) ||
      tx.category.toLowerCase().includes(q) ||
      tx.paymentMethod.toLowerCase().includes(q) ||
      (tx.notes ?? '').toLowerCase().includes(q)
  );

  const filteredStudySubjects = studySubjects.filter(
    (s) =>
      s.name.toLowerCase().includes(q) ||
      s.category.toLowerCase().includes(q) ||
      (s.notes ?? '').toLowerCase().includes(q)
  );

  const filteredStudyTopics = studyTopics.filter((t) =>
    t.title.toLowerCase().includes(q)
  );

  const filteredGroceryItems = groceryItems.filter(
    (g) =>
      g.name.toLowerCase().includes(q) ||
      g.category.toLowerCase().includes(q) ||
      (g.notes ?? '').toLowerCase().includes(q)
  );

  const filteredPantryItems = pantryItems.filter(
    (p) =>
      p.name.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q)
  );

  const filteredNotes = notes.filter(
    (n) =>
      !n.archived &&
      (n.title.toLowerCase().includes(q) ||
        n.content.toLowerCase().includes(q) ||
        n.category.toLowerCase().includes(q) ||
        n.tags.some((t) => t.toLowerCase().includes(q)))
  );

  const filteredGoals = goals.filter(
    (g) =>
      g.title.toLowerCase().includes(q) ||
      g.category.toLowerCase().includes(q) ||
      g.horizon.toLowerCase().includes(q) ||
      (g.motivation ?? '').toLowerCase().includes(q) ||
      g.milestones.some((m) => m.title.toLowerCase().includes(q))
  );

  const filteredTrips = trips.filter(
    (t) =>
      t.destination.toLowerCase().includes(q) ||
      t.region.toLowerCase().includes(q) ||
      t.tripType.toLowerCase().includes(q) ||
      (t.lodgingName ?? '').toLowerCase().includes(q) ||
      t.itinerary.some((it) => it.title.toLowerCase().includes(q))
  );

  return (
    <div className="flex flex-col">
      <header className="px-4 lg:px-8 pt-6 pb-4 flex flex-col gap-3">
        <div>
          <h1 className="font-headline text-headline-lg text-light-on-surface dark:text-dark-on-surface">
            Busca e Filtro
          </h1>
          <p className="font-body text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
            Encontre devocionais, músicas, podcasts, rádios, agenda e contatos.
          </p>
        </div>

        <div className="relative">
          <span
            className="material-symbols-outlined text-[20px] text-light-on-surface-variant dark:text-dark-on-surface-variant absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            aria-hidden="true"
          >
            search
          </span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar em todo o aplicativo..."
            aria-label="Buscar conteúdo"
            className="w-full rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant text-light-on-surface dark:text-dark-on-surface font-body text-body-md pl-10 pr-4 py-2.5 focus:outline-none focus:border-light-primary dark:focus:border-dark-primary"
          />
        </div>

        <div className="flex items-center gap-1 p-1 rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant overflow-x-auto">
          {(
            [
              { id: 'tudo', label: 'Tudo' },
              { id: 'devocionais', label: 'Devocionais' },
              { id: 'musicas', label: 'Músicas' },
              { id: 'podcasts', label: 'Podcasts' },
              { id: 'radios', label: 'Rádios' },
              { id: 'youtube', label: 'YouTube' },
              { id: 'financas', label: 'Finanças' },
              { id: 'supermercado', label: 'Supermercado' },
              { id: 'investimentos', label: 'Investimentos' },
              { id: 'livros', label: 'Livros' },
              { id: 'estudar', label: 'Estudar' },
              { id: 'notas', label: 'Anotações' },
              { id: 'metas', label: 'Metas' },
              { id: 'viagens', label: 'Viagens' },
              { id: 'agenda', label: 'Agenda & Contatos' },
              { id: 'rotinas', label: 'Rotinas' },
            ] as { id: ExploreFilter; label: string }[]
          ).map((tab) => {
            const active = filter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilter(tab.id)}
                className={`min-h-[38px] px-3 py-1.5 rounded-md font-body text-body-sm whitespace-nowrap transition-colors ${
                  active
                    ? 'bg-light-primary dark:bg-dark-primary text-light-on-primary dark:text-dark-on-primary font-semibold'
                    : 'text-light-on-surface-variant dark:text-dark-on-surface-variant hover:text-light-on-surface dark:hover:text-dark-on-surface'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </header>

      <main className="px-4 lg:px-8 pb-28 lg:pb-12 flex flex-col gap-5">
        {(filter === 'tudo' || filter === 'devocionais') &&
          (filteredDevotionals.length > 0 || filteredPersonal.length > 0) && (
            <section className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h2 className="font-headline text-title-md text-light-on-surface dark:text-dark-on-surface">
                  Devocionais ({filteredDevotionals.length + filteredPersonal.length})
                </h2>
                <button
                  type="button"
                  onClick={() => onNavigate('devocional')}
                  className="font-body text-body-sm text-light-primary dark:text-dark-primary hover:underline"
                >
                  Abrir Devocionais
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredPersonal.map((item) => (
                  <article
                    key={item.id}
                    className="rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-primary/40 dark:border-dark-primary/40 p-4 flex flex-col gap-1.5"
                  >
                    <span className="font-body text-label-sm text-light-primary dark:text-dark-primary">
                      Meu Devocional {item.audioDataUrl ? '· Com Áudio' : '· Escrito'}
                    </span>
                    <h3 className="font-headline text-title-md text-light-on-surface dark:text-dark-on-surface">
                      {item.title}
                    </h3>
                    {item.writtenText && (
                      <p className="font-body text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant line-clamp-2">
                        {item.writtenText}
                      </p>
                    )}
                  </article>
                ))}
                {filteredDevotionals.map((item) => {
                  const fav = favoriteDevotionalIds.includes(item.id);
                  return (
                    <article
                      key={item.id}
                      className="rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant p-4 flex flex-col justify-between gap-3"
                    >
                      <div className="flex flex-col gap-1.5">
                        <span className="font-body text-label-sm text-light-primary dark:text-dark-primary">
                          {item.theme} · {item.reference}
                        </span>
                        <p className="font-body text-body-md text-light-on-surface dark:text-dark-on-surface text-pretty">
                          {item.quote}
                        </p>
                      </div>
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => onToggleFavoriteDevotional(item.id)}
                          className={`inline-flex items-center gap-1.5 min-h-[38px] px-3 py-1 rounded-md font-body text-body-sm ${
                            fav
                              ? 'text-accent-gold'
                              : 'text-light-on-surface-variant dark:text-dark-on-surface-variant'
                          }`}
                        >
                          <span
                            className={`material-symbols-outlined text-[18px] ${
                              fav ? 'material-symbols-filled' : ''
                            }`}
                          >
                            favorite
                          </span>
                          <span>{fav ? 'Salvo' : 'Favoritar'}</span>
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          )}

        {(filter === 'tudo' || filter === 'musicas') && filteredTracks.length > 0 && (
          <section className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="font-headline text-title-md text-light-on-surface dark:text-dark-on-surface">
                Músicas ({filteredTracks.length})
              </h2>
              <button
                type="button"
                onClick={() => onNavigate('musica')}
                className="font-body text-body-sm text-light-primary dark:text-dark-primary hover:underline"
              >
                Buscar mais cantores
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredTracks.slice(0, 9).map((track) => {
                const fav = favoriteTrackIds.includes(track.id);
                const active = currentTrackId === track.id && isPlaying;
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
                        aria-label={fav ? 'Remover música dos favoritos' : 'Favoritar música'}
                        className={`inline-flex items-center justify-center min-w-[40px] min-h-[40px] rounded-full ${
                          fav
                            ? 'text-accent-gold'
                            : 'text-light-on-surface-variant dark:text-dark-on-surface-variant'
                        }`}
                      >
                        <span
                          className={`material-symbols-outlined text-[20px] ${
                            fav ? 'material-symbols-filled' : ''
                          }`}
                        >
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

        {(filter === 'tudo' || filter === 'podcasts') && filteredPodcasts.length > 0 && (
          <section className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="font-headline text-title-md text-light-on-surface dark:text-dark-on-surface">
                Podcasts ({filteredPodcasts.length})
              </h2>
              <button
                type="button"
                onClick={() => onNavigate('podcast')}
                className="font-body text-body-sm text-light-primary dark:text-dark-primary hover:underline"
              >
                Catálogo completo
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredPodcasts.slice(0, 6).map((ep) => {
                const active = activePodcastId === ep.id && isPodcastPlaying;
                return (
                  <article
                    key={ep.id}
                    className="rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant p-3 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <span className="font-body text-label-sm text-light-primary dark:text-dark-primary truncate block">
                        {ep.series} · {ep.durationMinutes} min
                      </span>
                      <h3 className="font-body text-label-lg text-light-on-surface dark:text-dark-on-surface truncate">
                        {ep.title}
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => onTogglePodcast(ep)}
                      aria-label={active ? 'Pausar podcast' : 'Ouvir podcast'}
                      className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-light-primary-container dark:bg-dark-primary-container text-light-on-primary-container dark:text-dark-on-primary shrink-0"
                    >
                      <span className="material-symbols-outlined material-symbols-filled text-[20px]">
                        {active ? 'pause' : 'play_arrow'}
                      </span>
                    </button>
                  </article>
                );
              })}
            </div>
          </section>
        )}

        {(filter === 'tudo' || filter === 'radios') && filteredStations.length > 0 && (
          <section className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="font-headline text-title-md text-light-on-surface dark:text-dark-on-surface">
                Rádios ({filteredStations.length})
              </h2>
              <button
                type="button"
                onClick={() => onNavigate('radio')}
                className="font-body text-body-sm text-light-primary dark:text-dark-primary hover:underline"
              >
                Buscar estações
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredStations.slice(0, 6).map((st) => {
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
                    <button
                      type="button"
                      onClick={() => onToggleRadio(st)}
                      aria-label={active ? 'Pausar rádio' : 'Sintonizar rádio'}
                      className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-light-primary-container dark:bg-dark-primary-container text-light-on-primary-container dark:text-dark-on-primary shrink-0"
                    >
                      <span className="material-symbols-outlined material-symbols-filled text-[20px]">
                        {active ? 'pause' : 'play_arrow'}
                      </span>
                    </button>
                  </article>
                );
              })}
            </div>
          </section>
        )}

        {(filter === 'tudo' || filter === 'youtube') && filteredYouTube.length > 0 && (
          <section className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="font-headline text-title-md text-light-on-surface dark:text-dark-on-surface">
                YouTube Integrado ({filteredYouTube.length})
              </h2>
              <button
                type="button"
                onClick={() => onNavigate('youtube')}
                className="font-body text-body-sm text-light-primary dark:text-dark-primary hover:underline"
              >
                Abrir YouTube no app
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredYouTube.slice(0, 6).map((v) => (
                <article
                  key={v.videoId}
                  className="rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant p-3 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <ResilientImage
                      src={v.thumbnailUrl}
                      alt={v.title}
                      fallbackType="album"
                      className="w-16 h-11 rounded object-cover shrink-0 border border-light-outline-variant dark:border-dark-outline-variant"
                    />
                    <div className="min-w-0 flex-1">
                      <span className="font-mono text-label-sm text-light-primary dark:text-dark-primary">
                        {v.durationText}
                      </span>
                      <h3 className="font-body text-label-lg text-light-on-surface dark:text-dark-on-surface truncate">
                        {v.title}
                      </h3>
                      <p className="font-body text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant truncate">
                        {v.channel}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onPlayYouTubeVideo(v);
                      onNavigate('youtube');
                    }}
                    aria-label={`Assistir ${v.title}`}
                    className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-light-primary-container dark:bg-dark-primary-container text-light-on-primary-container dark:text-dark-on-primary shrink-0"
                  >
                    <span className="material-symbols-outlined material-symbols-filled text-[20px]">
                      play_arrow
                    </span>
                  </button>
                </article>
              ))}
            </div>
          </section>
        )}

        {(filter === 'tudo' || filter === 'agenda') &&
          (filteredAgenda.length > 0 || filteredContacts.length > 0) && (
            <section className="flex flex-col gap-3">
              <h2 className="font-headline text-title-md text-light-on-surface dark:text-dark-on-surface">
                Agenda e Contatos ({filteredAgenda.length + filteredContacts.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredAgenda.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant p-3 flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="font-mono text-body-sm text-light-primary dark:text-dark-primary tabular-nums">
                        {item.time}
                      </span>
                      <span className="font-body text-body-md text-light-on-surface dark:text-dark-on-surface truncate">
                        {item.title}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => onNavigate('inicio')}
                      className="font-body text-label-sm text-light-primary dark:text-dark-primary hover:underline"
                    >
                      Agenda
                    </button>
                  </div>
                ))}
                {filteredContacts.map((c) => (
                  <div
                    key={c.id}
                    className="rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant p-3 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <p className="font-body text-label-lg text-light-on-surface dark:text-dark-on-surface truncate">
                        {c.name}
                      </p>
                      <p className="font-body text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant truncate">
                        {c.group} · {c.phone}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onNavigate('contatos')}
                      className="font-body text-label-sm text-light-primary dark:text-dark-primary hover:underline"
                    >
                      Ver
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

        {(filter === 'tudo' || filter === 'financas') &&
          filteredFinance.length > 0 && (
            <section className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h2 className="font-headline text-title-md text-light-on-surface dark:text-dark-on-surface">
                  Finanças e Gastos ({filteredFinance.length})
                </h2>
                <button
                  type="button"
                  onClick={() => onNavigate('financas')}
                  className="font-body text-body-sm text-light-primary dark:text-dark-primary hover:underline"
                >
                  Abrir Organização Financeira
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredFinance.slice(0, 8).map((tx) => {
                  const isExpense = tx.type === 'gasto';
                  return (
                    <article
                      key={tx.id}
                      className="rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant p-3 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <span className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
                          {tx.category} · {tx.paymentMethod} ·{' '}
                          {tx.paid
                            ? isExpense
                              ? 'Pago'
                              : 'Recebido'
                            : 'A pagar'}
                        </span>
                        <h3 className="font-body text-label-lg text-light-on-surface dark:text-dark-on-surface truncate">
                          {tx.title}
                        </h3>
                      </div>
                      <span
                        className={`font-mono text-title-md tabular-nums shrink-0 ${
                          isExpense
                            ? 'text-light-error dark:text-dark-error'
                            : 'text-cat-emerald'
                        }`}
                      >
                        {isExpense ? '-' : '+'}{' '}
                        {tx.amount.toLocaleString('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        })}
                      </span>
                    </article>
                  );
                })}
              </div>
            </section>
          )}

        {(filter === 'tudo' || filter === 'investimentos') &&
          filteredInvestments.length > 0 && (
            <section className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h2 className="font-headline text-title-md text-light-on-surface dark:text-dark-on-surface">
                  Investimentos ({filteredInvestments.length})
                </h2>
                <button
                  type="button"
                  onClick={() => onNavigate('investimentos')}
                  className="font-body text-body-sm text-light-primary dark:text-dark-primary hover:underline"
                >
                  Abrir carteira e simulador
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredInvestments.map((inv) => (
                  <article
                    key={inv.id}
                    className="rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant p-3 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <span className="font-body text-label-sm text-light-primary dark:text-dark-primary">
                        {inv.category}
                        {inv.ticker ? ` · ${inv.ticker}` : ''}
                      </span>
                      <h3 className="font-body text-label-lg text-light-on-surface dark:text-dark-on-surface truncate">
                        {inv.name}
                      </h3>
                    </div>
                    <span className="font-mono text-title-md text-light-on-surface dark:text-dark-on-surface tabular-nums shrink-0">
                      {inv.currentAmount.toLocaleString('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      })}
                    </span>
                  </article>
                ))}
              </div>
            </section>
          )}

        {(filter === 'tudo' || filter === 'livros') && filteredBooks.length > 0 && (
          <section className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="font-headline text-title-md text-light-on-surface dark:text-dark-on-surface">
                Livros ({filteredBooks.length})
              </h2>
              <button
                type="button"
                onClick={() => onNavigate('livros')}
                className="font-body text-body-sm text-light-primary dark:text-dark-primary hover:underline"
              >
                Abrir estante e catálogo
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredBooks.map((bk) => (
                <article
                  key={bk.id}
                  className="rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant p-3 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <span className="font-body text-label-sm text-accent-gold">
                      {bk.category} · {bk.status}
                    </span>
                    <h3 className="font-body text-label-lg text-light-on-surface dark:text-dark-on-surface truncate">
                      {bk.title}
                    </h3>
                    <p className="font-body text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant truncate">
                      {bk.author}
                    </p>
                  </div>
                  <span className="font-mono text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant tabular-nums shrink-0">
                    {bk.currentPage}/{bk.totalPages} pág.
                  </span>
                </article>
              ))}
            </div>
          </section>
        )}

        {(filter === 'tudo' || filter === 'estudar') &&
          (filteredStudySubjects.length > 0 || filteredStudyTopics.length > 0) && (
            <section className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h2 className="font-headline text-title-md text-light-on-surface dark:text-dark-on-surface">
                  Estudar ({filteredStudySubjects.length + filteredStudyTopics.length})
                </h2>
                <button
                  type="button"
                  onClick={() => onNavigate('estudar')}
                  className="font-body text-body-sm text-light-primary dark:text-dark-primary hover:underline"
                >
                  Abrir organização de estudos
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredStudySubjects.map((sub) => (
                  <article
                    key={sub.id}
                    className="rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant p-3 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <span className="font-body text-label-sm text-cat-blue">
                        {sub.category}
                      </span>
                      <h3 className="font-body text-label-lg text-light-on-surface dark:text-dark-on-surface truncate">
                        {sub.name}
                      </h3>
                      {sub.notes && (
                        <p className="font-body text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant truncate">
                          {sub.notes}
                        </p>
                      )}
                    </div>
                    <span className="font-mono text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant tabular-nums shrink-0">
                      {sub.studiedMinutes}/{sub.weeklyGoalMinutes} min
                    </span>
                  </article>
                ))}
                {filteredStudyTopics.map((topic) => {
                  const parent = studySubjects.find((s) => s.id === topic.subjectId);
                  return (
                    <article
                      key={topic.id}
                      className="rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant p-3 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <span className="font-body text-label-sm text-cat-emerald">
                          Tópico{parent ? ` · ${parent.name}` : ''}
                        </span>
                        <h3 className="font-body text-label-lg text-light-on-surface dark:text-dark-on-surface truncate">
                          {topic.title}
                        </h3>
                      </div>
                      <button
                        type="button"
                        onClick={() => onNavigate('estudar')}
                        className="font-body text-label-sm text-light-primary dark:text-dark-primary hover:underline shrink-0"
                      >
                        Abrir
                      </button>
                    </article>
                  );
                })}
              </div>
            </section>
          )}

        {(filter === 'tudo' || filter === 'supermercado') &&
          (filteredGroceryItems.length > 0 || filteredPantryItems.length > 0) && (
            <section className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h2 className="font-headline text-title-md text-light-on-surface dark:text-dark-on-surface">
                  Supermercado ({filteredGroceryItems.length + filteredPantryItems.length})
                </h2>
                <button
                  type="button"
                  onClick={() => onNavigate('supermercado')}
                  className="font-body text-body-sm text-light-primary dark:text-dark-primary hover:underline"
                >
                  Abrir Supermercado
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredGroceryItems.slice(0, 8).map((g) => (
                  <article
                    key={g.id}
                    className="rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant p-3 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <span className="font-body text-label-sm text-cat-emerald">
                        Lista · {g.category} · {g.inCart ? 'No carrinho' : 'Falta pegar'}
                      </span>
                      <h3 className="font-body text-label-lg text-light-on-surface dark:text-dark-on-surface truncate">
                        {g.name}
                      </h3>
                    </div>
                    <span className="font-mono text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant tabular-nums shrink-0">
                      {g.quantity} {g.unit}
                    </span>
                  </article>
                ))}
                {filteredPantryItems.slice(0, 4).map((p) => (
                  <article
                    key={p.id}
                    className="rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant p-3 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <span className="font-body text-label-sm text-accent-gold">
                        Despensa · {p.category}
                      </span>
                      <h3 className="font-body text-label-lg text-light-on-surface dark:text-dark-on-surface truncate">
                        {p.name}
                      </h3>
                    </div>
                    <span className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant shrink-0">
                      {p.quantityLabel}
                    </span>
                  </article>
                ))}
              </div>
            </section>
          )}

        {(filter === 'tudo' || filter === 'notas') && filteredNotes.length > 0 && (
          <section className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="font-headline text-title-md text-light-on-surface dark:text-dark-on-surface">
                Bloco de Anotações ({filteredNotes.length})
              </h2>
              <button
                type="button"
                onClick={() => onNavigate('notas')}
                className="font-body text-body-sm text-light-primary dark:text-dark-primary hover:underline"
              >
                Abrir Bloco de Anotações
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredNotes.slice(0, 8).map((note) => (
                <article
                  key={note.id}
                  onClick={() => onNavigate('notas')}
                  className="cursor-pointer rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant p-3 flex items-start justify-between gap-3 hover:border-light-primary dark:hover:border-dark-primary transition-colors"
                >
                  <div className="min-w-0 flex flex-col gap-1">
                    <span className="font-body text-label-sm text-accent-gold">
                      {note.category}
                      {note.pinned ? ' · Fixada' : ''}
                      {note.favorite ? ' · Favorita' : ''}
                    </span>
                    <h3 className="font-body text-label-lg text-light-on-surface dark:text-dark-on-surface truncate">
                      {note.title || 'Nota sem título'}
                    </h3>
                    {note.content && (
                      <p className="font-body text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant line-clamp-2">
                        {note.content}
                      </p>
                    )}
                    {note.tags.length > 0 && (
                      <span className="font-body text-label-sm text-light-primary dark:text-dark-primary">
                        {note.tags.map((t) => `#${t}`).join(' · ')}
                      </span>
                    )}
                  </div>
                  {note.checklist.length > 0 && (
                    <span className="font-mono text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant tabular-nums shrink-0">
                      {note.checklist.filter((c) => c.checked).length}/{note.checklist.length}
                    </span>
                  )}
                </article>
              ))}
            </div>
          </section>
        )}

        {(filter === 'tudo' || filter === 'metas') && filteredGoals.length > 0 && (
          <section className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="font-headline text-title-md text-light-on-surface dark:text-dark-on-surface">
                Metas ({filteredGoals.length})
              </h2>
              <button
                type="button"
                onClick={() => onNavigate('metas')}
                className="font-body text-body-sm text-light-primary dark:text-dark-primary hover:underline"
              >
                Abrir Metas
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredGoals.slice(0, 8).map((goal) => (
                <article
                  key={goal.id}
                  onClick={() => onNavigate('metas')}
                  className="cursor-pointer rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant p-3 flex items-center justify-between gap-3 hover:border-light-primary dark:hover:border-dark-primary transition-colors"
                >
                  <div className="min-w-0 flex flex-col gap-0.5">
                    <span className="font-body text-label-sm text-cat-emerald">
                      {goal.category} · {goal.horizon}
                    </span>
                    <h3 className="font-body text-label-lg text-light-on-surface dark:text-dark-on-surface truncate">
                      {goal.title}
                    </h3>
                  </div>
                  <span className="font-mono text-body-sm text-light-primary dark:text-dark-primary tabular-nums shrink-0">
                    {goal.status === 'concluida'
                      ? '100%'
                      : goal.measureMode === 'etapas'
                        ? `${goal.milestones.filter((m) => m.done).length}/${goal.milestones.length}`
                        : `${Math.min(100, Math.round((goal.currentValue / Math.max(1, goal.targetValue)) * 100))}%`}
                  </span>
                </article>
              ))}
            </div>
          </section>
        )}

        {(filter === 'tudo' || filter === 'viagens') && filteredTrips.length > 0 && (
          <section className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="font-headline text-title-md text-light-on-surface dark:text-dark-on-surface">
                Viagens ({filteredTrips.length})
              </h2>
              <button
                type="button"
                onClick={() => onNavigate('viagens')}
                className="font-body text-body-sm text-light-primary dark:text-dark-primary hover:underline"
              >
                Abrir Viagens
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredTrips.slice(0, 6).map((trip) => (
                <article
                  key={trip.id}
                  onClick={() => onNavigate('viagens')}
                  className="cursor-pointer rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant p-3 flex items-center justify-between gap-3 hover:border-light-primary dark:hover:border-dark-primary transition-colors"
                >
                  <div className="min-w-0 flex flex-col gap-0.5">
                    <span className="font-body text-label-sm text-cat-blue">
                      {trip.tripType} · {trip.region}
                    </span>
                    <h3 className="font-body text-label-lg text-light-on-surface dark:text-dark-on-surface truncate">
                      {trip.destination}
                    </h3>
                  </div>
                  <span className="font-mono text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant tabular-nums shrink-0">
                    {trip.startDate.split('-').reverse().join('/')}
                  </span>
                </article>
              ))}
            </div>
          </section>
        )}

        {(filter === 'tudo' || filter === 'rotinas') && filteredRoutines.length > 0 && (
          <section className="flex flex-col gap-3">
            <h2 className="font-headline text-title-md text-light-on-surface dark:text-dark-on-surface">
              Sugestões para sua Agenda
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {filteredRoutines.map((routine) => (
                <article
                  key={routine.id}
                  className="rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant p-4 flex flex-col justify-between gap-3"
                >
                  <div className="flex flex-col gap-1">
                    <span className="font-mono text-body-sm text-light-primary dark:text-dark-primary tabular-nums">
                      {routine.time}
                    </span>
                    <h3 className="font-headline text-title-md text-light-on-surface dark:text-dark-on-surface">
                      {routine.title}
                    </h3>
                    <p className="font-body text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
                      {routine.description}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      onAddRoutineToAgenda({
                        time: routine.time,
                        title: routine.title,
                        category: routine.category,
                      })
                    }
                    className="w-full min-h-[40px] rounded-full border border-light-primary dark:border-dark-primary text-light-primary dark:text-dark-primary font-body text-body-sm font-medium hover:bg-light-primary/10 dark:hover:bg-dark-primary/10 transition-colors"
                  >
                    Adicionar à Agenda
                  </button>
                </article>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
};
