import React, { useEffect, useMemo, useState } from 'react';
import {
  StudyOtherItem,
  StudyScheduleBlock,
  StudySubject,
  StudyTip,
  StudyTopic,
  StudyTopicStatus,
  StudyWeekDay,
} from '../types';

interface StudyViewProps {
  subjects: StudySubject[];
  topics: StudyTopic[];
  schedule: StudyScheduleBlock[];
  others: StudyOtherItem[];
  tips: StudyTip[];
  favoriteTipIds: string[];
  onAddSubject: (
    subject: Omit<StudySubject, 'id' | 'studiedMinutes'>,
    initialTopicTitle?: string
  ) => StudySubject | void;
  onUpdateSubject: (id: string, patch: Partial<StudySubject>) => void;
  onLogSubjectMinutes: (id: string, minutes: number) => void;
  onDeleteSubject: (id: string) => void;
  onAddTopic: (topic: Omit<StudyTopic, 'id'>) => void;
  onSetTopicStatus: (id: string, status: StudyTopicStatus) => void;
  onCycleTopicStatus: (id: string) => void;
  onDeleteTopic: (id: string) => void;
  onAddScheduleBlock: (block: Omit<StudyScheduleBlock, 'id' | 'done'>) => void;
  onToggleScheduleBlock: (id: string) => void;
  onDeleteScheduleBlock: (id: string) => void;
  onAddOtherItem: (item: Omit<StudyOtherItem, 'id' | 'done'>) => void;
  onToggleOtherItem: (id: string) => void;
  onDeleteOtherItem: (id: string) => void;
  onToggleFavoriteTip: (id: string) => void;
  onAddStudyMinutes?: (minutes: number) => void;
  onOpenBooks: () => void;
  onOpenYouTube: () => void;
  onBack: () => void;
  onShowToast: (msg: string) => void;
}

type StudySubTab = 'materias' | 'organizacao' | 'dicas';
type SubjectFilterMode = 'todas' | 'pendentes' | 'concluidas';
type OtherFilter = 'todos' | 'prova' | 'resumo' | 'link' | 'outro';
type TipCategoryFilter =
  | 'Todas'
  | 'Concentração'
  | 'Memorização'
  | 'Organização'
  | 'Leitura'
  | 'Favoritas';

const SUBJECT_CATEGORIES = [
  'Linguagens',
  'Exatas',
  'Humanas',
  'Idiomas',
  'Tecnologia',
  'Fé e Leitura',
  'Concursos',
  'Outros',
];

const WEEK_DAYS: StudyWeekDay[] = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

const DAY_ORDER: Record<StudyWeekDay, number> = {
  Seg: 1,
  Ter: 2,
  Qua: 3,
  Qui: 4,
  Sex: 5,
  Sáb: 6,
  Dom: 7,
};

const TOPIC_STATUS_META: Record<
  StudyTopicStatus,
  { label: string; icon: string; colorClass: string }
> = {
  a_estudar: {
    label: 'A estudar',
    icon: 'radio_button_unchecked',
    colorClass: 'text-light-on-surface-variant dark:text-dark-on-surface-variant',
  },
  estudando: {
    label: 'Estudando',
    icon: 'pending',
    colorClass: 'text-cat-blue',
  },
  concluido: {
    label: 'Concluído',
    icon: 'check_circle',
    colorClass: 'text-cat-emerald',
  },
};

const OTHER_KIND_META: Record<
  StudyOtherItem['kind'],
  { label: string; icon: string; colorClass: string }
> = {
  prova: {
    label: 'Prova / Simulado',
    icon: 'quiz',
    colorClass: 'text-accent-gold',
  },
  resumo: {
    label: 'Resumo',
    icon: 'summarize',
    colorClass: 'text-cat-emerald',
  },
  link: {
    label: 'Link útil',
    icon: 'link',
    colorClass: 'text-cat-blue',
  },
  outro: {
    label: 'Outro material',
    icon: 'sticky_note_2',
    colorClass: 'text-light-primary dark:text-dark-primary',
  },
};

