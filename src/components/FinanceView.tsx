import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  FinanceEntryType,
  FinanceTransaction,
} from '../types';

export type FinanceListFilter = 'todos' | 'gasto' | 'receita' | 'pendentes' | 'pagos';
type SortMode = 'nao_pagos_primeiro' | 'recentes' | 'maior_valor' | 'categoria';

interface FinanceViewProps {
  transactions: FinanceTransaction[];
  budgets?: Record<string, number>;
  initialFilter?: FinanceListFilter | null;
  onConsumeInitialFilter?: () => void;
  onAddTransaction: (tx: Omit<FinanceTransaction, 'id'>) => void;
  onUpdateTransaction: (id: string, patch: Partial<FinanceTransaction>) => void;
  onDeleteTransaction: (id: string) => void;
  onUpdateBudget?: (category: string, limit: number) => void;
  onOpenInvestments: () => void;
  onOpenCalculator: () => void;
  onBack: () => void;
  onShowToast: (msg: string) => void;
}

const EXPENSE_CATEGORIES = [
  'Moradia',
  'Alimentação',
  'Contas Fixas',
  'Transporte',
  'Saúde',
  'Dízimo e Oferta',
  'Compras',
  'Lazer',
  'Educação',
  'Outros',
];

const INCOME_CATEGORIES = [
  'Salário',
  'Freelance',
  'Vendas',
  'Rendimentos',
  'Outros',
];

function formatBRL(value: number): string {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function parseBRLInput(raw: string): number {
  const cleaned = raw.replace(/[^\d.,-]/g, '').trim();
  if (!cleaned) return Number.NaN;

  const hasComma = cleaned.includes(',');
  const hasDot = cleaned.includes('.');

  if (hasComma && hasDot) {
    const lastComma = cleaned.lastIndexOf(',');
    const lastDot = cleaned.lastIndexOf('.');
    return lastComma > lastDot
      ? parseFloat(cleaned.replace(/\./g, '').replace(',', '.'))
      : parseFloat(cleaned.replace(/,/g, ''));
  }

  if (hasComma) {
    return parseFloat(cleaned.replace(',', '.'));
  }

  if (hasDot) {
    const parts = cleaned.split('.');
    if (parts.length > 2 || (parts.length === 2 && parts[1].length === 3)) {
      return parseFloat(cleaned.replace(/\./g, ''));
    }
    return parseFloat(cleaned);
  }

  return parseFloat(cleaned);
}

function getCurrentMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function getTodayDateString(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate()
  ).padStart(2, '0')}`;
}

function shiftMonth(monthKey: string, delta: number): string {
  const [yStr, mStr] = monthKey.split('-');
  const d = new Date(Number(yStr), Number(mStr) - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function formatMonthLabel(monthKey: string): string {
  const [yStr, mStr] = monthKey.split('-');
  const d = new Date(Number(yStr), Number(mStr) - 1, 1);
  const label = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function formatDateShort(dateStr: string): string {
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}`;
}

