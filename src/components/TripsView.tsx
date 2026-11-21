import React, { useMemo, useState } from 'react';
import {
  TRIP_EXPENSE_CATEGORIES,
  TRIP_PACKING_CATEGORIES,
  TRIP_PACKING_PRESETS,
  TRIP_TEMPLATES,
} from '../data/initialData';
import {
  AgendaCategory,
  FinanceTransaction,
  TripExpenseCategory,
  TripItem,
  TripPackingCategory,
  TripStatus,
  TripType,
} from '../types';

interface TripsViewProps {
  trips: TripItem[];
  onAddTrip: (trip: Omit<TripItem, 'id' | 'createdAt'>) => TripItem;
  onUpdateTrip: (id: string, patch: Partial<TripItem>) => void;
  onDeleteTrip: (id: string) => void;
  onAddToAgenda?: (item: {
    time: string;
    title: string;
    category: AgendaCategory;
  }) => void;
  onAddFinanceTransaction?: (tx: Omit<FinanceTransaction, 'id'>) => void;
  onOpenGoals: () => void;
  onBack: () => void;
  onShowToast: (msg: string) => void;
}

type TripSubTab = 'resumo' | 'roteiro' | 'mala' | 'reservas';

const TRIP_TYPES: TripType[] = ['Lazer', 'Família', 'Trabalho', 'Retiro / Fé', 'Aventura'];

