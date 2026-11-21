import React, { useMemo, useState } from 'react';
import { GOAL_CATEGORIES, GOAL_TEMPLATES } from '../data/initialData';
import {
  AgendaCategory,
  GoalCategory,
  GoalHorizon,
  GoalItem,
  GoalMeasureMode,
  GoalStatus,
} from '../types';

interface GoalsViewProps {
  goals: GoalItem[];
  onAddGoal: (goal: Omit<GoalItem, 'id' | 'createdAt'>) => GoalItem;
  onUpdateGoal: (id: string, patch: Partial<GoalItem>) => void;
  onDeleteGoal: (id: string) => void;
  onAddToAgenda?: (item: {
    time: string;
    title: string;
    category: AgendaCategory;
  }) => void;
  onOpenTrips: () => void;
  onBack: () => void;
  onShowToast: (msg: string) => void;
}

const HORIZONS: GoalHorizon[] = ['Curto prazo', 'Médio prazo', 'Longo prazo'];

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDatePt(iso?: string): string {
  if (!iso) return 'Sem prazo';
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

function getDaysRemainingLabel(iso?: string): string | null {
  if (!iso) return null;
  const target = new Date(`${iso}T23:59:59`);
  if (Number.isNaN(target.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((target.getTime() - today.getTime()) / 86400000);
  if (diffDays < 0) return `Atrasada (${Math.abs(diffDays)}d)`;
  if (diffDays === 0) return 'Vence hoje';
  return `Faltam ${diffDays}d`;
}

function computeGoalProgress(goal: GoalItem): {
  percent: number;
  currentLabel: string;
  targetLabel: string;
} {
  if (goal.status === 'concluida') {
    if (goal.measureMode === 'valor') {
      return {
        percent: 100,
        currentLabel: formatCurrency(Math.max(goal.currentValue, goal.targetValue)),
        targetLabel: formatCurrency(goal.targetValue),
      };
    }
    if (goal.measureMode === 'quantidade') {
      const unit = goal.unitLabel ? ` ${goal.unitLabel}` : '';
      return {
        percent: 100,
        currentLabel: `${Math.max(goal.currentValue, goal.targetValue)}${unit}`,
        targetLabel: `${goal.targetValue}${unit}`,
      };
    }
  }

  if (goal.measureMode === 'etapas') {
    const total = goal.milestones.length;
    const doneCount = goal.milestones.filter((m) => m.done).length;
    if (total === 0) {
      return {
        percent: goal.status === 'concluida' ? 100 : 0,
        currentLabel: '0 etapas',
        targetLabel: '0 etapas',
      };
    }
    const percent = Math.min(100, Math.round((doneCount / total) * 100));
    return {
      percent,
      currentLabel: `${doneCount} etapa(s)`,
      targetLabel: `${total} etapas`,
    };
  }

  const safeTarget = Math.max(1, goal.targetValue);
  const percent = Math.min(100, Math.round((goal.currentValue / safeTarget) * 100));

  if (goal.measureMode === 'valor') {
    return {
      percent,
      currentLabel: formatCurrency(goal.currentValue),
      targetLabel: formatCurrency(goal.targetValue),
    };
  }

  const unit = goal.unitLabel ? ` ${goal.unitLabel}` : '';
  return {
    percent,
    currentLabel: `${goal.currentValue}${unit}`,
    targetLabel: `${goal.targetValue}${unit}`,
  };
}

function statusLabel(status: GoalStatus): string {
  if (status === 'concluida') return 'Concluída';
  if (status === 'pausada') return 'Pausada';
  return 'Em andamento';
}

export const GoalsView: React.FC<GoalsViewProps> = ({
  goals,
  onAddGoal,
  onUpdateGoal,
  onDeleteGoal,
  onAddToAgenda,
  onOpenTrips,
  onBack,
  onShowToast,
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'todas' | GoalStatus>('todas');
  const [horizonFilter, setHorizonFilter] = useState<'todos' | GoalHorizon>('todos');
  const [categoryFilter, setCategoryFilter] = useState<'todas' | GoalCategory>('todas');
  const [showForm, setShowForm] = useState(false);

  // Create form state
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<GoalCategory>('Pessoal');
  const [horizon, setHorizon] = useState<GoalHorizon>('Médio prazo');
  const [measureMode, setMeasureMode] = useState<GoalMeasureMode>('etapas');
  const [targetValue, setTargetValue] = useState('1000');
  const [currentValue, setCurrentValue] = useState('0');
  const [unitLabel, setUnitLabel] = useState('livros');
  const [deadline, setDeadline] = useState('');
  const [motivation, setMotivation] = useState('');
  const [initialMilestonesText, setInitialMilestonesText] = useState('');

  // Per-goal interactive state
  const [newMilestoneByGoal, setNewMilestoneByGoal] = useState<Record<string, string>>({});
  const [customDeltaByGoal, setCustomDeltaByGoal] = useState<Record<string, string>>({});
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [editMotivation, setEditMotivation] = useState('');
  const [editDeadline, setEditDeadline] = useState('');

  const metrics = useMemo(() => {
    const active = goals.filter((g) => g.status === 'em_andamento').length;
    const completed = goals.filter((g) => g.status === 'concluida').length;
    const avgProgress =
      goals.length > 0
        ? Math.round(
            goals.reduce((acc, g) => acc + computeGoalProgress(g).percent, 0) / goals.length
          )
        : 0;
    const totalSaved = goals
      .filter((g) => g.measureMode === 'valor')
      .reduce((acc, g) => acc + g.currentValue, 0);
    return { active, completed, avgProgress, totalSaved };
  }, [goals]);

  const filteredGoals = useMemo(() => {
    const q = search.trim().toLowerCase();
    return goals.filter((g) => {
      if (statusFilter !== 'todas' && g.status !== statusFilter) return false;
      if (horizonFilter !== 'todos' && g.horizon !== horizonFilter) return false;
      if (categoryFilter !== 'todas' && g.category !== categoryFilter) return false;
      if (!q) return true;
      return (
        g.title.toLowerCase().includes(q) ||
        g.category.toLowerCase().includes(q) ||
        (g.motivation ?? '').toLowerCase().includes(q) ||
        g.milestones.some((m) => m.title.toLowerCase().includes(q))
      );
    });
  }, [goals, search, statusFilter, horizonFilter, categoryFilter]);

  const handleApplyTemplate = (tplId: string) => {
    const tpl = GOAL_TEMPLATES.find((t) => t.id === tplId);
    if (!tpl) return;
    const created = onAddGoal({
      title: tpl.title,
      category: tpl.category,
      horizon: tpl.horizon,
      status: 'em_andamento',
      measureMode: tpl.measureMode,
      currentValue: 0,
      targetValue: tpl.targetValue,
      unitLabel: tpl.unitLabel,
      motivation: tpl.motivation,
      milestones: tpl.milestones.map((m, idx) => ({
        id: `gm-${Date.now()}-${idx}`,
        title: m,
        done: false,
      })),
    });
    onShowToast(`Meta "${created.title}" criada!`);
  };

  const handleCreateGoal = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) {
      onShowToast('Informe o título da meta.');
      return;
    }

    const parsedTarget = Math.max(1, Number(targetValue.replace(',', '.')) || 1);
    const parsedCurrent = Math.max(0, Number(currentValue.replace(',', '.')) || 0);
    const milestoneLines = initialMilestonesText
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

    const milestones =
      milestoneLines.length > 0
        ? milestoneLines.map((line, idx) => ({
            id: `gm-${Date.now()}-${idx}`,
            title: line,
            done: false,
          }))
        : measureMode === 'etapas'
          ? [{ id: `gm-${Date.now()}-0`, title: 'Primeiro passo da meta', done: false }]
          : [];

    onAddGoal({
      title: trimmed,
      category,
      horizon,
      status: 'em_andamento',
      measureMode,
      currentValue: measureMode === 'etapas' ? 0 : parsedCurrent,
      targetValue: measureMode === 'etapas' ? Math.max(1, milestones.length) : parsedTarget,
      unitLabel:
        measureMode === 'valor'
          ? 'R$'
          : measureMode === 'quantidade'
            ? unitLabel.trim() || 'un'
            : undefined,
      deadline: deadline || undefined,
      motivation: motivation.trim() || undefined,
      milestones,
    });

    setTitle('');
    setMotivation('');
    setDeadline('');
    setCurrentValue('0');
    setInitialMilestonesText('');
    setShowForm(false);
    onShowToast(`Meta "${trimmed}" adicionada!`);
  };

  const handleAddValueDelta = (goal: GoalItem, delta: number) => {
    const nextVal = Math.max(0, Math.round((goal.currentValue + delta) * 100) / 100);
    const reachedTarget = nextVal >= goal.targetValue;
    onUpdateGoal(goal.id, {
      currentValue: nextVal,
      status: reachedTarget ? 'concluida' : goal.status === 'concluida' ? 'em_andamento' : goal.status,
    });
    if (reachedTarget && goal.status !== 'concluida') {
      onShowToast(`Parabéns! Meta "${goal.title}" concluída!`);
    } else {
      onShowToast('Progresso atualizado.');
    }
  };

  const handleToggleMilestone = (goal: GoalItem, milestoneId: string) => {
    const nextMilestones = goal.milestones.map((m) =>
      m.id === milestoneId ? { ...m, done: !m.done } : m
    );
    const doneCount = nextMilestones.filter((m) => m.done).length;
    const allDone = nextMilestones.length > 0 && doneCount === nextMilestones.length;
    const patch: Partial<GoalItem> = {
      milestones: nextMilestones,
    };
    if (goal.measureMode === 'etapas') {
      patch.currentValue = doneCount;
      patch.targetValue = Math.max(1, nextMilestones.length);
      if (allDone) patch.status = 'concluida';
      else if (goal.status === 'concluida') patch.status = 'em_andamento';
    }
    onUpdateGoal(goal.id, patch);
  };

  const handleAddMilestone = (goal: GoalItem) => {
    const text = (newMilestoneByGoal[goal.id] ?? '').trim();
    if (!text) return;
    const nextMilestones = [
      ...goal.milestones,
      { id: `gm-${Date.now()}`, title: text, done: false },
    ];
    onUpdateGoal(goal.id, {
      milestones: nextMilestones,
      ...(goal.measureMode === 'etapas'
        ? {
            targetValue: nextMilestones.length,
            status: goal.status === 'concluida' ? 'em_andamento' : goal.status,
          }
        : {}),
    });
    setNewMilestoneByGoal((prev) => ({ ...prev, [goal.id]: '' }));
  };

  const handleDeleteMilestone = (goal: GoalItem, milestoneId: string) => {
    const nextMilestones = goal.milestones.filter((m) => m.id !== milestoneId);
    onUpdateGoal(goal.id, {
      milestones: nextMilestones,
      ...(goal.measureMode === 'etapas'
        ? {
            currentValue: nextMilestones.filter((m) => m.done).length,
            targetValue: Math.max(1, nextMilestones.length),
          }
        : {}),
    });
  };

  const handleSaveEditDetails = (goalId: string) => {
    onUpdateGoal(goalId, {
      motivation: editMotivation.trim() || undefined,
      deadline: editDeadline || undefined,
    });
    setEditingGoalId(null);
    onShowToast('Detalhes da meta atualizados.');
  };

  return (
    <div className="flex flex-col">
      <header className="px-4 lg:px-8 pt-6 pb-4 flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={onBack}
              aria-label="Voltar"
              className="min-h-[40px] min-w-[40px] rounded-md bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant flex items-center justify-center text-light-on-surface dark:text-dark-on-surface hover:border-light-primary dark:hover:border-dark-primary transition-colors shrink-0"
            >
              <span className="material-symbols-outlined text-[20px]">arrow_back</span>
            </button>
            <div className="min-w-0">
              <h1 className="font-headline text-headline-lg text-light-on-surface dark:text-dark-on-surface truncate">
                Metas
              </h1>
              <p className="font-body text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
                Objetivos pessoais, financeiros, etapas e acompanhamento de progresso.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onOpenTrips}
              className="min-h-[40px] px-3.5 py-2 rounded-md border border-light-outline-variant dark:border-dark-outline-variant bg-light-surface-container-low dark:bg-dark-surface-container-low text-light-on-surface dark:text-dark-on-surface font-body text-body-sm inline-flex items-center gap-1.5 hover:border-light-primary dark:hover:border-dark-primary transition-colors whitespace-nowrap shrink-0"
            >
              <span className="material-symbols-outlined text-[18px] text-cat-blue">
                flight_takeoff
              </span>
              <span>Ir para Viagens</span>
            </button>
            <button
              type="button"
              onClick={() => setShowForm((v) => !v)}
              className="min-h-[40px] px-4 py-2 rounded-full bg-light-primary dark:bg-dark-primary text-light-on-primary dark:text-dark-on-primary font-body text-label-lg inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <span className="material-symbols-outlined text-[18px]">
                {showForm ? 'close' : 'add'}
              </span>
              <span>{showForm ? 'Fechar' : 'Nova Meta'}</span>
            </button>
          </div>
        </div>
      </header>

      <main className="px-4 lg:px-8 pb-28 lg:pb-12 flex flex-col gap-5">
        {/* KPI Strip */}
        <section
          aria-label="Resumo das metas"
          className="grid grid-cols-2 lg:grid-cols-4 gap-3"
        >
          <div className="rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant p-3.5 flex flex-col gap-1">
            <span className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
              Em andamento
            </span>
            <span className="font-mono text-title-lg text-light-on-surface dark:text-dark-on-surface tabular-nums">
              {metrics.active}
            </span>
          </div>
          <div className="rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant p-3.5 flex flex-col gap-1">
            <span className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
              Concluídas
            </span>
            <span className="font-mono text-title-lg text-cat-emerald tabular-nums">
              {metrics.completed}/{goals.length}
            </span>
          </div>
          <div className="rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant p-3.5 flex flex-col gap-1">
            <span className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
              Progresso médio
            </span>
            <span className="font-mono text-title-lg text-light-primary dark:text-dark-primary tabular-nums">
              {metrics.avgProgress}%
            </span>
          </div>
          <div className="rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant p-3.5 flex flex-col gap-1">
            <span className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
              Total acumulado (R$)
            </span>
            <span className="font-mono text-title-lg text-accent-gold tabular-nums">
              {formatCurrency(metrics.totalSaved)}
            </span>
          </div>
        </section>

        {/* Quick Templates */}
        <section className="flex flex-col gap-2">
          <span className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
            Modelos rápidos (1 clique)
          </span>
          <div className="flex flex-wrap gap-2">
            {GOAL_TEMPLATES.map((tpl) => (
              <button
                key={tpl.id}
                type="button"
                onClick={() => handleApplyTemplate(tpl.id)}
                className="min-h-[38px] px-3 py-1.5 rounded-md bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant text-light-on-surface dark:text-dark-on-surface font-body text-body-sm inline-flex items-center gap-1.5 hover:border-light-primary dark:hover:border-dark-primary transition-colors whitespace-nowrap"
              >
                <span className="material-symbols-outlined text-[16px] text-cat-emerald">
                  {tpl.icon}
                </span>
                <span>+ {tpl.label}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Create Goal Form */}
        {showForm && (
          <form
            onSubmit={handleCreateGoal}
            className="rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-primary/60 dark:border-dark-primary/60 p-4 flex flex-col gap-3"
          >
            <h2 className="font-headline text-title-md text-light-on-surface dark:text-dark-on-surface">
              Criar nova meta
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <label className="flex flex-col gap-1">
                <span className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
                  Título da meta *
                </span>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex.: Quitar cartão, Ler 10 livros, Correr 5 km..."
                  className="rounded bg-light-surface-container-lowest dark:bg-dark-surface-container border border-light-outline-variant dark:border-dark-outline-variant px-3 py-2 font-body text-body-md text-light-on-surface dark:text-dark-on-surface focus:outline-none focus:border-light-primary dark:focus:border-dark-primary"
                />
              </label>

              <div className="grid grid-cols-2 gap-2">
                <label className="flex flex-col gap-1">
                  <span className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
                    Categoria
                  </span>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as GoalCategory)}
                    className="rounded bg-light-surface-container-lowest dark:bg-dark-surface-container border border-light-outline-variant dark:border-dark-outline-variant px-3 py-2 font-body text-body-md text-light-on-surface dark:text-dark-on-surface"
                  >
                    {GOAL_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex flex-col gap-1">
                  <span className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
                    Horizonte
                  </span>
                  <select
                    value={horizon}
                    onChange={(e) => setHorizon(e.target.value as GoalHorizon)}
                    className="rounded bg-light-surface-container-lowest dark:bg-dark-surface-container border border-light-outline-variant dark:border-dark-outline-variant px-3 py-2 font-body text-body-md text-light-on-surface dark:text-dark-on-surface"
                  >
                    {HORIZONS.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <label className="flex flex-col gap-1">
                <span className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
                  Forma de medir
                </span>
                <select
                  value={measureMode}
                  onChange={(e) => setMeasureMode(e.target.value as GoalMeasureMode)}
                  className="rounded bg-light-surface-container-lowest dark:bg-dark-surface-container border border-light-outline-variant dark:border-dark-outline-variant px-3 py-2 font-body text-body-md text-light-on-surface dark:text-dark-on-surface"
                >
                  <option value="etapas">Por etapas / checklist</option>
                  <option value="valor">Por valor (R$)</option>
                  <option value="quantidade">Por quantidade numérica</option>
                </select>
              </label>

              {measureMode !== 'etapas' && (
                <>
                  <label className="flex flex-col gap-1">
                    <span className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
                      Já conquistado
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={currentValue}
                      onChange={(e) => setCurrentValue(e.target.value)}
                      className="rounded bg-light-surface-container-lowest dark:bg-dark-surface-container border border-light-outline-variant dark:border-dark-outline-variant px-3 py-2 font-mono text-body-md text-light-on-surface dark:text-dark-on-surface"
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
                      Alvo total ({measureMode === 'valor' ? 'R$' : unitLabel || 'un'})
                    </span>
                    <input
                      type="number"
                      min="1"
                      step="any"
                      value={targetValue}
                      onChange={(e) => setTargetValue(e.target.value)}
                      className="rounded bg-light-surface-container-lowest dark:bg-dark-surface-container border border-light-outline-variant dark:border-dark-outline-variant px-3 py-2 font-mono text-body-md text-light-on-surface dark:text-dark-on-surface"
                    />
                  </label>
                </>
              )}

              {measureMode === 'quantidade' && (
                <label className="flex flex-col gap-1">
                  <span className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
                    Unidade (ex.: livros, km)
                  </span>
                  <input
                    type="text"
                    value={unitLabel}
                    onChange={(e) => setUnitLabel(e.target.value)}
                    placeholder="livros"
                    className="rounded bg-light-surface-container-lowest dark:bg-dark-surface-container border border-light-outline-variant dark:border-dark-outline-variant px-3 py-2 font-body text-body-md text-light-on-surface dark:text-dark-on-surface"
                  />
                </label>
              )}

              <label className="flex flex-col gap-1">
                <span className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
                  Prazo alvo (opcional)
                </span>
                <input
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="rounded bg-light-surface-container-lowest dark:bg-dark-surface-container border border-light-outline-variant dark:border-dark-outline-variant px-3 py-2 font-mono text-body-md text-light-on-surface dark:text-dark-on-surface"
                />
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <label className="flex flex-col gap-1">
                <span className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
                  Por que essa meta importa?
                </span>
                <input
                  type="text"
                  value={motivation}
                  onChange={(e) => setMotivation(e.target.value)}
                  placeholder="Motivação principal para manter o foco..."
                  className="rounded bg-light-surface-container-lowest dark:bg-dark-surface-container border border-light-outline-variant dark:border-dark-outline-variant px-3 py-2 font-body text-body-md text-light-on-surface dark:text-dark-on-surface"
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
                  Etapas iniciais (uma por linha, opcional)
                </span>
                <textarea
                  rows={2}
                  value={initialMilestonesText}
                  onChange={(e) => setInitialMilestonesText(e.target.value)}
                  placeholder={'Pesquisar opções\nSeparar valor inicial'}
                  className="rounded bg-light-surface-container-lowest dark:bg-dark-surface-container border border-light-outline-variant dark:border-dark-outline-variant px-3 py-2 font-body text-body-sm text-light-on-surface dark:text-dark-on-surface"
                />
              </label>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="min-h-[40px] px-4 py-2 rounded-md border border-light-outline-variant dark:border-dark-outline-variant font-body text-body-sm text-light-on-surface dark:text-dark-on-surface"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="min-h-[40px] px-5 py-2 rounded-full bg-light-primary dark:bg-dark-primary text-light-on-primary dark:text-dark-on-primary font-body text-label-lg"
              >
                Salvar Meta
              </button>
            </div>
          </form>
        )}

        {/* Filter Bar */}
        <section className="flex flex-col gap-3">
          <div className="flex flex-col md:flex-row gap-2.5">
            <div className="relative flex-1">
              <span
                className="material-symbols-outlined text-[18px] text-light-on-surface-variant dark:text-dark-on-surface-variant absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              >
                search
              </span>
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar meta, motivação ou etapa..."
                className="w-full rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant pl-9 pr-3 py-2 font-body text-body-md text-light-on-surface dark:text-dark-on-surface focus:outline-none focus:border-light-primary dark:focus:border-dark-primary"
              />
            </div>

            <select
              aria-label="Filtrar por prazo"
              value={horizonFilter}
              onChange={(e) => setHorizonFilter(e.target.value as 'todos' | GoalHorizon)}
              className="rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant px-3 py-2 font-body text-body-sm text-light-on-surface dark:text-dark-on-surface"
            >
              <option value="todos">Todos os prazos</option>
              {HORIZONS.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>

            <select
              aria-label="Filtrar por categoria"
              value={categoryFilter}
              onChange={(e) =>
                setCategoryFilter(e.target.value as 'todas' | GoalCategory)
              }
              className="rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant px-3 py-2 font-body text-body-sm text-light-on-surface dark:text-dark-on-surface"
            >
              <option value="todas">Todas as categorias</option>
              {GOAL_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1 p-1 rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant overflow-x-auto">
            {(
              [
                { id: 'todas', label: `Todas (${goals.length})` },
                {
                  id: 'em_andamento',
                  label: `Em andamento (${goals.filter((g) => g.status === 'em_andamento').length})`,
                },
                {
                  id: 'concluida',
                  label: `Concluídas (${goals.filter((g) => g.status === 'concluida').length})`,
                },
                {
                  id: 'pausada',
                  label: `Pausadas (${goals.filter((g) => g.status === 'pausada').length})`,
                },
              ] as { id: 'todas' | GoalStatus; label: string }[]
            ).map((tab) => {
              const active = statusFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStatusFilter(tab.id)}
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
        </section>

        {/* Goals List */}
        {filteredGoals.length === 0 ? (
          <div className="rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant p-8 text-center flex flex-col items-center gap-3">
            <span className="material-symbols-outlined text-[36px] text-light-on-surface-variant dark:text-dark-on-surface-variant">
              flag
            </span>
            <p className="font-body text-body-md text-light-on-surface dark:text-dark-on-surface">
              Nenhuma meta encontrada com esses filtros.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setStatusFilter('todas');
                setHorizonFilter('todos');
                setCategoryFilter('todas');
                setShowForm(true);
              }}
              className="min-h-[40px] px-4 py-2 rounded-full bg-light-primary dark:bg-dark-primary text-light-on-primary dark:text-dark-on-primary font-body text-body-sm"
            >
              Criar primeira meta
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredGoals.map((goal) => {
              const progress = computeGoalProgress(goal);
              const daysLabel = getDaysRemainingLabel(goal.deadline);
              const nextPendingStep = goal.milestones.find((m) => !m.done);
              const isEditing = editingGoalId === goal.id;

              return (
                <article
                  key={goal.id}
                  className="rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant p-4 flex flex-col gap-3.5"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1 flex flex-col gap-1">
                      <div className="flex flex-wrap items-center gap-1.5 font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
                        <span className="text-light-primary dark:text-dark-primary font-medium">
                          {goal.category}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{goal.horizon}</span>
                        <span aria-hidden="true">·</span>
                        <span
                          className={
                            goal.status === 'concluida'
                              ? 'text-cat-emerald font-medium'
                              : goal.status === 'pausada'
                                ? 'text-accent-gold'
                                : ''
                          }
                        >
                          {statusLabel(goal.status)}
                        </span>
                        {goal.deadline && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono tabular-nums">
                              {formatDatePt(goal.deadline)}
                              {daysLabel ? ` (${daysLabel})` : ''}
                            </span>
                          </>
                        )}
                      </div>
                      <h2
                        className={`font-headline text-title-md text-light-on-surface dark:text-dark-on-surface ${
                          goal.status === 'concluida' ? 'line-through opacity-75' : ''
                        }`}
                      >
                        {goal.title}
                      </h2>
                    </div>

                    <span className="font-mono text-title-md text-light-primary dark:text-dark-primary tabular-nums shrink-0">
                      {progress.percent}%
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="flex flex-col gap-1.5">
                    <div className="w-full h-2.5 rounded-full bg-light-surface-container-highest dark:bg-dark-surface-container overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          goal.status === 'concluida' || progress.percent >= 100
                            ? 'bg-cat-emerald'
                            : 'bg-light-primary dark:bg-dark-primary'
                        }`}
                        style={{ width: `${progress.percent}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between font-mono text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant tabular-nums">
                      <span>Atual: {progress.currentLabel}</span>
                      <span>Alvo: {progress.targetLabel}</span>
                    </div>
                  </div>

                  {/* Motivation / Edit details */}
                  {isEditing ? (
                    <div className="flex flex-col gap-2 pt-1 border-t border-light-outline-variant dark:border-dark-outline-variant">
                      <input
                        type="text"
                        value={editMotivation}
                        onChange={(e) => setEditMotivation(e.target.value)}
                        placeholder="Motivação da meta..."
                        className="rounded bg-light-surface-container-lowest dark:bg-dark-surface-container border border-light-outline-variant dark:border-dark-outline-variant px-3 py-2 font-body text-body-sm text-light-on-surface dark:text-dark-on-surface"
                      />
                      <div className="flex items-center gap-2">
                        <input
                          type="date"
                          value={editDeadline}
                          onChange={(e) => setEditDeadline(e.target.value)}
                          className="rounded bg-light-surface-container-lowest dark:bg-dark-surface-container border border-light-outline-variant dark:border-dark-outline-variant px-3 py-1.5 font-mono text-body-sm text-light-on-surface dark:text-dark-on-surface"
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveEditDetails(goal.id)}
                          className="min-h-[36px] px-3 py-1 rounded-md bg-light-primary dark:bg-dark-primary text-light-on-primary dark:text-dark-on-primary font-body text-label-md"
                        >
                          Salvar
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingGoalId(null)}
                          className="min-h-[36px] px-3 py-1 rounded-md border border-light-outline-variant dark:border-dark-outline-variant font-body text-label-md text-light-on-surface-variant dark:text-dark-on-surface-variant"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    goal.motivation && (
                      <p className="font-body text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
                        {goal.motivation}
                      </p>
                    )
                  )}

                  {/* Quick numeric / financial progress controls */}
                  {goal.measureMode !== 'etapas' && (
                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-light-outline-variant dark:border-dark-outline-variant">
                      {goal.measureMode === 'valor' ? (
                        <>
                          {[50, 100, 250].map((amt) => (
                            <button
                              key={amt}
                              type="button"
                              onClick={() => handleAddValueDelta(goal, amt)}
                              className="min-h-[36px] px-2.5 py-1 rounded-md border border-light-outline-variant dark:border-dark-outline-variant bg-light-surface-container-lowest dark:bg-dark-surface-container font-mono text-label-md text-cat-emerald hover:border-cat-emerald transition-colors tabular-nums"
                            >
                              + R$ {amt}
                            </button>
                          ))}
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => handleAddValueDelta(goal, -1)}
                            className="min-h-[36px] px-2.5 py-1 rounded-md border border-light-outline-variant dark:border-dark-outline-variant bg-light-surface-container-lowest dark:bg-dark-surface-container font-mono text-label-md text-light-on-surface dark:text-dark-on-surface"
                          >
                            -1
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAddValueDelta(goal, 1)}
                            className="min-h-[36px] px-2.5 py-1 rounded-md border border-light-outline-variant dark:border-dark-outline-variant bg-light-surface-container-lowest dark:bg-dark-surface-container font-mono text-label-md text-cat-emerald hover:border-cat-emerald transition-colors"
                          >
                            +1 {goal.unitLabel || ''}
                          </button>
                        </>
                      )}

                      <div className="flex items-center gap-1.5 ml-auto">
                        <input
                          type="number"
                          step="any"
                          value={customDeltaByGoal[goal.id] ?? ''}
                          onChange={(e) =>
                            setCustomDeltaByGoal((prev) => ({
                              ...prev,
                              [goal.id]: e.target.value,
                            }))
                          }
                          placeholder={goal.measureMode === 'valor' ? 'Outro R$' : 'Qtd'}
                          aria-label="Valor para somar ao progresso"
                          className="w-24 rounded bg-light-surface-container-lowest dark:bg-dark-surface-container border border-light-outline-variant dark:border-dark-outline-variant px-2.5 py-1.5 font-mono text-body-sm text-light-on-surface dark:text-dark-on-surface"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const val = Number(
                              (customDeltaByGoal[goal.id] ?? '').replace(',', '.')
                            );
                            if (!Number.isFinite(val) || val === 0) return;
                            handleAddValueDelta(goal, val);
                            setCustomDeltaByGoal((prev) => ({ ...prev, [goal.id]: '' }));
                          }}
                          className="min-h-[36px] px-3 py-1 rounded-md bg-light-primary dark:bg-dark-primary text-light-on-primary dark:text-dark-on-primary font-body text-label-md whitespace-nowrap"
                        >
                          Somar
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Milestones / Etapas */}
                  <div className="flex flex-col gap-2 pt-2 border-t border-light-outline-variant dark:border-dark-outline-variant">
                    <div className="flex items-center justify-between">
                      <span className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
                        Etapas e marcos (
                        <span className="font-mono tabular-nums">
                          {goal.milestones.filter((m) => m.done).length}/
                          {goal.milestones.length}
                        </span>
                        )
                      </span>
                    </div>

                    {goal.milestones.length > 0 && (
                      <ul className="flex flex-col divide-y divide-light-outline-variant/60 dark:divide-dark-outline-variant/60">
                        {goal.milestones.map((m) => (
                          <li
                            key={m.id}
                            className="py-1.5 flex items-center justify-between gap-2"
                          >
                            <button
                              type="button"
                              onClick={() => handleToggleMilestone(goal, m.id)}
                              className="flex items-center gap-2 text-left min-w-0 flex-1 min-h-[36px]"
                            >
                              <span
                                className={`material-symbols-outlined text-[18px] shrink-0 ${
                                  m.done
                                    ? 'material-symbols-filled text-cat-emerald'
                                    : 'text-light-on-surface-variant dark:text-dark-on-surface-variant'
                                }`}
                              >
                                {m.done ? 'check_circle' : 'radio_button_unchecked'}
                              </span>
                              <span
                                className={`font-body text-body-sm truncate ${
                                  m.done
                                    ? 'line-through opacity-60 text-light-on-surface-variant dark:text-dark-on-surface-variant'
                                    : 'text-light-on-surface dark:text-dark-on-surface'
                                }`}
                              >
                                {m.title}
                              </span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteMilestone(goal, m.id)}
                              aria-label="Remover etapa"
                              className="min-h-[32px] min-w-[32px] flex items-center justify-center text-light-on-surface-variant dark:text-dark-on-surface-variant hover:text-light-error dark:hover:text-dark-error shrink-0"
                            >
                              <span className="material-symbols-outlined text-[16px]">
                                close
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}

                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={newMilestoneByGoal[goal.id] ?? ''}
                        onChange={(e) =>
                          setNewMilestoneByGoal((prev) => ({
                            ...prev,
                            [goal.id]: e.target.value,
                          }))
                        }
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddMilestone(goal);
                          }
                        }}
                        placeholder="Adicionar nova etapa..."
                        className="flex-1 rounded bg-light-surface-container-lowest dark:bg-dark-surface-container border border-light-outline-variant dark:border-dark-outline-variant px-2.5 py-1.5 font-body text-body-sm text-light-on-surface dark:text-dark-on-surface"
                      />
                      <button
                        type="button"
                        onClick={() => handleAddMilestone(goal)}
                        className="min-h-[34px] px-3 py-1 rounded-md border border-light-outline-variant dark:border-dark-outline-variant font-body text-label-md text-light-on-surface dark:text-dark-on-surface hover:border-light-primary dark:hover:border-dark-primary whitespace-nowrap"
                      >
                        + Etapa
                      </button>
                    </div>
                  </div>

                  {/* Card Footer Actions */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-light-outline-variant dark:border-dark-outline-variant">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          const nextStatus: GoalStatus =
                            goal.status === 'concluida' ? 'em_andamento' : 'concluida';
                          onUpdateGoal(goal.id, { status: nextStatus });
                          onShowToast(
                            nextStatus === 'concluida'
                              ? `Meta "${goal.title}" concluída!`
                              : 'Meta reaberta.'
                          );
                        }}
                        className="min-h-[36px] px-2.5 py-1 rounded-md border border-light-outline-variant dark:border-dark-outline-variant font-body text-label-md text-cat-emerald inline-flex items-center gap-1 hover:border-cat-emerald transition-colors whitespace-nowrap"
                      >
                        <span className="material-symbols-outlined text-[16px]">
                          {goal.status === 'concluida' ? 'replay' : 'task_alt'}
                        </span>
                        <span>
                          {goal.status === 'concluida' ? 'Reabrir' : 'Concluir'}
                        </span>
                      </button>

                      {goal.status !== 'concluida' && (
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateGoal(goal.id, {
                              status:
                                goal.status === 'pausada' ? 'em_andamento' : 'pausada',
                            })
                          }
                          className="min-h-[36px] px-2.5 py-1 rounded-md border border-light-outline-variant dark:border-dark-outline-variant font-body text-label-md text-light-on-surface-variant dark:text-dark-on-surface-variant whitespace-nowrap"
                        >
                          {goal.status === 'pausada' ? 'Retomar' : 'Pausar'}
                        </button>
                      )}

                      {onAddToAgenda && (
                        <button
                          type="button"
                          onClick={() =>
                            onAddToAgenda({
                              time: '18:00',
                              title: nextPendingStep
                                ? `Meta: ${nextPendingStep.title}`
                                : `Avançar meta: ${goal.title}`,
                              category: 'emerald',
                            })
                          }
                          className="min-h-[36px] px-2.5 py-1 rounded-md border border-light-outline-variant dark:border-dark-outline-variant font-body text-label-md text-light-primary dark:text-dark-primary inline-flex items-center gap-1 whitespace-nowrap"
                        >
                          <span className="material-symbols-outlined text-[16px]">
                            event_available
                          </span>
                          <span>Agendar passo</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          setEditingGoalId(goal.id);
                          setEditMotivation(goal.motivation ?? '');
                          setEditDeadline(goal.deadline ?? '');
                        }}
                        className="min-h-[36px] px-2.5 py-1 rounded-md border border-light-outline-variant dark:border-dark-outline-variant font-body text-label-md text-light-on-surface-variant dark:text-dark-on-surface-variant whitespace-nowrap"
                      >
                        Editar
                      </button>
                    </div>

                    {confirmDeleteId === goal.id ? (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            onDeleteGoal(goal.id);
                            setConfirmDeleteId(null);
                            onShowToast('Meta removida.');
                          }}
                          className="min-h-[36px] px-2.5 py-1 rounded-md bg-light-error dark:bg-dark-error text-white font-body text-label-md whitespace-nowrap"
                        >
                          Confirmar exclusão
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="min-h-[36px] px-2 py-1 font-body text-label-md text-light-on-surface-variant dark:text-dark-on-surface-variant"
                        >
                          Não
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(goal.id)}
                        aria-label="Excluir meta"
                        className="min-h-[36px] px-2 py-1 rounded-md text-light-on-surface-variant dark:text-dark-on-surface-variant hover:text-light-error dark:hover:text-dark-error"
                      >
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    )}
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
