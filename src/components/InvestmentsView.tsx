import React, { useMemo, useState } from 'react';
import {
  InvestmentAsset,
  InvestmentCategory,
  MarketRatesSnapshot,
} from '../types';

interface InvestmentsViewProps {
  investments: InvestmentAsset[];
  marketRates: MarketRatesSnapshot;
  isLoadingRates: boolean;
  onRefreshRates: () => void;
  onAddAsset: (asset: Omit<InvestmentAsset, 'id' | 'updatedAt'>) => void;
  onUpdateAssetAmount: (id: string, nextAmount: number) => void;
  onDeleteAsset: (id: string) => void;
  onOpenCalculator: () => void;
  onOpenFinance?: () => void;
  onBack: () => void;
  onShowToast: (msg: string) => void;
}

const CATEGORIES: InvestmentCategory[] = [
  'Reserva',
  'Renda Fixa',
  'FIIs',
  'Ações',
  'Cripto',
];

const CATEGORY_COLOR: Record<InvestmentCategory, string> = {
  Reserva: 'bg-cat-emerald',
  'Renda Fixa': 'bg-cat-blue',
  FIIs: 'bg-accent-gold',
  Ações: 'bg-cat-violet',
  Cripto: 'bg-light-primary dark:bg-dark-primary',
};

