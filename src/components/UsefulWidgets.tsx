import React, { useEffect, useState } from 'react';
import { AppTab, DailyWidgetsState } from '../types';

interface UsefulWidgetsProps {
  widgets: DailyWidgetsState;
  onUpdateWidgets: (next: Partial<DailyWidgetsState>) => void;
  onAddFocusMinutes: (minutes: number) => void;
  isOffline: boolean;
  isManualOffline: boolean;
  onToggleManualOffline: () => void;
  favoritesCount: number;
  historyCount: number;
  personalDevotionalsCount: number;
  isRadioPlaying: boolean;
  activeRadioName: string;
  onQuickPlayRadio: () => void;
  onNavigate: (tab: AppTab) => void;
  onShowToast: (msg: string) => void;
}

function formatMMSS(totalSec: number): string {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export const UsefulWidgets: React.FC<UsefulWidgetsProps> = ({
  widgets,
  onUpdateWidgets,
  onAddFocusMinutes,
  isOffline,
  isManualOffline,
  onToggleManualOffline,
  favoritesCount,
  historyCount,
  personalDevotionalsCount,
  isRadioPlaying,
  activeRadioName,
  onQuickPlayRadio,
  onNavigate,
  onShowToast,
}) => {
  const [presetMinutes, setPresetMinutes] = useState<number>(15);
  const [secondsLeft, setSecondsLeft] = useState<number>(15 * 60);
  const [timerRunning, setTimerRunning] = useState<boolean>(false);
  const [showCustomize, setShowCustomize] = useState<boolean>(false);

  useEffect(() => {
    if (!timerRunning) return;
    const id = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          setTimerRunning(false);
          onAddFocusMinutes(presetMinutes);
          onShowToast(`Cronômetro concluído! +${presetMinutes} min adicionados ao seu foco.`);
          return presetMinutes * 60;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [timerRunning, presetMinutes, onAddFocusMinutes, onShowToast]);

  const handleSelectPreset = (mins: number) => {
    setTimerRunning(false);
    setPresetMinutes(mins);
    setSecondsLeft(mins * 60);
  };

  const anyVisible =
    widgets.showFocusWidget || widgets.showHabitsWidget || widgets.showOfflineWidget;

  return (
    <section className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className="material-symbols-outlined text-[20px] text-light-primary dark:text-dark-primary"
            aria-hidden="true"
          >
            widgets
          </span>
          <h2 className="font-headline text-title-md text-light-on-surface dark:text-dark-on-surface">
            Widgets Úteis
          </h2>
        </div>

        <button
          type="button"
          onClick={() => setShowCustomize((p) => !p)}
          className="min-h-[34px] inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-light-outline-variant dark:border-dark-outline-variant bg-light-surface-container-low dark:bg-dark-surface-container-low font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant hover:text-light-primary dark:hover:text-dark-primary"
        >
          <span className="material-symbols-outlined text-[16px]">tune</span>
          <span>Personalizar</span>
        </button>
      </div>

      {showCustomize && (
        <div className="rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant p-3 flex flex-wrap gap-2">
          {[
            { key: 'showFocusWidget' as const, label: 'Cronômetro de Foco' },
            { key: 'showHabitsWidget' as const, label: 'Hábitos Diários' },
            { key: 'showOfflineWidget' as const, label: 'Offline & Rádio Rápido' },
          ].map((item) => {
            const active = widgets[item.key];
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => onUpdateWidgets({ [item.key]: !active })}
                className={`min-h-[36px] inline-flex items-center gap-1.5 px-3 py-1 rounded-md border font-body text-body-sm transition-colors ${
                  active
                    ? 'bg-light-primary dark:bg-dark-primary border-light-primary dark:border-dark-primary text-light-on-primary dark:text-dark-on-primary font-semibold'
                    : 'bg-light-surface-container dark:bg-dark-surface-container border-light-outline-variant dark:border-dark-outline-variant text-light-on-surface-variant dark:text-dark-on-surface-variant'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">
                  {active ? 'check_box' : 'check_box_outline_blank'}
                </span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {!anyVisible ? (
        <div className="rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant p-4 text-center font-body text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
          Todos os widgets estão ocultos. Toque em <strong>Personalizar</strong> para ativar.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Widget 1: Focus / Prayer Pomodoro Timer */}
          {widgets.showFocusWidget && (
            <article className="rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant p-4 flex flex-col justify-between gap-3">
              <div className="flex items-center justify-between gap-2">
                <span className="font-headline text-label-lg text-light-on-surface dark:text-dark-on-surface flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[18px] text-accent-gold">
                    timer
                  </span>
                  Foco &amp; Oração
                </span>
                <div className="flex items-center gap-1">
                  {[5, 15, 25].map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => handleSelectPreset(mins)}
                      className={`px-2 py-0.5 rounded font-mono text-label-sm tabular-nums ${
                        presetMinutes === mins
                          ? 'bg-light-primary dark:bg-dark-primary text-light-on-primary dark:text-dark-on-primary font-semibold'
                          : 'bg-light-surface-container dark:bg-dark-surface-container text-light-on-surface-variant dark:text-dark-on-surface-variant'
                      }`}
                    >
                      {mins}m
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-headline-lg text-light-primary dark:text-dark-primary tabular-nums">
                  {formatMMSS(secondsLeft)}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setTimerRunning((p) => !p)}
                    className="min-h-[36px] px-3 py-1 rounded-full bg-light-primary-container dark:bg-dark-primary-container text-light-on-primary-container dark:text-dark-on-primary font-body text-body-sm font-semibold"
                  >
                    {timerRunning ? 'Pausar' : 'Iniciar'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTimerRunning(false);
                      setSecondsLeft(presetMinutes * 60);
                    }}
                    aria-label="Reiniciar cronômetro"
                    className="inline-flex items-center justify-center min-w-[36px] min-h-[36px] rounded-full border border-light-outline-variant dark:border-dark-outline-variant text-light-on-surface-variant dark:text-dark-on-surface-variant"
                  >
                    <span className="material-symbols-outlined text-[18px]">refresh</span>
                  </button>
                </div>
              </div>
            </article>
          )}

          {/* Widget 2: Daily Habits & Hydration */}
          {widgets.showHabitsWidget && (
            <article className="rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant p-4 flex flex-col justify-between gap-2.5">
              <div className="flex items-center justify-between">
                <span className="font-headline text-label-lg text-light-on-surface dark:text-dark-on-surface flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[18px] text-cat-emerald">
                    water_drop
                  </span>
                  Hábitos do Dia
                </span>
                <button
                  type="button"
                  onClick={() =>
                    onUpdateWidgets({ gratitudeDone: !widgets.gratitudeDone })
                  }
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded font-body text-label-sm border ${
                    widgets.gratitudeDone
                      ? 'border-cat-emerald text-cat-emerald bg-cat-emerald/10'
                      : 'border-light-outline-variant dark:border-dark-outline-variant text-light-on-surface-variant dark:text-dark-on-surface-variant'
                  }`}
                >
                  <span className="material-symbols-outlined text-[14px]">
                    {widgets.gratitudeDone ? 'check_circle' : 'volunteer_activism'}
                  </span>
                  <span>Gratidão</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-md bg-light-surface-container dark:bg-dark-surface-container p-2 flex items-center justify-between gap-1">
                  <div>
                    <span className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant block">
                      Água
                    </span>
                    <span className="font-mono text-title-md text-light-on-surface dark:text-dark-on-surface tabular-nums">
                      {widgets.waterCups}/8
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateWidgets({
                        waterCups: widgets.waterCups >= 8 ? 0 : widgets.waterCups + 1,
                      })
                    }
                    aria-label="Adicionar copo de água"
                    className="w-8 h-8 rounded-full bg-light-primary dark:bg-dark-primary text-light-on-primary dark:text-dark-on-primary flex items-center justify-center font-bold"
                  >
                    +
                  </button>
                </div>

                <div className="rounded-md bg-light-surface-container dark:bg-dark-surface-container p-2 flex items-center justify-between gap-1">
                  <div>
                    <span className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant block">
                      Oração
                    </span>
                    <span className="font-mono text-title-md text-light-on-surface dark:text-dark-on-surface tabular-nums">
                      {widgets.prayersCount}x
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateWidgets({ prayersCount: widgets.prayersCount + 1 })
                    }
                    aria-label="Registrar momento de oração"
                    className="w-8 h-8 rounded-full bg-light-primary dark:bg-dark-primary text-light-on-primary dark:text-dark-on-primary flex items-center justify-center font-bold"
                  >
                    +
                  </button>
                </div>
              </div>
            </article>
          )}

          {/* Widget 3: Offline Pack, Radio Quick Tune & History Shortcut */}
          {widgets.showOfflineWidget && (
            <article className="rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant p-4 flex flex-col justify-between gap-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="font-headline text-label-lg text-light-on-surface dark:text-dark-on-surface flex items-center gap-1.5">
                  <span
                    className={`material-symbols-outlined text-[18px] ${
                      isOffline ? 'text-accent-gold' : 'text-cat-blue'
                    }`}
                  >
                    {isOffline ? 'cloud_off' : 'offline_pin'}
                  </span>
                  {isOffline ? 'Modo Offline' : 'Acesso Rápido'}
                </span>
                <button
                  type="button"
                  onClick={onToggleManualOffline}
                  className="font-body text-label-sm text-light-primary dark:text-dark-primary hover:underline"
                >
                  {isManualOffline ? 'Ficar Online' : 'Simular Offline'}
                </button>
              </div>

              <p className="font-body text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant tabular-nums">
                {personalDevotionalsCount} devocionais · {favoritesCount} favoritos · {historyCount} no histórico
              </p>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onQuickPlayRadio}
                  className="flex-1 min-h-[36px] inline-flex items-center justify-center gap-1.5 px-2.5 py-1 rounded-md bg-light-surface-container dark:bg-dark-surface-container border border-light-outline-variant dark:border-dark-outline-variant font-body text-body-sm text-light-on-surface dark:text-dark-on-surface truncate"
                >
                  <span className="material-symbols-outlined text-[16px] text-accent-gold">
                    {isRadioPlaying ? 'pause' : 'radio'}
                  </span>
                  <span className="truncate">
                    {isRadioPlaying ? 'Pausar Rádio' : activeRadioName}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('favoritos')}
                  className="min-h-[36px] px-2.5 py-1 rounded-md bg-light-primary dark:bg-dark-primary text-light-on-primary dark:text-dark-on-primary font-body text-label-sm whitespace-nowrap"
                >
                  Histórico
                </button>
              </div>
            </article>
          )}
        </div>
      )}
    </section>
  );
};
