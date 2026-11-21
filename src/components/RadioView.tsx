import React, { useState } from 'react';
import { RadioStation } from '../types';
import { RadioStatus } from '../utils/audioPlayer';

const RADIO_CATEGORIES: { id: string; label: string }[] = [
  { id: 'gospel', label: 'Gospel' },
  { id: 'christian', label: 'Cristã' },
  { id: 'mpb', label: 'MPB' },
  { id: 'sertanejo', label: 'Sertanejo' },
  { id: 'pop', label: 'Pop' },
  { id: 'news', label: 'Notícias' },
  { id: 'todas', label: 'Todas (Brasil)' },
];

interface RadioViewProps {
  stations: RadioStation[];
  activeStationId: string;
  isPlaying: boolean;
  radioStreamStatus: RadioStatus;
  radioElapsedSeconds: number;
  selectedRadioTag: string;
  isSearchingStations: boolean;
  favoriteRadioIds?: string[];
  onToggleFavoriteRadio?: (stationId: string) => void;
  onSelectRadioTag: (tag: string) => void;
  onSearchStations: (query: string) => void;
  onToggleStation: (station: RadioStation) => void;
  onBack: () => void;
}

function formatTimer(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export const RadioView: React.FC<RadioViewProps> = ({
  stations,
  activeStationId,
  isPlaying,
  radioStreamStatus,
  radioElapsedSeconds,
  selectedRadioTag,
  isSearchingStations,
  favoriteRadioIds = [],
  onToggleFavoriteRadio,
  onSelectRadioTag,
  onSearchStations,
  onToggleStation,
  onBack,
}) => {
  const [searchInput, setSearchInput] = useState('');

  const activeStation =
    stations.find((s) => s.id === activeStationId) ?? stations[0];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearchStations(searchInput);
  };

  const statusText = !isPlaying
    ? 'Em espera'
    : radioStreamStatus === 'connecting'
      ? 'Conectando...'
      : radioStreamStatus === 'live'
        ? `Ao vivo (${formatTimer(radioElapsedSeconds)})`
        : `No ar · Estúdio (${formatTimer(radioElapsedSeconds)})`;

  return (
    <div className="flex flex-col">
      <header className="px-4 lg:px-8 pt-6 pb-4 flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            aria-label="Voltar"
            className="inline-flex items-center justify-center min-w-[44px] min-h-[44px] -ml-2 rounded-full text-light-on-surface dark:text-dark-on-surface hover:bg-light-surface-container-high dark:hover:bg-dark-surface-container-high transition-colors shrink-0"
          >
            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
          </button>
          <div>
            <h1 className="font-headline text-headline-md lg:text-headline-lg text-light-on-surface dark:text-dark-on-surface">
              Rádio
            </h1>
            <p className="font-body text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
              Busque estações reais do Brasil e ouça ao vivo.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex items-center gap-2">
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
              placeholder="Buscar rádio (ex: Melodia, 93 FM, Jovem Pan, Vida)..."
              aria-label="Buscar estação de rádio"
              className="w-full rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant text-light-on-surface dark:text-dark-on-surface font-body text-body-md pl-10 pr-4 py-2.5 focus:outline-none focus:border-light-primary dark:focus:border-dark-primary"
            />
          </div>
          <button
            type="submit"
            disabled={isSearchingStations}
            className="min-h-[44px] px-4 py-2 rounded-lg bg-light-primary dark:bg-dark-primary text-light-on-primary dark:text-dark-on-primary font-body text-label-lg whitespace-nowrap disabled:opacity-60"
          >
            {isSearchingStations ? 'Buscando...' : 'Buscar'}
          </button>
        </form>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {RADIO_CATEGORIES.map((cat) => {
            const active = selectedRadioTag === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => onSelectRadioTag(cat.id)}
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
      </header>

      <main className="px-4 lg:px-8 pb-36 lg:pb-14 flex flex-col gap-4">
        {/* Tuner Card */}
        {activeStation && (
          <section className="rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant p-5 flex items-center justify-between gap-4">
            <div className="min-w-0 flex-1 flex flex-col gap-1">
              <span className="font-mono text-title-md text-light-primary dark:text-dark-primary tabular-nums">
                {activeStation.frequency} · {statusText}
              </span>
              <h2 className="font-headline text-headline-md text-light-on-surface dark:text-dark-on-surface truncate">
                {activeStation.name}
              </h2>
              <p className="font-body text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant truncate">
                {activeStation.program} · {activeStation.genre}
              </p>
            </div>

            <button
              type="button"
              onClick={() => onToggleStation(activeStation)}
              aria-label={isPlaying ? 'Desligar rádio' : 'Sintonizar rádio'}
              aria-pressed={isPlaying}
              className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-light-primary-container dark:bg-dark-primary-container text-light-on-primary-container dark:text-dark-on-primary shrink-0 transition-transform hover:scale-105 active:scale-95"
            >
              <span className="material-symbols-outlined material-symbols-filled text-[28px]">
                {isPlaying ? 'pause' : 'play_arrow'}
              </span>
            </button>
          </section>
        )}

        {/* Stations Grid */}
        {isSearchingStations ? (
          <div className="rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant p-8 text-center font-body text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
            Procurando estações de rádio brasileiras...
          </div>
        ) : stations.length === 0 ? (
          <div className="rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant p-8 text-center font-body text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
            Nenhuma estação encontrada com esse termo. Tente outro nome ou categoria.
          </div>
        ) : (
          <section className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {stations.map((station) => {
              const isSelected = activeStation?.id === station.id;
              const isStationPlaying = isSelected && isPlaying;
              const isFav = favoriteRadioIds.includes(station.id);
              return (
                <div
                  key={station.id}
                  className={`rounded-lg border p-3.5 flex items-center justify-between gap-2 transition-colors ${
                    isSelected
                      ? 'bg-light-surface-container-high dark:bg-dark-surface-container-high border-light-primary dark:border-dark-primary'
                      : 'bg-light-surface-container-low dark:bg-dark-surface-container-low border-light-outline-variant dark:border-dark-outline-variant hover:border-light-primary/60 dark:hover:border-dark-primary/60'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => onToggleStation(station)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-body-sm text-light-primary dark:text-dark-primary tabular-nums">
                        {station.frequency}
                      </span>
                      <span className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant truncate">
                        · {station.genre}
                      </span>
                    </div>
                    <h3 className="font-headline text-title-md text-light-on-surface dark:text-dark-on-surface truncate mt-0.5">
                      {station.name}
                    </h3>
                    <p className="font-body text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant truncate">
                      {station.program}
                    </p>
                  </button>

                  <div className="flex items-center gap-1 shrink-0">
                    {onToggleFavoriteRadio && (
                      <button
                        type="button"
                        onClick={() => onToggleFavoriteRadio(station.id)}
                        aria-label={isFav ? 'Remover rádio dos favoritos' : 'Salvar rádio nos favoritos'}
                        className={`inline-flex items-center justify-center min-w-[38px] min-h-[38px] rounded-full ${
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
                    )}
                    <button
                      type="button"
                      onClick={() => onToggleStation(station)}
                      aria-label={isStationPlaying ? 'Pausar rádio' : 'Sintonizar rádio'}
                      className="inline-flex items-center justify-center min-w-[38px] min-h-[38px] rounded-full"
                    >
                      <span
                        className={`material-symbols-outlined material-symbols-filled text-[24px] ${
                          isStationPlaying
                            ? 'text-light-primary dark:text-dark-primary'
                            : 'text-light-on-surface-variant dark:text-dark-on-surface-variant'
                        }`}
                      >
                        {isStationPlaying ? 'graphic_eq' : 'radio'}
                      </span>
                    </button>
                  </div>
                </div>
              );
            })}
          </section>
        )}
      </main>
    </div>
  );
};
