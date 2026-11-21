import React, { useState } from 'react';
import { YouTubeVideoItem } from '../types';
import { ResilientImage } from './ResilientImage';

interface YouTubeViewProps {
  videos: YouTubeVideoItem[];
  savedVideos: YouTubeVideoItem[];
  recentVideos: YouTubeVideoItem[];
  activeVideo: YouTubeVideoItem | null;
  selectedCategory: string;
  isSearching: boolean;
  onSelectCategory: (categoryId: string) => void;
  onSearch: (query: string) => void;
  onPlayVideo: (video: YouTubeVideoItem) => void;
  onClosePlayer: () => void;
  onToggleSaveVideo: (video: YouTubeVideoItem) => void;
  onResolveAndPlayLink: (urlOrId: string) => Promise<boolean>;
  onBack: () => void;
  onShowToast: (msg: string) => void;
}

const YOUTUBE_CATEGORIES: { id: string; label: string }[] = [
  { id: 'destaques', label: 'Destaques' },
  { id: 'louvor', label: 'Louvor e Adoração' },
  { id: 'palavra', label: 'Palavra e Pregações' },
  { id: 'podcasts', label: 'Podcasts em Vídeo' },
  { id: 'financas', label: 'Finanças' },
  { id: 'aovivo', label: 'Ao Vivo' },
];

function looksLikeYouTubeLink(raw: string): boolean {
  const s = raw.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(s)) return true;
  return /youtube\.com|youtu\.be/i.test(s);
}