function formatCurrency(val: number): string {
  return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDatePt(iso?: string): string {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

function getCountdownDays(startDate: string): number | null {
  if (!startDate) return null;
  const start = new Date(`${startDate}T00:00:00`);
  if (Number.isNaN(start.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((start.getTime() - today.getTime()) / 86400000);
}

function getTripDurationDays(startDate: string, endDate: string): number {
  if (!startDate || !endDate) return 1;
  const s = new Date(`${startDate}T00:00:00`);
  const e = new Date(`${endDate}T00:00:00`);
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return 1;
  return Math.max(1, Math.round((e.getTime() - s.getTime()) / 86400000) + 1);
}

function tripStatusLabel(status: TripStatus): string {
  if (status === 'confirmada') return 'Confirmada';
  if (status === 'realizada') return 'Realizada';
  return 'Planejando';
}

function addDaysIso(daysAhead: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`;
}

export const TripsView: React.FC<TripsViewProps> = ({
  trips,
  onAddTrip,
  onUpdateTrip,
  onDeleteTrip,
  onAddToAgenda,
  onAddFinanceTransaction,
  onOpenGoals,
  onBack,
  onShowToast,
}) => {
  const [selectedTripId, setSelectedTripId] = useState<string>(trips[0]?.id ?? '');
  const [statusFilter, setStatusFilter] = useState<'todas' | TripStatus>('todas');
  const [subTab, setSubTab] = useState<TripSubTab>('resumo');
  const [showNewForm, setShowNewForm] = useState(false);
  const [confirmDeleteTripId, setConfirmDeleteTripId] = useState<string | null>(null);

  // New trip form
  const [destination, setDestination] = useState('');
  const [region, setRegion] = useState('');
  const [tripType, setTripType] = useState<TripType>('Lazer');
  const [status, setStatus] = useState<TripStatus>('planejando');
  const [startDate, setStartDate] = useState(addDaysIso(14));
  const [endDate, setEndDate] = useState(addDaysIso(17));
  const [travelers, setTravelers] = useState('Família');
  const [estimatedBudget, setEstimatedBudget] = useState('2000');

  // Expense form inside selected trip
  const [expTitle, setExpTitle] = useState('');
  const [expCategory, setExpCategory] = useState<TripExpenseCategory>('Transporte');
  const [expAmount, setExpAmount] = useState('');
  const [expPaid, setExpPaid] = useState(false);

  // Itinerary form inside selected trip
  const [itDay, setItDay] = useState('1');
  const [itTime, setItTime] = useState('09:00');
  const [itTitle, setItTitle] = useState('');
  const [itLocation, setItLocation] = useState('');
  const [itNotes, setItNotes] = useState('');

  // Packing form inside selected trip
  const [packName, setPackName] = useState('');
  const [packCategory, setPackCategory] = useState<TripPackingCategory>('Roupas');
  const [packQty, setPackQty] = useState('1');
  const [packCategoryFilter, setPackCategoryFilter] = useState<'todas' | TripPackingCategory>('todas');
  const [onlyUnpacked, setOnlyUnpacked] = useState(false);

  const filteredTrips = useMemo(() => {
    if (statusFilter === 'todas') return trips;
    return trips.filter((t) => t.status === statusFilter);
  }, [trips, statusFilter]);

  const activeTrip = useMemo(() => {
    return (
      filteredTrips.find((t) => t.id === selectedTripId) ??
      trips.find((t) => t.id === selectedTripId) ??
      filteredTrips[0] ??
      trips[0] ??
      null
    );
  }, [filteredTrips, trips, selectedTripId]);

  const kpis = useMemo(() => {
    const upcoming = trips
      .filter((t) => t.status !== 'realizada' && t.startDate)
      .sort((a, b) => a.startDate.localeCompare(b.startDate))[0];
    const nextDays = upcoming ? getCountdownDays(upcoming.startDate) : null;
    const totalBudget = trips.reduce((acc, t) => acc + t.estimatedBudget, 0);
    const totalPlannedExpenses = trips.reduce(
      (acc, t) => acc + t.expenses.reduce((s, e) => s + e.amount, 0),
      0
    );
    const activePacked = activeTrip
      ? activeTrip.packing.filter((p) => p.packed).length
      : 0;
    const activePackTotal = activeTrip ? activeTrip.packing.length : 0;
    return {
      upcoming,
      nextDays,
      totalBudget,
      totalPlannedExpenses,
      activePacked,
      activePackTotal,
    };
  }, [trips, activeTrip]);

  const handleApplyTemplate = (tplId: string) => {
    const tpl = TRIP_TEMPLATES.find((t) => t.id === tplId);
    if (!tpl) return;
    const created = onAddTrip({
      destination: tpl.destination,
      region: tpl.region,
      tripType: tpl.tripType,
      status: 'planejando',
      startDate: addDaysIso(25),
      endDate: addDaysIso(25 + tpl.daysDuration),
      travelers: tpl.tripType === 'Trabalho' ? 'Individual' : 'Família',
      estimatedBudget: tpl.estimatedBudget,
      itinerary: [
        {
          id: `it-${Date.now()}-1`,
          dayNumber: 1,
          time: '09:00',
          title: `Saída e chegada em ${tpl.destination}`,
          location: tpl.region,
          done: false,
        },
      ],
      packing: TRIP_PACKING_PRESETS.slice(0, 6).map((p, idx) => ({
        id: `pk-${Date.now()}-${idx}`,
        ...p,
        packed: false,
      })),
      expenses: [],
    });
    setSelectedTripId(created.id);
    onShowToast(`Roteiro "${created.destination}" criado!`);
  };

  const handleCreateTrip = (e: React.FormEvent) => {
    e.preventDefault();
    const dest = destination.trim();
    if (!dest) {
      onShowToast('Informe o destino da viagem.');
      return;
    }
    const created = onAddTrip({
      destination: dest,
      region: region.trim() || 'Brasil',
      tripType,
      status,
      startDate,
      endDate: endDate >= startDate ? endDate : startDate,
      travelers: travelers.trim() || 'Pessoal',
      estimatedBudget: Math.max(0, Number(estimatedBudget.replace(',', '.')) || 0),
      itinerary: [],
      packing: [],
      expenses: [],
    });
    setSelectedTripId(created.id);
    setDestination('');
    setRegion('');
    setShowNewForm(false);
    onShowToast(`Viagem para "${created.destination}" adicionada!`);
  };

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTrip) return;
    const title = expTitle.trim();
    const amount = Number(expAmount.replace(',', '.'));
    if (!title || !Number.isFinite(amount) || amount <= 0) {
      onShowToast('Informe descrição e valor do gasto.');
      return;
    }
    onUpdateTrip(activeTrip.id, {
      expenses: [
        {
          id: `ex-${Date.now()}`,
          title,
          category: expCategory,
          amount,
          paid: expPaid,
        },
        ...activeTrip.expenses,
      ],
    });
    setExpTitle('');
    setExpAmount('');
    setExpPaid(false);
    onShowToast('Gasto adicionado à viagem.');
  };

  const handleSendExpenseToFinance = (title: string, amount: number, paid: boolean) => {
    if (!onAddFinanceTransaction || !activeTrip) return;
    onAddFinanceTransaction({
      type: 'gasto',
      title: `Viagem (${activeTrip.destination}): ${title}`,
      amount,
      category: 'Lazer',
      paymentMethod: 'PIX',
      date: addDaysIso(0),
      paid,
      notes: `Importado do planejador de viagens (${activeTrip.destination})`,
    });
    onShowToast(`"${title}" lançado em Finanças!`);
  };

  const handleAddItineraryItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTrip) return;
    const title = itTitle.trim();
    if (!title) {
      onShowToast('Descreva a atividade do roteiro.');
      return;
    }
    const dayNumber = Math.max(1, parseInt(itDay, 10) || 1);
    const next = [
      ...activeTrip.itinerary,
      {
        id: `it-${Date.now()}`,
        dayNumber,
        time: itTime || '09:00',
        title,
        location: itLocation.trim() || undefined,
        notes: itNotes.trim() || undefined,
        done: false,
      },
    ].sort((a, b) => a.dayNumber - b.dayNumber || a.time.localeCompare(b.time));
    onUpdateTrip(activeTrip.id, { itinerary: next });
    setItTitle('');
    setItLocation('');
    setItNotes('');
    onShowToast(`Atividade adicionada ao Dia ${dayNumber}.`);
  };

  const handleAddPackingItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTrip) return;
    const name = packName.trim();
    if (!name) return;
    const quantity = Math.max(1, parseInt(packQty, 10) || 1);
    onUpdateTrip(activeTrip.id, {
      packing: [
        {
          id: `pk-${Date.now()}`,
          name,
          category: packCategory,
          quantity,
          packed: false,
        },
        ...activeTrip.packing,
      ],
    });
    setPackName('');
    setPackQty('1');
  };

  const handleLoadEssentialPacking = () => {
    if (!activeTrip) return;
    const existingNames = new Set(
      activeTrip.packing.map((p) => p.name.trim().toLowerCase())
    );
    const additions = TRIP_PACKING_PRESETS.filter(
      (p) => !existingNames.has(p.name.trim().toLowerCase())
    ).map((p, idx) => ({
      id: `pk-${Date.now()}-${idx}`,
      ...p,
      packed: false,
    }));
    if (additions.length === 0) {
      onShowToast('Os itens essenciais já estão na sua mala.');
      return;
    }
    onUpdateTrip(activeTrip.id, {
      packing: [...activeTrip.packing, ...additions],
    });
    onShowToast(`${additions.length} itens essenciais carregados na mala!`);
  };

  const activeExpensesTotal = activeTrip
    ? activeTrip.expenses.reduce((s, e) => s + e.amount, 0)
    : 0;
  const activeExpensesPaid = activeTrip
    ? activeTrip.expenses.filter((e) => e.paid).reduce((s, e) => s + e.amount, 0)
    : 0;
  const activeExpensesPending = activeExpensesTotal - activeExpensesPaid;

  const filteredPacking = activeTrip
    ? activeTrip.packing.filter((p) => {
        if (packCategoryFilter !== 'todas' && p.category !== packCategoryFilter) return false;
        if (onlyUnpacked && p.packed) return false;
        return true;
      })
    : [];

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
                Viagens
              </h1>
              <p className="font-body text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
                Roteiro dia a dia, orçamento, mala e reservas em um só lugar.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onOpenGoals}
              className="min-h-[40px] px-3.5 py-2 rounded-md border border-light-outline-variant dark:border-dark-outline-variant bg-light-surface-container-low dark:bg-dark-surface-container-low text-light-on-surface dark:text-dark-on-surface font-body text-body-sm inline-flex items-center gap-1.5 hover:border-light-primary dark:hover:border-dark-primary transition-colors whitespace-nowrap shrink-0"
            >
              <span className="material-symbols-outlined text-[18px] text-cat-emerald">
                flag
              </span>
              <span>Ir para Metas</span>
            </button>
            <button
              type="button"
              onClick={() => setShowNewForm((v) => !v)}
              className="min-h-[40px] px-4 py-2 rounded-full bg-light-primary dark:bg-dark-primary text-light-on-primary dark:text-dark-on-primary font-body text-label-lg inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <span className="material-symbols-outlined text-[18px]">
                {showNewForm ? 'close' : 'add'}
              </span>
              <span>{showNewForm ? 'Fechar' : 'Nova Viagem'}</span>
            </button>
          </div>
        </div>
      </header>

      <main className="px-4 lg:px-8 pb-28 lg:pb-12 flex flex-col gap-5">
        {/* KPI Strip */}
        <section
          aria-label="Resumo das viagens"
          className="grid grid-cols-2 lg:grid-cols-4 gap-3"
        >
          <div className="rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant p-3.5 flex flex-col gap-1">
            <span className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
              Próxima viagem
            </span>
            <span className="font-headline text-title-md text-light-on-surface dark:text-dark-on-surface truncate">
              {kpis.upcoming ? kpis.upcoming.destination : 'Nenhuma agendada'}
            </span>
            {kpis.upcoming && kpis.nextDays !== null && (
              <span className="font-mono text-label-sm text-light-primary dark:text-dark-primary tabular-nums">
                {kpis.nextDays > 0
                  ? `Faltam ${kpis.nextDays} dias`
                  : kpis.nextDays === 0
                    ? 'É hoje!'
                    : 'Em andamento'}
              </span>
            )}
          </div>

          <div className="rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant p-3.5 flex flex-col gap-1">
            <span className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
              Viagens cadastradas
            </span>
            <span className="font-mono text-title-lg text-light-on-surface dark:text-dark-on-surface tabular-nums">
              {trips.length}
            </span>
          </div>

          <div className="rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant p-3.5 flex flex-col gap-1">
            <span className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
              Orçamentos previstos
            </span>
            <span className="font-mono text-title-lg text-accent-gold tabular-nums">
              {formatCurrency(kpis.totalBudget)}
            </span>
          </div>

          <div className="rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant p-3.5 flex flex-col gap-1">
            <span className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
              Mala da viagem ativa
            </span>
            <span className="font-mono text-title-lg text-cat-emerald tabular-nums">
              {kpis.activePacked}/{kpis.activePackTotal} itens
            </span>
          </div>
        </section>

        {/* Quick Templates */}
        <section className="flex flex-col gap-2">
          <span className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
            Modelos rápidos de viagem
          </span>
          <div className="flex flex-wrap gap-2">
            {TRIP_TEMPLATES.map((tpl) => (
              <button
                key={tpl.id}
                type="button"
                onClick={() => handleApplyTemplate(tpl.id)}
                className="min-h-[38px] px-3 py-1.5 rounded-md bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant text-light-on-surface dark:text-dark-on-surface font-body text-body-sm inline-flex items-center gap-1.5 hover:border-light-primary dark:hover:border-dark-primary transition-colors whitespace-nowrap"
              >
                <span className="material-symbols-outlined text-[16px] text-cat-blue">
                  {tpl.icon}
                </span>
                <span>+ {tpl.label}</span>
              </button>
            ))}
          </div>
        </section>

        {/* New Trip Form */}
        {showNewForm && (
          <form
            onSubmit={handleCreateTrip}
            className="rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-primary/60 dark:border-dark-primary/60 p-4 flex flex-col gap-3"
          >
            <h2 className="font-headline text-title-md text-light-on-surface dark:text-dark-on-surface">
              Planejar nova viagem
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <label className="flex flex-col gap-1">
                <span className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
                  Destino *
                </span>
                <input
                  type="text"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  placeholder="Ex.: Gramado, Florianópolis, Lisboa..."
                  className="rounded bg-light-surface-container-lowest dark:bg-dark-surface-container border border-light-outline-variant dark:border-dark-outline-variant px-3 py-2 font-body text-body-md text-light-on-surface dark:text-dark-on-surface"
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
                  Estado / País
                </span>
                <input
                  type="text"
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  placeholder="Ex.: Rio Grande do Sul · Brasil"
                  className="rounded bg-light-surface-container-lowest dark:bg-dark-surface-container border border-light-outline-variant dark:border-dark-outline-variant px-3 py-2 font-body text-body-md text-light-on-surface dark:text-dark-on-surface"
                />
              </label>

              <div className="grid grid-cols-2 gap-2">
                <label className="flex flex-col gap-1">
                  <span className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
                    Tipo
                  </span>
                  <select
                    value={tripType}
                    onChange={(e) => setTripType(e.target.value as TripType)}
                    className="rounded bg-light-surface-container-lowest dark:bg-dark-surface-container border border-light-outline-variant dark:border-dark-outline-variant px-2.5 py-2 font-body text-body-md text-light-on-surface dark:text-dark-on-surface"
                  >
                    {TRIP_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex flex-col gap-1">
                  <span className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
                    Status
                  </span>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as TripStatus)}
                    className="rounded bg-light-surface-container-lowest dark:bg-dark-surface-container border border-light-outline-variant dark:border-dark-outline-variant px-2.5 py-2 font-body text-body-md text-light-on-surface dark:text-dark-on-surface"
                  >
                    <option value="planejando">Planejando</option>
                    <option value="confirmada">Confirmada</option>
                    <option value="realizada">Realizada</option>
                  </select>
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <label className="flex flex-col gap-1">
                <span className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
                  Data de ida
                </span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="rounded bg-light-surface-container-lowest dark:bg-dark-surface-container border border-light-outline-variant dark:border-dark-outline-variant px-3 py-2 font-mono text-body-md text-light-on-surface dark:text-dark-on-surface"
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
                  Data de volta
                </span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="rounded bg-light-surface-container-lowest dark:bg-dark-surface-container border border-light-outline-variant dark:border-dark-outline-variant px-3 py-2 font-mono text-body-md text-light-on-surface dark:text-dark-on-surface"
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
                  Quem vai
                </span>
                <input
                  type="text"
                  value={travelers}
                  onChange={(e) => setTravelers(e.target.value)}
                  placeholder="Ex.: Casal, Família, Só eu"
                  className="rounded bg-light-surface-container-lowest dark:bg-dark-surface-container border border-light-outline-variant dark:border-dark-outline-variant px-3 py-2 font-body text-body-md text-light-on-surface dark:text-dark-on-surface"
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
                  Orçamento previsto (R$)
                </span>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={estimatedBudget}
                  onChange={(e) => setEstimatedBudget(e.target.value)}
                  className="rounded bg-light-surface-container-lowest dark:bg-dark-surface-container border border-light-outline-variant dark:border-dark-outline-variant px-3 py-2 font-mono text-body-md text-light-on-surface dark:text-dark-on-surface"
                />
              </label>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowNewForm(false)}
                className="min-h-[40px] px-4 py-2 rounded-md border border-light-outline-variant dark:border-dark-outline-variant font-body text-body-sm text-light-on-surface dark:text-dark-on-surface"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="min-h-[40px] px-5 py-2 rounded-full bg-light-primary dark:bg-dark-primary text-light-on-primary dark:text-dark-on-primary font-body text-label-lg"
              >
                Criar Viagem
              </button>
            </div>
          </form>
        )}

        {/* Workspace Grid: Trip Selector + Selected Trip Detail */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          {/* Left column: Trips list */}
          <aside className="lg:col-span-4 flex flex-col gap-3">
            <div className="flex items-center gap-1 p-1 rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant overflow-x-auto">
              {(
                [
                  { id: 'todas', label: 'Todas' },
                  { id: 'confirmada', label: 'Confirmadas' },
                  { id: 'planejando', label: 'Planejando' },
                  { id: 'realizada', label: 'Realizadas' },
                ] as { id: 'todas' | TripStatus; label: string }[]
              ).map((tab) => {
                const active = statusFilter === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setStatusFilter(tab.id)}
                    className={`flex-1 min-h-[36px] px-2.5 py-1 rounded-md font-body text-label-md whitespace-nowrap transition-colors ${
                      active
                        ? 'bg-light-primary dark:bg-dark-primary text-light-on-primary dark:text-dark-on-primary font-semibold'
                        : 'text-light-on-surface-variant dark:text-dark-on-surface-variant'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {filteredTrips.length === 0 ? (
              <div className="rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant p-5 text-center flex flex-col items-center gap-2">
                <p className="font-body text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
                  Nenhuma viagem nesta categoria.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {filteredTrips.map((trip) => {
                  const selected = activeTrip?.id === trip.id;
                  const days = getCountdownDays(trip.startDate);
                  const totalSpent = trip.expenses.reduce((s, e) => s + e.amount, 0);
                  return (
                    <button
                      key={trip.id}
                      type="button"
                      onClick={() => setSelectedTripId(trip.id)}
                      className={`w-full text-left rounded-lg border p-3.5 flex flex-col gap-1.5 transition-colors ${
                        selected
                          ? 'bg-light-surface-container-high dark:bg-dark-surface-container-high border-light-primary dark:border-dark-primary'
                          : 'bg-light-surface-container-low dark:bg-dark-surface-container-low border-light-outline-variant dark:border-dark-outline-variant hover:border-light-primary/60 dark:hover:border-dark-primary/60'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 font-body text-label-sm">
                        <span
                          className={
                            trip.status === 'confirmada'
                              ? 'text-cat-emerald font-medium'
                              : trip.status === 'realizada'
                                ? 'text-light-on-surface-variant dark:text-dark-on-surface-variant'
                                : 'text-accent-gold font-medium'
                          }
                        >
                          {tripStatusLabel(trip.status)} · {trip.tripType}
                        </span>
                        {days !== null && trip.status !== 'realizada' && (
                          <span className="font-mono text-light-primary dark:text-dark-primary tabular-nums">
                            {days > 0 ? `em ${days}d` : days === 0 ? 'Hoje' : 'Ativa'}
                          </span>
                        )}
                      </div>

                      <h2 className="font-headline text-title-md text-light-on-surface dark:text-dark-on-surface truncate">
                        {trip.destination}
                      </h2>

                      <p className="font-body text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant truncate">
                        {trip.region} · {trip.travelers}
                      </p>

                      <div className="flex items-center justify-between font-mono text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant tabular-nums pt-1">
                        <span>
                          {formatDatePt(trip.startDate)} → {formatDatePt(trip.endDate)}
                        </span>
                        <span>{formatCurrency(totalSpent || trip.estimatedBudget)}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </aside>

          {/* Right column: Selected Trip Workspace */}
          <section className="lg:col-span-8 flex flex-col gap-4">
            {!activeTrip ? (
              <div className="rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant p-8 text-center flex flex-col items-center gap-3">
                <span className="material-symbols-outlined text-[38px] text-light-on-surface-variant dark:text-dark-on-surface-variant">
                  flight_takeoff
                </span>
                <p className="font-body text-body-md text-light-on-surface dark:text-dark-on-surface">
                  Selecione ou crie uma viagem para montar o roteiro, orçamento e mala.
                </p>
                <button
                  type="button"
                  onClick={() => setShowNewForm(true)}
                  className="min-h-[40px] px-4 py-2 rounded-full bg-light-primary dark:bg-dark-primary text-light-on-primary dark:text-dark-on-primary font-body text-body-sm"
                >
                  Planejar primeira viagem
                </button>
              </div>
            ) : (
              <>
                {/* Trip Header Card */}
                <div className="rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant p-4 flex flex-col gap-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex flex-col gap-1 min-w-0">
                      <span className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
                        {activeTrip.region} · {activeTrip.tripType} · {activeTrip.travelers}
                      </span>
                      <h2 className="font-headline text-headline-sm text-light-on-surface dark:text-dark-on-surface">
                        {activeTrip.destination}
                      </h2>
                      <span className="font-mono text-body-sm text-light-primary dark:text-dark-primary tabular-nums">
                        {formatDatePt(activeTrip.startDate)} até{' '}
                        {formatDatePt(activeTrip.endDate)} ·{' '}
                        {getTripDurationDays(activeTrip.startDate, activeTrip.endDate)} dia(s)
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        aria-label="Alterar status da viagem"
                        value={activeTrip.status}
                        onChange={(e) =>
                          onUpdateTrip(activeTrip.id, {
                            status: e.target.value as TripStatus,
                          })
                        }
                        className="min-h-[38px] rounded-md bg-light-surface-container-lowest dark:bg-dark-surface-container border border-light-outline-variant dark:border-dark-outline-variant px-3 py-1.5 font-body text-body-sm text-light-on-surface dark:text-dark-on-surface"
                      >
                        <option value="planejando">Planejando</option>
                        <option value="confirmada">Confirmada</option>
                        <option value="realizada">Realizada</option>
                      </select>

                      {confirmDeleteTripId === activeTrip.id ? (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              onDeleteTrip(activeTrip.id);
                              setConfirmDeleteTripId(null);
                              onShowToast('Viagem removida.');
                            }}
                            className="min-h-[38px] px-3 py-1.5 rounded-md bg-light-error dark:bg-dark-error text-white font-body text-label-md"
                          >
                            Confirmar
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteTripId(null)}
                            className="min-h-[38px] px-2.5 py-1.5 font-body text-label-md text-light-on-surface-variant dark:text-dark-on-surface-variant"
                          >
                            Cancelar
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteTripId(activeTrip.id)}
                          aria-label="Excluir viagem"
                          className="min-h-[38px] min-w-[38px] rounded-md border border-light-outline-variant dark:border-dark-outline-variant flex items-center justify-center text-light-on-surface-variant dark:text-dark-on-surface-variant hover:text-light-error dark:hover:text-dark-error"
                        >
                          <span className="material-symbols-outlined text-[18px]">
                            delete
                          </span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Workspace Sub-tabs */}
                  <div className="flex items-center gap-1 p-1 rounded-lg bg-light-surface-container dark:bg-dark-surface-container overflow-x-auto">
                    {(
                      [
                        { id: 'resumo', label: 'Orçamento & Gastos' },
                        {
                          id: 'roteiro',
                          label: `Roteiro (${activeTrip.itinerary.length})`,
                        },
                        {
                          id: 'mala',
                          label: `Mala (${activeTrip.packing.filter((p) => p.packed).length}/${activeTrip.packing.length})`,
                        },
                        { id: 'reservas', label: 'Reservas & Dados' },
                      ] as { id: TripSubTab; label: string }[]
                    ).map((t) => {
                      const active = subTab === t.id;
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setSubTab(t.id)}
                          className={`flex-1 min-h-[38px] px-3 py-1.5 rounded-md font-body text-body-sm whitespace-nowrap transition-colors ${
                            active
                              ? 'bg-light-primary dark:bg-dark-primary text-light-on-primary dark:text-dark-on-primary font-semibold'
                              : 'text-light-on-surface-variant dark:text-dark-on-surface-variant hover:text-light-on-surface dark:hover:text-dark-on-surface'
                          }`}
                        >
                          {t.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Subtab 1: Orçamento & Gastos */}
                {subTab === 'resumo' && (
                  <div className="rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant p-4 flex flex-col gap-4">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
                          Teto previsto
                        </span>
                        <span className="font-mono text-title-md text-light-on-surface dark:text-dark-on-surface tabular-nums">
                          {formatCurrency(activeTrip.estimatedBudget)}
                        </span>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
                          Total dos itens
                        </span>
                        <span className="font-mono text-title-md text-light-primary dark:text-dark-primary tabular-nums">
                          {formatCurrency(activeExpensesTotal)}
                        </span>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
                          Já pago
                        </span>
                        <span className="font-mono text-title-md text-cat-emerald tabular-nums">
                          {formatCurrency(activeExpensesPaid)}
                        </span>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
                          A pagar
                        </span>
                        <span className="font-mono text-title-md text-accent-gold tabular-nums">
                          {formatCurrency(activeExpensesPending)}
                        </span>
                      </div>
                    </div>

                    {/* Add Expense Form */}
                    <form
                      onSubmit={handleAddExpense}
                      className="grid grid-cols-1 sm:grid-cols-12 gap-2 pt-3 border-t border-light-outline-variant dark:border-dark-outline-variant"
                    >
                      <input
                        type="text"
                        value={expTitle}
                        onChange={(e) => setExpTitle(e.target.value)}
                        placeholder="Novo gasto (ex.: Passagem, Hotel, Almoço...)"
                        className="sm:col-span-5 rounded bg-light-surface-container-lowest dark:bg-dark-surface-container border border-light-outline-variant dark:border-dark-outline-variant px-3 py-2 font-body text-body-sm text-light-on-surface dark:text-dark-on-surface"
                      />
                      <select
                        value={expCategory}
                        onChange={(e) =>
                          setExpCategory(e.target.value as TripExpenseCategory)
                        }
                        className="sm:col-span-3 rounded bg-light-surface-container-lowest dark:bg-dark-surface-container border border-light-outline-variant dark:border-dark-outline-variant px-2.5 py-2 font-body text-body-sm text-light-on-surface dark:text-dark-on-surface"
                      >
                        {TRIP_EXPENSE_CATEGORIES.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={expAmount}
                        onChange={(e) => setExpAmount(e.target.value)}
                        placeholder="Valor R$"
                        className="sm:col-span-2 rounded bg-light-surface-container-lowest dark:bg-dark-surface-container border border-light-outline-variant dark:border-dark-outline-variant px-2.5 py-2 font-mono text-body-sm text-light-on-surface dark:text-dark-on-surface"
                      />
                      <button
                        type="submit"
                        className="sm:col-span-2 min-h-[38px] px-3 py-2 rounded-md bg-light-primary dark:bg-dark-primary text-light-on-primary dark:text-dark-on-primary font-body text-label-md whitespace-nowrap"
                      >
                        + Gasto
                      </button>
                      <label className="sm:col-span-12 flex items-center gap-2 font-body text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
                        <input
                          type="checkbox"
                          checked={expPaid}
                          onChange={(e) => setExpPaid(e.target.checked)}
                        />
                        <span>Marcar como já pago</span>
                      </label>
                    </form>

                    {/* Expense list */}
                    {activeTrip.expenses.length === 0 ? (
                      <p className="font-body text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant py-3 text-center">
                        Nenhum gasto cadastrado ainda nesta viagem.
                      </p>
                    ) : (
                      <ul className="flex flex-col divide-y divide-light-outline-variant dark:divide-dark-outline-variant">
                        {activeTrip.expenses.map((ex) => (
                          <li
                            key={ex.id}
                            className="py-2.5 flex flex-wrap items-center justify-between gap-2"
                          >
                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                              <button
                                type="button"
                                onClick={() =>
                                  onUpdateTrip(activeTrip.id, {
                                    expenses: activeTrip.expenses.map((item) =>
                                      item.id === ex.id
                                        ? { ...item, paid: !item.paid }
                                        : item
                                    ),
                                  })
                                }
                                className={`min-h-[34px] px-2.5 py-1 rounded-md border font-body text-label-sm whitespace-nowrap ${
                                  ex.paid
                                    ? 'border-cat-emerald text-cat-emerald'
                                    : 'border-accent-gold text-accent-gold'
                                }`}
                              >
                                {ex.paid ? 'Pago' : 'A pagar'}
                              </button>
                              <div className="min-w-0">
                                <p className="font-body text-body-md text-light-on-surface dark:text-dark-on-surface truncate">
                                  {ex.title}
                                </p>
                                <span className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
                                  {ex.category}
                                  {ex.notes ? ` · ${ex.notes}` : ''}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <span className="font-mono text-title-md text-light-on-surface dark:text-dark-on-surface tabular-nums">
                                {formatCurrency(ex.amount)}
                              </span>
                              {onAddFinanceTransaction && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleSendExpenseToFinance(
                                      ex.title,
                                      ex.amount,
                                      ex.paid
                                    )
                                  }
                                  title="Lançar este valor em Finanças"
                                  className="min-h-[34px] px-2.5 py-1 rounded-md border border-light-outline-variant dark:border-dark-outline-variant font-body text-label-sm text-light-primary dark:text-dark-primary whitespace-nowrap"
                                >
                                  Lançar em Finanças
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() =>
                                  onUpdateTrip(activeTrip.id, {
                                    expenses: activeTrip.expenses.filter(
                                      (item) => item.id !== ex.id
                                    ),
                                  })
                                }
                                aria-label="Remover gasto"
                                className="min-h-[34px] min-w-[34px] flex items-center justify-center text-light-on-surface-variant dark:text-dark-on-surface-variant hover:text-light-error dark:hover:text-dark-error"
                              >
                                <span className="material-symbols-outlined text-[18px]">
                                  close
                                </span>
                              </button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}

                {/* Subtab 2: Roteiro Dia a Dia */}
                {subTab === 'roteiro' && (
                  <div className="rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant p-4 flex flex-col gap-4">
                    <form
                      onSubmit={handleAddItineraryItem}
                      className="grid grid-cols-1 sm:grid-cols-12 gap-2"
                    >
                      <input
                        type="number"
                        min="1"
                        max="60"
                        value={itDay}
                        onChange={(e) => setItDay(e.target.value)}
                        aria-label="Dia da viagem"
                        placeholder="Dia"
                        className="sm:col-span-2 rounded bg-light-surface-container-lowest dark:bg-dark-surface-container border border-light-outline-variant dark:border-dark-outline-variant px-2.5 py-2 font-mono text-body-sm text-light-on-surface dark:text-dark-on-surface"
                      />
                      <input
                        type="time"
                        value={itTime}
                        onChange={(e) => setItTime(e.target.value)}
                        aria-label="Horário"
                        className="sm:col-span-2 rounded bg-light-surface-container-lowest dark:bg-dark-surface-container border border-light-outline-variant dark:border-dark-outline-variant px-2.5 py-2 font-mono text-body-sm text-light-on-surface dark:text-dark-on-surface"
                      />
                      <input
                        type="text"
                        value={itTitle}
                        onChange={(e) => setItTitle(e.target.value)}
                        placeholder="Passeio, embarque, restaurante..."
                        className="sm:col-span-4 rounded bg-light-surface-container-lowest dark:bg-dark-surface-container border border-light-outline-variant dark:border-dark-outline-variant px-3 py-2 font-body text-body-sm text-light-on-surface dark:text-dark-on-surface"
                      />
                      <input
                        type="text"
                        value={itLocation}
                        onChange={(e) => setItLocation(e.target.value)}
                        placeholder="Local (opcional)"
                        className="sm:col-span-2 rounded bg-light-surface-container-lowest dark:bg-dark-surface-container border border-light-outline-variant dark:border-dark-outline-variant px-2.5 py-2 font-body text-body-sm text-light-on-surface dark:text-dark-on-surface"
                      />
                      <button
                        type="submit"
                        className="sm:col-span-2 min-h-[38px] px-3 py-2 rounded-md bg-light-primary dark:bg-dark-primary text-light-on-primary dark:text-dark-on-primary font-body text-label-md whitespace-nowrap"
                      >
                        + Roteiro
                      </button>
                      <input
                        type="text"
                        value={itNotes}
                        onChange={(e) => setItNotes(e.target.value)}
                        placeholder="Observação rápida (ex.: levar ingresso impresso, reservar mesa...)"
                        className="sm:col-span-12 rounded bg-light-surface-container-lowest dark:bg-dark-surface-container border border-light-outline-variant dark:border-dark-outline-variant px-3 py-1.5 font-body text-body-sm text-light-on-surface dark:text-dark-on-surface"
                      />
                    </form>

                    {activeTrip.itinerary.length === 0 ? (
                      <p className="font-body text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant py-4 text-center">
                        Adicione passeios, horários de saída e reservas no roteiro acima.
                      </p>
                    ) : (
                      <ul className="flex flex-col divide-y divide-light-outline-variant dark:divide-dark-outline-variant">
                        {activeTrip.itinerary.map((item) => (
                          <li
                            key={item.id}
                            className="py-2.5 flex flex-wrap items-center justify-between gap-2"
                          >
                            <button
                              type="button"
                              onClick={() =>
                                onUpdateTrip(activeTrip.id, {
                                  itinerary: activeTrip.itinerary.map((it) =>
                                    it.id === item.id ? { ...it, done: !it.done } : it
                                  ),
                                })
                              }
                              className="flex items-start gap-2.5 text-left min-w-0 flex-1"
                            >
                              <span
                                className={`material-symbols-outlined text-[20px] mt-0.5 shrink-0 ${
                                  item.done
                                    ? 'material-symbols-filled text-cat-emerald'
                                    : 'text-light-on-surface-variant dark:text-dark-on-surface-variant'
                                }`}
                              >
                                {item.done ? 'check_circle' : 'radio_button_unchecked'}
                              </span>
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-1.5 font-mono text-label-sm text-light-primary dark:text-dark-primary tabular-nums">
                                  <span>Dia {item.dayNumber}</span>
                                  <span aria-hidden="true">·</span>
                                  <span>{item.time}</span>
                                  {item.location && (
                                    <>
                                      <span aria-hidden="true">·</span>
                                      <span className="font-body text-light-on-surface-variant dark:text-dark-on-surface-variant">
                                        {item.location}
                                      </span>
                                    </>
                                  )}
                                </div>
                                <p
                                  className={`font-body text-body-md ${
                                    item.done
                                      ? 'line-through opacity-60 text-light-on-surface-variant dark:text-dark-on-surface-variant'
                                      : 'text-light-on-surface dark:text-dark-on-surface'
                                  }`}
                                >
                                  {item.title}
                                </p>
                                {item.notes && (
                                  <p className="font-body text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
                                    {item.notes}
                                  </p>
                                )}
                              </div>
                            </button>

                            <div className="flex items-center gap-1.5 shrink-0">
                              {onAddToAgenda && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    onAddToAgenda({
                                      time: item.time,
                                      title: `${activeTrip.destination}: ${item.title}`,
                                      category: 'blue',
                                    })
                                  }
                                  className="min-h-[34px] px-2.5 py-1 rounded-md border border-light-outline-variant dark:border-dark-outline-variant font-body text-label-sm text-light-primary dark:text-dark-primary whitespace-nowrap"
                                >
                                  Agendar
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() =>
                                  onUpdateTrip(activeTrip.id, {
                                    itinerary: activeTrip.itinerary.filter(
                                      (it) => it.id !== item.id
                                    ),
                                  })
                                }
                                aria-label="Remover atividade"
                                className="min-h-[34px] min-w-[34px] flex items-center justify-center text-light-on-surface-variant dark:text-dark-on-surface-variant hover:text-light-error dark:hover:text-dark-error"
                              >
                                <span className="material-symbols-outlined text-[18px]">
                                  close
                                </span>
                              </button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}

                {/* Subtab 3: Mala & Checklist */}
                {subTab === 'mala' && (
                  <div className="rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant p-4 flex flex-col gap-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-body-md text-light-on-surface dark:text-dark-on-surface tabular-nums">
                          {activeTrip.packing.filter((p) => p.packed).length}/
                          {activeTrip.packing.length} itens na mala
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={handleLoadEssentialPacking}
                        className="min-h-[36px] px-3 py-1.5 rounded-md border border-light-primary dark:border-dark-primary text-light-primary dark:text-dark-primary font-body text-label-md inline-flex items-center gap-1.5 whitespace-nowrap"
                      >
                        <span className="material-symbols-outlined text-[16px]">
                          luggage
                        </span>
                        <span>Carregar Checklist Essencial</span>
                      </button>
                    </div>

                    <form
                      onSubmit={handleAddPackingItem}
                      className="grid grid-cols-1 sm:grid-cols-12 gap-2"
                    >
                      <input
                        type="text"
                        value={packName}
                        onChange={(e) => setPackName(e.target.value)}
                        placeholder="Item para levar na mala..."
                        className="sm:col-span-5 rounded bg-light-surface-container-lowest dark:bg-dark-surface-container border border-light-outline-variant dark:border-dark-outline-variant px-3 py-2 font-body text-body-sm text-light-on-surface dark:text-dark-on-surface"
                      />
                      <select
                        value={packCategory}
                        onChange={(e) =>
                          setPackCategory(e.target.value as TripPackingCategory)
                        }
                        className="sm:col-span-3 rounded bg-light-surface-container-lowest dark:bg-dark-surface-container border border-light-outline-variant dark:border-dark-outline-variant px-2.5 py-2 font-body text-body-sm text-light-on-surface dark:text-dark-on-surface"
                      >
                        {TRIP_PACKING_CATEGORIES.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        min="1"
                        max="99"
                        value={packQty}
                        onChange={(e) => setPackQty(e.target.value)}
                        aria-label="Quantidade"
                        className="sm:col-span-2 rounded bg-light-surface-container-lowest dark:bg-dark-surface-container border border-light-outline-variant dark:border-dark-outline-variant px-2.5 py-2 font-mono text-body-sm text-light-on-surface dark:text-dark-on-surface"
                      />
                      <button
                        type="submit"
                        className="sm:col-span-2 min-h-[38px] px-3 py-2 rounded-md bg-light-primary dark:bg-dark-primary text-light-on-primary dark:text-dark-on-primary font-body text-label-md whitespace-nowrap"
                      >
                        + Mala
                      </button>
                    </form>

                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <select
                        aria-label="Filtrar itens da mala"
                        value={packCategoryFilter}
                        onChange={(e) =>
                          setPackCategoryFilter(
                            e.target.value as 'todas' | TripPackingCategory
                          )
                        }
                        className="rounded-md bg-light-surface-container-lowest dark:bg-dark-surface-container border border-light-outline-variant dark:border-dark-outline-variant px-2.5 py-1.5 font-body text-body-sm text-light-on-surface dark:text-dark-on-surface"
                      >
                        <option value="todas">Todas as categorias</option>
                        {TRIP_PACKING_CATEGORIES.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>

                      <label className="flex items-center gap-2 font-body text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
                        <input
                          type="checkbox"
                          checked={onlyUnpacked}
                          onChange={(e) => setOnlyUnpacked(e.target.checked)}
                        />
                        <span>Mostrar só o que falta guardar</span>
                      </label>
                    </div>

                    {filteredPacking.length === 0 ? (
                      <p className="font-body text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant py-4 text-center">
                        Nenhum item exibido. Use "Carregar Checklist Essencial" ou adicione acima.
                      </p>
                    ) : (
                      <ul className="flex flex-col divide-y divide-light-outline-variant dark:divide-dark-outline-variant">
                        {filteredPacking.map((p) => (
                          <li
                            key={p.id}
                            className="py-2 flex items-center justify-between gap-2"
                          >
                            <button
                              type="button"
                              onClick={() =>
                                onUpdateTrip(activeTrip.id, {
                                  packing: activeTrip.packing.map((item) =>
                                    item.id === p.id
                                      ? { ...item, packed: !item.packed }
                                      : item
                                  ),
                                })
                              }
                              className="flex items-center gap-2.5 text-left min-w-0 flex-1 min-h-[36px]"
                            >
                              <span
                                className={`material-symbols-outlined text-[20px] shrink-0 ${
                                  p.packed
                                    ? 'material-symbols-filled text-cat-emerald'
                                    : 'text-light-on-surface-variant dark:text-dark-on-surface-variant'
                                }`}
                              >
                                {p.packed ? 'check_box' : 'check_box_outline_blank'}
                              </span>
                              <span
                                className={`font-body text-body-md truncate ${
                                  p.packed
                                    ? 'line-through opacity-60 text-light-on-surface-variant dark:text-dark-on-surface-variant'
                                    : 'text-light-on-surface dark:text-dark-on-surface'
                                }`}
                              >
                                {p.name}
                              </span>
                            </button>

                            <div className="flex items-center gap-2 shrink-0">
                              <span className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
                                {p.category} ·{' '}
                                <span className="font-mono tabular-nums">
                                  {p.quantity}x
                                </span>
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  onUpdateTrip(activeTrip.id, {
                                    packing: activeTrip.packing.filter(
                                      (item) => item.id !== p.id
                                    ),
                                  })
                                }
                                aria-label="Remover item da mala"
                                className="min-h-[32px] min-w-[32px] flex items-center justify-center text-light-on-surface-variant dark:text-dark-on-surface-variant hover:text-light-error dark:hover:text-dark-error"
                              >
                                <span className="material-symbols-outlined text-[16px]">
                                  close
                                </span>
                              </button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}

                {/* Subtab 4: Reservas & Dados */}
                {subTab === 'reservas' && (
                  <div className="rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant p-4 flex flex-col gap-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <label className="flex flex-col gap-1">
                        <span className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
                          Hospedagem / Endereço
                        </span>
                        <input
                          type="text"
                          value={activeTrip.lodgingName ?? ''}
                          onChange={(e) =>
                            onUpdateTrip(activeTrip.id, { lodgingName: e.target.value })
                          }
                          placeholder="Nome do hotel, pousada ou casa..."
                          className="rounded bg-light-surface-container-lowest dark:bg-dark-surface-container border border-light-outline-variant dark:border-dark-outline-variant px-3 py-2 font-body text-body-md text-light-on-surface dark:text-dark-on-surface"
                        />
                      </label>

                      <label className="flex flex-col gap-1">
                        <span className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
                          Transporte / Voo / Trajeto
                        </span>
                        <input
                          type="text"
                          value={activeTrip.transportInfo ?? ''}
                          onChange={(e) =>
                            onUpdateTrip(activeTrip.id, {
                              transportInfo: e.target.value,
                            })
                          }
                          placeholder="Código do voo, rodovia, horário de embarque..."
                          className="rounded bg-light-surface-container-lowest dark:bg-dark-surface-container border border-light-outline-variant dark:border-dark-outline-variant px-3 py-2 font-body text-body-md text-light-on-surface dark:text-dark-on-surface"
                        />
                      </label>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <label className="flex flex-col gap-1">
                        <span className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
                          Data de ida
                        </span>
                        <input
                          type="date"
                          value={activeTrip.startDate}
                          onChange={(e) =>
                            onUpdateTrip(activeTrip.id, { startDate: e.target.value })
                          }
                          className="rounded bg-light-surface-container-lowest dark:bg-dark-surface-container border border-light-outline-variant dark:border-dark-outline-variant px-3 py-2 font-mono text-body-md text-light-on-surface dark:text-dark-on-surface"
                        />
                      </label>

                      <label className="flex flex-col gap-1">
                        <span className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
                          Data de volta
                        </span>
                        <input
                          type="date"
                          value={activeTrip.endDate}
                          onChange={(e) =>
                            onUpdateTrip(activeTrip.id, { endDate: e.target.value })
                          }
                          className="rounded bg-light-surface-container-lowest dark:bg-dark-surface-container border border-light-outline-variant dark:border-dark-outline-variant px-3 py-2 font-mono text-body-md text-light-on-surface dark:text-dark-on-surface"
                        />
                      </label>

                      <label className="flex flex-col gap-1">
                        <span className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
                          Teto de orçamento (R$)
                        </span>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={activeTrip.estimatedBudget}
                          onChange={(e) =>
                            onUpdateTrip(activeTrip.id, {
                              estimatedBudget: Math.max(
                                0,
                                Number(e.target.value) || 0
                              ),
                            })
                          }
                          className="rounded bg-light-surface-container-lowest dark:bg-dark-surface-container border border-light-outline-variant dark:border-dark-outline-variant px-3 py-2 font-mono text-body-md text-light-on-surface dark:text-dark-on-surface"
                        />
                      </label>
                    </div>

                    <label className="flex flex-col gap-1">
                      <span className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
                        Códigos de reserva, documentos e anotações importantes
                      </span>
                      <textarea
                        rows={4}
                        value={activeTrip.reservationNotes ?? ''}
                        onChange={(e) =>
                          onUpdateTrip(activeTrip.id, {
                            reservationNotes: e.target.value,
                          })
                        }
                        placeholder="Check-in/check-out, localizador, telefones úteis, lembretes..."
                        className="rounded bg-light-surface-container-lowest dark:bg-dark-surface-container border border-light-outline-variant dark:border-dark-outline-variant px-3 py-2 font-body text-body-md text-light-on-surface dark:text-dark-on-surface"
                      />
                    </label>
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      </main>
    </div>
  );
};
