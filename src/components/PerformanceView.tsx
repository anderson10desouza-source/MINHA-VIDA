import React from 'react';
import {
  AgendaItem,
  AppTab,
  BookItem,
  FinanceTransaction,
  GoalItem,
  HabitItem,
  JournalEntry,
  StudySubject,
  TaskItem,
} from '../types';
import { toLocalDateKey } from '../utils/dateTime';

interface PerformanceViewProps {
  agenda: AgendaItem[];
  tasks: TaskItem[];
  habits: HabitItem[];
  journalEntries: JournalEntry[];
  goals: GoalItem[];
  books: BookItem[];
  studySubjects: StudySubject[];
  financeTransactions: FinanceTransaction[];
  readingMinutes: number;
  onNavigate: (tab: AppTab) => void;
  onBack: () => void;
}

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

function getLast7DateKeys(baseDateKey: string): string[] {
  const keys: string[] = [];
  const d = new Date(`${baseDateKey}T12:00:00`);
  for (let i = 6; i >= 0; i -= 1) {
    const copy = new Date(d);
    copy.setDate(d.getDate() - i);
    keys.push(toLocalDateKey(copy));
  }
  return keys;
}

export const PerformanceView: React.FC<PerformanceViewProps> = ({
  agenda,
  tasks,
  habits,
  journalEntries,
  goals,
  books,
  studySubjects,
  financeTransactions,
  readingMinutes,
  onNavigate,
  onBack,
}) => {
  const todayKey = toLocalDateKey();
  const monthPrefix = todayKey.slice(0, 7);
  const last7Keys = getLast7DateKeys(todayKey);

  // Agenda stats
  const todayAgenda = agenda.filter((a) => (a.date || todayKey) === todayKey);
  const doneTodayAgenda = todayAgenda.filter((a) => a.completed).length;
  const totalAgendaDone = agenda.filter((a) => a.completed).length;
  const agendaRate =
    agenda.length > 0 ? Math.round((totalAgendaDone / agenda.length) * 100) : 0;

  // Tasks stats
  const doneTasks = tasks.filter((t) => t.completed).length;
  const tasksRate = tasks.length > 0 ? Math.round((doneTasks / tasks.length) * 100) : 0;

  // Habits stats
  const habitsDoneToday = habits.filter((h) => h.completedDates.includes(todayKey)).length;
  const habitsTodayRate =
    habits.length > 0 ? Math.round((habitsDoneToday / habits.length) * 100) : 0;

  const weeklyHabitTotalSlots = habits.length * 7;
  const weeklyHabitCompletions = habits.reduce(
    (sum, h) => sum + last7Keys.filter((k) => h.completedDates.includes(k)).length,
    0
  );
  const habitsWeeklyRate =
    weeklyHabitTotalSlots > 0
      ? Math.round((weeklyHabitCompletions / weeklyHabitTotalSlots) * 100)
      : 0;
  const topStreak = habits.reduce(
    (max, h) => Math.max(max, getHabitStreak(h.completedDates, todayKey)),
    0
  );

  // Goals stats
  const completedGoals = goals.filter((g) => g.status === 'concluida').length;
  const goalsAvgProgress =
    goals.length > 0
      ? Math.round(
          goals.reduce((sum, g) => {
            if (g.status === 'concluida') return sum + 100;
            if (g.measureMode === 'etapas' && g.milestones.length > 0) {
              const doneM = g.milestones.filter((m) => m.done).length;
              return sum + (doneM / g.milestones.length) * 100;
            }
            return sum + Math.min(100, (g.currentValue / Math.max(1, g.targetValue)) * 100);
          }, 0) / goals.length
        )
      : 0;

  // Journal stats
  const journalThisMonth = journalEntries.filter((e) => e.date.startsWith(monthPrefix));
  const moodCounts = journalEntries.reduce<Record<string, number>>((acc, entry) => {
    acc[entry.mood] = (acc[entry.mood] || 0) + 1;
    return acc;
  }, {});
  const topMood = Object.entries(moodCounts).sort((a, b) => b[1] - a[1])[0]?.[0];

  // Study & Books stats
  const studyMinutesTotal = studySubjects.reduce((sum, s) => sum + s.studiedMinutes, 0);
  const studyGoalTotal = studySubjects.reduce((sum, s) => sum + s.weeklyGoalMinutes, 0);
  const studyRate =
    studyGoalTotal > 0 ? Math.min(100, Math.round((studyMinutesTotal / studyGoalTotal) * 100)) : 0;
  const finishedBooks = books.filter((b) => b.status === 'Concluído').length;

  // Finance stats (this month)
  const monthTx = financeTransactions.filter((tx) => tx.date.startsWith(monthPrefix));
  const monthIncome = monthTx
    .filter((tx) => tx.type === 'receita')
    .reduce((sum, tx) => sum + tx.amount, 0);
  const monthExpense = monthTx
    .filter((tx) => tx.type === 'gasto')
    .reduce((sum, tx) => sum + tx.amount, 0);
  const monthBalance = monthIncome - monthExpense;

  // Composite overall index using active pillars
  const activeRates: number[] = [];
  if (agenda.length > 0) activeRates.push(agendaRate);
  if (tasks.length > 0) activeRates.push(tasksRate);
  if (habits.length > 0) activeRates.push(habitsWeeklyRate);
  if (goals.length > 0) activeRates.push(goalsAvgProgress);
  if (studySubjects.length > 0) activeRates.push(studyRate);

  const overallScore =
    activeRates.length > 0
      ? Math.round(activeRates.reduce((a, b) => a + b, 0) / activeRates.length)
      : 0;

  const dailyHabitBars = last7Keys.map((dateKey) => {
    const count = habits.filter((h) => h.completedDates.includes(dateKey)).length;
    const pct = habits.length > 0 ? Math.round((count / habits.length) * 100) : 0;
    const [, m, d] = dateKey.split('-');
    return {
      dateKey,
      label: `${d}/${m}`,
      count,
      pct,
    };
  });

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
            <h1 className="font-headline text-headline-md lg:text-headline-lg text-light-on-surface dark:text-dark-on-surface truncate">
              Meu Painel de Desempenho
            </h1>
            <p className="font-body text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
              Visão real da sua constância, metas, rotina, leitura e finanças
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onNavigate('assistente')}
          className="min-h-[40px] px-3.5 py-2 rounded-full bg-light-primary dark:bg-dark-primary text-light-on-primary dark:text-dark-on-primary font-body text-label-md inline-flex items-center gap-1.5 shrink-0"
        >
          <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
          <span className="hidden sm:inline">Analisar com IA</span>
        </button>
      </header>

      <main className="px-4 lg:px-8 pb-28 lg:pb-12 flex flex-col gap-4">
        {/* Overall Summary Hero Card */}
        <section className="rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-primary/40 dark:border-dark-primary/40 p-4 lg:p-5 grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          <div className="md:col-span-5 flex flex-col gap-1.5">
            <span className="font-body text-label-sm text-light-primary dark:text-dark-primary uppercase tracking-wide">
              Índice Geral de Desempenho
            </span>
            <div className="flex items-baseline gap-2">
              <span className="font-headline text-display-lg text-light-on-surface dark:text-dark-on-surface tabular-nums">
                {overallScore}%
              </span>
              <span className="font-body text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
                {activeRates.length > 0
                  ? `baseado em ${activeRates.length} área(s) ativa(s)`
                  : 'comece adicionando hábitos, tarefas ou metas'}
              </span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-light-surface-container-highest dark:bg-dark-surface-container-highest overflow-hidden mt-1">
              <div
                className="h-full bg-light-primary dark:bg-dark-primary transition-all duration-300"
                style={{ width: `${overallScore}%` }}
              />
            </div>
          </div>

          <div className="md:col-span-7 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="rounded-md bg-light-surface-container dark:bg-dark-surface-container border border-light-outline-variant dark:border-dark-outline-variant p-3 flex flex-col gap-0.5">
              <span className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
                Maior sequência
              </span>
              <span className="font-headline text-headline-md text-light-primary dark:text-dark-primary tabular-nums">
                {topStreak} dias
              </span>
            </div>
            <div className="rounded-md bg-light-surface-container dark:bg-dark-surface-container border border-light-outline-variant dark:border-dark-outline-variant p-3 flex flex-col gap-0.5">
              <span className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
                Hábitos hoje
              </span>
              <span className="font-headline text-headline-md text-cat-emerald tabular-nums">
                {habitsDoneToday}/{habits.length}
              </span>
            </div>
            <div className="rounded-md bg-light-surface-container dark:bg-dark-surface-container border border-light-outline-variant dark:border-dark-outline-variant p-3 flex flex-col gap-0.5">
              <span className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
                Diário no mês
              </span>
              <span className="font-headline text-headline-md text-accent-gold tabular-nums">
                {journalThisMonth.length}
              </span>
            </div>
            <div className="rounded-md bg-light-surface-container dark:bg-dark-surface-container border border-light-outline-variant dark:border-dark-outline-variant p-3 flex flex-col gap-0.5">
              <span className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
                Leitura
              </span>
              <span className="font-headline text-headline-md text-cat-blue tabular-nums">
                {Math.floor(readingMinutes / 60)}h {readingMinutes % 60}m
              </span>
            </div>
          </div>
        </section>

        {/* 7-Day Habits Chart + Key Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <section className="lg:col-span-6 rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-headline text-title-md text-light-on-surface dark:text-dark-on-surface">
                Constância nos últimos 7 dias
              </h2>
              <button
                type="button"
                onClick={() => onNavigate('habitos')}
                className="font-body text-body-sm text-light-primary dark:text-dark-primary hover:underline"
              >
                Abrir Hábitos
              </button>
            </div>

            {habits.length === 0 ? (
              <p className="font-body text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant py-6 text-center">
                Cadastre seus hábitos e rotinas para acompanhar a evolução semanal aqui.
              </p>
            ) : (
              <div className="grid grid-cols-7 gap-2 items-end h-36 pt-2">
                {dailyHabitBars.map((bar) => (
                  <div
                    key={bar.dateKey}
                    className="flex flex-col items-center justify-end gap-1.5 h-full"
                  >
                    <span className="font-mono text-[11px] text-light-on-surface-variant dark:text-dark-on-surface-variant tabular-nums">
                      {bar.pct}%
                    </span>
                    <div className="w-full max-w-[34px] flex-1 rounded-md bg-light-surface-container-highest dark:bg-dark-surface-container-highest flex items-end overflow-hidden">
                      <div
                        className="w-full rounded-t-md bg-light-primary dark:bg-dark-primary transition-all duration-300"
                        style={{ height: `${Math.max(bar.pct > 0 ? 12 : 0, bar.pct)}%` }}
                      />
                    </div>
                    <span className="font-mono text-[11px] text-light-on-surface-variant dark:text-dark-on-surface-variant tabular-nums">
                      {bar.label}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="lg:col-span-6 rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant p-4 flex flex-col gap-3">
            <h2 className="font-headline text-title-md text-light-on-surface dark:text-dark-on-surface">
              Progresso por Pilar
            </h2>

            {[
              {
                label: 'Agenda e Compromissos',
                value: `${doneTodayAgenda}/${todayAgenda.length} hoje · ${totalAgendaDone}/${agenda.length} total`,
                pct: agendaRate,
                tab: 'inicio' as AppTab,
              },
              {
                label: 'Tarefas do Dia',
                value: `${doneTasks}/${tasks.length} concluídas`,
                pct: tasksRate,
                tab: 'mais' as AppTab,
              },
              {
                label: 'Hábitos Semanais',
                value: `${habitsWeeklyRate}% na semana · ${habitsTodayRate}% hoje`,
                pct: habitsWeeklyRate,
                tab: 'habitos' as AppTab,
              },
              {
                label: 'Metas e Objetivos',
                value: `${completedGoals}/${goals.length} concluídas · média ${goalsAvgProgress}%`,
                pct: goalsAvgProgress,
                tab: 'metas' as AppTab,
              },
              {
                label: 'Estudos',
                value: `${studyMinutesTotal}/${studyGoalTotal || 0} min`,
                pct: studyRate,
                tab: 'estudar' as AppTab,
              },
            ].map((row) => (
              <button
                key={row.label}
                type="button"
                onClick={() => onNavigate(row.tab)}
                className="flex flex-col gap-1 text-left group"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-body text-body-sm font-medium text-light-on-surface dark:text-dark-on-surface group-hover:text-light-primary dark:group-hover:text-dark-primary transition-colors">
                    {row.label}
                  </span>
                  <span className="font-mono text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant tabular-nums">
                    {row.value}
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-light-surface-container-highest dark:bg-dark-surface-container-highest overflow-hidden">
                  <div
                    className="h-full bg-light-primary dark:bg-dark-primary transition-all duration-300"
                    style={{ width: `${row.pct}%` }}
                  />
                </div>
              </button>
            ))}
          </section>
        </div>

        {/* Bottom Cards: Finance, Journal Mood & Books */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            type="button"
            onClick={() => onNavigate('financas')}
            className="rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant hover:border-light-primary dark:hover:border-dark-primary p-4 flex flex-col gap-2 text-left transition-colors"
          >
            <div className="flex items-center justify-between">
              <span className="font-headline text-title-md text-light-on-surface dark:text-dark-on-surface">
                Saúde Financeira (Mês)
              </span>
              <span className="material-symbols-outlined text-[20px] text-cat-emerald">
                account_balance_wallet
              </span>
            </div>
            <div className="flex flex-col gap-1 font-body text-body-sm">
              <div className="flex justify-between">
                <span className="text-light-on-surface-variant dark:text-dark-on-surface-variant">
                  Receitas:
                </span>
                <span className="font-mono text-cat-emerald tabular-nums">
                  {monthIncome.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-light-on-surface-variant dark:text-dark-on-surface-variant">
                  Gastos:
                </span>
                <span className="font-mono text-light-error dark:text-dark-error tabular-nums">
                  {monthExpense.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
              </div>
              <div className="border-t border-light-outline-variant dark:border-dark-outline-variant pt-1 mt-1 flex justify-between font-semibold">
                <span>Saldo do mês:</span>
                <span
                  className={`font-mono tabular-nums ${
                    monthBalance >= 0
                      ? 'text-cat-emerald'
                      : 'text-light-error dark:text-dark-error'
                  }`}
                >
                  {monthBalance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('diario')}
            className="rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant hover:border-light-primary dark:hover:border-dark-primary p-4 flex flex-col gap-2 text-left transition-colors"
          >
            <div className="flex items-center justify-between">
              <span className="font-headline text-title-md text-light-on-surface dark:text-dark-on-surface">
                Diário e Bem-Estar
              </span>
              <span className="material-symbols-outlined text-[20px] text-accent-gold">
                book_2
              </span>
            </div>
            <p className="font-body text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
              Total de registros: <strong className="text-light-on-surface dark:text-dark-on-surface">{journalEntries.length}</strong>
            </p>
            <p className="font-body text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
              Humor mais frequente:{' '}
              <strong className="text-light-primary dark:text-dark-primary">
                {topMood || 'Sem registros ainda'}
              </strong>
            </p>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('livros')}
            className="rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant hover:border-light-primary dark:hover:border-dark-primary p-4 flex flex-col gap-2 text-left transition-colors"
          >
            <div className="flex items-center justify-between">
              <span className="font-headline text-title-md text-light-on-surface dark:text-dark-on-surface">
                Livros e Leitura
              </span>
              <span className="material-symbols-outlined text-[20px] text-cat-blue">
                auto_stories
              </span>
            </div>
            <p className="font-body text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
              Livros na estante: <strong className="text-light-on-surface dark:text-dark-on-surface">{books.length}</strong>
            </p>
            <p className="font-body text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
              Concluídos:{' '}
              <strong className="text-cat-emerald">{finishedBooks}</strong>
            </p>
          </button>
        </div>
      </main>
    </div>
  );
};