export const FinanceView: React.FC<FinanceViewProps> = ({
  transactions,
  initialFilter,
  onConsumeInitialFilter,
  onAddTransaction,
  onUpdateTransaction,
  onDeleteTransaction,
  onOpenInvestments,
  onOpenCalculator,
  onBack,
  onShowToast,
}) => {
  const currentMonthKey = getCurrentMonthKey();
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthKey);
  const [showAllMonths, setShowAllMonths] = useState<boolean>(false);

  // Add / Edit form state
  const [editingTxId, setEditingTxId] = useState<string | null>(null);
  const [txType, setTxType] = useState<FinanceEntryType>('gasto');
  const [txPaid, setTxPaid] = useState<boolean>(false);
  const [txTitle, setTxTitle] = useState('');
  const [txAmountStr, setTxAmountStr] = useState('');
  const [txCategory, setTxCategory] = useState<string>('Contas Fixas');
  const [txDate, setTxDate] = useState<string>(getTodayDateString);

  // Organize & filter state
  const [listFilter, setListFilter] = useState<FinanceListFilter>('todos');
  const [categoryFilter, setCategoryFilter] = useState<string>('Todas');
  const [sortMode, setSortMode] = useState<SortMode>('nao_pagos_primeiro');
  const [searchQuery, setSearchQuery] = useState('');

  const titleInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!initialFilter) return;
    setListFilter(initialFilter);
    if (initialFilter === 'pendentes') {
      const hasInMonth = transactions.some(
        (tx) => tx.type === 'gasto' && !tx.paid && tx.date.startsWith(selectedMonth)
      );
      if (!hasInMonth && transactions.some((tx) => tx.type === 'gasto' && !tx.paid)) {
        setShowAllMonths(true);
      }
    }
    onConsumeInitialFilter?.();
  }, [initialFilter, onConsumeInitialFilter, selectedMonth, transactions]);

  const scopeTransactions = useMemo(() => {
    if (showAllMonths) return transactions;
    return transactions.filter((tx) => tx.date.startsWith(selectedMonth));
  }, [transactions, selectedMonth, showAllMonths]);

  const totals = useMemo(() => {
    let totalIncome = 0;
    let incomeCount = 0;
    let totalPaid = 0;
    let paidCount = 0;
    let totalUnpaid = 0;
    let unpaidCount = 0;

    const categoryTotals: Record<string, { paid: number; unpaid: number; total: number }> = {};

    for (const tx of scopeTransactions) {
      if (tx.type === 'receita') {
        totalIncome += tx.amount;
        incomeCount += 1;
      } else {
        if (tx.paid) {
          totalPaid += tx.amount;
          paidCount += 1;
        } else {
          totalUnpaid += tx.amount;
          unpaidCount += 1;
        }

        if (!categoryTotals[tx.category]) {
          categoryTotals[tx.category] = { paid: 0, unpaid: 0, total: 0 };
        }
        categoryTotals[tx.category].total += tx.amount;
        if (tx.paid) {
          categoryTotals[tx.category].paid += tx.amount;
        } else {
          categoryTotals[tx.category].unpaid += tx.amount;
        }
      }
    }

    const totalExpenses = totalPaid + totalUnpaid;
    const expenseCount = paidCount + unpaidCount;
    const balance = totalIncome - totalExpenses;

    const categoriesSorted = Object.entries(categoryTotals)
      .map(([category, vals]) => ({
        category,
        paid: vals.paid,
        unpaid: vals.unpaid,
        total: vals.total,
        pct: totalExpenses > 0 ? (vals.total / totalExpenses) * 100 : 0,
      }))
      .sort((a, b) => b.total - a.total);

    return {
      totalIncome,
      incomeCount,
      totalPaid,
      paidCount,
      totalUnpaid,
      unpaidCount,
      totalExpenses,
      expenseCount,
      balance,
      categoriesSorted,
    };
  }, [scopeTransactions]);

  const visibleList = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    const filtered = scopeTransactions.filter((tx) => {
      if (listFilter === 'pendentes' && (tx.type !== 'gasto' || tx.paid)) return false;
      if (listFilter === 'pagos' && (tx.type !== 'gasto' || !tx.paid)) return false;
      if (listFilter === 'gasto' && tx.type !== 'gasto') return false;
      if (listFilter === 'receita' && tx.type !== 'receita') return false;
      if (categoryFilter !== 'Todas' && tx.category !== categoryFilter) return false;
      if (
        q &&
        !tx.title.toLowerCase().includes(q) &&
        !tx.category.toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });

    return [...filtered].sort((a, b) => {
      if (sortMode === 'nao_pagos_primeiro') {
        const aRank = a.type === 'gasto' && !a.paid ? 0 : a.type === 'gasto' ? 1 : 2;
        const bRank = b.type === 'gasto' && !b.paid ? 0 : b.type === 'gasto' ? 1 : 2;
        if (aRank !== bRank) return aRank - bRank;
        return b.date.localeCompare(a.date);
      }
      if (sortMode === 'maior_valor') {
        return b.amount - a.amount;
      }
      if (sortMode === 'categoria') {
        const cmp = a.category.localeCompare(b.category);
        return cmp !== 0 ? cmp : b.date.localeCompare(a.date);
      }
      return b.date.localeCompare(a.date);
    });
  }, [scopeTransactions, listFilter, categoryFilter, searchQuery, sortMode]);

  const visibleTotals = useMemo(() => {
    let paid = 0;
    let unpaid = 0;
    let income = 0;
    for (const tx of visibleList) {
      if (tx.type === 'receita') income += tx.amount;
      else if (tx.paid) paid += tx.amount;
      else unpaid += tx.amount;
    }
    return { paid, unpaid, expenses: paid + unpaid, income };
  }, [visibleList]);

  const usedCategories = useMemo(
    () =>
      Array.from(new Set(scopeTransactions.map((tx) => tx.category))).sort((a, b) =>
        a.localeCompare(b)
      ),
    [scopeTransactions]
  );

  const resetForm = (nextType: FinanceEntryType = txType, nextPaid = txPaid) => {
    setEditingTxId(null);
    setTxType(nextType);
    setTxPaid(nextPaid);
    setTxTitle('');
    setTxAmountStr('');
    setTxCategory(nextType === 'gasto' ? 'Contas Fixas' : 'Salário');
    setTxDate(
      selectedMonth === currentMonthKey ? getTodayDateString() : `${selectedMonth}-10`
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTitle = txTitle.trim();
    const amount = parseBRLInput(txAmountStr);

    if (!cleanTitle || Number.isNaN(amount) || amount <= 0) {
      onShowToast('Digite o nome e um valor maior que zero.');
      return;
    }

    const payload: Omit<FinanceTransaction, 'id'> = {
      type: txType,
      title: cleanTitle,
      amount: Math.round(amount * 100) / 100,
      category: txCategory,
      paymentMethod: 'PIX',
      date: txDate || getTodayDateString(),
      paid: txPaid,
    };

    if (editingTxId) {
      onUpdateTransaction(editingTxId, payload);
      onShowToast(`"${cleanTitle}" atualizado.`);
      resetForm('gasto', false);
    } else {
      onAddTransaction(payload);
      if (!showAllMonths) {
        setSelectedMonth(payload.date.slice(0, 7));
      }
      if (
        (listFilter === 'pendentes' && (payload.paid || payload.type !== 'gasto')) ||
        (listFilter === 'pagos' && (!payload.paid || payload.type !== 'gasto')) ||
        (listFilter === 'gasto' && payload.type !== 'gasto') ||
        (listFilter === 'receita' && payload.type !== 'receita')
      ) {
        setListFilter('todos');
      }
      if (categoryFilter !== 'Todas' && categoryFilter !== payload.category) {
        setCategoryFilter('Todas');
      }
      onShowToast(
        payload.type === 'gasto'
          ? payload.paid
            ? `"${cleanTitle}" adicionado como pago.`
            : `"${cleanTitle}" adicionado em Não pagos.`
          : `Entrada "${cleanTitle}" adicionada.`
      );
      resetForm(txType, txPaid);
    }
  };

  const handleStartEdit = (tx: FinanceTransaction) => {
    setEditingTxId(tx.id);
    setTxType(tx.type);
    setTxPaid(tx.paid);
    setTxTitle(tx.title);
    setTxAmountStr(String(tx.amount).replace('.', ','));
    setTxCategory(tx.category);
    setTxDate(tx.date);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    window.setTimeout(() => titleInputRef.current?.focus(), 150);
  };

  const handleTogglePaid = (tx: FinanceTransaction) => {
    const nextPaid = !tx.paid;
    onUpdateTransaction(tx.id, { paid: nextPaid });
    onShowToast(
      tx.type === 'gasto'
        ? nextPaid
          ? `"${tx.title}" marcado como pago.`
          : `"${tx.title}" marcado como não pago.`
        : nextPaid
          ? `"${tx.title}" marcado como recebido.`
          : `"${tx.title}" marcado como a receber.`
    );
  };

  const handleDelete = (tx: FinanceTransaction) => {
    onDeleteTransaction(tx.id);
    if (editingTxId === tx.id) {
      resetForm('gasto', false);
    }
    onShowToast(`"${tx.title}" removido.`);
  };

  return (
    <div className="flex flex-col">
      {/* Header */}
      <header className="px-4 lg:px-8 pt-6 pb-4 flex flex-wrap items-center justify-between gap-3">
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
              Organização Financeira
            </h1>
            <p className="font-body text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant truncate">
              Adicione, remova, organize o que já foi pago, o que falta pagar e veja o total.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {!showAllMonths && (
            <div className="inline-flex items-center rounded-full bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant p-0.5">
              <button
                type="button"
                onClick={() => setSelectedMonth((m) => shiftMonth(m, -1))}
                aria-label="Mês anterior"
                className="inline-flex items-center justify-center min-w-[38px] min-h-[38px] rounded-full hover:bg-light-surface-container-high dark:hover:bg-dark-surface-container-high"
              >
                <span className="material-symbols-outlined text-[20px]">chevron_left</span>
              </button>
              <span className="px-2.5 font-body text-body-sm font-medium text-light-on-surface dark:text-dark-on-surface whitespace-nowrap">
                {formatMonthLabel(selectedMonth)}
              </span>
              <button
                type="button"
                onClick={() => setSelectedMonth((m) => shiftMonth(m, 1))}
                aria-label="Próximo mês"
                className="inline-flex items-center justify-center min-w-[38px] min-h-[38px] rounded-full hover:bg-light-surface-container-high dark:hover:bg-dark-surface-container-high"
              >
                <span className="material-symbols-outlined text-[20px]">chevron_right</span>
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() => setShowAllMonths((p) => !p)}
            className={`min-h-[40px] px-3.5 py-1.5 rounded-full border font-body text-body-sm font-medium transition-colors whitespace-nowrap ${
              showAllMonths
                ? 'bg-light-primary dark:bg-dark-primary border-light-primary dark:border-dark-primary text-light-on-primary dark:text-dark-on-primary'
                : 'border-light-outline-variant dark:border-dark-outline-variant text-light-on-surface dark:text-dark-on-surface hover:border-light-primary dark:hover:border-dark-primary'
            }`}
          >
            {showAllMonths ? 'Todos os meses' : 'Ver todos meses'}
          </button>

          <button
            type="button"
            onClick={onOpenInvestments}
            className="inline-flex items-center gap-1.5 min-h-[40px] px-3 py-1.5 rounded-full border border-light-outline-variant dark:border-dark-outline-variant text-light-on-surface dark:text-dark-on-surface font-body text-body-sm hover:border-light-primary dark:hover:border-dark-primary whitespace-nowrap"
          >
            <span className="material-symbols-outlined text-[18px] text-cat-emerald">
              trending_up
            </span>
            <span className="hidden sm:inline">Investimentos</span>
          </button>

          <button
            type="button"
            onClick={onOpenCalculator}
            aria-label="Calculadora"
            className="inline-flex items-center gap-1.5 min-h-[40px] px-3 py-1.5 rounded-full border border-light-outline-variant dark:border-dark-outline-variant text-light-on-surface dark:text-dark-on-surface font-body text-body-sm hover:border-light-primary dark:hover:border-dark-primary whitespace-nowrap"
          >
            <span className="material-symbols-outlined text-[18px] text-cat-blue">
              calculate
            </span>
            <span className="hidden sm:inline">Calculadora</span>
          </button>
        </div>
      </header>

      <main className="px-4 lg:px-8 pb-28 lg:pb-12 flex flex-col gap-5">
        {/* 4 Clear Totals: Pago | Não Pago | Total Gastos | Saldo (Entradas) */}
        <section
          aria-label="Totais financeiros"
          className="rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-light-outline-variant dark:divide-dark-outline-variant"
        >
          <button
            type="button"
            onClick={() => setListFilter((f) => (f === 'pagos' ? 'todos' : 'pagos'))}
            className={`p-4 text-left flex flex-col gap-0.5 transition-colors hover:bg-light-surface-container dark:hover:bg-dark-surface-container ${
              listFilter === 'pagos'
                ? 'bg-light-surface-container dark:bg-dark-surface-container'
                : ''
            }`}
          >
            <span className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant flex items-center justify-between gap-1">
              <span>Já está pago</span>
              <span className="font-mono tabular-nums">{totals.paidCount}</span>
            </span>
            <strong className="font-mono text-title-lg text-cat-emerald tabular-nums">
              {formatBRL(totals.totalPaid)}
            </strong>
          </button>

          <button
            type="button"
            onClick={() =>
              setListFilter((f) => (f === 'pendentes' ? 'todos' : 'pendentes'))
            }
            className={`p-4 text-left flex flex-col gap-0.5 border-l border-light-outline-variant dark:border-dark-outline-variant lg:border-l-0 transition-colors hover:bg-light-surface-container dark:hover:bg-dark-surface-container ${
              listFilter === 'pendentes'
                ? 'bg-light-surface-container dark:bg-dark-surface-container'
                : ''
            }`}
          >
            <span className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant flex items-center justify-between gap-1">
              <span>Não pago (A pagar)</span>
              <span className="font-mono tabular-nums text-accent-gold">
                {totals.unpaidCount}
              </span>
            </span>
            <strong
              className={`font-mono text-title-lg tabular-nums ${
                totals.totalUnpaid > 0
                  ? 'text-accent-gold'
                  : 'text-light-on-surface dark:text-dark-on-surface'
              }`}
            >
              {formatBRL(totals.totalUnpaid)}
            </strong>
          </button>

          <button
            type="button"
            onClick={() => setListFilter((f) => (f === 'gasto' ? 'todos' : 'gasto'))}
            className={`p-4 text-left flex flex-col gap-0.5 transition-colors hover:bg-light-surface-container dark:hover:bg-dark-surface-container ${
              listFilter === 'gasto'
                ? 'bg-light-surface-container dark:bg-dark-surface-container'
                : ''
            }`}
          >
            <span className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant flex items-center justify-between gap-1">
              <span>Total de gastos</span>
              <span className="font-mono tabular-nums">{totals.expenseCount}</span>
            </span>
            <strong className="font-mono text-title-lg text-light-error dark:text-dark-error tabular-nums">
              {formatBRL(totals.totalExpenses)}
            </strong>
          </button>

          <button
            type="button"
            onClick={() => setListFilter((f) => (f === 'receita' ? 'todos' : 'receita'))}
            className={`p-4 text-left flex flex-col gap-0.5 border-l border-light-outline-variant dark:border-dark-outline-variant lg:border-l-0 transition-colors hover:bg-light-surface-container dark:hover:bg-dark-surface-container ${
              listFilter === 'receita'
                ? 'bg-light-surface-container dark:bg-dark-surface-container'
                : ''
            }`}
          >
            <span className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant tabular-nums">
              Saldo (Entradas: {formatBRL(totals.totalIncome)})
            </span>
            <strong
              className={`font-mono text-title-lg tabular-nums ${
                totals.balance >= 0
                  ? 'text-cat-emerald'
                  : 'text-light-error dark:text-dark-error'
              }`}
            >
              {formatBRL(totals.balance)}
            </strong>
          </button>
        </section>

        {/* Simple Add / Edit Form */}
        <form
          onSubmit={handleSubmit}
          className={`rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border p-4 flex flex-col gap-3 ${
            editingTxId
              ? 'border-light-primary dark:border-dark-primary'
              : 'border-light-outline-variant dark:border-dark-outline-variant'
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-1 p-1 rounded-lg bg-light-surface-container dark:bg-dark-surface-container border border-light-outline-variant dark:border-dark-outline-variant">
                <button
                  type="button"
                  onClick={() => {
                    setTxType('gasto');
                    if (!EXPENSE_CATEGORIES.includes(txCategory)) {
                      setTxCategory('Contas Fixas');
                    }
                  }}
                  className={`min-h-[36px] px-3 py-1 rounded-md font-body text-body-sm font-medium transition-colors ${
                    txType === 'gasto'
                      ? 'bg-light-error dark:bg-dark-error text-white'
                      : 'text-light-on-surface-variant dark:text-dark-on-surface-variant'
                  }`}
                >
                  Gasto
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTxType('receita');
                    setTxPaid(true);
                    if (!INCOME_CATEGORIES.includes(txCategory)) {
                      setTxCategory('Salário');
                    }
                  }}
                  className={`min-h-[36px] px-3 py-1 rounded-md font-body text-body-sm font-medium transition-colors ${
                    txType === 'receita'
                      ? 'bg-cat-emerald text-white'
                      : 'text-light-on-surface-variant dark:text-dark-on-surface-variant'
                  }`}
                >
                  Entrada
                </button>
              </div>

              <div className="inline-flex items-center gap-1 p-1 rounded-lg bg-light-surface-container dark:bg-dark-surface-container border border-light-outline-variant dark:border-dark-outline-variant">
                <button
                  type="button"
                  onClick={() => setTxPaid(true)}
                  className={`min-h-[36px] px-3 py-1 rounded-md font-body text-body-sm font-medium transition-colors ${
                    txPaid
                      ? 'bg-cat-emerald text-white'
                      : 'text-light-on-surface-variant dark:text-dark-on-surface-variant'
                  }`}
                >
                  {txType === 'gasto' ? 'Pago' : 'Recebido'}
                </button>
                <button
                  type="button"
                  onClick={() => setTxPaid(false)}
                  className={`min-h-[36px] px-3 py-1 rounded-md font-body text-body-sm font-semibold transition-colors ${
                    !txPaid
                      ? 'bg-accent-gold text-dark-on-primary'
                      : 'text-light-on-surface-variant dark:text-dark-on-surface-variant'
                  }`}
                >
                  {txType === 'gasto' ? 'Não pago' : 'A receber'}
                </button>
              </div>
            </div>

            {editingTxId && (
              <button
                type="button"
                onClick={() => resetForm('gasto', false)}
                className="font-body text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant hover:underline"
              >
                Cancelar edição
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
            <input
              ref={titleInputRef}
              type="text"
              required
              aria-label="Nome da conta ou gasto"
              value={txTitle}
              onChange={(e) => setTxTitle(e.target.value)}
              placeholder={
                txType === 'gasto'
                  ? 'Nome (ex.: Luz, Internet, Mercado...)'
                  : 'Nome (ex.: Salário, Extra...)'
              }
              className="sm:col-span-4 rounded-md bg-light-surface-container dark:bg-dark-surface-container border border-light-outline-variant dark:border-dark-outline-variant px-3 py-2.5 font-body text-body-md text-light-on-surface dark:text-dark-on-surface focus:outline-none focus:border-light-primary dark:focus:border-dark-primary"
            />

            <input
              type="text"
              inputMode="decimal"
              required
              aria-label="Valor em reais"
              value={txAmountStr}
              onChange={(e) => setTxAmountStr(e.target.value)}
              placeholder="Valor R$"
              className="sm:col-span-2 rounded-md bg-light-surface-container dark:bg-dark-surface-container border border-light-outline-variant dark:border-dark-outline-variant px-3 py-2.5 font-mono text-body-md tabular-nums text-light-on-surface dark:text-dark-on-surface focus:outline-none focus:border-light-primary dark:focus:border-dark-primary"
            />

            <select
              aria-label="Categoria"
              value={txCategory}
              onChange={(e) => setTxCategory(e.target.value)}
              className="sm:col-span-2 rounded-md bg-light-surface-container dark:bg-dark-surface-container border border-light-outline-variant dark:border-dark-outline-variant px-3 py-2.5 font-body text-body-md text-light-on-surface dark:text-dark-on-surface focus:outline-none focus:border-light-primary dark:focus:border-dark-primary"
            >
              {(txType === 'gasto' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES).map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>

            <input
              type="date"
              aria-label="Data"
              value={txDate}
              onChange={(e) => setTxDate(e.target.value)}
              className="sm:col-span-2 rounded-md bg-light-surface-container dark:bg-dark-surface-container border border-light-outline-variant dark:border-dark-outline-variant px-3 py-2.5 font-mono text-body-sm tabular-nums text-light-on-surface dark:text-dark-on-surface focus:outline-none focus:border-light-primary dark:focus:border-dark-primary"
            />

            <button
              type="submit"
              className="sm:col-span-2 min-h-[44px] px-4 py-2 rounded-md bg-light-primary dark:bg-dark-primary text-light-on-primary dark:text-dark-on-primary font-body text-body-sm font-semibold inline-flex items-center justify-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[18px]">
                {editingTxId ? 'check' : 'add'}
              </span>
              <span>{editingTxId ? 'Salvar' : 'Adicionar'}</span>
            </button>
          </div>
        </form>

        {/* Main Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left: Clean List with Pago/Não Pago toggle + Editar + Tirar */}
          <section className="lg:col-span-8 rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant overflow-hidden flex flex-col">
            <div className="p-4 border-b border-light-outline-variant dark:border-dark-outline-variant flex flex-col gap-3">
              {/* Filter Tabs */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1 p-1 rounded-md bg-light-surface-container dark:bg-dark-surface-container border border-light-outline-variant dark:border-dark-outline-variant overflow-x-auto max-w-full">
                  {(
                    [
                      { id: 'todos', label: `Todos (${scopeTransactions.length})` },
                      { id: 'pendentes', label: `Não pagos (${totals.unpaidCount})` },
                      { id: 'pagos', label: `Pagos (${totals.paidCount})` },
                      { id: 'gasto', label: `Gastos (${totals.expenseCount})` },
                      { id: 'receita', label: `Entradas (${totals.incomeCount})` },
                    ] as { id: FinanceListFilter; label: string }[]
                  ).map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setListFilter(opt.id)}
                      className={`min-h-[36px] px-3 py-1 rounded font-body text-label-sm whitespace-nowrap transition-colors ${
                        listFilter === opt.id
                          ? 'bg-light-primary dark:bg-dark-primary text-light-on-primary dark:text-dark-on-primary font-semibold'
                          : 'text-light-on-surface-variant dark:text-dark-on-surface-variant hover:text-light-on-surface dark:hover:text-dark-on-surface'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Search, Category Filter, and Sort/Organize */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                <div className="sm:col-span-5 relative">
                  <span
                    className="material-symbols-outlined text-[18px] text-light-on-surface-variant dark:text-dark-on-surface-variant absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                    aria-hidden="true"
                  >
                    search
                  </span>
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar nome..."
                    className="w-full rounded-md bg-light-surface-container dark:bg-dark-surface-container border border-light-outline-variant dark:border-dark-outline-variant pl-9 pr-3 py-2 font-body text-body-sm text-light-on-surface dark:text-dark-on-surface focus:outline-none focus:border-light-primary dark:focus:border-dark-primary"
                  />
                </div>

                <select
                  aria-label="Filtrar por categoria"
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="sm:col-span-3 rounded-md bg-light-surface-container dark:bg-dark-surface-container border border-light-outline-variant dark:border-dark-outline-variant px-3 py-2 font-body text-body-sm text-light-on-surface dark:text-dark-on-surface focus:outline-none focus:border-light-primary dark:focus:border-dark-primary"
                >
                  <option value="Todas">Todas categorias</option>
                  {usedCategories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>

                <select
                  aria-label="Organizar lista"
                  value={sortMode}
                  onChange={(e) => setSortMode(e.target.value as SortMode)}
                  className="sm:col-span-4 rounded-md bg-light-surface-container dark:bg-dark-surface-container border border-light-outline-variant dark:border-dark-outline-variant px-3 py-2 font-body text-body-sm text-light-on-surface dark:text-dark-on-surface focus:outline-none focus:border-light-primary dark:focus:border-dark-primary"
                >
                  <option value="nao_pagos_primeiro">Organizar: Não pagos primeiro</option>
                  <option value="recentes">Organizar: Mais recentes</option>
                  <option value="maior_valor">Organizar: Maior valor</option>
                  <option value="categoria">Organizar: Por categoria</option>
                </select>
              </div>
            </div>

            {visibleList.length === 0 ? (
              <div className="p-8 text-center flex flex-col items-center gap-2">
                <p className="font-body text-body-md text-light-on-surface-variant dark:text-dark-on-surface-variant">
                  Nenhum item nesta lista.
                </p>
                {(listFilter !== 'todos' || categoryFilter !== 'Todas' || searchQuery) && (
                  <button
                    type="button"
                    onClick={() => {
                      setListFilter('todos');
                      setCategoryFilter('Todas');
                      setSearchQuery('');
                    }}
                    className="font-body text-body-sm text-light-primary dark:text-dark-primary hover:underline"
                  >
                    Mostrar todos
                  </button>
                )}
              </div>
            ) : (
              <ul className="divide-y divide-light-outline-variant dark:divide-dark-outline-variant">
                {visibleList.map((tx) => {
                  const isExpense = tx.type === 'gasto';
                  return (
                    <li
                      key={tx.id}
                      className="px-4 py-3 flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 hover:bg-light-surface-container/60 dark:hover:bg-dark-surface-container/60 transition-colors"
                    >
                      {/* 1-click Paid / Unpaid toggle + Title */}
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <button
                          type="button"
                          onClick={() => handleTogglePaid(tx)}
                          className={`inline-flex items-center gap-1 min-h-[38px] px-2.5 py-1 rounded-md font-body text-label-sm font-semibold border transition-colors shrink-0 ${
                            tx.paid
                              ? 'border-cat-emerald/40 bg-cat-emerald/10 text-cat-emerald hover:bg-cat-emerald/20'
                              : 'border-accent-gold/60 bg-accent-gold/15 text-accent-gold hover:bg-accent-gold/25'
                          }`}
                        >
                          <span className="material-symbols-outlined text-[16px]">
                            {tx.paid ? 'check_box' : 'check_box_outline_blank'}
                          </span>
                          <span>
                            {tx.paid
                              ? isExpense
                                ? 'Pago'
                                : 'Recebido'
                              : isExpense
                                ? 'Não pago'
                                : 'A receber'}
                          </span>
                        </button>

                        <div className="min-w-0 flex-1">
                          <p
                            className={`font-body text-label-lg truncate ${
                              tx.paid && isExpense
                                ? 'text-light-on-surface dark:text-dark-on-surface'
                                : 'text-light-on-surface dark:text-dark-on-surface font-medium'
                            }`}
                          >
                            {tx.title}
                          </p>
                          <p className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant truncate tabular-nums">
                            {tx.category} · {formatDateShort(tx.date)}
                          </p>
                        </div>
                      </div>

                      {/* Value + Editar + Tirar */}
                      <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                        <strong
                          className={`font-mono text-body-md font-semibold tabular-nums mr-1 ${
                            isExpense
                              ? tx.paid
                                ? 'text-light-error dark:text-dark-error'
                                : 'text-accent-gold'
                              : 'text-cat-emerald'
                          }`}
                        >
                          {isExpense ? '-' : '+'} {formatBRL(tx.amount)}
                        </strong>

                        <button
                          type="button"
                          onClick={() => handleStartEdit(tx)}
                          aria-label={`Editar ${tx.title}`}
                          className="inline-flex items-center justify-center min-w-[38px] min-h-[38px] rounded-md text-light-on-surface-variant dark:text-dark-on-surface-variant hover:text-light-primary dark:hover:text-dark-primary hover:bg-light-surface-container-high dark:hover:bg-dark-surface-container-high"
                        >
                          <span className="material-symbols-outlined text-[18px]">edit</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDelete(tx)}
                          aria-label={`Tirar ${tx.title}`}
                          className="inline-flex items-center gap-1 min-h-[38px] px-2.5 py-1 rounded-md text-light-on-surface-variant dark:text-dark-on-surface-variant hover:text-light-error dark:hover:text-dark-error hover:bg-light-error/10 dark:hover:bg-dark-error/10 font-body text-label-sm"
                        >
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                          <span className="hidden sm:inline">Tirar</span>
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}

            {/* Clear Bottom Totals of the Displayed List */}
            <footer className="px-4 py-3 border-t border-light-outline-variant dark:border-dark-outline-variant bg-light-surface-container/50 dark:bg-dark-surface-container/50 flex flex-wrap items-center justify-between gap-2 font-body text-body-sm tabular-nums">
              <span className="text-light-on-surface-variant dark:text-dark-on-surface-variant">
                {visibleList.length} item(ns) na lista
              </span>
              <div className="flex flex-wrap items-center gap-4">
                {visibleTotals.expenses > 0 && (
                  <>
                    <span className="text-cat-emerald font-mono">
                      Pago: {formatBRL(visibleTotals.paid)}
                    </span>
                    <span className="text-accent-gold font-mono">
                      Não pago: {formatBRL(visibleTotals.unpaid)}
                    </span>
                    <span className="text-light-on-surface dark:text-dark-on-surface font-mono font-semibold">
                      Total gastos: {formatBRL(visibleTotals.expenses)}
                    </span>
                  </>
                )}
                {visibleTotals.income > 0 && (
                  <span className="text-cat-emerald font-mono font-semibold">
                    Entradas: {formatBRL(visibleTotals.income)}
                  </span>
                )}
              </div>
            </footer>
          </section>

          {/* Right: Simple Totals by Category */}
          <aside className="lg:col-span-4 rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-headline text-title-md text-light-on-surface dark:text-dark-on-surface">
                Gastos por Categoria
              </h2>
              {categoryFilter !== 'Todas' && (
                <button
                  type="button"
                  onClick={() => setCategoryFilter('Todas')}
                  className="font-body text-label-sm text-light-primary dark:text-dark-primary hover:underline"
                >
                  Limpar
                </button>
              )}
            </div>

            {totals.categoriesSorted.length === 0 ? (
              <p className="font-body text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
                Adicione um gasto para ver o total por categoria.
              </p>
            ) : (
              <div className="divide-y divide-light-outline-variant dark:divide-dark-outline-variant">
                {totals.categoriesSorted.map((cat) => {
                  const selected = categoryFilter === cat.category;
                  return (
                    <button
                      key={cat.category}
                      type="button"
                      onClick={() =>
                        setCategoryFilter((prev) =>
                          prev === cat.category ? 'Todas' : cat.category
                        )
                      }
                      className={`w-full text-left py-2.5 px-2 -mx-2 rounded-md flex flex-col gap-1 transition-colors ${
                        selected
                          ? 'bg-light-surface-container dark:bg-dark-surface-container'
                          : 'hover:bg-light-surface-container/60 dark:hover:bg-dark-surface-container/60'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-body text-body-sm font-medium text-light-on-surface dark:text-dark-on-surface">
                          {cat.category}
                        </span>
                        <span className="font-mono text-body-sm font-semibold tabular-nums text-light-on-surface dark:text-dark-on-surface">
                          {formatBRL(cat.total)}
                        </span>
                      </div>

                      <div className="h-1.5 w-full rounded-full bg-light-surface-container-high dark:bg-dark-surface-container-high overflow-hidden">
                        <div
                          className="h-full rounded-full bg-light-primary dark:bg-dark-primary"
                          style={{ width: `${Math.max(4, cat.pct)}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant tabular-nums">
                        <span>{cat.pct.toFixed(0)}% dos gastos</span>
                        {cat.unpaid > 0 && (
                          <span className="text-accent-gold font-medium">
                            Falta pagar {formatBRL(cat.unpaid)}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </aside>
        </div>
      </main>
    </div>
  );
};