export const YouTubeView: React.FC<YouTubeViewProps> = ({
  videos,
  savedVideos,
  recentVideos,
  activeVideo,
  selectedCategory,
  isSearching,
  onSelectCategory,
  onSearch,
  onPlayVideo,
  onClosePlayer,
  onToggleSaveVideo,
  onResolveAndPlayLink,
  onBack,
  onShowToast,
}) => {
  const [subTab, setSubTab] = useState<'explorar' | 'salvos' | 'recentes'>('explorar');
  const [query, setQuery] = useState('');
  const [isTheaterMode, setIsTheaterMode] = useState(false);
  const [isResolvingLink, setIsResolvingLink] = useState(false);

  const handleSubmitSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) {
      onSelectCategory(selectedCategory);
      return;
    }

    if (looksLikeYouTubeLink(trimmed)) {
      setIsResolvingLink(true);
      const ok = await onResolveAndPlayLink(trimmed);
      setIsResolvingLink(false);
      if (ok) {
        setQuery('');
      } else {
        onShowToast('Não foi possível abrir este link do YouTube. Tente pesquisar pelo título.');
      }
      return;
    }

    setSubTab('explorar');
    onSearch(trimmed);
  };

  const activeList =
    subTab === 'salvos'
      ? savedVideos
      : subTab === 'recentes'
        ? recentVideos
        : videos;

  const isSaved = (videoId: string) =>
    savedVideos.some((v) => v.videoId === videoId);

  const handlePlayNext = () => {
    if (!activeVideo || activeList.length === 0) return;
    const idx = activeList.findIndex((v) => v.videoId === activeVideo.videoId);
    const nextIdx = idx >= 0 ? (idx + 1) % activeList.length : 0;
    onPlayVideo(activeList[nextIdx]);
  };

  const embedUrl = activeVideo
    ? `https://www.youtube.com/embed/${activeVideo.videoId}?autoplay=1&rel=0&playsinline=1`
    : '';

  return (
    <div className="flex flex-col">
      {/* Header */}
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
              <h1 className="font-headline text-headline-md lg:text-headline-lg text-light-on-surface dark:text-dark-on-surface truncate">
                YouTube Integrado
              </h1>
              <p className="font-body text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant truncate">
                Assista pregações, louvores, podcasts em vídeo e canais ao vivo sem sair do app.
              </p>
            </div>
          </div>
        </div>

        {/* Search & Direct YouTube URL Form */}
        <form onSubmit={(e) => void handleSubmitSearch(e)} className="flex items-center gap-2">
          <div className="relative flex-1">
            <span
              className="material-symbols-outlined text-[20px] text-light-on-surface-variant dark:text-dark-on-surface-variant absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            >
              smart_display
            </span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar no YouTube ou colar link de vídeo/live..."
              aria-label="Buscar vídeos ou colar link do YouTube"
              className="w-full rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant pl-10 pr-4 py-2.5 font-body text-body-md text-light-on-surface dark:text-dark-on-surface focus:outline-none focus:border-light-primary dark:focus:border-dark-primary"
            />
          </div>
          <button
            type="submit"
            disabled={isSearching || isResolvingLink}
            className="min-h-[44px] px-5 py-2 rounded-full bg-light-primary dark:bg-dark-primary text-light-on-primary dark:text-dark-on-primary font-body text-label-lg whitespace-nowrap disabled:opacity-60"
          >
            {isResolvingLink
              ? 'Abrindo...'
              : isSearching
                ? 'Buscando...'
                : looksLikeYouTubeLink(query)
                  ? 'Abrir Link'
                  : 'Buscar'}
          </button>
        </form>

        {/* Sub-Tabs */}
        <div className="flex items-center gap-1 p-1 rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant w-fit max-w-full overflow-x-auto">
          <button
            type="button"
            onClick={() => setSubTab('explorar')}
            className={`min-h-[38px] px-4 py-1.5 rounded-md font-body text-body-sm font-semibold whitespace-nowrap transition-colors ${
              subTab === 'explorar'
                ? 'bg-light-primary dark:bg-dark-primary text-light-on-primary dark:text-dark-on-primary'
                : 'text-light-on-surface-variant dark:text-dark-on-surface-variant hover:text-light-on-surface dark:hover:text-dark-on-surface'
            }`}
          >
            Explorar Vídeos
          </button>
          <button
            type="button"
            onClick={() => setSubTab('salvos')}
            className={`min-h-[38px] px-4 py-1.5 rounded-md font-body text-body-sm font-semibold whitespace-nowrap transition-colors ${
              subTab === 'salvos'
                ? 'bg-light-primary dark:bg-dark-primary text-light-on-primary dark:text-dark-on-primary'
                : 'text-light-on-surface-variant dark:text-dark-on-surface-variant hover:text-light-on-surface dark:hover:text-dark-on-surface'
            }`}
          >
            Salvos ({savedVideos.length})
          </button>
          <button
            type="button"
            onClick={() => setSubTab('recentes')}
            className={`min-h-[38px] px-4 py-1.5 rounded-md font-body text-body-sm font-semibold whitespace-nowrap transition-colors ${
              subTab === 'recentes'
                ? 'bg-light-primary dark:bg-dark-primary text-light-on-primary dark:text-dark-on-primary'
                : 'text-light-on-surface-variant dark:text-dark-on-surface-variant hover:text-light-on-surface dark:hover:text-dark-on-surface'
            }`}
          >
            Assistidos ({recentVideos.length})
          </button>
        </div>
      </header>

      <main className="px-4 lg:px-8 pb-32 lg:pb-12 flex flex-col gap-5">
        {/* Embedded Integrated Video Player */}
        {activeVideo && (
          <section
            aria-label="Player de vídeo do YouTube"
            className="rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant overflow-hidden flex flex-col"
          >
            <div
              className={`w-full bg-black ${
                isTheaterMode ? 'aspect-[21/9] min-h-[280px] lg:min-h-[460px]' : 'aspect-video max-h-[520px]'
              }`}
            >
              <iframe
                key={activeVideo.videoId}
                src={embedUrl}
                title={activeVideo.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                className="w-full h-full border-0"
              />
            </div>

            <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="min-w-0 flex-1 flex flex-col gap-1">
                <div className="flex items-center gap-2 font-body text-label-sm text-light-primary dark:text-dark-primary">
                  <span>{activeVideo.channel}</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono tabular-nums">{activeVideo.durationText}</span>
                  {activeVideo.viewsText && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>{activeVideo.viewsText}</span>
                    </>
                  )}
                </div>
                <h2 className="font-headline text-title-md text-light-on-surface dark:text-dark-on-surface line-clamp-2">
                  {activeVideo.title}
                </h2>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => onToggleSaveVideo(activeVideo)}
                  className={`inline-flex items-center gap-1.5 min-h-[40px] px-3.5 py-1.5 rounded-full border font-body text-body-sm font-medium transition-colors ${
                    isSaved(activeVideo.videoId)
                      ? 'border-accent-gold text-accent-gold bg-light-surface-container dark:bg-dark-surface-container'
                      : 'border-light-outline-variant dark:border-dark-outline-variant text-light-on-surface dark:text-dark-on-surface hover:border-light-primary dark:hover:border-dark-primary'
                  }`}
                >
                  <span
                    className={`material-symbols-outlined text-[18px] ${
                      isSaved(activeVideo.videoId) ? 'material-symbols-filled' : ''
                    }`}
                  >
                    bookmark
                  </span>
                  <span>{isSaved(activeVideo.videoId) ? 'Salvo' : 'Salvar'}</span>
                </button>

                {activeList.length > 1 && (
                  <button
                    type="button"
                    onClick={handlePlayNext}
                    className="inline-flex items-center gap-1 min-h-[40px] px-3.5 py-1.5 rounded-full border border-light-outline-variant dark:border-dark-outline-variant font-body text-body-sm text-light-on-surface dark:text-dark-on-surface hover:border-light-primary dark:hover:border-dark-primary"
                  >
                    <span className="material-symbols-outlined text-[18px]">skip_next</span>
                    <span>Próximo</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setIsTheaterMode((p) => !p)}
                  aria-label="Alternar modo cinema"
                  className="hidden sm:inline-flex items-center gap-1 min-h-[40px] px-3 py-1.5 rounded-full border border-light-outline-variant dark:border-dark-outline-variant font-body text-body-sm text-light-on-surface dark:text-dark-on-surface hover:border-light-primary dark:hover:border-dark-primary"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {isTheaterMode ? 'close_fullscreen' : 'aspect_ratio'}
                  </span>
                  <span>{isTheaterMode ? 'Normal' : 'Cinema'}</span>
                </button>

                <button
                  type="button"
                  onClick={onClosePlayer}
                  aria-label="Fechar player"
                  className="inline-flex items-center justify-center min-w-[40px] min-h-[40px] rounded-full border border-light-outline-variant dark:border-dark-outline-variant text-light-on-surface-variant dark:text-dark-on-surface-variant hover:text-light-error dark:hover:text-dark-error"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>
            </div>
          </section>
        )}

        {/* Categories (Explorar tab) */}
        {subTab === 'explorar' && (
          <div className="flex items-center gap-1 p-1 rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant overflow-x-auto">
            {YOUTUBE_CATEGORIES.map((cat) => {
              const active = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => onSelectCategory(cat.id)}
                  className={`min-h-[38px] px-3.5 py-1.5 rounded-md font-body text-body-sm whitespace-nowrap transition-colors ${
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
        )}

        {/* Video Grid */}
        {isSearching && subTab === 'explorar' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div
                key={n}
                className="h-60 rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant"
              />
            ))}
          </div>
        ) : activeList.length === 0 ? (
          <section className="rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant p-8 text-center flex flex-col items-center gap-2">
            <span className="material-symbols-outlined text-4xl text-light-primary dark:text-dark-primary">
              smart_display
            </span>
            <h2 className="font-headline text-title-md text-light-on-surface dark:text-dark-on-surface">
              {subTab === 'salvos'
                ? 'Nenhum vídeo salvo ainda'
                : subTab === 'recentes'
                  ? 'Nenhum vídeo assistido ainda'
                  : 'Nenhum vídeo encontrado'}
            </h2>
            <p className="font-body text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant max-w-md">
              {subTab === 'salvos'
                ? 'Toque em "Salvar" nos vídeos do YouTube para criar sua lista rápida.'
                : subTab === 'recentes'
                  ? 'Os vídeos que você assistir aqui ficam salvos no histórico.'
                  : 'Tente buscar outro tema ou cole diretamente o link de um vídeo do YouTube.'}
            </p>
          </section>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeList.map((video) => {
              const isPlayingNow = activeVideo?.videoId === video.videoId;
              const saved = isSaved(video.videoId);
              return (
                <article
                  key={`${subTab}-${video.videoId}`}
                  className={`rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border overflow-hidden flex flex-col justify-between transition-colors ${
                    isPlayingNow
                      ? 'border-light-primary dark:border-dark-primary'
                      : 'border-light-outline-variant dark:border-dark-outline-variant'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => onPlayVideo(video)}
                    className="relative aspect-video w-full bg-black text-left overflow-hidden group focus-visible:outline-2 focus-visible:outline-light-primary"
                  >
                    <ResilientImage
                      src={video.thumbnailUrl}
                      alt={video.title}
                      fallbackType="album"
                      className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-200"
                    />
                    <span className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/80 text-white font-mono text-[11px] tabular-nums">
                      {video.durationText}
                    </span>
                    <span className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="w-12 h-12 rounded-full bg-light-primary dark:bg-dark-primary text-light-on-primary dark:text-dark-on-primary flex items-center justify-center shadow-lg">
                        <span className="material-symbols-outlined material-symbols-filled text-[26px]">
                          play_arrow
                        </span>
                      </span>
                    </span>
                  </button>

                  <div className="p-3.5 flex-1 flex flex-col justify-between gap-2.5">
                    <div className="flex flex-col gap-1">
                      <h3 className="font-headline text-label-lg text-light-on-surface dark:text-dark-on-surface line-clamp-2">
                        {video.title}
                      </h3>
                      <p className="font-body text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant truncate">
                        {video.channel}
                        {video.viewsText ? ` · ${video.viewsText}` : ''}
                      </p>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-light-outline-variant dark:border-dark-outline-variant">
                      <button
                        type="button"
                        onClick={() => onPlayVideo(video)}
                        className={`flex-1 inline-flex items-center justify-center gap-1.5 min-h-[38px] px-3 py-1.5 rounded-full font-body text-label-sm font-semibold transition-colors ${
                          isPlayingNow
                            ? 'bg-cat-emerald text-white'
                            : 'bg-light-primary dark:bg-dark-primary text-light-on-primary dark:text-dark-on-primary'
                        }`}
                      >
                        <span className="material-symbols-outlined material-symbols-filled text-[17px]">
                          play_arrow
                        </span>
                        <span>{isPlayingNow ? 'Assistindo Agora' : 'Assistir Vídeo'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onToggleSaveVideo(video)}
                        aria-label={saved ? 'Remover dos salvos' : 'Salvar vídeo'}
                        className={`inline-flex items-center justify-center min-w-[38px] min-h-[38px] rounded-full border transition-colors ${
                          saved
                            ? 'border-accent-gold text-accent-gold'
                            : 'border-light-outline-variant dark:border-dark-outline-variant text-light-on-surface-variant dark:text-dark-on-surface-variant hover:border-light-primary dark:hover:border-dark-primary'
                        }`}
                      >
                        <span
                          className={`material-symbols-outlined text-[18px] ${
                            saved ? 'material-symbols-filled' : ''
                          }`}
                        >
                          bookmark
                        </span>
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};