function formatBRL(value: number): string {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function parseBRLNumber(raw: string): number {
  const cleaned = raw.replace(/[^\d.,-]/g, '').trim();
  if (!cleaned) return Number.NaN;
  const hasComma = cleaned.includes(',');
  const hasDot = cleaned.includes('.');
  if (hasComma && hasDot) {
    return cleaned.lastIndexOf(',') > cleaned.lastIndexOf('.')
      ? parseFloat(cleaned.replace(/\./g, '').replace(',', '.'))
      : parseFloat(cleaned.replace(/,/g, ''));
  }
  if (hasComma) return parseFloat(cleaned.replace(',', '.'));
  if (hasDot) {
    const parts = cleaned.split('.');
    if (parts.length > 2 || (parts.length === 2 && parts[1].length === 3)) {
      return parseFloat(cleaned.replace(/\./g, ''));
    }
    return parseFloat(cleaned);
  }
  return parseFloat(cleaned);
}

function simulateCompound(
  initial: number,
  monthly: number,
  annualRatePct: number,
  months: number
) {
  const monthlyRate = Math.pow(1 + Math.max(0, annualRatePct) / 100, 1 / 12) - 1;
  let balance = Math.max(0, initial);
  let totalContributed = Math.max(0, initial);

  for (let m = 0; m < months; m += 1) {
    balance = balance * (1 + monthlyRate) + Math.max(0, monthly);
    totalContributed += Math.max(0, monthly);
  }

  return {
    finalAmount: balance,
    totalContributed,
    interestEarned: Math.max(0, balance - totalContributed),
  };
}

export const InvestmentsView: React.FC<InvestmentsViewProps> = ({
  investments,
  marketRates,
  isLoadingRates,
  onRefreshRates,
  onAddAsset,
  onUpdateAssetAmount,
  onDeleteAsset,
  onOpenCalculator,
  onOpenFinance,
  onBack,
  onShowToast,
}) => {
  const [subTab, setSubTab] = useState<'carteira' | 'simulador'>('carteira');
  const [selectedCategory, setSelectedCategory] = useState<'Todas' | InvestmentCategory>('Todas');
  const [showAddForm, setShowAddForm] = useState(false);

  // Add asset form
  const [name, setName] = useState('');
  const [ticker, setTicker] = useState('');
  const [category, setCategory] = useState<InvestmentCategory>('Renda Fixa');
  const [investedStr, setInvestedStr] = useState('');
  const [currentStr, setCurrentStr] = useState('');
  const [rateStr, setRateStr] = useState(String(marketRates.cdi));
  const [notes, setNotes] = useState('');

  // Inline edit saldo state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAmountStr, setEditAmountStr] = useState('');

  // Simulator state
  const [simInitial, setSimInitial] = useState('5000');
  const [simMonthly, setSimMonthly] = useState('500');
  const [simRate, setSimRate] = useState(String(marketRates.cdi));
  const [simYears, setSimYears] = useState('5');

  const totals = useMemo(() => {
    const invested = investments.reduce((acc, a) => acc + a.investedAmount, 0);
    const current = investments.reduce((acc, a) => acc + a.currentAmount, 0);
    const profit = current - invested;
    const pct = invested > 0 ? (profit / invested) * 100 : 0;

    const byCategory = CATEGORIES.map((cat) => {
      const sum = investments
        .filter((a) => a.category === cat)
        .reduce((acc, a) => acc + a.currentAmount, 0);
      return {
        category: cat,
        amount: sum,
        share: current > 0 ? (sum / current) * 100 : 0,
      };
    }).filter((c) => c.amount > 0);

    return { invested, current, profit, pct, byCategory };
  }, [investments]);

  const filteredAssets = useMemo(() => {
    if (selectedCategory === 'Todas') return investments;
    return investments.filter((a) => a.category === selectedCategory);
  }, [investments, selectedCategory]);

  const simInitialNum = Math.max(0, parseFloat(simInitial.replace(',', '.')) || 0);
  const simMonthlyNum = Math.max(0, parseFloat(simMonthly.replace(',', '.')) || 0);
  const simRateNum = Math.max(0, parseFloat(simRate.replace(',', '.')) || 0);
  const simMonths = Math.max(1, Math.min(480, Math.round((parseFloat(simYears.replace(',', '.')) || 1) * 12)));

  const simResult = useMemo(
    () => simulateCompound(simInitialNum, simMonthlyNum, simRateNum, simMonths),
    [simInitialNum, simMonthlyNum, simRateNum, simMonths]
  );

  const poupancaResult = useMemo(
    () => simulateCompound(simInitialNum, simMonthlyNum, marketRates.poupancaAnual, simMonths),
    [simInitialNum, simMonthlyNum, marketRates.poupancaAnual, simMonths]
  );

  const cdiResult = useMemo(
    () => simulateCompound(simInitialNum, simMonthlyNum, marketRates.cdi, simMonths),
    [simInitialNum, simMonthlyNum, marketRates.cdi, simMonths]
  );

  const handleCreateAsset = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim();
    const invested = parseBRLNumber(investedStr);
    const current = parseBRLNumber(currentStr || investedStr);
    const rate = parseBRLNumber(rateStr) || 0;

    if (!cleanName || Number.isNaN(invested) || invested < 0) {
      onShowToast('Informe o nome do ativo e o valor investido.');
      return;
    }

    onAddAsset({
      name: cleanName,
      ticker: ticker.trim().toUpperCase() || undefined,
      category,
      investedAmount: invested,
      currentAmount: Number.isNaN(current) ? invested : current,
      annualRatePct: rate,
      notes: notes.trim() || undefined,
    });

    setName('');
    setTicker('');
    setInvestedStr('');
    setCurrentStr('');
    setNotes('');
    setShowAddForm(false);
    onShowToast(`"${cleanName}" adicionado à sua carteira.`);
  };

  const handleSaveEdit = (id: string) => {
    const val = parseBRLNumber(editAmountStr);
    if (Number.isNaN(val) || val < 0) {
      onShowToast('Valor inválido.');
      return;
    }
    onUpdateAssetAmount(id, val);
    setEditingId(null);
    onShowToast('Saldo atualizado.');
  };

  return (
    <div className="flex flex-col">
      <header className="px-4 lg:px-8 pt-6 pb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onBack}
            aria-label="Voltar"
            className="inline-flex items-center justify-center min-w-[44px] min-h-[44px] rounded-full bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant text-light-on-surface dark:text-dark-on-surface hover:border-light-primary dark:hover:border-dark-primary transition-colors shrink-0"
          >
            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
          </button>
          <div className="min-w-0">
            <h1 className="font-headline text-headline-lg text-light-on-surface dark:text-dark-on-surface truncate">
              Investimentos
            </h1>
            <p className="font-body text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant truncate">
              Carteira, taxas do mercado brasileiro e simulador de rendimento.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {onOpenFinance && (
            <button
              type="button"
              onClick={onOpenFinance}
              className="inline-flex items-center gap-1.5 min-h-[44px] px-3 py-2 rounded-full border border-light-outline-variant dark:border-dark-outline-variant bg-light-surface-container-low dark:bg-dark-surface-container-low text-light-on-surface dark:text-dark-on-surface font-body text-body-sm hover:border-light-primary dark:hover:border-dark-primary whitespace-nowrap"
            >
              <span className="material-symbols-outlined text-[18px] text-cat-emerald">
                account_balance_wallet
              </span>
              <span className="hidden sm:inline">Meus Gastos</span>
            </button>
          )}
          <button
            type="button"
            onClick={onOpenCalculator}
            className="inline-flex items-center gap-1.5 min-h-[44px] px-3 py-2 rounded-full border border-light-outline-variant dark:border-dark-outline-variant bg-light-surface-container-low dark:bg-dark-surface-container-low text-light-on-surface dark:text-dark-on-surface font-body text-body-sm hover:border-light-primary dark:hover:border-dark-primary whitespace-nowrap"
          >
            <span className="material-symbols-outlined text-[18px]">calculate</span>
            <span className="hidden sm:inline">Calculadora</span>
          </button>
          <button
            type="button"
            onClick={onRefreshRates}
            disabled={isLoadingRates}
            aria-label="Atualizar cotações"
            className="inline-flex items-center gap-1.5 min-h-[44px] px-3 py-2 rounded-full bg-light-primary dark:bg-dark-primary text-light-on-primary dark:text-dark-on-primary font-body text-body-sm font-semibold whitespace-nowrap disabled:opacity-60"
          >
            <span className="material-symbols-outlined text-[18px]">refresh</span>
            <span>{isLoadingRates ? 'Atualizando...' : 'Cotações'}</span>
          </button>
        </div>
      </header>

      <main className="px-4 lg:px-8 pb-28 lg:pb-12 flex flex-col gap-5">
        {/* Market Indicators Strip */}
        <section
          aria-label="Indicadores de mercado"
          className="rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant p-4 flex flex-col gap-3"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-headline text-title-md text-light-on-surface dark:text-dark-on-surface">
              Mercado Hoje
            </h2>
            <span className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant tabular-nums">
              {marketRates.isLive ? 'Taxas ao vivo' : 'Taxas de referência'} · Atualizado às {marketRates.updatedAt}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 border-t border-light-outline-variant dark:border-dark-outline-variant pt-3">
            <div className="flex flex-col gap-0.5">
              <span className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
                Taxa Selic
              </span>
              <span className="font-mono text-title-md text-light-primary dark:text-dark-primary tabular-nums">
                {marketRates.selic.toFixed(2)}% a.a.
              </span>
            </div>

            <div className="flex flex-col gap-0.5">
              <span className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
                CDI Hoje
              </span>
              <span className="font-mono text-title-md text-cat-emerald tabular-nums">
                {marketRates.cdi.toFixed(2)}% a.a.
              </span>
            </div>

            <div className="flex flex-col gap-0.5">
              <span className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
                IPCA (12m)
              </span>
              <span className="font-mono text-title-md text-light-on-surface dark:text-dark-on-surface tabular-nums">
                {marketRates.ipca.toFixed(2)}% a.a.
              </span>
            </div>

            <div className="flex flex-col gap-0.5">
              <span className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
                Dólar (USD)
              </span>
              <span className="font-mono text-title-md text-light-on-surface dark:text-dark-on-surface tabular-nums">
                R$ {marketRates.usdBrl.toFixed(2)}
              </span>
            </div>

            <div className="flex flex-col gap-0.5">
              <span className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
                Euro (EUR)
              </span>
              <span className="font-mono text-title-md text-light-on-surface dark:text-dark-on-surface tabular-nums">
                R$ {marketRates.eurBrl.toFixed(2)}
              </span>
            </div>

            <div className="flex flex-col gap-0.5">
              <span className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
                Bitcoin (BTC)
              </span>
              <span className="font-mono text-title-md text-light-on-surface dark:text-dark-on-surface tabular-nums">
                R$ {marketRates.btcBrl.toLocaleString('pt-BR')}
              </span>
              {marketRates.btcChange24h !== 0 && (
                <span
                  className={`font-mono text-[11px] tabular-nums ${
                    marketRates.btcChange24h >= 0
                      ? 'text-cat-emerald'
                      : 'text-light-error dark:text-dark-error'
                  }`}
                >
                  {marketRates.btcChange24h >= 0 ? '▲ Alta' : '▼ Queda'}{' '}
                  {Math.abs(marketRates.btcChange24h).toFixed(2)}% (24h)
                </span>
              )}
            </div>
          </div>
        </section>

        {/* Sub-tab Switch: Carteira vs Simulador */}
        <div className="flex items-center gap-1 p-1 rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant w-fit">
          <button
            type="button"
            onClick={() => setSubTab('carteira')}
            className={`min-h-[40px] px-4 py-1.5 rounded-md font-body text-body-sm font-semibold whitespace-nowrap transition-colors ${
              subTab === 'carteira'
                ? 'bg-light-primary dark:bg-dark-primary text-light-on-primary dark:text-dark-on-primary'
                : 'text-light-on-surface-variant dark:text-dark-on-surface-variant hover:text-light-on-surface dark:hover:text-dark-on-surface'
            }`}
          >
            Minha Carteira ({investments.length})
          </button>
          <button
            type="button"
            onClick={() => setSubTab('simulador')}
            className={`min-h-[40px] px-4 py-1.5 rounded-md font-body text-body-sm font-semibold whitespace-nowrap transition-colors ${
              subTab === 'simulador'
                ? 'bg-light-primary dark:bg-dark-primary text-light-on-primary dark:text-dark-on-primary'
                : 'text-light-on-surface-variant dark:text-dark-on-surface-variant hover:text-light-on-surface dark:hover:text-dark-on-surface'
            }`}
          >
            Simulador de Juros Compostos
          </button>
        </div>

        {subTab === 'carteira' ? (
          <div className="flex flex-col gap-5">
            {/* Portfolio Summary KPIs */}
            <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant p-4 flex flex-col gap-1">
                <span className="font-body text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
                  Patrimônio Atual
                </span>
                <span className="font-mono text-headline-md text-light-on-surface dark:text-dark-on-surface tabular-nums">
                  {formatBRL(totals.current)}
                </span>
              </div>

              <div className="rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant p-4 flex flex-col gap-1">
                <span className="font-body text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
                  Total Aportado
                </span>
                <span className="font-mono text-headline-md text-light-on-surface dark:text-dark-on-surface tabular-nums">
                  {formatBRL(totals.invested)}
                </span>
              </div>

              <div className="rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant p-4 flex flex-col gap-1">
                <span className="font-body text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
                  Rendimento Acumulado
                </span>
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span
                    className={`font-mono text-headline-md tabular-nums ${
                      totals.profit >= 0
                        ? 'text-cat-emerald'
                        : 'text-light-error dark:text-dark-error'
                    }`}
                  >
                    {totals.profit >= 0 ? '+' : ''}
                    {formatBRL(totals.profit)}
                  </span>
                  <span
                    className={`font-mono text-body-sm tabular-nums ${
                      totals.profit >= 0
                        ? 'text-cat-emerald'
                        : 'text-light-error dark:text-dark-error'
                    }`}
                  >
                    ({totals.profit >= 0 ? '▲' : '▼'} {Math.abs(totals.pct).toFixed(2)}%)
                  </span>
                </div>
              </div>
            </section>

            {/* Allocation Breakdown Bar */}
            {totals.byCategory.length > 0 && (
              <section className="rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant p-4 flex flex-col gap-3">
                <h2 className="font-headline text-title-md text-light-on-surface dark:text-dark-on-surface">
                  Distribuição da Carteira
                </h2>
                <div className="h-3 w-full rounded-full overflow-hidden flex bg-light-surface-container-highest dark:bg-dark-surface-container-highest">
                  {totals.byCategory.map((item) => (
                    <div
                      key={item.category}
                      style={{ width: `${Math.max(2, item.share)}%` }}
                      className={`${CATEGORY_COLOR[item.category]} h-full`}
                      title={`${item.category}: ${item.share.toFixed(1)}%`}
                    />
                  ))}
                </div>
                <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                  {totals.byCategory.map((item) => (
                    <div key={item.category} className="flex items-center gap-2 text-body-sm">
                      <span className={`w-2.5 h-2.5 rounded-sm ${CATEGORY_COLOR[item.category]}`} />
                      <span className="font-body text-light-on-surface dark:text-dark-on-surface">
                        {item.category}
                      </span>
                      <span className="font-mono text-light-on-surface-variant dark:text-dark-on-surface-variant tabular-nums">
                        {item.share.toFixed(1)}% · {formatBRL(item.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Filter & New Asset Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-1 p-1 rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant overflow-x-auto max-w-full">
                {(['Todas', ...CATEGORIES] as const).map((cat) => {
                  const active = selectedCategory === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategory(cat)}
                      className={`min-h-[38px] px-3 py-1 rounded-md font-body text-body-sm whitespace-nowrap transition-colors ${
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

              <button
                type="button"
                onClick={() => setShowAddForm((p) => !p)}
                className="inline-flex items-center gap-1.5 min-h-[44px] px-4 py-2 rounded-full bg-light-primary dark:bg-dark-primary text-light-on-primary dark:text-dark-on-primary font-body text-label-lg whitespace-nowrap"
              >
                <span className="material-symbols-outlined text-[18px]">
                  {showAddForm ? 'close' : 'add'}
                </span>
                <span>{showAddForm ? 'Cancelar' : 'Novo Ativo / Aporte'}</span>
              </button>
            </div>

            {showAddForm && (
              <form
                onSubmit={handleCreateAsset}
                className="rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-primary/60 dark:border-dark-primary/60 p-4 flex flex-col gap-3"
              >
                <h2 className="font-headline text-title-md text-light-on-surface dark:text-dark-on-surface">
                  Cadastrar Investimento
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
                      Nome do ativo
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ex: Tesouro IPCA+ 2035"
                      required
                      className="rounded bg-light-surface-container-lowest dark:bg-dark-surface-container border border-light-outline-variant dark:border-dark-outline-variant px-3 py-2 text-body-md text-light-on-surface dark:text-dark-on-surface focus:outline-none focus:border-light-primary dark:focus:border-dark-primary"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
                      Código / Ticker (opcional)
                    </label>
                    <input
                      type="text"
                      value={ticker}
                      onChange={(e) => setTicker(e.target.value)}
                      placeholder="Ex: MXRF11, PETR4"
                      className="rounded bg-light-surface-container-lowest dark:bg-dark-surface-container border border-light-outline-variant dark:border-dark-outline-variant px-3 py-2 text-body-md text-light-on-surface dark:text-dark-on-surface focus:outline-none focus:border-light-primary dark:focus:border-dark-primary"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
                      Categoria
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value as InvestmentCategory)}
                      className="rounded bg-light-surface-container-lowest dark:bg-dark-surface-container border border-light-outline-variant dark:border-dark-outline-variant px-3 py-2 text-body-md text-light-on-surface dark:text-dark-on-surface focus:outline-none focus:border-light-primary dark:focus:border-dark-primary"
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
                      Valor Investido (R$)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={investedStr}
                      onChange={(e) => setInvestedStr(e.target.value)}
                      placeholder="1000.00"
                      required
                      className="rounded bg-light-surface-container-lowest dark:bg-dark-surface-container border border-light-outline-variant dark:border-dark-outline-variant px-3 py-2 text-body-md font-mono tabular-nums text-light-on-surface dark:text-dark-on-surface focus:outline-none focus:border-light-primary dark:focus:border-dark-primary"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
                      Saldo Atual (R$)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={currentStr}
                      onChange={(e) => setCurrentStr(e.target.value)}
                      placeholder="Opcional (igual ao investido)"
                      className="rounded bg-light-surface-container-lowest dark:bg-dark-surface-container border border-light-outline-variant dark:border-dark-outline-variant px-3 py-2 text-body-md font-mono tabular-nums text-light-on-surface dark:text-dark-on-surface focus:outline-none focus:border-light-primary dark:focus:border-dark-primary"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
                      Rentabilidade Estimada (% a.a.)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={rateStr}
                      onChange={(e) => setRateStr(e.target.value)}
                      className="rounded bg-light-surface-container-lowest dark:bg-dark-surface-container border border-light-outline-variant dark:border-dark-outline-variant px-3 py-2 text-body-md font-mono tabular-nums text-light-on-surface dark:text-dark-on-surface focus:outline-none focus:border-light-primary dark:focus:border-dark-primary"
                    />
                  </div>
                </div>

                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Objetivo ou observação (ex: aposentadoria, viagem, dividendos...)"
                  className="rounded bg-light-surface-container-lowest dark:bg-dark-surface-container border border-light-outline-variant dark:border-dark-outline-variant px-3 py-2 text-body-md text-light-on-surface dark:text-dark-on-surface focus:outline-none focus:border-light-primary dark:focus:border-dark-primary"
                />

                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="min-h-[44px] px-5 py-2 rounded-full bg-light-primary dark:bg-dark-primary text-light-on-primary dark:text-dark-on-primary font-body text-label-lg"
                  >
                    Salvar Investimento
                  </button>
                </div>
              </form>
            )}

            {/* Assets List */}
            {filteredAssets.length === 0 ? (
              <div className="rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant p-8 text-center flex flex-col items-center gap-3">
                <p className="font-body text-body-md text-light-on-surface-variant dark:text-dark-on-surface-variant">
                  Nenhum ativo cadastrado nesta categoria ainda.
                </p>
                <button
                  type="button"
                  onClick={() => setShowAddForm(true)}
                  className="min-h-[44px] px-4 py-2 rounded-full bg-light-primary dark:bg-dark-primary text-light-on-primary dark:text-dark-on-primary font-body text-label-lg"
                >
                  Adicionar primeiro ativo
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredAssets.map((asset) => {
                  const diff = asset.currentAmount - asset.investedAmount;
                  const pct =
                    asset.investedAmount > 0 ? (diff / asset.investedAmount) * 100 : 0;
                  const isEditing = editingId === asset.id;

                  return (
                    <article
                      key={asset.id}
                      className="rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant p-4 flex flex-col justify-between gap-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
                            <span className={`w-2 h-2 rounded-sm ${CATEGORY_COLOR[asset.category]}`} />
                            <span>{asset.category}</span>
                            {asset.ticker && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span className="font-mono text-light-primary dark:text-dark-primary">
                                  {asset.ticker}
                                </span>
                              </>
                            )}
                            <span aria-hidden="true">·</span>
                            <span className="font-mono tabular-nums">
                              {asset.annualRatePct.toFixed(1)}% a.a.
                            </span>
                          </div>
                          <h3 className="font-headline text-title-md text-light-on-surface dark:text-dark-on-surface mt-1">
                            {asset.name}
                          </h3>
                          {asset.notes && (
                            <p className="font-body text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant mt-0.5">
                              {asset.notes}
                            </p>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => onDeleteAsset(asset.id)}
                          aria-label={`Remover ${asset.name}`}
                          className="inline-flex items-center justify-center min-w-[40px] min-h-[40px] rounded-full text-light-on-surface-variant dark:text-dark-on-surface-variant hover:text-light-error dark:hover:text-dark-error"
                        >
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                      </div>

                      <div className="border-t border-light-outline-variant dark:border-dark-outline-variant pt-3 flex flex-wrap items-end justify-between gap-2">
                        <div>
                          <span className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant block">
                            Saldo Atual (Aportado: {formatBRL(asset.investedAmount)})
                          </span>
                          <div className="flex items-baseline gap-2">
                            <span className="font-mono text-title-md text-light-on-surface dark:text-dark-on-surface tabular-nums">
                              {formatBRL(asset.currentAmount)}
                            </span>
                            <span
                              className={`font-mono text-body-sm tabular-nums ${
                                diff >= 0
                                  ? 'text-cat-emerald'
                                  : 'text-light-error dark:text-dark-error'
                              }`}
                            >
                              {diff >= 0 ? '▲ +' : '▼ '}
                              {pct.toFixed(2)}%
                            </span>
                          </div>
                        </div>

                        {isEditing ? (
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              step="0.01"
                              value={editAmountStr}
                              onChange={(e) => setEditAmountStr(e.target.value)}
                              aria-label="Novo saldo"
                              className="w-28 rounded bg-light-surface-container-lowest dark:bg-dark-surface-container border border-light-primary dark:border-dark-primary px-2 py-1.5 font-mono text-body-sm tabular-nums text-light-on-surface dark:text-dark-on-surface"
                            />
                            <button
                              type="button"
                              onClick={() => handleSaveEdit(asset.id)}
                              className="min-h-[36px] px-3 rounded-md bg-light-primary dark:bg-dark-primary text-light-on-primary dark:text-dark-on-primary font-body text-label-sm"
                            >
                              Salvar
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingId(asset.id);
                              setEditAmountStr(String(asset.currentAmount));
                            }}
                            className="min-h-[38px] px-3 py-1 rounded-full border border-light-outline-variant dark:border-dark-outline-variant font-body text-body-sm text-light-on-surface dark:text-dark-on-surface hover:border-light-primary dark:hover:border-dark-primary"
                          >
                            Atualizar saldo
                          </button>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* Compound Interest Simulator */
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            <div className="lg:col-span-5 rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant p-4 flex flex-col gap-4">
              <h2 className="font-headline text-title-md text-light-on-surface dark:text-dark-on-surface">
                Parâmetros da Simulação
              </h2>

              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                  <label className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
                    Aporte Inicial (R$)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={simInitial}
                    onChange={(e) => setSimInitial(e.target.value)}
                    className="rounded bg-light-surface-container-lowest dark:bg-dark-surface-container border border-light-outline-variant dark:border-dark-outline-variant px-3 py-2 font-mono text-body-md tabular-nums text-light-on-surface dark:text-dark-on-surface focus:outline-none focus:border-light-primary dark:focus:border-dark-primary"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
                    Aporte Mensal (R$)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="50"
                    value={simMonthly}
                    onChange={(e) => setSimMonthly(e.target.value)}
                    className="rounded bg-light-surface-container-lowest dark:bg-dark-surface-container border border-light-outline-variant dark:border-dark-outline-variant px-3 py-2 font-mono text-body-md tabular-nums text-light-on-surface dark:text-dark-on-surface focus:outline-none focus:border-light-primary dark:focus:border-dark-primary"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
                      Taxa (% ao ano)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={simRate}
                      onChange={(e) => setSimRate(e.target.value)}
                      className="rounded bg-light-surface-container-lowest dark:bg-dark-surface-container border border-light-outline-variant dark:border-dark-outline-variant px-3 py-2 font-mono text-body-md tabular-nums text-light-on-surface dark:text-dark-on-surface focus:outline-none focus:border-light-primary dark:focus:border-dark-primary"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
                      Prazo (Anos)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="40"
                      value={simYears}
                      onChange={(e) => setSimYears(e.target.value)}
                      className="rounded bg-light-surface-container-lowest dark:bg-dark-surface-container border border-light-outline-variant dark:border-dark-outline-variant px-3 py-2 font-mono text-body-md tabular-nums text-light-on-surface dark:text-dark-on-surface focus:outline-none focus:border-light-primary dark:focus:border-dark-primary"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 pt-1">
                  <span className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
                    Atalhos de taxa do mercado
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { label: `Poupança (${marketRates.poupancaAnual}%)`, val: marketRates.poupancaAnual },
                      { label: `100% CDI (${marketRates.cdi}%)`, val: marketRates.cdi },
                      {
                        label: `110% CDI (${(marketRates.cdi * 1.1).toFixed(2)}%)`,
                        val: Number((marketRates.cdi * 1.1).toFixed(2)),
                      },
                      {
                        label: `IPCA + 6% (${(marketRates.ipca + 6).toFixed(2)}%)`,
                        val: Number((marketRates.ipca + 6).toFixed(2)),
                      },
                    ].map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => setSimRate(String(preset.val))}
                        className="min-h-[36px] px-2.5 py-1 rounded-md border border-light-outline-variant dark:border-dark-outline-variant bg-light-surface-container dark:bg-dark-surface-container font-body text-label-sm text-light-on-surface dark:text-dark-on-surface hover:border-light-primary dark:hover:border-dark-primary"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-7 rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant p-4 flex flex-col gap-4">
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-headline text-title-md text-light-on-surface dark:text-dark-on-surface">
                  Resultado em {simYears || '1'} ano(s) ({simMonths} meses)
                </h2>
                <span className="font-mono text-body-sm text-light-primary dark:text-dark-primary tabular-nums">
                  {simRateNum.toFixed(2)}% a.a.
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 border-b border-light-outline-variant dark:border-dark-outline-variant pb-4">
                <div>
                  <span className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant block">
                    Valor Final Bruto
                  </span>
                  <span className="font-mono text-headline-md text-light-primary dark:text-dark-primary tabular-nums">
                    {formatBRL(simResult.finalAmount)}
                  </span>
                </div>

                <div>
                  <span className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant block">
                    Total Investido
                  </span>
                  <span className="font-mono text-title-md text-light-on-surface dark:text-dark-on-surface tabular-nums">
                    {formatBRL(simResult.totalContributed)}
                  </span>
                </div>

                <div>
                  <span className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant block">
                    Juros Compostos
                  </span>
                  <span className="font-mono text-title-md text-cat-emerald tabular-nums">
                    +{formatBRL(simResult.interestEarned)}
                  </span>
                </div>
              </div>

              {/* Comparison vs Poupança & CDI */}
              <div className="flex flex-col gap-3">
                <h3 className="font-headline text-label-lg text-light-on-surface dark:text-dark-on-surface">
                  Comparativo com Aplicações Brasileiras
                </h3>

                {[
                  {
                    label: `Simulação (${simRateNum.toFixed(2)}% a.a.)`,
                    value: simResult.finalAmount,
                    barClass: 'bg-light-primary dark:bg-dark-primary',
                  },
                  {
                    label: `100% do CDI (${marketRates.cdi.toFixed(2)}% a.a.)`,
                    value: cdiResult.finalAmount,
                    barClass: 'bg-cat-emerald',
                  },
                  {
                    label: `Poupança (${marketRates.poupancaAnual.toFixed(2)}% a.a.)`,
                    value: poupancaResult.finalAmount,
                    barClass: 'bg-cat-blue',
                  },
                ].map((row) => {
                  const maxVal = Math.max(
                    simResult.finalAmount,
                    cdiResult.finalAmount,
                    poupancaResult.finalAmount,
                    1
                  );
                  const widthPct = Math.max(8, (row.value / maxVal) * 100);
                  return (
                    <div key={row.label} className="flex flex-col gap-1">
                      <div className="flex items-center justify-between text-body-sm gap-2">
                        <span className="font-body text-light-on-surface dark:text-dark-on-surface">
                          {row.label}
                        </span>
                        <span className="font-mono text-light-on-surface dark:text-dark-on-surface tabular-nums">
                          {formatBRL(row.value)}
                        </span>
                      </div>
                      <div className="h-2.5 w-full rounded-full bg-light-surface-container-highest dark:bg-dark-surface-container-highest overflow-hidden">
                        <div
                          style={{ width: `${widthPct}%` }}
                          className={`h-full rounded-full ${row.barClass}`}
                        />
                      </div>
                    </div>
                  );
                })}

                <p className="font-body text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant pt-1 tabular-nums">
                  Diferença da sua taxa em relação à Poupança:{' '}
                  <strong className="text-light-on-surface dark:text-dark-on-surface font-mono">
                    {simResult.finalAmount - poupancaResult.finalAmount >= 0 ? '+' : ''}
                    {formatBRL(simResult.finalAmount - poupancaResult.finalAmount)}
                  </strong>
                </p>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
};
