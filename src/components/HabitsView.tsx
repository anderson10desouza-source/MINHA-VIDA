import React, { useState } from 'react';
import { HabitItem, HabitPeriod } from '../types';
import { toLocalDateKey } from '../utils/dateTime';

interface HabitsViewProps {
  habits: HabitItem[];
  onAddHabit: (habit: Omit<HabitItem, 'id' | 'completedDates' | 'createdAt'>) => void;
  onToggleHabitDate: (habitId: string, dateKey: string) => void;
  onDeleteHabit: (habitId: string) => void;
  onBack: () => void;
  onShowToast: (msg: string) => void;
}

const PERIODS: HabitPeriod[] = ['Manhã', 'Tarde', 'Noite', 'Livre'];

function getHabitStreak(completedDates: string[], todayKey: string): number {
  const set = new Set(completedDates);
  let streak = 0;
  const cursor = new Date(`${todayKey}T12:00:00`);
  if (!set.has(todayKey)) {
    cursor.setDate(cursor.getDate() - 1);
  }
  while (set.has(toLocalDateKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function getLast7Days(todayKey: string): { key: string; shortLabel: string; dayNum: string }[] {
  const base = new Date(`${todayKey}T12:00:00`);
  const list: { key: string; shortLabel: string; dayNum: string }[] = [];
  const wdNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  for (let i = 6; i >= 0; i -= 1) {
    const d = new Date(base);
    d.setDate(base.getDate() - i);
    list.push({
      key: toLocalDateKey(d),
      shortLabel: wdNames[d.getDay()],
      dayNum: String(d.getDate()).padStart(2, '0'),
    });
  }
  return list;
}

export const HabitsView: React.FC<HabitsViewProps> = ({
  habits,
  onAddHabit,
  onToggleHabitDate,
  onDeleteHabit,
  onBack,
  onShowToast,
}) => {
  const todayKey = toLocalDateKey();
  const last7Days = getLast7Days(todayKey);

  const [periodFilter, setPeriodFilter] = useState<HabitPeriod | 'Todos'>('Todos');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Bem-estar');
  const [period, setPeriod] = useState<HabitPeriod>('Manhã');
  const [targetPerWeek, setTargetPerWeek] = useState(5);
  const [reminderTime, setReminderTime] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTitle = title.trim();
    if (!cleanTitle) {
      onShowToast('Informe o nome do hábito ou rotina.');
      return;
    }
    onAddHabit({
      title: cleanTitle,
      category: category.trim() || 'Rotina',
      period,
      targetPerWeek: Math.min(7, Math.max(1, targetPerWeek)),
      reminderTime: reminderTime.trim() || undefined,
    });
    setTitle('');
    setReminderTime('');
    onShowToast(`Hábito "${cleanTitle}" criado!`);
  };

  const doneTodayCount = habits.filter((h) => h.completedDates.includes(todayKey)).length;
  const todayProgress =
    habits.length > 0 ? Math.round((doneTodayCount / habits.length) * 100) : 0;

  const filteredHabits = habits.filter(
    (h) => periodFilter === 'Todos' || h.period === periodFilter
  );

  return (
    <div className="flex flex-col">
      <header className="px-4 lg:px-8 pt-6 pb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={onBack}
            aria-label="Voltar"
            className="inline-flex items-center justify-center min-w-[44px] min-h-[44px] -ml-2 rounded-full text-light-on-surface dark:text-dark-on-surface hover:bg-light-surface-container-high dark:hover:bg-dark-surface-container-high transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
          </button>
          <div className="min-w-0">
            <h1 className="font-headline text-headline-md lg:text-headline-lg text-light-on-surface dark:text-dark-on-surface">
              Hábitos e Rotinas
            </h1>
            <p className="font-body text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
              Organize sua rotina de manhã, tarde e noite e construa constância
            </p>
          </div>
        </div>

        <div className="rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant px-3 py-1.5 text-right shrink-0">
          <span className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant block">
            Hoje
          </span>
          <span className="font-mono text-title-md text-light-primary dark:text-dark-primary tabular-nums">
            {doneTodayCount}/{habits.length} ({todayProgress}%)
          </span>
        </div>
      </header>

      <main className="px-4 lg:px-8 pb-28 lg:pb-12 grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Create Habit Form */}
        <section className="lg:col-span-4 rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant p-4 flex flex-col gap-3">
          <h2 className="font-headline text-title-md text-light-on-surface dark:text-dark-on-surface">
            Novo Hábito / Rotina
          </h2>
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <label
                htmlFor="habit-title"
                className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant"
              >
                O que deseja praticar?
              </label>
              <input
                id="habit-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Ler 10 páginas, Caminhar 30 min"
                required
                className="rounded bg-light-surface-container-lowest dark:bg-dark-surface-container border border-light-outline-variant dark:border-dark-outline-variant px-3 py-2 font-body text-body-md text-light-on-surface dark:text-dark-on-surface"
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="flex flex-col gap-1">
                <label
                  htmlFor="habit-period"
                  className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant"
                >
                  Período
                </label>
                <select
                  id="habit-period"
                  value={period}
                  onChange={(e) => setPeriod(e.target.value as HabitPeriod)}
                  className="rounded bg-light-surface-container-lowest dark:bg-dark-surface-container border border-light-outline-variant dark:border-dark-outline-variant px-2.5 py-2 font-body text-body-sm text-light-on-surface dark:text-dark-on-surface"
                >
                  {PERIODS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label
                  htmlFor="habit-time"
                  className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant"
                >
                  Horário (opcional)
                </label>
                <input
                  id="habit-time"
                  type="time"
                  value={reminderTime}
                  onChange={(e) => setReminderTime(e.target.value)}
                  className="rounded bg-light-surface-container-lowest dark:bg-dark-surface-container border border-light-outline-variant dark:border-dark-outline-variant px-2.5 py-2 font-mono text-body-sm text-light-on-surface dark:text-dark-on-surface"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="flex flex-col gap-1">
                <label
                  htmlFor="habit-category"
                  className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant"
                >
                  Área
                </label>
                <input
                  id="habit-category"
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="Saúde, Fé, Foco..."
                  className="rounded bg-light-surface-container-lowest dark:bg-dark-surface-container border border-light-outline-variant dark:border-dark-outline-variant px-2.5 py-2 font-body text-body-sm text-light-on-surface dark:text-dark-on-surface"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label
                  htmlFor="habit-target"
                  className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant"
                >
                  Meta semanal (dias)
                </label>
                <input
                  id="habit-target"
                  type="number"
                  min={1}
                  max={7}
                  value={targetPerWeek}
                  onChange={(e) => setTargetPerWeek(Number(e.target.value))}
                  className="rounded bg-light-surface-container-lowest dark:bg-dark-surface-container border border-light-outline-variant dark:border-dark-outline-variant px-2.5 py-2 font-mono text-body-sm text-light-on-surface dark:text-dark-on-surface"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full min-h-[44px] rounded-full bg-light-primary dark:bg-dark-primary text-light-on-primary dark:text-dark-on-primary font-body text-label-lg hover:opacity-90 transition-opacity"
            >
              Adicionar Hábito
            </button>
          </form>
        </section>

        {/* Habits Tracker List */}
        <section className="lg:col-span-8 flex flex-col gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {(['Todos', ...PERIODS] as const).map((p) => {
              const active = periodFilter === p;
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPeriodFilter(p)}
                  className={`min-h-[38px] px-3.5 py-1.5 rounded-md font-body text-body-sm whitespace-nowrap border transition-colors ${
                    active
                      ? 'bg-light-primary dark:bg-dark-primary text-light-on-primary dark:text-dark-on-primary border-transparent font-semibold'
                      : 'bg-light-surface-container-low dark:bg-dark-surface-container-low border-light-outline-variant dark:border-dark-outline-variant text-light-on-surface-variant dark:text-dark-on-surface-variant'
                  }`}
                >
                  {p}
                </button>
              );
            })}
          </div>

          {filteredHabits.length === 0 ? (
            <div className="rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant p-8 text-center">
              <p className="font-body text-body-md text-light-on-surface-variant dark:text-dark-on-surface-variant">
                Nenhum hábito cadastrado neste período ainda. Crie sua primeira rotina ao lado!
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {filteredHabits.map((habit) => {
                const doneToday = habit.completedDates.includes(todayKey);
                const streak = getHabitStreak(habit.completedDates, todayKey);
                const weeklyDone = last7Days.filter((d) =>
                  habit.completedDates.includes(d.key)
                ).length;

                return (
                  <article
                    key={habit.id}
                    className="rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant p-4 flex flex-col gap-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => onToggleHabitDate(habit.id, todayKey)}
                        className="flex items-start gap-3 text-left flex-1 min-w-0"
                      >
                        <span
                          className={`material-symbols-outlined text-[24px] mt-0.5 shrink-0 ${
                            doneToday
                              ? 'material-symbols-filled text-cat-emerald'
                              : 'text-light-on-surface-variant dark:text-dark-on-surface-variant'
                          }`}
                        >
                          {doneToday ? 'check_circle' : 'radio_button_unchecked'}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-body text-label-sm text-light-primary dark:text-dark-primary">
                              {habit.period}
                              {habit.reminderTime ? ` · ${habit.reminderTime}` : ''}
                            </span>
                            <span className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
                              {habit.category}
                            </span>
                          </div>
                          <h3
                            className={`font-headline text-title-md ${
                              doneToday
                                ? 'line-through opacity-65 text-light-on-surface-variant dark:text-dark-on-surface-variant'
                                : 'text-light-on-surface dark:text-dark-on-surface'
                            }`}
                          >
                            {habit.title}
                          </h3>
                        </div>
                      </button>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-mono text-label-sm px-2 py-1 rounded bg-light-surface-container dark:bg-dark-surface-container text-accent-gold tabular-nums">
                          {streak}d seguidos · {weeklyDone}/{habit.targetPerWeek}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            onDeleteHabit(habit.id);
                            onShowToast('Hábito removido.');
                          }}
                          aria-label={`Excluir ${habit.title}`}
                          className="inline-flex items-center justify-center w-8 h-8 rounded-full text-light-on-surface-variant dark:text-dark-on-surface-variant hover:text-light-error dark:hover:text-dark-error"
                        >
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                      </div>
                    </div>

                    {/* 7-day quick check-in row */}
                    <div className="grid grid-cols-7 gap-1.5 pt-2 border-t border-light-outline-variant dark:border-dark-outline-variant">
                      {last7Days.map((day) => {
                        const checked = habit.completedDates.includes(day.key);
                        const isToday = day.key === todayKey;
                        return (
                          <button
                            key={day.key}
                            type="button"
                            onClick={() => onToggleHabitDate(habit.id, day.key)}
                            aria-pressed={checked}
                            className={`rounded-md py-1.5 flex flex-col items-center justify-center gap-0.5 border text-center transition-colors ${
                              checked
                                ? 'bg-cat-emerald/20 border-cat-emerald text-cat-emerald font-semibold'
                                : isToday
                                  ? 'bg-light-surface-container dark:bg-dark-surface-container border-light-primary/50 dark:border-dark-primary/50 text-light-on-surface dark:text-dark-on-surface'
                                  : 'bg-light-surface-container-lowest dark:bg-dark-surface-container border-light-outline-variant dark:border-dark-outline-variant text-light-on-surface-variant dark:text-dark-on-surface-variant'
                            }`}
                          >
                            <span className="font-body text-[10px]">{day.shortLabel}</span>
                            <span className="font-mono text-xs tabular-nums">{day.dayNum}</span>
                          </button>
                        );
                      })}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
};
