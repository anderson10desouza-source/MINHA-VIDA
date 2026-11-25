import React, { useEffect, useState } from 'react';
import {
  AgendaCategory,
  AgendaItem,
  AppTab,
  DailyWidgetsState,
  DailyWordEntry,
  DevotionalItem,
  MusicTrack,
  NotificationItem,
  TaskItem,
  UserProfile,
} from '../types';
import {
  formatFullDatePtBr,
  formatMonthYearPtBr,
  formatShortDatePtBr,
  formatTimeHHMM,
  getGreetingForDate,
  getMonthCalendarCells,
  MONTH_NAMES_PT,
  toLocalDateKey,
  WEEKDAY_SHORT_PT,
} from '../utils/dateTime';
import { MediaMenuStrip } from './MediaMenuStrip';
import { PWAInstallBanner } from './OfflineModeBar';
import { ResilientImage } from './ResilientImage';
import { UsefulWidgets } from './UsefulWidgets';

interface HomeViewProps {
  profile: UserProfile;
  agenda: AgendaItem[];
  onOpenAgendaModal: (dateKey?: string) => void;
  onToggleAgendaItem: (id: string) => void;
  onDeleteAgendaItem: (id: string) => void;
  currentDevotional: DevotionalItem;
  todayWord: DailyWordEntry;
  onNextDevotional: () => void;
  isDevotionalFavorited: boolean;
  onToggleFavoriteDevotional: (id: string) => void;
  tasks: TaskItem[];
  readingMinutes: number;
  onAddReadingMinutes: (minutes: number) => void;
  onOpenTasksView: () => void;
  currentTrack: MusicTrack;
  isPlaying: boolean;
  playbackProgress: number;
  onTogglePlay: () => void;
  onNextTrack: () => void;
  notifications: NotificationItem[];
  onMarkAllRead: () => void;
  onDismissNotification?: (id: string) => void;
  onOpenNotification?: (notif: NotificationItem) => void;
  onTriggerBrowserReminder?: () => void;
  onOpenProfile: () => void;
  onNavigate: (tab: AppTab) => void;
  onOpenMyDevotional?: (focus?: 'written' | 'audio') => void;
  unreadMessagesCount: number;
  widgets: DailyWidgetsState;
  onUpdateWidgets: (next: Partial<DailyWidgetsState>) => void;
  isOffline: boolean;
  isManualOffline: boolean;
  onToggleManualOffline: () => void;
  favoritesCount: number;
  historyCount: number;
  personalDevotionalsCount: number;
  isRadioPlaying: boolean;
  activeRadioName: string;
  onQuickPlayRadio: () => void;
  onShowToast: (msg: string) => void;
}

const CATEGORY_DOT: Record<AgendaCategory, string> = {
  blue: 'bg-cat-blue',
  gold: 'bg-accent-gold',
  emerald: 'bg-cat-emerald',
  violet: 'bg-cat-violet',
};

