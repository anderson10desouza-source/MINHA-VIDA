import React from 'react';
import { AppTab } from '../types';

interface NowPlayingBarProps {
  title: string;
  subtitle: string;
  kindLabel: 'Música' | 'Podcast' | 'Rádio';
  targetTab: AppTab;
  isPlaying: boolean;
  elapsedLabel: string;
  volume: number;
  onTogglePlay: () => void;
  onStop: () => void;
  onVolumeChange: (val: number) => void;
  onOpenView: (tab: AppTab) => void;
}

export const NowPlayingBar: React.FC<NowPlayingBarProps> = ({
  title,
  subtitle,
  kindLabel,
  targetTab,
  isPlaying,
  elapsedLabel,
  volume,
  onTogglePlay,
  onStop,
  onVolumeChange,
  onOpenView,
}) => {
  return (
    <aside
      aria-label="Reprodutor de áudio ativo"
      className="fixed bottom-[64px] lg:bottom-4 inset-x-3 lg:inset-x-auto lg:right-6 lg:w-96 z-30 max-w-md mx-auto lg:mx-0 rounded-lg bg-light-surface-container-high/95 dark:bg-dark-surface-container-high/95 backdrop-blur-md border border-light-primary/60 dark:border-dark-primary/60 px-3.5 py-2.5 shadow-lg flex flex-col gap-2"
    >
      <div className="flex items-center justify-between gap-2.5">
        <button
          type="button"
          onClick={() => onOpenView(targetTab)}
          className="flex items-center gap-2.5 min-w-0 flex-1 text-left"
        >
          <span
            className={`material-symbols-outlined text-[22px] text-light-primary dark:text-dark-primary shrink-0 ${
              isPlaying ? 'animate-pulse' : ''
            }`}
            aria-hidden="true"
          >
            {kindLabel === 'Podcast'
              ? 'podcasts'
              : kindLabel === 'Rádio'
                ? 'radio'
                : 'music_note'}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="font-body text-label-sm text-light-primary dark:text-dark-primary">
                {kindLabel}
              </span>
              <span className="font-mono text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant tabular-nums">
                · {elapsedLabel}
              </span>
            </div>
            <p className="font-headline text-body-sm font-semibold text-light-on-surface dark:text-dark-on-surface truncate">
              {title}
            </p>
            <p className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant truncate">
              {subtitle}
            </p>
          </div>
        </button>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={onTogglePlay}
            aria-label={isPlaying ? 'Pausar áudio' : 'Retomar áudio'}
            className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-light-primary-container dark:bg-dark-primary-container text-light-on-primary-container dark:text-dark-on-primary"
          >
            <span className="material-symbols-outlined material-symbols-filled text-[20px]">
              {isPlaying ? 'pause' : 'play_arrow'}
            </span>
          </button>
          <button
            type="button"
            onClick={onStop}
            aria-label="Parar reprodução"
            className="inline-flex items-center justify-center min-w-[36px] min-h-[36px] rounded-full text-light-on-surface-variant dark:text-dark-on-surface-variant hover:bg-light-surface-container dark:hover:bg-dark-surface-container"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span
          className="material-symbols-outlined text-[16px] text-light-on-surface-variant dark:text-dark-on-surface-variant"
          aria-hidden="true"
        >
          {volume === 0 ? 'volume_off' : 'volume_up'}
        </span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={volume}
          onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
          aria-label="Volume do reprodutor"
          className="flex-1 h-1.5 accent-accent-gold cursor-pointer"
        />
        <span className="font-mono text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant tabular-nums w-9 text-right">
          {Math.round(volume * 100)}%
        </span>
      </div>
    </aside>
  );
};