function formatCountdown(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function formatMinutesLabel(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const rem = minutes % 60;
  return rem === 0 ? `${h}h` : `${h}h ${rem}min`;
}

function formatDateShort(dateStr?: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}`;
}

function getSafeExternalUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const parsed = new URL(candidate);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      return parsed.toString();
    }
    return null;
  } catch {
    return null;
  }
}

export const StudyView: React.FC<StudyViewProps> = ({
  subjects,
  topics,
  schedule,
  others,
  tips,
  favoriteTipIds,
  onAddSubject,
  onUpdateSubject,
  onLogSubjectMinutes,
  onDeleteSubject,
  onAddTopic,
  onSetTopicStatus,
  onCycleTopicStatus,
  onDeleteTopic,
  onAddScheduleBlock,
  onToggleScheduleBlock,
  onDeleteScheduleBlock,
  onAddOtherItem,
  onToggleOtherItem,
  onDeleteOtherItem,
  onToggleFavoriteTip,
  onAddStudyMinutes,
  onOpenBooks,
  onOpenYouTube,
  onBack,
  onShowToast,
}) => {
  const [subTab, setSubTab] = useState<StudySubTab>('materias');
  const [subjectFilter, setSubjectFilter] = useState<SubjectFilterMode>('todas');

  // Focus / Pomodoro Timer State
  const [timerSubjectId, setTimerSubjectId] = useState<string>(subjects[0]?.id ?? '');
  const [timerMinutesPreset, setTimerMinutesPreset] = useState<number>(25);
  const [secondsLeft, setSecondsLeft] = useState<number>(25 * 60);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);

  // New Subject + Initial Topic Form State
  const [showExtraSubjectFields, setShowExtraSubjectFields] = useState<boolean>(false);
  const [subjectName, setSubjectName] = useState<string>('');
  const [initialTopicTitle, setInitialTopicTitle] = useState<string>('');
  const [subjectCategory, setSubjectCategory] = useState<string>('Linguagens');
  const [subjectGoalMinutes, setSubjectGoalMinutes] = useState<string>('120');
  const [subjectNotes, setSubjectNotes] = useState<string>('');

  // Per-subject inline UI state (all subjects expanded by default so topics are always accessible)
  const [collapsedSubjectIds, setCollapsedSubjectIds] = useState<string[]>([]);
  const [newTopicDrafts, setNewTopicDrafts] = useState<Record<string, string>>({});
  const [editingNotesId, setEditingNotesId] = useState<string | null>(null);
  const [notesDraft, setNotesDraft] = useState<string>('');

  // Organization & Schedule State
  const [scheduleDayFilter, setScheduleDayFilter] = useState<StudyWeekDay | 'Todos'>('Todos');
  const [scheduleDay, setScheduleDay] = useState<StudyWeekDay>('Seg');
  const [scheduleTime, setScheduleTime] = useState<string>('19:00');
  const [scheduleSubject, setScheduleSubject] = useState<string>(
    subjects[0]?.name ?? ''
  );
  const [scheduleDuration, setScheduleDuration] = useState<string>('45');

  // Others (Provas, Resumos, Links, Outros) State
  const [otherFilter, setOtherFilter] = useState<OtherFilter>('todos');
  const [otherKind, setOtherKind] = useState<StudyOtherItem['kind']>('prova');
  const [otherTitle, setOtherTitle] = useState<string>('');
  const [otherSubjectName, setOtherSubjectName] = useState<string>('');
  const [otherDetail, setOtherDetail] = useState<string>('');
  const [otherDate, setOtherDate] = useState<string>('');

  // Tips State
  const [tipCategory, setTipCategory] = useState<TipCategoryFilter>('Todas');
  const [tipQuery, setTipQuery] = useState<string>('');

  useEffect(() => {
    if (subjects.length > 0 && !subjects.some((s) => s.id === timerSubjectId)) {
      setTimerSubjectId(subjects[0].id);
    }
    if (subjects.length > 0 && !scheduleSubject) {
      setScheduleSubject(subjects[0].name);
    }
  }, [subjects, timerSubjectId, scheduleSubject]);

  useEffect(() => {
    if (!isTimerRunning) return;
    const interval = window.setInterval(() => {
      setSecondsLeft((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => window.clearInterval(interval);
  }, [isTimerRunning]);

  useEffect(() => {
    if (isTimerRunning && secondsLeft === 0) {
      setIsTimerRunning(false);
    }
  }, [isTimerRunning, secondsLeft]);

  const totalStudiedMinutes = useMemo(
    () => subjects.reduce((sum, s) => sum + s.studiedMinutes, 0),
    [subjects]
  );
  const totalGoalMinutes = useMemo(
    () => subjects.reduce((sum, s) => sum + s.weeklyGoalMinutes, 0),
    [subjects]
  );
  const completedTopics = useMemo(
    () => topics.filter((t) => t.status === 'concluido'),
    [topics]
  );
  const completedTopicsCount = completedTopics.length;
  const pendingTopicsCount = useMemo(
    () => topics.filter((t) => t.status !== 'concluido').length,
    [topics]
  );
  const completedScheduleCount = useMemo(
    () => schedule.filter((b) => b.done).length,
    [schedule]
  );
  const pendingOthersCount = useMemo(
    () => others.filter((o) => !o.done).length,
    [others]
  );

  const selectedTimerSubject = subjects.find((s) => s.id === timerSubjectId) ?? null;

  const handleSelectPreset = (minutes: number) => {
    setIsTimerRunning(false);
    setTimerMinutesPreset(minutes);
    setSecondsLeft(minutes * 60);
  };

  const handleCompleteStudySession = () => {
    const elapsedSeconds = Math.max(0, timerMinutesPreset * 60 - secondsLeft);
    const loggedMinutes =
      elapsedSeconds >= 60 ? Math.round(elapsedSeconds / 60) : timerMinutesPreset;

    setIsTimerRunning(false);
    setSecondsLeft(timerMinutesPreset * 60);

    if (selectedTimerSubject) {
      onLogSubjectMinutes(selectedTimerSubject.id, loggedMinutes);
    }
    onAddStudyMinutes?.(loggedMinutes);
    onShowToast(
      selectedTimerSubject
        ? `+${loggedMinutes} min registrados em "${selectedTimerSubject.name}".`
        : `+${loggedMinutes} min de estudo registrados.`
    );
  };

  const handleLaunchQuickTipTimer = (minutes: number, tipTitle: string) => {
    setIsTimerRunning(true);
    setTimerMinutesPreset(minutes);
    setSecondsLeft(minutes * 60);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    onShowToast(`Timer de ${minutes} min iniciado: ${tipTitle}`);
  };

  const handleCreateSubject = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = subjectName.trim();
    const cleanTopic = initialTopicTitle.trim();
    if (!cleanName) {
      onShowToast('Informe o nome da matéria.');
      return;
    }

    const existing = subjects.find(
      (s) => s.name.trim().toLowerCase() === cleanName.toLowerCase()
    );

    if (existing) {
      if (!cleanTopic) {
        onShowToast(`A matéria "${existing.name}" já existe. Digite um assunto para adicionar.`);
        return;
      }
      onAddTopic({
        subjectId: existing.id,
        title: cleanTopic,
        status: 'a_estudar',
      });
      setCollapsedSubjectIds((prev) => prev.filter((id) => id !== existing.id));
      setInitialTopicTitle('');
      onShowToast(`Assunto "${cleanTopic}" adicionado em "${existing.name}".`);
      return;
    }

    const goal = Math.max(15, parseInt(subjectGoalMinutes, 10) || 120);
    onAddSubject(
      {
        name: cleanName,
        category: subjectCategory,
        weeklyGoalMinutes: goal,
        notes: subjectNotes.trim() || undefined,
      },
      cleanTopic || undefined
    );
    setSubjectName('');
    setInitialTopicTitle('');
    setSubjectNotes('');
    setSubjectGoalMinutes('120');
    setShowExtraSubjectFields(false);
    onShowToast(
      cleanTopic
        ? `Matéria "${cleanName}" e assunto "${cleanTopic}" adicionados.`
        : `Matéria "${cleanName}" adicionada.`
    );
  };

  const handleCreateTopic = (subjectId: string) => {
    const title = (newTopicDrafts[subjectId] ?? '').trim();
    if (!title) {
      onShowToast('Digite o assunto para adicionar.');
      return;
    }
    onAddTopic({
      subjectId,
      title,
      status: 'a_estudar',
    });
    setNewTopicDrafts((prev) => ({ ...prev, [subjectId]: '' }));
    onShowToast(`Assunto "${title}" adicionado.`);
  };

  const handleCreateScheduleBlock = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanSubject = scheduleSubject.trim();
    if (!cleanSubject) {
      onShowToast('Informe a matéria ou atividade para o cronograma.');
      return;
    }
    const duration = Math.max(10, parseInt(scheduleDuration, 10) || 45);
    onAddScheduleBlock({
      day: scheduleDay,
      time: scheduleTime || '19:00',
      subjectName: cleanSubject,
      durationMinutes: duration,
    });
    onShowToast(`Bloco adicionado em ${scheduleDay} às ${scheduleTime || '19:00'}.`);
  };

  const handleCreateOtherItem = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTitle = otherTitle.trim();
    const cleanDetail = otherDetail.trim();
    if (!cleanTitle) {
      onShowToast('Informe um título para o item.');
      return;
    }
    onAddOtherItem({
      kind: otherKind,
      title: cleanTitle,
      subjectName: otherSubjectName.trim() || undefined,
      detail: cleanDetail || 'Sem detalhes adicionais.',
      date: otherDate || undefined,
    });
    setOtherTitle('');
    setOtherDetail('');
    setOtherDate('');
    onShowToast(`Item "${cleanTitle}" salvo em Outros.`);
  };

  const sortedSchedule = useMemo(() => {
    return [...schedule]
      .filter((b) => scheduleDayFilter === 'Todos' || b.day === scheduleDayFilter)
      .sort((a, b) => {
        const dayDiff = DAY_ORDER[a.day] - DAY_ORDER[b.day];
        if (dayDiff !== 0) return dayDiff;
        return a.time.localeCompare(b.time);
      });
  }, [schedule, scheduleDayFilter]);

  const filteredOthers = useMemo(() => {
    return others.filter((item) => otherFilter === 'todos' || item.kind === otherFilter);
  }, [others, otherFilter]);

  const filteredTips = useMemo(() => {
    const q = tipQuery.trim().toLowerCase();
    return tips.filter((tip) => {
      const matchesCategory =
        tipCategory === 'Todas' ||
        (tipCategory === 'Favoritas'
          ? favoriteTipIds.includes(tip.id)
          : tip.category === tipCategory);
      const matchesQuery =
        !q ||
        tip.title.toLowerCase().includes(q) ||
        tip.summary.toLowerCase().includes(q) ||
        tip.howToApply.toLowerCase().includes(q);
      return matchesCategory && matchesQuery;
    });
  }, [tips, tipCategory, tipQuery, favoriteTipIds]);

  const totalProgressPct =
    totalGoalMinutes > 0
      ? Math.min(100, Math.round((totalStudiedMinutes / totalGoalMinutes) * 100))
      : 0;

  return (
    <div className="flex flex-col">
      {/* Header */}
      <header className="px-4 lg:px-8 pt-6 pb-4 flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBack}
              aria-label="Voltar"
              className="inline-flex items-center justify-center w-11 h-11 rounded-full bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant text-light-on-surface dark:text-dark-on-surface hover:border-light-primary dark:hover:border-dark-primary transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]">arrow_back</span>
            </button>
            <div>
              <h1 className="font-headline text-headline-lg text-light-on-surface dark:text-dark-on-surface">
                Estudar
              </h1>
              <p className="font-body text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
                Organize matérias, cronograma, outros materiais e dicas de estudo.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onOpenBooks}
              className="inline-flex items-center gap-1.5 min-h-[40px] px-3 rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant font-body text-body-sm text-light-on-surface dark:text-dark-on-surface hover:border-light-primary dark:hover:border-dark-primary transition-colors"
            >
              <span className="material-symbols-outlined text-[18px] text-accent-gold">
                menu_book
              </span>
              <span>Livros</span>
            </button>
            <button
              type="button"
              onClick={onOpenYouTube}
              className="inline-flex items-center gap-1.5 min-h-[40px] px-3 rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant font-body text-body-sm text-light-on-surface dark:text-dark-on-surface hover:border-light-primary dark:hover:border-dark-primary transition-colors"
            >
              <span className="material-symbols-outlined text-[18px] text-light-error dark:text-dark-error">
                smart_display
              </span>
              <span>YouTube</span>
            </button>
          </div>
        </div>

        {/* Summary KPI Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
          <div className="rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant p-3 flex flex-col gap-1">
            <span className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
              Tempo na semana
            </span>
            <span className="font-mono text-title-md text-light-on-surface dark:text-dark-on-surface tabular-nums">
              {formatMinutesLabel(totalStudiedMinutes)}
            </span>
            <span className="font-body text-label-sm text-cat-blue font-mono tabular-nums">
              Meta {formatMinutesLabel(totalGoalMinutes)} · {totalProgressPct}%
            </span>
          </div>

          <div className="rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant p-3 flex flex-col gap-1">
            <span className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
              Matérias e tópicos
            </span>
            <span className="font-mono text-title-md text-light-on-surface dark:text-dark-on-surface tabular-nums">
              {subjects.length} matérias
            </span>
            <span className="font-body text-label-sm text-cat-emerald font-mono tabular-nums">
              {completedTopicsCount}/{topics.length} tópicos concluídos
            </span>
          </div>

          <div className="rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant p-3 flex flex-col gap-1">
            <span className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
              Cronograma semanal
            </span>
            <span className="font-mono text-title-md text-light-on-surface dark:text-dark-on-surface tabular-nums">
              {completedScheduleCount}/{schedule.length} blocos
            </span>
            <span className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
              Sessões organizadas
            </span>
          </div>

          <div className="rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant p-3 flex flex-col gap-1">
            <span className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
              Provas e materiais
            </span>
            <span className="font-mono text-title-md text-light-on-surface dark:text-dark-on-surface tabular-nums">
              {pendingOthersCount} pendentes
            </span>
            <span className="font-body text-label-sm text-accent-gold font-mono tabular-nums">
              {favoriteTipIds.length} dicas salvas
            </span>
          </div>
        </div>

        {/* Focus Timer Bar */}
        <section
          aria-label="Cronômetro de estudo focado"
          className="rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant p-3.5 flex flex-col md:flex-row md:items-center md:justify-between gap-3"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-lg bg-light-primary/10 dark:bg-dark-primary/15 text-cat-blue flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[24px]">timer</span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-headline-md text-light-on-surface dark:text-dark-on-surface tabular-nums">
                  {formatCountdown(secondsLeft)}
                </span>
                <span className="font-body text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
                  {isTimerRunning
                    ? 'Em andamento'
                    : secondsLeft === 0
                      ? 'Sessão finalizada'
                      : 'Modo foco'}
                </span>
              </div>
              <div className="mt-1 flex items-center gap-2 flex-wrap">
                <select
                  aria-label="Selecionar matéria para o cronômetro"
                  value={timerSubjectId}
                  onChange={(e) => setTimerSubjectId(e.target.value)}
                  className="rounded-md bg-light-surface dark:bg-dark-surface border border-light-outline-variant dark:border-dark-outline-variant text-light-on-surface dark:text-dark-on-surface font-body text-body-sm px-2.5 py-1.5 focus:outline-none focus:border-light-primary dark:focus:border-dark-primary max-w-full"
                >
                  {subjects.length === 0 ? (
                    <option value="">Sem matérias cadastradas</option>
                  ) : (
                    subjects.map((sub) => (
                      <option key={sub.id} value={sub.id}>
                        {sub.name}
                      </option>
                    ))
                  )}
                </select>

                <div className="flex items-center gap-1">
                  {[15, 25, 50].map((min) => (
                    <button
                      key={min}
                      type="button"
                      onClick={() => handleSelectPreset(min)}
                      className={`min-h-[34px] px-2.5 rounded-md font-mono text-label-sm tabular-nums transition-colors border ${
                        timerMinutesPreset === min
                          ? 'bg-light-primary dark:bg-dark-primary text-light-on-primary dark:text-dark-on-primary border-transparent font-semibold'
                          : 'bg-light-surface dark:bg-dark-surface text-light-on-surface-variant dark:text-dark-on-surface-variant border-light-outline-variant dark:border-dark-outline-variant'
                      }`}
                    >
                      {min}m
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                if (secondsLeft === 0) setSecondsLeft(timerMinutesPreset * 60);
                setIsTimerRunning((prev) => !prev);
              }}
              className="inline-flex items-center gap-1.5 min-h-[42px] px-4 rounded-lg bg-light-primary dark:bg-dark-primary text-light-on-primary dark:text-dark-on-primary font-body text-body-sm font-semibold transition-opacity hover:opacity-90"
            >
              <span className="material-symbols-outlined text-[18px]">
                {isTimerRunning ? 'pause' : 'play_arrow'}
              </span>
              <span>{isTimerRunning ? 'Pausar' : 'Iniciar foco'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsTimerRunning(false);
                setSecondsLeft(timerMinutesPreset * 60);
              }}
              aria-label="Reiniciar cronômetro"
              className="inline-flex items-center justify-center min-w-[42px] min-h-[42px] px-3 rounded-lg border border-light-outline-variant dark:border-dark-outline-variant text-light-on-surface-variant dark:text-dark-on-surface-variant hover:text-light-on-surface dark:hover:text-dark-on-surface"
            >
              <span className="material-symbols-outlined text-[18px]">refresh</span>
            </button>

            <button
              type="button"
              onClick={handleCompleteStudySession}
              className="inline-flex items-center gap-1.5 min-h-[42px] px-3.5 rounded-lg border border-cat-emerald/50 text-cat-emerald font-body text-body-sm font-medium hover:bg-cat-emerald/10 transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">check</span>
              <span>Concluir sessão</span>
            </button>
          </div>
        </section>

        {/* Sub-Tabs */}
        <div className="grid grid-cols-3 gap-1 p-1 rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant">
          {(
            [
              { id: 'materias', label: `Matérias (${subjects.length})` },
              {
                id: 'organizacao',
                label: `Organização e Outros (${schedule.length + others.length})`,
              },
              { id: 'dicas', label: `Dicas (${tips.length})` },
            ] as { id: StudySubTab; label: string }[]
          ).map((tab) => {
            const active = subTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSubTab(tab.id)}
                className={`min-h-[40px] px-2 py-1.5 rounded-md font-body text-body-sm transition-colors truncate ${
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
        {/* TAB 1: MATÉRIAS E ASSUNTOS */}
        {subTab === 'materias' && (
          <section className="flex flex-col gap-4">
            <div>
              <h2 className="font-headline text-title-md text-light-on-surface dark:text-dark-on-surface">
                Matérias e Assuntos de Estudo
              </h2>
              <p className="font-body text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
                Coloque a matéria e o assunto que vai estudar, adicione outros assuntos em cada matéria e acompanhe o que já foi concluído.
              </p>
            </div>

            {/* Always-visible quick form: Matéria + Assunto */}
            <form
              onSubmit={handleCreateSubject}
              className="rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant p-4 flex flex-col gap-3"
            >
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                <div className="flex flex-col gap-1 md:col-span-5">
                  <label
                    htmlFor="study-subject-name"
                    className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant"
                  >
                    Matéria (nova ou existente)
                  </label>
                  <input
                    id="study-subject-name"
                    type="text"
                    list="study-subjects-datalist"
                    value={subjectName}
                    onChange={(e) => setSubjectName(e.target.value)}
                    placeholder="Ex.: Português, Matemática..."
                    className="rounded-md bg-light-surface dark:bg-dark-surface border border-light-outline-variant dark:border-dark-outline-variant px-3 py-2.5 font-body text-body-md text-light-on-surface dark:text-dark-on-surface focus:outline-none focus:border-light-primary dark:focus:border-dark-primary"
                  />
                  <datalist id="study-subjects-datalist">
                    {subjects.map((s) => (
                      <option key={s.id} value={s.name} />
                    ))}
                  </datalist>
                </div>

                <div className="flex flex-col gap-1 md:col-span-5">
                  <label
                    htmlFor="study-initial-topic"
                    className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant"
                  >
                    Assunto que vou estudar
                  </label>
                  <input
                    id="study-initial-topic"
                    type="text"
                    value={initialTopicTitle}
                    onChange={(e) => setInitialTopicTitle(e.target.value)}
                    placeholder="Ex.: Crase, Porcentagem, Romanos..."
                    className="rounded-md bg-light-surface dark:bg-dark-surface border border-light-outline-variant dark:border-dark-outline-variant px-3 py-2.5 font-body text-body-md text-light-on-surface dark:text-dark-on-surface focus:outline-none focus:border-light-primary dark:focus:border-dark-primary"
                  />
                </div>

                <div className="md:col-span-2">
                  <button
                    type="submit"
                    className="w-full min-h-[44px] px-4 rounded-lg bg-light-primary dark:bg-dark-primary text-light-on-primary dark:text-dark-on-primary font-body text-body-sm font-semibold inline-flex items-center justify-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-[18px]">add</span>
                    <span>Adicionar</span>
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setShowExtraSubjectFields((prev) => !prev)}
                  className="font-body text-label-sm text-light-primary dark:text-dark-primary hover:underline inline-flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[16px]">
                    {showExtraSubjectFields ? 'expand_less' : 'tune'}
                  </span>
                  <span>
                    {showExtraSubjectFields
                      ? 'Ocultar área, meta e anotação'
                      : 'Definir área, meta semanal e anotação (opcional)'}
                  </span>
                </button>
              </div>

              {showExtraSubjectFields && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-light-outline-variant dark:border-dark-outline-variant">
                  <div className="flex flex-col gap-1">
                    <label
                      htmlFor="study-subject-category"
                      className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant"
                    >
                      Área
                    </label>
                    <select
                      id="study-subject-category"
                      value={subjectCategory}
                      onChange={(e) => setSubjectCategory(e.target.value)}
                      className="rounded-md bg-light-surface dark:bg-dark-surface border border-light-outline-variant dark:border-dark-outline-variant px-3 py-2 font-body text-body-sm text-light-on-surface dark:text-dark-on-surface focus:outline-none focus:border-light-primary dark:focus:border-dark-primary"
                    >
                      {SUBJECT_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label
                      htmlFor="study-subject-goal"
                      className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant"
                    >
                      Meta semanal (minutos)
                    </label>
                    <input
                      id="study-subject-goal"
                      type="number"
                      min={15}
                      step={15}
                      value={subjectGoalMinutes}
                      onChange={(e) => setSubjectGoalMinutes(e.target.value)}
                      className="rounded-md bg-light-surface dark:bg-dark-surface border border-light-outline-variant dark:border-dark-outline-variant px-3 py-2 font-mono text-body-sm text-light-on-surface dark:text-dark-on-surface tabular-nums focus:outline-none focus:border-light-primary dark:focus:border-dark-primary"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label
                      htmlFor="study-subject-notes"
                      className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant"
                    >
                      Anotação rápida
                    </label>
                    <input
                      id="study-subject-notes"
                      type="text"
                      value={subjectNotes}
                      onChange={(e) => setSubjectNotes(e.target.value)}
                      placeholder="Ex.: Revisar resumos antes da prova"
                      className="rounded-md bg-light-surface dark:bg-dark-surface border border-light-outline-variant dark:border-dark-outline-variant px-3 py-2 font-body text-body-sm text-light-on-surface dark:text-dark-on-surface focus:outline-none focus:border-light-primary dark:focus:border-dark-primary"
                    />
                  </div>
                </div>
              )}
            </form>

            {/* Filter Bar: Todas / A estudar / Concluídas */}
            <div className="grid grid-cols-3 gap-1 p-1 rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant">
              {(
                [
                  { id: 'todas', label: `Todas (${subjects.length})` },
                  { id: 'pendentes', label: `A estudar (${pendingTopicsCount})` },
                  { id: 'concluidas', label: `Concluídas (${completedTopicsCount})` },
                ] as { id: SubjectFilterMode; label: string }[]
              ).map((tab) => {
                const active = subjectFilter === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setSubjectFilter(tab.id)}
                    className={`min-h-[38px] px-2 py-1.5 rounded-md font-body text-body-sm transition-colors truncate ${
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

            {subjectFilter === 'concluidas' ? (
              <div className="flex flex-col gap-3">
                {completedTopics.length === 0 ? (
                  <div className="rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant p-6 text-center flex flex-col items-center gap-2">
                    <span className="material-symbols-outlined text-[32px] text-light-on-surface-variant dark:text-dark-on-surface-variant">
                      task_alt
                    </span>
                    <p className="font-body text-body-md text-light-on-surface dark:text-dark-on-surface">
                      Nenhum assunto concluído ainda.
                    </p>
                    <p className="font-body text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
                      Toque em &ldquo;Concluir&rdquo; em qualquer assunto das suas matérias para vê-lo aqui.
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {subjects.map((subject) => {
                      const subjectTopics = topics.filter(
                        (t) => t.subjectId === subject.id
                      );
                      const doneTopics = subjectTopics.filter(
                        (t) => t.status === 'concluido'
                      );
                      if (doneTopics.length === 0) return null;
                      const allDone =
                        subjectTopics.length > 0 &&
                        doneTopics.length === subjectTopics.length;
                      return (
                        <article
                          key={subject.id}
                          className="rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-cat-emerald/40 p-4 flex flex-col gap-2.5"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div>
                              <span className="font-body text-label-sm text-cat-emerald">
                                {subject.category} · {doneTopics.length}/{subjectTopics.length}{' '}
                                assunto(s) concluído(s)
                                {allDone ? ' · Matéria concluída' : ''}
                              </span>
                              <h3 className="font-headline text-title-md text-light-on-surface dark:text-dark-on-surface">
                                {subject.name}
                              </h3>
                            </div>
                          </div>

                          <ul className="flex flex-col gap-2">
                            {doneTopics.map((topic) => (
                              <li
                                key={topic.id}
                                className="rounded-md bg-light-surface dark:bg-dark-surface border border-light-outline-variant dark:border-dark-outline-variant px-3 py-2 flex items-center justify-between gap-2"
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <span className="material-symbols-outlined material-symbols-filled text-[20px] text-cat-emerald shrink-0">
                                    check_circle
                                  </span>
                                  <span className="font-body text-body-sm text-light-on-surface dark:text-dark-on-surface truncate">
                                    {topic.title}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      onSetTopicStatus(topic.id, 'a_estudar');
                                      onShowToast(`"${topic.title}" reaberto para estudar.`);
                                    }}
                                    className="min-h-[32px] px-2.5 rounded font-body text-label-sm text-light-primary dark:text-dark-primary hover:bg-light-primary/10 dark:hover:bg-dark-primary/10"
                                  >
                                    Reabrir
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => onDeleteTopic(topic.id)}
                                    aria-label={`Remover assunto ${topic.title}`}
                                    className="inline-flex items-center justify-center w-8 h-8 rounded-full text-light-on-surface-variant dark:text-dark-on-surface-variant hover:text-light-error dark:hover:text-dark-error"
                                  >
                                    <span className="material-symbols-outlined text-[18px]">
                                      close
                                    </span>
                                  </button>
                                </div>
                              </li>
                            ))}
                          </ul>
                        </article>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : subjects.length === 0 ? (
              <div className="rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant p-6 text-center flex flex-col items-center gap-2">
                <span className="material-symbols-outlined text-[32px] text-light-on-surface-variant dark:text-dark-on-surface-variant">
                  school
                </span>
                <p className="font-body text-body-md text-light-on-surface dark:text-dark-on-surface">
                  Nenhuma matéria cadastrada ainda.
                </p>
                <p className="font-body text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
                  Preencha acima a matéria e o assunto que vai estudar para começar.
                </p>
              </div>
            ) : subjectFilter === 'pendentes' &&
              subjects.every((s) => {
                const st = topics.filter((t) => t.subjectId === s.id);
                return st.length > 0 && st.every((t) => t.status === 'concluido');
              }) ? (
              <div className="rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-cat-emerald/40 p-6 text-center flex flex-col items-center gap-2">
                <span className="material-symbols-outlined material-symbols-filled text-[32px] text-cat-emerald">
                  check_circle
                </span>
                <p className="font-body text-body-md text-light-on-surface dark:text-dark-on-surface">
                  Todos os assuntos cadastrados já foram concluídos!
                </p>
                <p className="font-body text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
                  Adicione um novo assunto acima ou veja tudo na aba &ldquo;Concluídas&rdquo;.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-3">
                  {subjects.map((subject) => {
                    const allSubjectTopics = topics.filter(
                      (t) => t.subjectId === subject.id
                    );
                    const visibleTopics =
                      subjectFilter === 'pendentes'
                        ? allSubjectTopics.filter((t) => t.status !== 'concluido')
                        : allSubjectTopics;

                    if (
                      subjectFilter === 'pendentes' &&
                      allSubjectTopics.length > 0 &&
                      visibleTopics.length === 0
                    ) {
                      return null;
                    }

                    const doneCount = allSubjectTopics.filter(
                      (t) => t.status === 'concluido'
                    ).length;
                    const allTopicsCompleted =
                      allSubjectTopics.length > 0 &&
                      doneCount === allSubjectTopics.length;
                    const pct =
                      subject.weeklyGoalMinutes > 0
                        ? Math.min(
                            100,
                            Math.round(
                              (subject.studiedMinutes / subject.weeklyGoalMinutes) * 100
                            )
                          )
                        : 0;
                    const isExpanded = !collapsedSubjectIds.includes(subject.id);
                    const isEditingNotes = editingNotesId === subject.id;

                    return (
                      <article
                        key={subject.id}
                        className={`rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border p-4 flex flex-col gap-3 ${
                          allTopicsCompleted
                            ? 'border-cat-emerald/50'
                            : 'border-light-outline-variant dark:border-dark-outline-variant'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <span
                              className={`font-body text-label-sm ${
                                allTopicsCompleted ? 'text-cat-emerald' : 'text-cat-blue'
                              }`}
                            >
                              {subject.category} · {allSubjectTopics.length} assunto(s) ·{' '}
                              {doneCount} concluído(s)
                              {allTopicsCompleted ? ' · Tudo concluído' : ''}
                            </span>
                            <h3 className="font-headline text-title-md text-light-on-surface dark:text-dark-on-surface mt-0.5">
                              {subject.name}
                            </h3>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                onLogSubjectMinutes(subject.id, 15);
                                onAddStudyMinutes?.(15);
                                onShowToast(`+15 min adicionados em "${subject.name}".`);
                              }}
                              title="Registrar +15 minutos nesta matéria"
                              className="min-h-[38px] px-2.5 rounded-md border border-light-outline-variant dark:border-dark-outline-variant font-mono text-label-sm text-cat-emerald hover:bg-cat-emerald/10 transition-colors tabular-nums"
                            >
                              +15m
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                setCollapsedSubjectIds((prev) =>
                                  prev.includes(subject.id)
                                    ? prev.filter((id) => id !== subject.id)
                                    : [...prev, subject.id]
                                )
                              }
                              aria-expanded={isExpanded}
                              aria-label={
                                isExpanded ? 'Recolher assuntos' : 'Mostrar assuntos'
                              }
                              className="inline-flex items-center justify-center w-10 h-10 rounded-full text-light-on-surface-variant dark:text-dark-on-surface-variant hover:text-light-on-surface dark:hover:text-dark-on-surface"
                            >
                              <span className="material-symbols-outlined text-[20px]">
                                {isExpanded ? 'expand_less' : 'expand_more'}
                              </span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                onDeleteSubject(subject.id);
                                onShowToast(`Matéria "${subject.name}" removida.`);
                              }}
                              aria-label={`Remover ${subject.name}`}
                              className="inline-flex items-center justify-center w-10 h-10 rounded-full text-light-on-surface-variant dark:text-dark-on-surface-variant hover:text-light-error dark:hover:text-dark-error"
                            >
                              <span className="material-symbols-outlined text-[20px]">
                                delete_outline
                              </span>
                            </button>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center justify-between font-mono text-label-sm tabular-nums">
                            <span className="text-light-on-surface-variant dark:text-dark-on-surface-variant">
                              Estudado: {formatMinutesLabel(subject.studiedMinutes)} / Meta{' '}
                              {formatMinutesLabel(subject.weeklyGoalMinutes)}
                            </span>
                            <span className="text-light-on-surface dark:text-dark-on-surface font-semibold">
                              {pct}%
                            </span>
                          </div>
                          <div className="h-2 rounded-full bg-light-surface-container-high dark:bg-dark-surface-container-high overflow-hidden">
                            <div
                              className="h-full rounded-full bg-cat-blue transition-all duration-300"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>

                        {/* Notes Display / Inline Edit */}
                        {isEditingNotes ? (
                          <div className="flex flex-col sm:flex-row gap-2">
                            <input
                              type="text"
                              value={notesDraft}
                              onChange={(e) => setNotesDraft(e.target.value)}
                              placeholder="Anotação sobre esta matéria..."
                              className="flex-1 rounded-md bg-light-surface dark:bg-dark-surface border border-light-outline-variant dark:border-dark-outline-variant px-3 py-1.5 font-body text-body-sm text-light-on-surface dark:text-dark-on-surface focus:outline-none focus:border-light-primary dark:focus:border-dark-primary"
                            />
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  onUpdateSubject(subject.id, {
                                    notes: notesDraft.trim() || undefined,
                                  });
                                  setEditingNotesId(null);
                                  onShowToast('Anotação salva.');
                                }}
                                className="min-h-[36px] px-3 rounded-md bg-light-primary dark:bg-dark-primary text-light-on-primary dark:text-dark-on-primary font-body text-label-sm font-semibold"
                              >
                                Salvar
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingNotesId(null)}
                                className="min-h-[36px] px-3 rounded-md border border-light-outline-variant dark:border-dark-outline-variant font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant"
                              >
                                Cancelar
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-body text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
                              {subject.notes ? subject.notes : 'Sem anotações nesta matéria.'}
                            </p>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingNotesId(subject.id);
                                setNotesDraft(subject.notes ?? '');
                              }}
                              className="font-body text-label-sm text-light-primary dark:text-dark-primary hover:underline shrink-0"
                            >
                              {subject.notes ? 'Editar nota' : 'Adicionar nota'}
                            </button>
                          </div>
                        )}

                        {/* Assuntos da Matéria (visible by default) */}
                        {isExpanded && (
                          <div className="pt-3 border-t border-light-outline-variant dark:border-dark-outline-variant flex flex-col gap-2.5">
                            <div className="flex items-center justify-between">
                              <span className="font-body text-label-lg text-light-on-surface dark:text-dark-on-surface">
                                Assuntos da matéria
                              </span>
                              <span className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
                                Marque como Concluído ao finalizar
                              </span>
                            </div>

                            {visibleTopics.length === 0 ? (
                              <p className="font-body text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
                                Nenhum assunto pendente nesta matéria. Adicione outro assunto abaixo.
                              </p>
                            ) : (
                              <ul className="flex flex-col gap-2">
                                {visibleTopics.map((topic) => {
                                  const meta = TOPIC_STATUS_META[topic.status];
                                  const isDone = topic.status === 'concluido';
                                  return (
                                    <li
                                      key={topic.id}
                                      className="rounded-md bg-light-surface dark:bg-dark-surface border border-light-outline-variant dark:border-dark-outline-variant px-3 py-2 flex flex-wrap sm:flex-nowrap items-center justify-between gap-2"
                                    >
                                      <button
                                        type="button"
                                        onClick={() =>
                                          onSetTopicStatus(
                                            topic.id,
                                            isDone ? 'a_estudar' : 'concluido'
                                          )
                                        }
                                        aria-label={
                                          isDone
                                            ? `Reabrir ${topic.title}`
                                            : `Concluir ${topic.title}`
                                        }
                                        className="flex items-center gap-2.5 min-w-0 flex-1 text-left"
                                      >
                                        <span
                                          className={`material-symbols-outlined text-[20px] shrink-0 ${meta.colorClass} ${
                                            isDone ? 'material-symbols-filled' : ''
                                          }`}
                                        >
                                          {meta.icon}
                                        </span>
                                        <span
                                          className={`font-body text-body-sm truncate ${
                                            isDone
                                              ? 'line-through text-light-on-surface-variant dark:text-dark-on-surface-variant'
                                              : 'text-light-on-surface dark:text-dark-on-surface'
                                          }`}
                                        >
                                          {topic.title}
                                        </span>
                                      </button>

                                      <div className="flex items-center gap-1.5 shrink-0">
                                        <button
                                          type="button"
                                          onClick={() => onCycleTopicStatus(topic.id)}
                                          className={`min-h-[32px] px-2 rounded font-body text-label-sm ${meta.colorClass} hover:bg-light-surface-container-low dark:hover:bg-dark-surface-container-low`}
                                        >
                                          {meta.label}
                                        </button>

                                        {!isDone && (
                                          <button
                                            type="button"
                                            onClick={() => {
                                              onSetTopicStatus(topic.id, 'concluido');
                                              onShowToast(`"${topic.title}" concluído!`);
                                            }}
                                            className="min-h-[32px] px-2.5 rounded border border-cat-emerald/40 text-cat-emerald font-body text-label-sm font-medium hover:bg-cat-emerald/10"
                                          >
                                            Concluir
                                          </button>
                                        )}

                                        <button
                                          type="button"
                                          onClick={() => onDeleteTopic(topic.id)}
                                          aria-label={`Remover assunto ${topic.title}`}
                                          className="inline-flex items-center justify-center w-8 h-8 rounded-full text-light-on-surface-variant dark:text-dark-on-surface-variant hover:text-light-error dark:hover:text-dark-error"
                                        >
                                          <span className="material-symbols-outlined text-[18px]">
                                            close
                                          </span>
                                        </button>
                                      </div>
                                    </li>
                                  );
                                })}
                              </ul>
                            )}

                            {/* Add Another Assunto Inline */}
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={newTopicDrafts[subject.id] ?? ''}
                                onChange={(e) =>
                                  setNewTopicDrafts((prev) => ({
                                    ...prev,
                                    [subject.id]: e.target.value,
                                  }))
                                }
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleCreateTopic(subject.id);
                                  }
                                }}
                                placeholder={`Adicionar outro assunto em ${subject.name}...`}
                                aria-label={`Novo assunto em ${subject.name}`}
                                className="flex-1 rounded-md bg-light-surface dark:bg-dark-surface border border-light-outline-variant dark:border-dark-outline-variant px-3 py-2 font-body text-body-sm text-light-on-surface dark:text-dark-on-surface focus:outline-none focus:border-light-primary dark:focus:border-dark-primary"
                              />
                              <button
                                type="button"
                                onClick={() => handleCreateTopic(subject.id)}
                                className="min-h-[38px] px-3.5 rounded-md bg-light-primary/15 dark:bg-dark-primary/20 text-light-primary dark:text-dark-primary font-body text-body-sm font-semibold shrink-0"
                              >
                                + Assunto
                              </button>
                            </div>
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>

                {/* Always-clear summary of already concluded topics & subjects on "Todas" */}
                {subjectFilter === 'todas' && completedTopics.length > 0 && (
                  <section className="rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-cat-emerald/40 p-4 flex flex-col gap-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined material-symbols-filled text-[20px] text-cat-emerald">
                          check_circle
                        </span>
                        <h3 className="font-headline text-title-md text-light-on-surface dark:text-dark-on-surface">
                          Já Concluídas ({completedTopics.length})
                        </h3>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSubjectFilter('concluidas')}
                        className="font-body text-label-sm text-cat-emerald hover:underline"
                      >
                        Ver só concluídas
                      </button>
                    </div>

                    <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {completedTopics.map((topic) => {
                        const parent = subjects.find((s) => s.id === topic.subjectId);
                        return (
                          <li
                            key={topic.id}
                            className="rounded-md bg-light-surface dark:bg-dark-surface border border-light-outline-variant dark:border-dark-outline-variant px-3 py-2 flex items-center justify-between gap-2"
                          >
                            <div className="min-w-0">
                              <span className="font-body text-label-sm text-cat-emerald block truncate">
                                {parent ? parent.name : 'Matéria'}
                              </span>
                              <span className="font-body text-body-sm text-light-on-surface dark:text-dark-on-surface block truncate">
                                {topic.title}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                onSetTopicStatus(topic.id, 'a_estudar');
                                onShowToast(`"${topic.title}" reaberto para estudar.`);
                              }}
                              className="min-h-[32px] px-2.5 rounded font-body text-label-sm text-light-primary dark:text-dark-primary hover:bg-light-primary/10 dark:hover:bg-dark-primary/10 shrink-0"
                            >
                              Reabrir
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                )}
              </div>
            )}
          </section>
        )}

        {/* TAB 2: ORGANIZAÇÃO (CRONOGRAMA) & OUTROS */}
        {subTab === 'organizacao' && (
          <div className="flex flex-col gap-6">
            {/* Cronograma Semanal */}
            <section className="flex flex-col gap-3">
              <div>
                <h2 className="font-headline text-title-md text-light-on-surface dark:text-dark-on-surface">
                  Organização Semanal de Estudos
                </h2>
                <p className="font-body text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
                  Defina seus horários fixos na semana e marque cada bloco ao concluir.
                </p>
              </div>

              <form
                onSubmit={handleCreateScheduleBlock}
                className="rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant p-3.5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 items-end"
              >
                <div className="flex flex-col gap-1">
                  <label
                    htmlFor="sch-day"
                    className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant"
                  >
                    Dia
                  </label>
                  <select
                    id="sch-day"
                    value={scheduleDay}
                    onChange={(e) => setScheduleDay(e.target.value as StudyWeekDay)}
                    className="rounded-md bg-light-surface dark:bg-dark-surface border border-light-outline-variant dark:border-dark-outline-variant px-2.5 py-2 font-body text-body-sm text-light-on-surface dark:text-dark-on-surface focus:outline-none focus:border-light-primary dark:focus:border-dark-primary"
                  >
                    {WEEK_DAYS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label
                    htmlFor="sch-time"
                    className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant"
                  >
                    Horário
                  </label>
                  <input
                    id="sch-time"
                    type="time"
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                    className="rounded-md bg-light-surface dark:bg-dark-surface border border-light-outline-variant dark:border-dark-outline-variant px-2.5 py-2 font-mono text-body-sm text-light-on-surface dark:text-dark-on-surface focus:outline-none focus:border-light-primary dark:focus:border-dark-primary"
                  />
                </div>

                <div className="flex flex-col gap-1 sm:col-span-2 lg:col-span-1">
                  <label
                    htmlFor="sch-subject"
                    className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant"
                  >
                    Matéria ou foco
                  </label>
                  <input
                    id="sch-subject"
                    type="text"
                    list="study-subjects-datalist"
                    value={scheduleSubject}
                    onChange={(e) => setScheduleSubject(e.target.value)}
                    placeholder="Ex.: Português"
                    className="rounded-md bg-light-surface dark:bg-dark-surface border border-light-outline-variant dark:border-dark-outline-variant px-2.5 py-2 font-body text-body-sm text-light-on-surface dark:text-dark-on-surface focus:outline-none focus:border-light-primary dark:focus:border-dark-primary"
                  />
                  <datalist id="study-subjects-datalist">
                    {subjects.map((s) => (
                      <option key={s.id} value={s.name} />
                    ))}
                  </datalist>
                </div>

                <div className="flex flex-col gap-1">
                  <label
                    htmlFor="sch-dur"
                    className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant"
                  >
                    Duração (min)
                  </label>
                  <input
                    id="sch-dur"
                    type="number"
                    min={10}
                    step={5}
                    value={scheduleDuration}
                    onChange={(e) => setScheduleDuration(e.target.value)}
                    className="rounded-md bg-light-surface dark:bg-dark-surface border border-light-outline-variant dark:border-dark-outline-variant px-2.5 py-2 font-mono text-body-sm text-light-on-surface dark:text-dark-on-surface tabular-nums focus:outline-none focus:border-light-primary dark:focus:border-dark-primary"
                  />
                </div>

                <button
                  type="submit"
                  className="min-h-[40px] px-4 rounded-lg bg-light-primary dark:bg-dark-primary text-light-on-primary dark:text-dark-on-primary font-body text-body-sm font-semibold"
                >
                  Adicionar bloco
                </button>
              </form>

              {/* Day Filter */}
              <div className="flex items-center gap-1 p-1 rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant overflow-x-auto">
                {(['Todos', ...WEEK_DAYS] as (StudyWeekDay | 'Todos')[]).map((day) => {
                  const active = scheduleDayFilter === day;
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => setScheduleDayFilter(day)}
                      className={`min-h-[36px] px-3 rounded-md font-body text-body-sm whitespace-nowrap transition-colors ${
                        active
                          ? 'bg-light-primary dark:bg-dark-primary text-light-on-primary dark:text-dark-on-primary font-semibold'
                          : 'text-light-on-surface-variant dark:text-dark-on-surface-variant hover:text-light-on-surface dark:hover:text-dark-on-surface'
                      }`}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>

              {sortedSchedule.length === 0 ? (
                <p className="font-body text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant p-4">
                  Nenhum bloco de estudo encontrado para este filtro.
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {sortedSchedule.map((block) => (
                    <article
                      key={block.id}
                      className="rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant p-3 flex items-center justify-between gap-3"
                    >
                      <button
                        type="button"
                        onClick={() => onToggleScheduleBlock(block.id)}
                        className="flex items-center gap-3 min-w-0 flex-1 text-left"
                      >
                        <span
                          className={`material-symbols-outlined text-[22px] shrink-0 ${
                            block.done
                              ? 'material-symbols-filled text-cat-emerald'
                              : 'text-light-on-surface-variant dark:text-dark-on-surface-variant'
                          }`}
                        >
                          {block.done ? 'check_circle' : 'radio_button_unchecked'}
                        </span>
                        <div className="min-w-0">
                          <span className="font-mono text-label-sm text-cat-blue tabular-nums block">
                            {block.day} · {block.time} · {block.durationMinutes} min
                          </span>
                          <h3
                            className={`font-body text-label-lg truncate ${
                              block.done
                                ? 'line-through text-light-on-surface-variant dark:text-dark-on-surface-variant'
                                : 'text-light-on-surface dark:text-dark-on-surface'
                            }`}
                          >
                            {block.subjectName}
                          </h3>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          onDeleteScheduleBlock(block.id);
                          onShowToast('Bloco removido do cronograma.');
                        }}
                        aria-label={`Remover ${block.subjectName}`}
                        className="inline-flex items-center justify-center w-9 h-9 rounded-full text-light-on-surface-variant dark:text-dark-on-surface-variant hover:text-light-error dark:hover:text-dark-error shrink-0"
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          delete_outline
                        </span>
                      </button>
                    </article>
                  ))}
                </div>
              )}
            </section>

            {/* Outros Materiais: Provas, Resumos, Links e Tarefas */}
            <section className="flex flex-col gap-3 pt-2 border-t border-light-outline-variant dark:border-dark-outline-variant">
              <div>
                <h2 className="font-headline text-title-md text-light-on-surface dark:text-dark-on-surface">
                  Outros (Provas, Resumos, Links e Anotações)
                </h2>
                <p className="font-body text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
                  Centralize datas de provas, simulados, resumos curtos, links de aula e lembretes extras.
                </p>
              </div>

              <form
                onSubmit={handleCreateOtherItem}
                className="rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant p-3.5 flex flex-col gap-3"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                  <div className="flex flex-col gap-1">
                    <label
                      htmlFor="oth-kind"
                      className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant"
                    >
                      Tipo
                    </label>
                    <select
                      id="oth-kind"
                      value={otherKind}
                      onChange={(e) =>
                        setOtherKind(e.target.value as StudyOtherItem['kind'])
                      }
                      className="rounded-md bg-light-surface dark:bg-dark-surface border border-light-outline-variant dark:border-dark-outline-variant px-2.5 py-2 font-body text-body-sm text-light-on-surface dark:text-dark-on-surface focus:outline-none focus:border-light-primary dark:focus:border-dark-primary"
                    >
                      <option value="prova">Prova / Simulado</option>
                      <option value="resumo">Resumo</option>
                      <option value="link">Link útil</option>
                      <option value="outro">Outro material</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1 sm:col-span-2 lg:col-span-1">
                    <label
                      htmlFor="oth-title"
                      className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant"
                    >
                      Título
                    </label>
                    <input
                      id="oth-title"
                      type="text"
                      value={otherTitle}
                      onChange={(e) => setOtherTitle(e.target.value)}
                      placeholder="Ex.: Simulado de Português"
                      className="rounded-md bg-light-surface dark:bg-dark-surface border border-light-outline-variant dark:border-dark-outline-variant px-2.5 py-2 font-body text-body-sm text-light-on-surface dark:text-dark-on-surface focus:outline-none focus:border-light-primary dark:focus:border-dark-primary"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label
                      htmlFor="oth-subject"
                      className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant"
                    >
                      Matéria (opcional)
                    </label>
                    <input
                      id="oth-subject"
                      type="text"
                      list="study-subjects-datalist"
                      value={otherSubjectName}
                      onChange={(e) => setOtherSubjectName(e.target.value)}
                      placeholder="Ex.: Geral"
                      className="rounded-md bg-light-surface dark:bg-dark-surface border border-light-outline-variant dark:border-dark-outline-variant px-2.5 py-2 font-body text-body-sm text-light-on-surface dark:text-dark-on-surface focus:outline-none focus:border-light-primary dark:focus:border-dark-primary"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label
                      htmlFor="oth-date"
                      className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant"
                    >
                      Data (opcional)
                    </label>
                    <input
                      id="oth-date"
                      type="date"
                      value={otherDate}
                      onChange={(e) => setOtherDate(e.target.value)}
                      className="rounded-md bg-light-surface dark:bg-dark-surface border border-light-outline-variant dark:border-dark-outline-variant px-2.5 py-2 font-mono text-body-sm text-light-on-surface dark:text-dark-on-surface focus:outline-none focus:border-light-primary dark:focus:border-dark-primary"
                    />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2.5">
                  <input
                    type="text"
                    value={otherDetail}
                    onChange={(e) => setOtherDetail(e.target.value)}
                    placeholder={
                      otherKind === 'link'
                        ? 'Cole o endereço (ex.: https://...)'
                        : 'Resumo, páginas para revisar ou observações...'
                    }
                    aria-label="Detalhes do item"
                    className="flex-1 rounded-md bg-light-surface dark:bg-dark-surface border border-light-outline-variant dark:border-dark-outline-variant px-3 py-2 font-body text-body-sm text-light-on-surface dark:text-dark-on-surface focus:outline-none focus:border-light-primary dark:focus:border-dark-primary"
                  />
                  <button
                    type="submit"
                    className="min-h-[40px] px-4 rounded-lg bg-light-primary dark:bg-dark-primary text-light-on-primary dark:text-dark-on-primary font-body text-body-sm font-semibold shrink-0"
                  >
                    Salvar item
                  </button>
                </div>
              </form>

              {/* Kind Filter */}
              <div className="flex items-center gap-1 p-1 rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant overflow-x-auto">
                {(
                  [
                    { id: 'todos', label: 'Todos' },
                    { id: 'prova', label: 'Provas' },
                    { id: 'resumo', label: 'Resumos' },
                    { id: 'link', label: 'Links' },
                    { id: 'outro', label: 'Outros' },
                  ] as { id: OtherFilter; label: string }[]
                ).map((item) => {
                  const active = otherFilter === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setOtherFilter(item.id)}
                      className={`min-h-[36px] px-3 rounded-md font-body text-body-sm whitespace-nowrap transition-colors ${
                        active
                          ? 'bg-light-primary dark:bg-dark-primary text-light-on-primary dark:text-dark-on-primary font-semibold'
                          : 'text-light-on-surface-variant dark:text-dark-on-surface-variant hover:text-light-on-surface dark:hover:text-dark-on-surface'
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>

              {filteredOthers.length === 0 ? (
                <p className="font-body text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant p-4">
                  Nenhum item cadastrado nesta categoria.
                </p>
              ) : (
                <div className="flex flex-col gap-2.5">
                  {filteredOthers.map((item) => {
                    const meta = OTHER_KIND_META[item.kind];
                    const safeUrl =
                      item.kind === 'link' ? getSafeExternalUrl(item.detail) : null;
                    return (
                      <article
                        key={item.id}
                        className="rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant p-3.5 flex items-start justify-between gap-3"
                      >
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                          <button
                            type="button"
                            onClick={() => onToggleOtherItem(item.id)}
                            aria-label={
                              item.done ? 'Marcar como pendente' : 'Marcar como concluído'
                            }
                            className="mt-0.5 shrink-0"
                          >
                            <span
                              className={`material-symbols-outlined text-[22px] ${
                                item.done
                                  ? 'material-symbols-filled text-cat-emerald'
                                  : meta.colorClass
                              }`}
                            >
                              {item.done ? 'check_circle' : meta.icon}
                            </span>
                          </button>

                          <div className="min-w-0 flex-1">
                            <span className={`font-body text-label-sm ${meta.colorClass}`}>
                              {meta.label}
                              {item.subjectName ? ` · ${item.subjectName}` : ''}
                              {item.date ? ` · ${formatDateShort(item.date)}` : ''}
                            </span>
                            <h3
                              className={`font-body text-label-lg mt-0.5 ${
                                item.done
                                  ? 'line-through text-light-on-surface-variant dark:text-dark-on-surface-variant'
                                  : 'text-light-on-surface dark:text-dark-on-surface'
                              }`}
                            >
                              {item.title}
                            </h3>
                            {safeUrl ? (
                              <a
                                href={safeUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-body text-body-sm text-cat-blue hover:underline break-all inline-block mt-0.5"
                              >
                                {safeUrl}
                              </a>
                            ) : (
                              <p className="font-body text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant mt-0.5">
                                {item.detail}
                              </p>
                            )}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            onDeleteOtherItem(item.id);
                            onShowToast('Item removido.');
                          }}
                          aria-label={`Remover ${item.title}`}
                          className="inline-flex items-center justify-center w-9 h-9 rounded-full text-light-on-surface-variant dark:text-dark-on-surface-variant hover:text-light-error dark:hover:text-dark-error shrink-0"
                        >
                          <span className="material-symbols-outlined text-[18px]">
                            delete_outline
                          </span>
                        </button>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        )}

        {/* TAB 3: DICAS DE ESTUDO */}
        {subTab === 'dicas' && (
          <section className="flex flex-col gap-4">
            <div>
              <h2 className="font-headline text-title-md text-light-on-surface dark:text-dark-on-surface">
                Dicas Práticas de Estudo
              </h2>
              <p className="font-body text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
                Técnicas simples para melhorar foco, retenção e organização no dia a dia.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5">
              <div className="relative flex-1">
                <span
                  className="material-symbols-outlined text-[18px] text-light-on-surface-variant dark:text-dark-on-surface-variant absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                  aria-hidden="true"
                >
                  search
                </span>
                <input
                  type="search"
                  value={tipQuery}
                  onChange={(e) => setTipQuery(e.target.value)}
                  placeholder="Buscar dica (ex.: Pomodoro, revisão, leitura)..."
                  aria-label="Buscar dica de estudo"
                  className="w-full rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant text-light-on-surface dark:text-dark-on-surface font-body text-body-sm pl-9 pr-3 py-2.5 focus:outline-none focus:border-light-primary dark:focus:border-dark-primary"
                />
              </div>
            </div>

            <div className="flex items-center gap-1 p-1 rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant overflow-x-auto">
              {(
                [
                  'Todas',
                  'Concentração',
                  'Memorização',
                  'Organização',
                  'Leitura',
                  'Favoritas',
                ] as TipCategoryFilter[]
              ).map((cat) => {
                const active = tipCategory === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setTipCategory(cat)}
                    className={`min-h-[36px] px-3 rounded-md font-body text-body-sm whitespace-nowrap transition-colors ${
                      active
                        ? 'bg-light-primary dark:bg-dark-primary text-light-on-primary dark:text-dark-on-primary font-semibold'
                        : 'text-light-on-surface-variant dark:text-dark-on-surface-variant hover:text-light-on-surface dark:hover:text-dark-on-surface'
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>

            {filteredTips.length === 0 ? (
              <p className="font-body text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant p-4">
                Nenhuma dica encontrada para este filtro.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredTips.map((tip) => {
                  const isFav = favoriteTipIds.includes(tip.id);
                  return (
                    <article
                      key={tip.id}
                      className="rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant p-4 flex flex-col justify-between gap-3"
                    >
                      <div className="flex flex-col gap-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="font-body text-label-sm text-cat-blue">
                              {tip.category}
                              {tip.quickTimerMinutes
                                ? ` · Bloco sugerido de ${tip.quickTimerMinutes} min`
                                : ''}
                            </span>
                            <h3 className="font-headline text-title-md text-light-on-surface dark:text-dark-on-surface mt-0.5">
                              {tip.title}
                            </h3>
                          </div>

                          <button
                            type="button"
                            onClick={() => onToggleFavoriteTip(tip.id)}
                            aria-label={
                              isFav ? 'Remover dica dos favoritos' : 'Salvar dica nos favoritos'
                            }
                            className={`inline-flex items-center justify-center w-10 h-10 rounded-full shrink-0 ${
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
                        </div>

                        <p className="font-body text-body-sm text-light-on-surface dark:text-dark-on-surface text-pretty">
                          {tip.summary}
                        </p>

                        <div className="rounded-md bg-light-surface dark:bg-dark-surface border border-light-outline-variant dark:border-dark-outline-variant p-3">
                          <span className="font-body text-label-sm text-cat-emerald block mb-0.5">
                            Como aplicar agora
                          </span>
                          <p className="font-body text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant text-pretty">
                            {tip.howToApply}
                          </p>
                        </div>
                      </div>

                      {tip.quickTimerMinutes && (
                        <button
                          type="button"
                          onClick={() =>
                            handleLaunchQuickTipTimer(tip.quickTimerMinutes!, tip.title)
                          }
                          className="w-full min-h-[40px] rounded-lg border border-light-primary dark:border-dark-primary text-light-primary dark:text-dark-primary font-body text-body-sm font-medium hover:bg-light-primary/10 dark:hover:bg-dark-primary/10 transition-colors inline-flex items-center justify-center gap-1.5"
                        >
                          <span className="material-symbols-outlined text-[18px]">
                            play_circle
                          </span>
                          <span>Iniciar timer de {tip.quickTimerMinutes} min</span>
                        </button>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
};