function formatReadingTime(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export const HomeView: React.FC<HomeViewProps> = ({
  profile,
  agenda,
  onOpenAgendaModal,
  onToggleAgendaItem,
  onDeleteAgendaItem,
  currentDevotional,
  todayWord,
  onNextDevotional,
  isDevotionalFavorited,
  onToggleFavoriteDevotional,
  tasks,
  readingMinutes,
  onAddReadingMinutes,
  onOpenTasksView,
  currentTrack,
  isPlaying,
  playbackProgress,
  onTogglePlay,
  onNextTrack,
  notifications,
  onMarkAllRead,
  onDismissNotification,
  onOpenNotification,
  onTriggerBrowserReminder,
  onOpenProfile,
  onNavigate,
  onOpenMyDevotional,
  unreadMessagesCount,
  widgets,
  onUpdateWidgets,
  isOffline,
  isManualOffline,
  onToggleManualOffline,
  favoritesCount,
  historyCount,
  personalDevotionalsCount,
  isRadioPlaying,
  activeRadioName,
  onQuickPlayRadio,
  onShowToast,
}) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [now, setNow] = useState<Date>(() => new Date());
  const [selectedDate, setSelectedDate] = useState<string>(() => toLocalDateKey());
  const [calendarYear, setCalendarYear] = useState<number>(() => new Date().getFullYear());
  const [calendarMonth, setCalendarMonth] = useState<number>(() => new Date().getMonth());
  const [showCalendar, setShowCalendar] = useState<boolean>(true);

  useEffect(() => {
    const syncNow = () => {
      const current = new Date();
      setNow((prev) => {
        const prevKey = toLocalDateKey(prev);
        const nextKey = toLocalDateKey(current);
        if (prevKey !== nextKey) {
          setSelectedDate((sel) => (sel === prevKey ? nextKey : sel));
          setCalendarYear(current.getFullYear());
          setCalendarMonth(current.getMonth());
        }
        return current;
      });
    };

    const interval = window.setInterval(syncNow, 15000);
    const onFocusOrVisible = () => {
      if (document.visibilityState === 'visible') syncNow();
    };
    window.addEventListener('focus', onFocusOrVisible);
    document.addEventListener('visibilitychange', onFocusOrVisible);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', onFocusOrVisible);
      document.removeEventListener('visibilitychange', onFocusOrVisible);
    };
  }, []);

  const todayKey = toLocalDateKey(now);
  const greeting = getGreetingForDate(now);
  const currentTimeLabel = formatTimeHHMM(now);
  const currentFullDateLabel = formatFullDatePtBr(now);
  const currentYear = now.getFullYear();

  const firstName = profile.fullName.trim().split(' ')[0] || 'Você';
  const initials = profile.fullName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase())
    .join('');

  const unreadCount = notifications.filter((n) => !n.read).length;

  const agendaDatesWithEvents = new Set(
    agenda.map((item) => item.date || todayKey)
  );
  const selectedDayAgenda = agenda.filter(
    (item) => (item.date || todayKey) === selectedDate
  );
  const sortedAgenda = [...selectedDayAgenda].sort((a, b) =>
    a.time.localeCompare(b.time)
  );
  const completedAgendaCount = selectedDayAgenda.filter((a) => a.completed).length;

  const totalTasksCount = tasks.length;
  const completedTasksCount = tasks.filter((t) => t.completed).length;
  const totalActions = totalTasksCount + selectedDayAgenda.length;
  const doneActions = completedTasksCount + completedAgendaCount;
  const focusPercent =
    totalTasksCount === 8 && doneActions === 5
      ? 87
      : Math.min(100, Math.max(25, Math.round(45 + (doneActions / Math.max(1, totalActions)) * 55)));

  const calendarCells = getMonthCalendarCells(calendarYear, calendarMonth);

  const handlePrevMonth = () => {
    if (calendarMonth === 0) {
      setCalendarYear((y) => y - 1);
      setCalendarMonth(11);
    } else {
      setCalendarMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (calendarMonth === 11) {
      setCalendarYear((y) => y + 1);
      setCalendarMonth(0);
    } else {
      setCalendarMonth((m) => m + 1);
    }
  };

  const handleGoToday = () => {
    const fresh = new Date();
    setNow(fresh);
    setSelectedDate(toLocalDateKey(fresh));
    setCalendarYear(fresh.getFullYear());
    setCalendarMonth(fresh.getMonth());
  };

  const handleCopyDevotional = async () => {
    try {
      await navigator.clipboard.writeText(
        `${currentDevotional.quote} – ${currentDevotional.reference}`
      );
      onShowToast('Devocional copiado para a área de transferência.');
    } catch {
      onShowToast('Devocional selecionado para leitura.');
    }
  };

  return (
    <div className="flex flex-col">
      {/* Top Greeting Header */}
      <header className="px-4 lg:px-8 pt-6 pb-3 flex items-start justify-between gap-3 relative">
        <div className="flex flex-col gap-1 flex-1 min-w-0">
          <h1 className="font-headline text-headline-lg lg:text-[28px] lg:leading-[34px] text-light-on-surface dark:text-dark-on-surface text-balance">
            {greeting},{' '}
            <span className="text-light-primary dark:text-dark-primary">{firstName}!</span>
          </h1>
          <p className="font-body text-label-sm text-light-primary dark:text-dark-primary tabular-nums">
            {currentFullDateLabel} · {currentTimeLabel}
          </p>
          <p className="font-body text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant text-pretty">
            “Tudo posso naquele que me fortalece.”
            <br />
            <span className="text-light-on-surface-variant dark:text-dark-on-surface-variant">
              – Filipenses 4:13
            </span>
          </p>
        </div>

        <div className="flex items-start gap-2 shrink-0">
          <button
            type="button"
            onClick={onOpenProfile}
            aria-label={`Abrir perfil de ${firstName}`}
            title="Perfil e Dados Pessoais"
            className="w-16 h-16 rounded-full border-2 border-accent-gold overflow-hidden bg-light-surface-container dark:bg-dark-surface-container shrink-0 transition-transform duration-150 hover:scale-[1.03] active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-light-primary dark:focus-visible:outline-dark-primary"
          >
            <ResilientImage
              src={profile.avatarUrl}
              alt={profile.fullName}
              fallbackType="avatar"
              initials={initials}
              className="w-full h-full object-cover"
            />
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={() => setShowNotifications((prev) => !prev)}
              aria-label="Notificações"
              aria-expanded={showNotifications}
              className="relative inline-flex items-center justify-center min-w-[44px] min-h-[44px] rounded-full text-light-on-surface dark:text-dark-on-surface hover:bg-light-surface-container-high dark:hover:bg-dark-surface-container-high transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-light-primary dark:focus-visible:outline-dark-primary"
            >
              <span className="material-symbols-outlined text-[20px]">notifications</span>
              {unreadCount > 0 && (
                <span className="absolute top-2 right-2 min-w-[16px] h-4 px-1 rounded-full bg-light-primary dark:bg-dark-primary text-light-on-primary dark:text-dark-on-primary font-mono text-[10px] leading-4 font-semibold text-center tabular-nums">
                  {unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div
                role="region"
                aria-label="Central de notificações"
                className="absolute right-0 mt-2 w-80 sm:w-96 rounded-lg bg-light-surface-container-lowest dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant shadow-xl p-4 z-30 flex flex-col gap-3 max-h-[75vh] overflow-y-auto"
              >
                <div className="flex items-center justify-between gap-2">
                  <h2 className="font-headline text-title-md text-light-on-surface dark:text-dark-on-surface">
                    Notificações Úteis
                  </h2>
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={onMarkAllRead}
                      className="font-body text-body-sm text-light-primary dark:text-dark-primary hover:underline whitespace-nowrap"
                    >
                      Marcar lidas
                    </button>
                  )}
                </div>

                {onTriggerBrowserReminder && (
                  <button
                    type="button"
                    onClick={onTriggerBrowserReminder}
                    className="w-full min-h-[36px] inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md bg-light-surface-container dark:bg-dark-surface-container border border-light-outline-variant dark:border-dark-outline-variant font-body text-body-sm text-light-primary dark:text-dark-primary hover:border-light-primary dark:hover:border-dark-primary transition-colors"
                  >
                    <span className="material-symbols-outlined text-[16px]">
                      notifications_active
                    </span>
                    <span>Ativar e testar lembrete no navegador</span>
                  </button>
                )}

                {notifications.length === 0 ? (
                  <p className="font-body text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant py-3 text-center">
                    Tudo em dia por aqui!
                  </p>
                ) : (
                  <ul className="flex flex-col divide-y divide-light-outline-variant dark:divide-dark-outline-variant">
                    {notifications.map((notif) => (
                      <li key={notif.id} className="py-2.5 first:pt-0 last:pb-0 flex flex-col gap-1.5">
                        <div className="flex items-start justify-between gap-2">
                          <p
                            className={`font-body text-body-sm ${
                              notif.read
                                ? 'text-light-on-surface-variant dark:text-dark-on-surface-variant'
                                : 'text-light-on-surface dark:text-dark-on-surface font-medium'
                            }`}
                          >
                            {notif.title}
                          </p>
                          {onDismissNotification && (
                            <button
                              type="button"
                              onClick={() => onDismissNotification(notif.id)}
                              aria-label="Dispensar notificação"
                              className="text-light-on-surface-variant dark:text-dark-on-surface-variant hover:text-light-error dark:hover:text-dark-error shrink-0"
                            >
                              <span className="material-symbols-outlined text-[16px]">close</span>
                            </button>
                          )}
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant tabular-nums">
                            {notif.time}
                          </span>
                          {notif.targetTab && (
                            <button
                              type="button"
                              onClick={() => {
                                setShowNotifications(false);
                                if (onOpenNotification) {
                                  onOpenNotification(notif);
                                } else {
                                  onNavigate(notif.targetTab!);
                                }
                              }}
                              className="font-body text-label-sm text-light-primary dark:text-dark-primary hover:underline"
                            >
                              {notif.actionLabel || 'Abrir'}
                            </button>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      <PWAInstallBanner />

      {/* Quick Global Search Bar -> Opens Busca e Filtro */}
      <div className="px-4 lg:px-8 pb-2">
        <button
          type="button"
          onClick={() => onNavigate('explorar')}
          className="w-full min-h-[42px] rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant hover:border-light-primary/70 dark:hover:border-dark-primary/70 px-3.5 py-2 flex items-center justify-between gap-2 text-left transition-colors"
        >
          <span className="flex items-center gap-2.5 min-w-0">
            <span className="material-symbols-outlined text-[19px] text-light-on-surface-variant dark:text-dark-on-surface-variant">
              search
            </span>
            <span className="font-body text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant truncate">
              Buscar músicas, podcasts, rádios, devocionais...
            </span>
          </span>
          <span className="font-body text-label-sm text-light-primary dark:text-dark-primary whitespace-nowrap">
            Filtrar
          </span>
        </button>
      </div>

      {/* 6-Item Content & Media Menu Strip (Podcast, Música, Fotos, Mensagem, Devocional, Rádio) */}
      <MediaMenuStrip
        activeTab="inicio"
        onNavigate={onNavigate}
        variant="strip"
        unreadMessagesCount={unreadMessagesCount}
      />

      {/* Main Dashboard Content */}
      <main className="px-4 lg:px-8 pb-28 lg:pb-12 grid grid-cols-1 lg:grid-cols-12 gap-3 lg:gap-5 items-start">
        {/* Left Column on Desktop: Minha Agenda + Música em destaque */}
        <div className="lg:col-span-7 flex flex-col gap-3 lg:gap-5">
          {/* Card 1: Minha Agenda */}
          <article className="rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant p-4 flex flex-col gap-3">
            <header className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="material-symbols-outlined text-[20px] text-cat-blue shrink-0"
                  aria-hidden="true"
                >
                  calendar_month
                </span>
                <div className="flex flex-col min-w-0">
                  <h2 className="font-headline text-title-md text-light-on-surface dark:text-dark-on-surface truncate">
                    Minha Agenda
                  </h2>
                  <span className="font-mono text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant tabular-nums">
                    Agora: {currentTimeLabel}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowCalendar((prev) => !prev)}
                  aria-expanded={showCalendar}
                  className="min-h-[36px] px-2.5 py-1 rounded-md border border-light-outline-variant dark:border-dark-outline-variant text-light-on-surface-variant dark:text-dark-on-surface-variant hover:text-light-primary dark:hover:text-dark-primary font-body text-label-sm transition-colors"
                >
                  {showCalendar ? 'Ocultar mês' : 'Calendário'}
                </button>
                <button
                  type="button"
                  onClick={() => onOpenAgendaModal(selectedDate)}
                  aria-label="Adicionar compromisso"
                  className="inline-flex items-center justify-center min-w-[44px] min-h-[44px] -mr-2 rounded-full text-light-on-surface dark:text-dark-on-surface hover:bg-light-surface-container-high dark:hover:bg-dark-surface-container-high transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-light-primary dark:focus-visible:outline-dark-primary"
                >
                  <span className="material-symbols-outlined text-[20px]">add</span>
                </button>
              </div>
            </header>

            {showCalendar && (
              <div className="rounded-md bg-light-surface-container-lowest dark:bg-dark-surface-container border border-light-outline-variant dark:border-dark-outline-variant p-3 flex flex-col gap-2.5">
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={handlePrevMonth}
                    aria-label="Mês anterior"
                    className="inline-flex items-center justify-center w-8 h-8 rounded-full text-light-on-surface-variant dark:text-dark-on-surface-variant hover:bg-light-surface-container-high dark:hover:bg-dark-surface-container-high transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                  </button>

                  <div className="flex items-center gap-1.5 min-w-0">
                    <select
                      aria-label="Selecionar mês"
                      value={calendarMonth}
                      onChange={(e) => setCalendarMonth(Number(e.target.value))}
                      className="rounded bg-transparent font-headline text-label-lg text-light-on-surface dark:text-dark-on-surface px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-light-primary dark:focus:ring-dark-primary"
                    >
                      {MONTH_NAMES_PT.map((monthName, idx) => (
                        <option
                          key={monthName}
                          value={idx}
                          className="bg-light-surface-container-low dark:bg-dark-surface-container-low text-light-on-surface dark:text-dark-on-surface"
                        >
                          {monthName}
                        </option>
                      ))}
                    </select>
                    <select
                      aria-label="Selecionar ano"
                      value={calendarYear}
                      onChange={(e) => setCalendarYear(Number(e.target.value))}
                      className="rounded bg-transparent font-mono text-label-lg text-light-primary dark:text-dark-primary tabular-nums px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-light-primary dark:focus:ring-dark-primary"
                    >
                      {Array.from({ length: 11 }, (_, i) => currentYear - 3 + i).map((yr) => (
                        <option
                          key={yr}
                          value={yr}
                          className="bg-light-surface-container-low dark:bg-dark-surface-container-low text-light-on-surface dark:text-dark-on-surface"
                        >
                          {yr}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-1">
                    {(selectedDate !== todayKey ||
                      calendarMonth !== now.getMonth() ||
                      calendarYear !== currentYear) && (
                      <button
                        type="button"
                        onClick={handleGoToday}
                        className="px-2 py-1 rounded text-label-sm font-body text-light-primary dark:text-dark-primary hover:bg-light-primary/10 dark:hover:bg-dark-primary/10"
                      >
                        Hoje
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleNextMonth}
                      aria-label="Próximo mês"
                      className="inline-flex items-center justify-center w-8 h-8 rounded-full text-light-on-surface-variant dark:text-dark-on-surface-variant hover:bg-light-surface-container-high dark:hover:bg-dark-surface-container-high transition-colors"
                    >
                      <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-7 gap-1 text-center">
                  {WEEKDAY_SHORT_PT.map((wd, idx) => (
                    <span
                      key={`${wd}-${idx}`}
                      className="font-body text-[11px] font-semibold text-light-on-surface-variant dark:text-dark-on-surface-variant py-0.5"
                    >
                      {wd}
                    </span>
                  ))}
                  {calendarCells.map((cell) => {
                    const isToday = cell.dateKey === todayKey;
                    const isSelected = cell.dateKey === selectedDate;
                    const hasEvents = agendaDatesWithEvents.has(cell.dateKey);
                    return (
                      <button
                        key={cell.dateKey}
                        type="button"
                        onClick={() => {
                          setSelectedDate(cell.dateKey);
                          if (!cell.inMonth) {
                            const [y, m] = cell.dateKey.split('-').map(Number);
                            setCalendarYear(y);
                            setCalendarMonth(m - 1);
                          }
                        }}
                        aria-label={`${formatShortDatePtBr(cell.dateKey)}`}
                        aria-pressed={isSelected}
                        className={`relative h-8 rounded-md flex flex-col items-center justify-center font-mono text-xs tabular-nums transition-colors ${
                          isSelected
                            ? 'bg-light-primary dark:bg-dark-primary text-light-on-primary dark:text-dark-on-primary font-bold'
                            : isToday
                              ? 'border border-accent-gold text-accent-gold font-bold'
                              : cell.inMonth
                                ? 'text-light-on-surface dark:text-dark-on-surface hover:bg-light-surface-container-high dark:hover:bg-dark-surface-container-high'
                                : 'text-light-on-surface-variant/40 dark:text-dark-on-surface-variant/40'
                        }`}
                      >
                        <span>{cell.day}</span>
                        {hasEvents && (
                          <span
                            className={`absolute bottom-0.5 w-1 h-1 rounded-full ${
                              isSelected
                                ? 'bg-light-on-primary dark:bg-dark-on-primary'
                                : 'bg-accent-gold'
                            }`}
                            aria-hidden="true"
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <p className="font-body text-body-sm text-light-primary dark:text-dark-primary tabular-nums">
                  {selectedDate === todayKey ? 'Hoje · ' : ''}
                  {formatShortDatePtBr(selectedDate)}
                  {!showCalendar ? ` (${formatMonthYearPtBr(calendarYear, calendarMonth)})` : ''}
                </p>
                {completedAgendaCount > 0 && (
                  <span className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant tabular-nums">
                    {completedAgendaCount}/{sortedAgenda.length} concluídos
                  </span>
                )}
              </div>

              {sortedAgenda.length === 0 ? (
                <p className="font-body text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant py-2">
                  Nenhum compromisso para {selectedDate === todayKey ? 'hoje' : formatShortDatePtBr(selectedDate)}. Toque em + para adicionar.
                </p>
              ) : (
                <ul className="flex flex-col gap-1">
                  {sortedAgenda.map((item) => (
                    <li
                      key={item.id}
                      className="group flex items-center justify-between gap-2 rounded-md -mx-2 px-2 hover:bg-light-surface-container dark:hover:bg-dark-surface-container/60 transition-colors"
                    >
                      <button
                        type="button"
                        onClick={() => onToggleAgendaItem(item.id)}
                        className="flex-1 min-h-[40px] flex items-center gap-3 text-left py-1.5 focus-visible:outline-2 focus-visible:outline-light-primary dark:focus-visible:outline-dark-primary rounded"
                      >
                        <span
                          className={`w-2 h-2 rounded-full ${CATEGORY_DOT[item.category]} shrink-0`}
                          aria-hidden="true"
                        />
                        <span
                          className={`font-mono text-mono-md tabular-nums ${
                            item.completed
                              ? 'line-through opacity-50 text-light-on-surface-variant dark:text-dark-on-surface-variant'
                              : 'text-light-on-surface-variant dark:text-dark-on-surface-variant'
                          }`}
                        >
                          {item.time}
                        </span>
                        <span
                          className={`font-body text-body-md ${
                            item.completed
                              ? 'line-through opacity-55 text-light-on-surface-variant dark:text-dark-on-surface-variant'
                              : 'text-light-on-surface dark:text-dark-on-surface'
                          }`}
                        >
                          {item.title}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onDeleteAgendaItem(item.id)}
                        aria-label={`Remover ${item.title}`}
                        className="opacity-55 sm:opacity-0 sm:group-hover:opacity-100 focus-visible:opacity-100 inline-flex items-center justify-center min-w-[36px] min-h-[36px] rounded-full text-light-on-surface-variant dark:text-dark-on-surface-variant hover:text-light-error dark:hover:text-dark-error transition-opacity"
                      >
                        <span className="material-symbols-outlined text-[18px]">close</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </article>

          {/* Card 4: Música em destaque */}
          <article className="order-4 lg:order-2 rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant p-3 flex flex-col gap-2.5">
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => onNavigate('musica')}
                className="flex items-center gap-3 min-w-0 flex-1 text-left rounded-md focus-visible:outline-2 focus-visible:outline-light-primary dark:focus-visible:outline-dark-primary"
              >
                <ResilientImage
                  src={currentTrack.coverUrl}
                  alt={`Capa do álbum ${currentTrack.artist}`}
                  fallbackType="album"
                  className="w-14 h-14 rounded-md object-cover shrink-0 border border-light-outline-variant dark:border-dark-outline-variant"
                />
                <div className="flex flex-col min-w-0">
                  <span className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
                    Música em destaque
                  </span>
                  <h3 className="font-body text-label-lg text-light-on-surface dark:text-dark-on-surface truncate">
                    {currentTrack.title}
                  </h3>
                  <span className="font-body text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant truncate">
                    {currentTrack.artist}
                  </span>
                </div>
              </button>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={onNextTrack}
                  aria-label="Próxima música"
                  className="inline-flex items-center justify-center min-w-[40px] min-h-[40px] rounded-full text-light-on-surface-variant dark:text-dark-on-surface-variant hover:bg-light-surface-container-high dark:hover:bg-dark-surface-container-high transition-colors"
                >
                  <span className="material-symbols-outlined text-[20px]">skip_next</span>
                </button>
                <button
                  type="button"
                  onClick={onTogglePlay}
                  aria-label={isPlaying ? 'Pausar música' : 'Reproduzir música'}
                  aria-pressed={isPlaying}
                  className="inline-flex items-center justify-center w-11 h-11 rounded-full bg-light-primary-container dark:bg-dark-primary-container text-light-on-primary-container dark:text-dark-on-primary shrink-0 transition-transform duration-150 hover:scale-105 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-light-primary dark:focus-visible:outline-dark-primary"
                >
                  <span className="material-symbols-outlined material-symbols-filled text-[22px]">
                    {isPlaying ? 'pause' : 'play_arrow'}
                  </span>
                </button>
              </div>
            </div>

            {isPlaying && (
              <div className="flex items-center gap-2 pt-0.5">
                <span className="font-mono text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant tabular-nums">
                  {formatDuration(Math.floor(playbackProgress * currentTrack.durationSeconds))}
                </span>
                <div className="flex-1 h-1.5 rounded-full bg-light-surface-container-high dark:bg-dark-surface-container-highest overflow-hidden">
                  <div
                    className="h-full bg-light-primary dark:bg-dark-primary transition-all duration-300"
                    style={{ width: `${Math.min(100, Math.round(playbackProgress * 100))}%` }}
                  />
                </div>
                <span className="font-mono text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant tabular-nums">
                  {formatDuration(currentTrack.durationSeconds)}
                </span>
              </div>
            )}
          </article>
        </div>

        {/* Right Column on Desktop: Devocional do Dia + Resumo do Dia */}
        <div className="lg:col-span-5 flex flex-col gap-3 lg:gap-5">
          {/* Card 2: Devocional do Dia */}
          <article className="rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant p-4 flex flex-col gap-2.5">
            <header className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => onNavigate('devocional')}
                className="flex items-center gap-2 text-left hover:text-light-primary dark:hover:text-dark-primary transition-colors"
              >
                <span
                  className="material-symbols-outlined text-[20px] text-light-on-surface-variant dark:text-dark-on-surface-variant"
                  aria-hidden="true"
                >
                  menu_book
                </span>
                <h2 className="font-headline text-title-md text-light-on-surface dark:text-dark-on-surface">
                  Devocional do Dia
                </h2>
              </button>

              <div className="flex items-center gap-0.5 -mr-1.5">
                <button
                  type="button"
                  onClick={() => onToggleFavoriteDevotional(currentDevotional.id)}
                  aria-label={isDevotionalFavorited ? 'Remover dos favoritos' : 'Salvar nos favoritos'}
                  aria-pressed={isDevotionalFavorited}
                  className={`inline-flex items-center justify-center min-w-[38px] min-h-[38px] rounded-full transition-colors ${
                    isDevotionalFavorited
                      ? 'text-accent-gold'
                      : 'text-light-on-surface-variant dark:text-dark-on-surface-variant hover:bg-light-surface-container-high dark:hover:bg-dark-surface-container-high'
                  }`}
                >
                  <span
                    className={`material-symbols-outlined text-[19px] ${
                      isDevotionalFavorited ? 'material-symbols-filled' : ''
                    }`}
                  >
                    favorite
                  </span>
                </button>
                <button
                  type="button"
                  onClick={handleCopyDevotional}
                  aria-label="Copiar versículo"
                  className="inline-flex items-center justify-center min-w-[38px] min-h-[38px] rounded-full text-light-on-surface-variant dark:text-dark-on-surface-variant hover:bg-light-surface-container-high dark:hover:bg-dark-surface-container-high transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]">content_copy</span>
                </button>
                <button
                  type="button"
                  onClick={onNextDevotional}
                  aria-label="Próximo devocional"
                  className="inline-flex items-center justify-center min-w-[38px] min-h-[38px] rounded-full text-light-on-surface-variant dark:text-dark-on-surface-variant hover:bg-light-surface-container-high dark:hover:bg-dark-surface-container-high transition-colors"
                >
                  <span className="material-symbols-outlined text-[20px]">chevron_right</span>
                </button>
              </div>
            </header>

            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => onNavigate('devocional')}
                className="text-left rounded-md bg-light-surface-container dark:bg-dark-surface-container border border-accent-gold/45 p-3 flex flex-col gap-1 hover:border-accent-gold transition-colors"
              >
                <span className="font-body text-label-sm text-accent-gold">
                  Palavra do Dia · {todayWord.word}
                </span>
                <p className="font-body text-body-sm text-light-on-surface dark:text-dark-on-surface line-clamp-2">
                  {todayWord.verse} ({todayWord.reference})
                </p>
              </button>

              <p className="font-body text-body-md text-light-on-surface dark:text-dark-on-surface text-pretty">
                {currentDevotional.quote}
              </p>
              <div className="flex items-center justify-between gap-2">
                <p className="font-body text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
                  – {currentDevotional.reference}
                </p>
                <button
                  type="button"
                  onClick={() => onNavigate('devocional')}
                  className="font-body text-body-sm text-light-primary dark:text-dark-primary hover:underline whitespace-nowrap"
                >
                  Ler reflexão
                </button>
              </div>
              {onOpenMyDevotional && (
                <div className="pt-2 border-t border-light-outline-variant dark:border-dark-outline-variant flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onOpenMyDevotional('written')}
                    className="flex-1 min-h-[38px] inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md bg-light-surface-container dark:bg-dark-surface-container border border-light-outline-variant dark:border-dark-outline-variant text-light-on-surface dark:text-dark-on-surface font-body text-body-sm hover:border-light-primary dark:hover:border-dark-primary transition-colors"
                  >
                    <span className="material-symbols-outlined text-[17px] text-light-primary dark:text-dark-primary">
                      edit_note
                    </span>
                    <span>Escrever devocional</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onOpenMyDevotional('audio')}
                    className="flex-1 min-h-[38px] inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md bg-light-surface-container dark:bg-dark-surface-container border border-light-outline-variant dark:border-dark-outline-variant text-light-on-surface dark:text-dark-on-surface font-body text-body-sm hover:border-light-primary dark:hover:border-dark-primary transition-colors"
                  >
                    <span className="material-symbols-outlined text-[17px] text-light-primary dark:text-dark-primary">
                      mic
                    </span>
                    <span>Gravar áudio</span>
                  </button>
                </div>
              )}
            </div>
          </article>

          {/* Card 3: Resumo do Dia */}
          <article className="rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant p-4 flex flex-col gap-3">
            <header className="flex items-center justify-between">
              <h2 className="font-headline text-title-md text-light-on-surface dark:text-dark-on-surface">
                Resumo do Dia
              </h2>
              <button
                type="button"
                onClick={onOpenTasksView}
                className="font-body text-body-sm text-light-primary dark:text-dark-primary hover:underline whitespace-nowrap"
              >
                Ver tarefas
              </button>
            </header>

            <div className="grid grid-cols-4 gap-2 items-stretch">
              <button
                type="button"
                onClick={onOpenTasksView}
                className="rounded-md bg-light-surface-container dark:bg-dark-surface-container border border-light-outline-variant dark:border-dark-outline-variant px-1 py-2.5 flex flex-col items-center justify-center gap-1 text-center h-full hover:border-light-primary/60 dark:hover:border-dark-primary/60 transition-colors"
              >
                <span
                  className="material-symbols-outlined text-[20px] text-light-on-surface-variant dark:text-dark-on-surface-variant"
                  aria-hidden="true"
                >
                  fact_check
                </span>
                <span className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
                  Tarefas
                </span>
                <span className="font-headline text-title-md text-light-on-surface dark:text-dark-on-surface tabular-nums">
                  {totalTasksCount}
                </span>
              </button>

              <button
                type="button"
                onClick={onOpenTasksView}
                className="rounded-md bg-light-surface-container dark:bg-dark-surface-container border border-light-outline-variant dark:border-dark-outline-variant px-1 py-2.5 flex flex-col items-center justify-center gap-1 text-center h-full hover:border-light-primary/60 dark:hover:border-dark-primary/60 transition-colors"
              >
                <span
                  className="material-symbols-outlined text-[20px] text-light-on-surface-variant dark:text-dark-on-surface-variant"
                  aria-hidden="true"
                >
                  check_circle
                </span>
                <span className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
                  Concluídas
                </span>
                <span className="font-headline text-title-md text-light-on-surface dark:text-dark-on-surface tabular-nums">
                  {completedTasksCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => onAddReadingMinutes(15)}
                title="Toque para registrar +15 min de leitura"
                className="rounded-md bg-light-surface-container dark:bg-dark-surface-container border border-light-outline-variant dark:border-dark-outline-variant px-1 py-2.5 flex flex-col items-center justify-center gap-1 text-center h-full hover:border-light-primary/60 dark:hover:border-dark-primary/60 transition-colors"
              >
                <span
                  className="material-symbols-outlined text-[20px] text-light-on-surface-variant dark:text-dark-on-surface-variant"
                  aria-hidden="true"
                >
                  auto_stories
                </span>
                <span className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
                  Leitura
                </span>
                <span className="font-headline text-title-md text-light-on-surface dark:text-dark-on-surface tabular-nums whitespace-nowrap">
                  {formatReadingTime(readingMinutes)}
                </span>
              </button>

              <div className="rounded-md bg-light-surface-container dark:bg-dark-surface-container border border-light-outline-variant dark:border-dark-outline-variant px-1 py-2.5 flex flex-col items-center justify-center gap-1 text-center h-full">
                <span
                  className="material-symbols-outlined text-[20px] text-light-on-surface-variant dark:text-dark-on-surface-variant"
                  aria-hidden="true"
                >
                  track_changes
                </span>
                <span className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
                  Foco
                </span>
                <span className="font-headline text-title-md text-light-on-surface dark:text-dark-on-surface tabular-nums">
                  {focusPercent}%
                </span>
              </div>
            </div>
          </article>
        </div>

        {/* Useful Interactive Widgets Row */}
        <div className="lg:col-span-12">
          <UsefulWidgets
            widgets={widgets}
            onUpdateWidgets={onUpdateWidgets}
            onAddFocusMinutes={onAddReadingMinutes}
            isOffline={isOffline}
            isManualOffline={isManualOffline}
            onToggleManualOffline={onToggleManualOffline}
            favoritesCount={favoritesCount}
            historyCount={historyCount}
            personalDevotionalsCount={personalDevotionalsCount}
            isRadioPlaying={isRadioPlaying}
            activeRadioName={activeRadioName}
            onQuickPlayRadio={onQuickPlayRadio}
            onNavigate={onNavigate}
            onShowToast={onShowToast}
          />
        </div>
      </main>
    </div>
  );
};
