import React, { useMemo, useState } from 'react';
import {
  GROCERY_CATEGORIES,
  GROCERY_QUICK_SUGGESTIONS,
  SUPERMARKET_TIPS,
} from '../data/initialData';
import {
  GroceryCategory,
  GroceryItem,
  GroceryPurchaseRecord,
  GroceryUnit,
  PantryItem,
  PantryStatus,
  PaymentMethod,
} from '../types';

interface SupermarketViewProps {
  items: GroceryItem[];
  pantry: PantryItem[];
  purchases: GroceryPurchaseRecord[];
  groceryBudget: number;
  onUpdateGroceryBudget: (limit: number) => void;
  onAddItem: (item: Omit<GroceryItem, 'id'>) => void;
  onUpdateItem: (id: string, patch: Partial<GroceryItem>) => void;
  onDeleteItem: (id: string) => void;
  onCompletePurchase: (payload: {
    storeName: string;
    paymentMethod: PaymentMethod;
    alsoRecordInFinance: boolean;
  }) => void;
  onAddPantryItem: (item: Omit<PantryItem, 'id'>) => void;
  onCyclePantryStatus: (id: string) => void;
  onDeletePantryItem: (id: string) => void;
  onDeletePurchaseRecord: (id: string) => void;
  onOpenFinance: () => void;
  onBack: () => void;
  onShowToast: (msg: string) => void;
}

type SupermarketSubTab = 'lista' | 'despensa' | 'comparador' | 'historico';
type ListStatusFilter = 'todos' | 'falta' | 'carrinho';
type CompareMode = 'peso' | 'volume' | 'unidade';

const GROCERY_UNITS: GroceryUnit[] = ['un', 'kg', 'g', 'L', 'ml', 'pct', 'cx'];
const PAYMENT_METHODS: PaymentMethod[] = ['PIX', 'Débito', 'Crédito', 'Dinheiro'];

const PANTRY_STATUS_META: Record<
  PantryStatus,
  { label: string; icon: string; colorClass: string }
> = {
  ok: {
    label: 'Em dia',
    icon: 'check_circle',
    colorClass: 'text-cat-emerald',
  },
  acabando: {
    label: 'Acabando',
    icon: 'warning',
    colorClass: 'text-accent-gold',
  },
  em_falta: {
    label: 'Em falta',
    icon: 'error',
    colorClass: 'text-light-error dark:text-dark-error',
  },
};

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

function formatDateShort(dateStr?: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

export const SupermarketView: React.FC<SupermarketViewProps> = ({
  items,
  pantry,
  purchases,
  groceryBudget,
  onUpdateGroceryBudget,
  onAddItem,
  onUpdateItem,
  onDeleteItem,
  onCompletePurchase,
  onAddPantryItem,
  onCyclePantryStatus,
  onDeletePantryItem,
  onDeletePurchaseRecord,
  onOpenFinance,
  onBack,
  onShowToast,
}) => {
  const [subTab, setSubTab] = useState<SupermarketSubTab>('lista');

  // Budget inline edit
  const [editingBudget, setEditingBudget] = useState(false);
  const [budgetDraft, setBudgetDraft] = useState(String(groceryBudget));

  // New grocery item form
  const [itemName, setItemName] = useState('');
  const [itemCategory, setItemCategory] = useState<GroceryCategory>('Mercearia');
  const [itemQty, setItemQty] = useState('1');
  const [itemUnit, setItemUnit] = useState<GroceryUnit>('un');
  const [itemPrice, setItemPrice] = useState('');
  const [itemNotes, setItemNotes] = useState('');
  const [showQuickSuggestions, setShowQuickSuggestions] = useState(false);

  // List filters & price inline editing
  const [listQuery, setListQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ListStatusFilter>('todos');
  const [categoryFilter, setCategoryFilter] = useState<GroceryCategory | 'Todas'>('Todas');
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
  const [priceDraft, setPriceDraft] = useState('');

  // Checkout bar state
  const [storeName, setStoreName] = useState('Supermercado');
  const [checkoutPayment, setCheckoutPayment] = useState<PaymentMethod>('PIX');
  const [recordInFinance, setRecordInFinance] = useState(true);

  // Pantry form state
  const [pantryName, setPantryName] = useState('');
  const [pantryCategory, setPantryCategory] = useState<GroceryCategory>('Mercearia');
  const [pantryQtyLabel, setPantryQtyLabel] = useState('');
  const [pantryStatus, setPantryStatus] = useState<PantryStatus>('ok');
  const [pantryExpiry, setPantryExpiry] = useState('');

  // Price comparator state
  const [compareMode, setCompareMode] = useState<CompareMode>('peso');
  const [prodAPrice, setProdAPrice] = useState('14,90');
  const [prodAQty, setProdAQty] = useState('500');
  const [prodAUnit, setProdAUnit] = useState<'g' | 'kg' | 'ml' | 'L' | 'un'>('g');
  const [prodBPrice, setProdBPrice] = useState('26,90');
  const [prodBQty, setProdBQty] = useState('1');
  const [prodBUnit, setProdBUnit] = useState<'g' | 'kg' | 'ml' | 'L' | 'un'>('kg');

  const cartItems = useMemo(() => items.filter((i) => i.inCart), [items]);
  const missingItems = useMemo(() => items.filter((i) => !i.inCart), [items]);

  const cartTotal = useMemo(
    () => cartItems.reduce((sum, i) => sum + i.quantity * i.estimatedPrice, 0),
    [cartItems]
  );
  const missingTotal = useMemo(
    () => missingItems.reduce((sum, i) => sum + i.quantity * i.estimatedPrice, 0),
    [missingItems]
  );
  const estimatedAllTotal = cartTotal + missingTotal;

  const pantryAlertsCount = useMemo(
    () => pantry.filter((p) => p.status !== 'ok').length,
    [pantry]
  );

  const historyTotal = useMemo(
    () => purchases.reduce((sum, p) => sum + p.totalAmount, 0),
    [purchases]
  );

  const filteredItems = useMemo(() => {
    const q = listQuery.trim().toLowerCase();
    return items
      .filter((i) => {
        const matchStatus =
          statusFilter === 'todos' ||
          (statusFilter === 'falta' ? !i.inCart : i.inCart);
        const matchCat = categoryFilter === 'Todas' || i.category === categoryFilter;
        const matchQuery =
          !q ||
          i.name.toLowerCase().includes(q) ||
          i.category.toLowerCase().includes(q) ||
          (i.notes ?? '').toLowerCase().includes(q);
        return matchStatus && matchCat && matchQuery;
      })
      .sort((a, b) => Number(a.inCart) - Number(b.inCart));
  }, [items, listQuery, statusFilter, categoryFilter]);

  const budgetUsagePct =
    groceryBudget > 0
      ? Math.min(100, Math.round((estimatedAllTotal / groceryBudget) * 100))
      : 0;

  const handleSaveBudget = () => {
    const parsed = parseBRLInput(budgetDraft);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      onShowToast('Informe um orçamento válido maior que zero.');
      return;
    }
    onUpdateGroceryBudget(parsed);
    setEditingBudget(false);
    onShowToast(`Orçamento do supermercado atualizado para ${formatBRL(parsed)}.`);
  };

  const handleCreateItem = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = itemName.trim();
    if (!cleanName) {
      onShowToast('Informe o nome do produto.');
      return;
    }
    const qty = parseBRLInput(itemQty);
    const safeQty = Number.isFinite(qty) && qty > 0 ? qty : 1;
    const price = itemPrice.trim() ? parseBRLInput(itemPrice) : 0;
    const safePrice = Number.isFinite(price) && price >= 0 ? price : 0;

    onAddItem({
      name: cleanName,
      category: itemCategory,
      quantity: safeQty,
      unit: itemUnit,
      estimatedPrice: safePrice,
      inCart: false,
      notes: itemNotes.trim() || undefined,
    });
    setItemName('');
    setItemQty('1');
    setItemPrice('');
    setItemNotes('');
    onShowToast(`"${cleanName}" adicionado à lista.`);
  };

  const handleQuickAddSuggestion = (
    sug: (typeof GROCERY_QUICK_SUGGESTIONS)[number]
  ) => {
    const exists = items.some(
      (i) => i.name.trim().toLowerCase() === sug.name.toLowerCase() && !i.inCart
    );
    if (exists) {
      onShowToast(`"${sug.name}" já está na sua lista.`);
      return;
    }
    onAddItem({
      name: sug.name,
      category: sug.category,
      quantity: sug.quantity,
      unit: sug.unit,
      estimatedPrice: sug.estimatedPrice,
      inCart: false,
    });
    onShowToast(`"${sug.name}" adicionado à lista.`);
  };

  const handleSaveInlinePrice = (id: string) => {
    const parsed = parseBRLInput(priceDraft);
    const safePrice = Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
    onUpdateItem(id, { estimatedPrice: safePrice });
    setEditingPriceId(null);
  };

  const handleFinishCheckout = (e: React.FormEvent) => {
    e.preventDefault();
    if (cartItems.length === 0) {
      onShowToast('Marque pelo menos um item no carrinho para finalizar.');
      return;
    }
    onCompletePurchase({
      storeName: storeName.trim() || 'Supermercado',
      paymentMethod: checkoutPayment,
      alsoRecordInFinance: recordInFinance,
    });
  };

  const handleCreatePantryItem = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = pantryName.trim();
    if (!cleanName) {
      onShowToast('Informe o nome do item da despensa.');
      return;
    }
    onAddPantryItem({
      name: cleanName,
      category: pantryCategory,
      quantityLabel: pantryQtyLabel.trim() || '1 unidade',
      status: pantryStatus,
      expiryDate: pantryExpiry || undefined,
    });
    setPantryName('');
    setPantryQtyLabel('');
    setPantryExpiry('');
    onShowToast(`"${cleanName}" salvo na despensa.`);
  };

  const handleSendPantryToGroceryList = (pItem: PantryItem) => {
    const alreadyInList = items.some(
      (i) => i.name.trim().toLowerCase() === pItem.name.trim().toLowerCase() && !i.inCart
    );
    if (alreadyInList) {
      onShowToast(`"${pItem.name}" já está na lista de compras.`);
      return;
    }
    onAddItem({
      name: pItem.name,
      category: pItem.category,
      quantity: 1,
      unit: 'un',
      estimatedPrice: 0,
      inCart: false,
      notes: 'Reposição da despensa',
    });
    onShowToast(`"${pItem.name}" enviado para a lista de compras.`);
  };

  const handleSwitchCompareMode = (mode: CompareMode) => {
    setCompareMode(mode);
    if (mode === 'peso') {
      setProdAUnit('g');
      setProdAQty('500');
      setProdBUnit('kg');
      setProdBQty('1');
    } else if (mode === 'volume') {
      setProdAUnit('ml');
      setProdAQty('350');
      setProdBUnit('L');
      setProdBQty('1');
    } else {
      setProdAUnit('un');
      setProdAQty('12');
      setProdBUnit('un');
      setProdBQty('18');
    }
  };

  const comparisonResult = useMemo(() => {
    const pA = parseBRLInput(prodAPrice);
    const qA = parseBRLInput(prodAQty);
    const pB = parseBRLInput(prodBPrice);
    const qB = parseBRLInput(prodBQty);

    if (
      !Number.isFinite(pA) ||
      pA <= 0 ||
      !Number.isFinite(qA) ||
      qA <= 0 ||
      !Number.isFinite(pB) ||
      pB <= 0 ||
      !Number.isFinite(qB) ||
      qB <= 0
    ) {
      return null;
    }

    const toBaseFactor = (unit: typeof prodAUnit): number => {
      if (unit === 'g' || unit === 'ml') return 1 / 1000; // per 1 kg or 1 L
      return 1; // kg, L, or un
    };

    const baseQtyA = qA * toBaseFactor(prodAUnit);
    const baseQtyB = qB * toBaseFactor(prodBUnit);
    const unitPriceA = pA / baseQtyA;
    const unitPriceB = pB / baseQtyB;

    const unitLabel =
      compareMode === 'peso'
        ? 'por 1 kg'
        : compareMode === 'volume'
          ? 'por 1 L'
          : 'por unidade';

    const diffPct =
      Math.max(unitPriceA, unitPriceB) > 0
        ? Math.round(
            (Math.abs(unitPriceA - unitPriceB) / Math.max(unitPriceA, unitPriceB)) * 100
          )
        : 0;

    const winner: 'A' | 'B' | 'empate' =
      Math.abs(unitPriceA - unitPriceB) < 0.005
        ? 'empate'
        : unitPriceA < unitPriceB
          ? 'A'
          : 'B';

    return { unitPriceA, unitPriceB, unitLabel, diffPct, winner };
  }, [compareMode, prodAPrice, prodAQty, prodAUnit, prodBPrice, prodBQty, prodBUnit]);

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
                Supermercado
              </h1>
              <p className="font-body text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
                Lista de compras, carrinho ao vivo, despensa, comparador de preço e histórico.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onOpenFinance}
            className="inline-flex items-center gap-1.5 min-h-[40px] px-3 rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant font-body text-body-sm text-light-on-surface dark:text-dark-on-surface hover:border-light-primary dark:hover:border-dark-primary transition-colors"
          >
            <span className="material-symbols-outlined text-[18px] text-cat-emerald">
              account_balance_wallet
            </span>
            <span>Ver Finanças</span>
          </button>
        </div>

        {/* Summary KPI Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
          <div className="rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant p-3 flex flex-col gap-1">
            <span className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
              Falta pegar
            </span>
            <span className="font-mono text-title-md text-light-on-surface dark:text-dark-on-surface tabular-nums">
              {formatBRL(missingTotal)}
            </span>
            <span className="font-body text-label-sm text-accent-gold font-mono tabular-nums">
              {missingItems.length} item(ns) na lista
            </span>
          </div>

          <div className="rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant p-3 flex flex-col gap-1">
            <span className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
              No carrinho
            </span>
            <span className="font-mono text-title-md text-cat-emerald tabular-nums">
              {formatBRL(cartTotal)}
            </span>
            <span className="font-body text-label-sm text-cat-emerald font-mono tabular-nums">
              {cartItems.length} item(ns) pegos
            </span>
          </div>

          <div className="rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant p-3 flex flex-col gap-1">
            <div className="flex items-center justify-between gap-1">
              <span className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
                Previsto / Orçamento
              </span>
              <button
                type="button"
                onClick={() => {
                  setBudgetDraft(String(groceryBudget));
                  setEditingBudget((p) => !p);
                }}
                className="font-body text-label-sm text-light-primary dark:text-dark-primary hover:underline"
              >
                {editingBudget ? 'Fechar' : 'Ajustar'}
              </button>
            </div>
            {editingBudget ? (
              <div className="flex items-center gap-1 mt-0.5">
                <input
                  type="text"
                  inputMode="decimal"
                  value={budgetDraft}
                  onChange={(e) => setBudgetDraft(e.target.value)}
                  aria-label="Orçamento do supermercado"
                  className="w-full rounded bg-light-surface dark:bg-dark-surface border border-light-outline-variant dark:border-dark-outline-variant px-2 py-1 font-mono text-body-sm text-light-on-surface dark:text-dark-on-surface tabular-nums"
                />
                <button
                  type="button"
                  onClick={handleSaveBudget}
                  className="px-2 py-1 rounded bg-light-primary dark:bg-dark-primary text-light-on-primary dark:text-dark-on-primary font-body text-label-sm font-semibold"
                >
                  OK
                </button>
              </div>
            ) : (
              <>
                <span
                  className={`font-mono text-title-md tabular-nums ${
                    estimatedAllTotal > groceryBudget
                      ? 'text-light-error dark:text-dark-error'
                      : 'text-light-on-surface dark:text-dark-on-surface'
                  }`}
                >
                  {formatBRL(estimatedAllTotal)}
                </span>
                <span className="font-body text-label-sm text-cat-blue font-mono tabular-nums">
                  Meta {formatBRL(groceryBudget)} · {budgetUsagePct}%
                </span>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={() => setSubTab('despensa')}
            className="rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant p-3 flex flex-col gap-1 text-left hover:border-light-primary dark:hover:border-dark-primary transition-colors"
          >
            <span className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
              Despensa em casa
            </span>
            <span className="font-mono text-title-md text-light-on-surface dark:text-dark-on-surface tabular-nums">
              {pantry.length} itens
            </span>
            <span
              className={`font-body text-label-sm font-mono tabular-nums ${
                pantryAlertsCount > 0 ? 'text-accent-gold' : 'text-cat-emerald'
              }`}
            >
              {pantryAlertsCount > 0
                ? `${pantryAlertsCount} acabando / em falta`
                : 'Estoque em dia'}
            </span>
          </button>
        </div>

        {/* Sub-Tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 p-1 rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant">
          {(
            [
              { id: 'lista', label: `Lista (${items.length})` },
              { id: 'despensa', label: `Despensa (${pantry.length})` },
              { id: 'comparador', label: 'Comparar Preço' },
              { id: 'historico', label: `Histórico (${purchases.length})` },
            ] as { id: SupermarketSubTab; label: string }[]
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
        {/* TAB 1: LISTA DE COMPRAS & CARRINHO */}
        {subTab === 'lista' && (
          <section className="flex flex-col gap-4">
            {/* Quick Add Form */}
            <form
              onSubmit={handleCreateItem}
              className="rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant p-4 flex flex-col gap-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-headline text-title-md text-light-on-surface dark:text-dark-on-surface">
                  Adicionar Item na Lista
                </h2>
                <button
                  type="button"
                  onClick={() => setShowQuickSuggestions((prev) => !prev)}
                  className="font-body text-label-sm text-light-primary dark:text-dark-primary hover:underline inline-flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[16px]">
                    {showQuickSuggestions ? 'expand_less' : 'bolt'}
                  </span>
                  <span>
                    {showQuickSuggestions
                      ? 'Ocultar básicos'
                      : 'Itens básicos em 1 toque'}
                  </span>
                </button>
              </div>

              {showQuickSuggestions && (
                <div className="flex flex-wrap gap-1.5 pb-2 border-b border-light-outline-variant dark:border-dark-outline-variant">
                  {GROCERY_QUICK_SUGGESTIONS.map((sug) => (
                    <button
                      key={sug.name}
                      type="button"
                      onClick={() => handleQuickAddSuggestion(sug)}
                      className="min-h-[34px] px-2.5 rounded-md bg-light-surface dark:bg-dark-surface border border-light-outline-variant dark:border-dark-outline-variant font-body text-label-sm text-light-on-surface dark:text-dark-on-surface hover:border-light-primary dark:hover:border-dark-primary transition-colors"
                    >
                      + {sug.name}
                    </button>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2.5 items-end">
                <div className="flex flex-col gap-1 lg:col-span-4">
                  <label
                    htmlFor="gro-name"
                    className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant"
                  >
                    Produto
                  </label>
                  <input
                    id="gro-name"
                    type="text"
                    value={itemName}
                    onChange={(e) => setItemName(e.target.value)}
                    placeholder="Ex.: Arroz, Frango, Detergente..."
                    className="rounded-md bg-light-surface dark:bg-dark-surface border border-light-outline-variant dark:border-dark-outline-variant px-3 py-2 font-body text-body-sm text-light-on-surface dark:text-dark-on-surface focus:outline-none focus:border-light-primary dark:focus:border-dark-primary"
                  />
                </div>

                <div className="flex flex-col gap-1 lg:col-span-2">
                  <label
                    htmlFor="gro-cat"
                    className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant"
                  >
                    Corredor / Categoria
                  </label>
                  <select
                    id="gro-cat"
                    value={itemCategory}
                    onChange={(e) => setItemCategory(e.target.value as GroceryCategory)}
                    className="rounded-md bg-light-surface dark:bg-dark-surface border border-light-outline-variant dark:border-dark-outline-variant px-2.5 py-2 font-body text-body-sm text-light-on-surface dark:text-dark-on-surface focus:outline-none focus:border-light-primary dark:focus:border-dark-primary"
                  >
                    {GROCERY_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2 lg:col-span-2">
                  <div className="flex flex-col gap-1">
                    <label
                      htmlFor="gro-qty"
                      className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant"
                    >
                      Qtd
                    </label>
                    <input
                      id="gro-qty"
                      type="text"
                      inputMode="decimal"
                      value={itemQty}
                      onChange={(e) => setItemQty(e.target.value)}
                      className="rounded-md bg-light-surface dark:bg-dark-surface border border-light-outline-variant dark:border-dark-outline-variant px-2.5 py-2 font-mono text-body-sm text-light-on-surface dark:text-dark-on-surface tabular-nums focus:outline-none focus:border-light-primary dark:focus:border-dark-primary"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label
                      htmlFor="gro-unit"
                      className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant"
                    >
                      Unid.
                    </label>
                    <select
                      id="gro-unit"
                      value={itemUnit}
                      onChange={(e) => setItemUnit(e.target.value as GroceryUnit)}
                      className="rounded-md bg-light-surface dark:bg-dark-surface border border-light-outline-variant dark:border-dark-outline-variant px-2 py-2 font-body text-body-sm text-light-on-surface dark:text-dark-on-surface focus:outline-none focus:border-light-primary dark:focus:border-dark-primary"
                    >
                      {GROCERY_UNITS.map((u) => (
                        <option key={u} value={u}>
                          {u}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex flex-col gap-1 lg:col-span-2">
                  <label
                    htmlFor="gro-price"
                    className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant"
                  >
                    Preço un. (R$)
                  </label>
                  <input
                    id="gro-price"
                    type="text"
                    inputMode="decimal"
                    value={itemPrice}
                    onChange={(e) => setItemPrice(e.target.value)}
                    placeholder="0,00"
                    className="rounded-md bg-light-surface dark:bg-dark-surface border border-light-outline-variant dark:border-dark-outline-variant px-2.5 py-2 font-mono text-body-sm text-light-on-surface dark:text-dark-on-surface tabular-nums focus:outline-none focus:border-light-primary dark:focus:border-dark-primary"
                  />
                </div>

                <div className="lg:col-span-2">
                  <button
                    type="submit"
                    className="w-full min-h-[42px] px-4 rounded-lg bg-light-primary dark:bg-dark-primary text-light-on-primary dark:text-dark-on-primary font-body text-body-sm font-semibold inline-flex items-center justify-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[18px]">add</span>
                    <span>Adicionar</span>
                  </button>
                </div>
              </div>

              <input
                type="text"
                value={itemNotes}
                onChange={(e) => setItemNotes(e.target.value)}
                placeholder="Observação opcional (ex.: marca, tamanho, maduro)..."
                aria-label="Observação do produto"
                className="rounded-md bg-light-surface dark:bg-dark-surface border border-light-outline-variant dark:border-dark-outline-variant px-3 py-1.5 font-body text-body-sm text-light-on-surface dark:text-dark-on-surface focus:outline-none focus:border-light-primary dark:focus:border-dark-primary"
              />
            </form>

            {/* Search & Filters */}
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
                  value={listQuery}
                  onChange={(e) => setListQuery(e.target.value)}
                  placeholder="Buscar item na lista..."
                  aria-label="Buscar item na lista"
                  className="w-full rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant text-light-on-surface dark:text-dark-on-surface font-body text-body-sm pl-9 pr-3 py-2.5 focus:outline-none focus:border-light-primary dark:focus:border-dark-primary"
                />
              </div>

              <select
                aria-label="Filtrar por corredor"
                value={categoryFilter}
                onChange={(e) =>
                  setCategoryFilter(e.target.value as GroceryCategory | 'Todas')
                }
                className="rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant text-light-on-surface dark:text-dark-on-surface font-body text-body-sm px-3 py-2.5 focus:outline-none focus:border-light-primary dark:focus:border-dark-primary"
              >
                <option value="Todas">Todos os corredores</option>
                {GROCERY_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-3 gap-1 p-1 rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant">
              {(
                [
                  { id: 'todos', label: `Todos (${items.length})` },
                  { id: 'falta', label: `Falta pegar (${missingItems.length})` },
                  { id: 'carrinho', label: `No carrinho (${cartItems.length})` },
                ] as { id: ListStatusFilter; label: string }[]
              ).map((tab) => {
                const active = statusFilter === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setStatusFilter(tab.id)}
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

            {/* Grocery Items List */}
            {filteredItems.length === 0 ? (
              <div className="rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant p-6 text-center flex flex-col items-center gap-2">
                <span className="material-symbols-outlined text-[32px] text-light-on-surface-variant dark:text-dark-on-surface-variant">
                  shopping_cart
                </span>
                <p className="font-body text-body-md text-light-on-surface dark:text-dark-on-surface">
                  Nenhum item encontrado nesta lista.
                </p>
                <p className="font-body text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
                  Adicione novos produtos acima ou use os itens básicos em 1 toque.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {filteredItems.map((item) => {
                  const subtotal = item.quantity * item.estimatedPrice;
                  const isEditingPrice = editingPriceId === item.id;

                  return (
                    <article
                      key={item.id}
                      className={`rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        item.inCart
                          ? 'border-cat-emerald/40 opacity-85'
                          : 'border-light-outline-variant dark:border-dark-outline-variant'
                      }`}
                    >
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateItem(item.id, { inCart: !item.inCart })
                          }
                          aria-label={
                            item.inCart
                              ? `Tirar ${item.name} do carrinho`
                              : `Colocar ${item.name} no carrinho`
                          }
                          className="mt-0.5 shrink-0"
                        >
                          <span
                            className={`material-symbols-outlined text-[24px] ${
                              item.inCart
                                ? 'material-symbols-filled text-cat-emerald'
                                : 'text-light-on-surface-variant dark:text-dark-on-surface-variant'
                            }`}
                          >
                            {item.inCart
                              ? 'check_circle'
                              : 'radio_button_unchecked'}
                          </span>
                        </button>

                        <div className="min-w-0 flex-1">
                          <span className="font-body text-label-sm text-cat-blue">
                            {item.category} · {item.inCart ? 'No carrinho' : 'Falta pegar'}
                          </span>
                          <h3
                            className={`font-body text-label-lg truncate ${
                              item.inCart
                                ? 'line-through text-light-on-surface-variant dark:text-dark-on-surface-variant'
                                : 'text-light-on-surface dark:text-dark-on-surface'
                            }`}
                          >
                            {item.name}
                          </h3>
                          {item.notes && (
                            <p className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant truncate">
                              {item.notes}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Quantity Stepper, Unit Price Edit, Subtotal & Delete */}
                      <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2 shrink-0">
                        <div className="inline-flex items-center rounded-md border border-light-outline-variant dark:border-dark-outline-variant bg-light-surface dark:bg-dark-surface">
                          <button
                            type="button"
                            onClick={() => {
                              const step = item.unit === 'kg' ? 0.5 : 1;
                              const nextQty = Math.max(
                                step,
                                Math.round((item.quantity - step) * 100) / 100
                              );
                              onUpdateItem(item.id, { quantity: nextQty });
                            }}
                            aria-label={`Diminuir quantidade de ${item.name}`}
                            className="w-8 h-8 inline-flex items-center justify-center text-light-on-surface-variant dark:text-dark-on-surface-variant hover:text-light-on-surface dark:hover:text-dark-on-surface"
                          >
                            <span className="material-symbols-outlined text-[16px]">
                              remove
                            </span>
                          </button>
                          <span className="px-2 font-mono text-label-sm text-light-on-surface dark:text-dark-on-surface tabular-nums">
                            {item.quantity} {item.unit}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              const step = item.unit === 'kg' ? 0.5 : 1;
                              const nextQty =
                                Math.round((item.quantity + step) * 100) / 100;
                              onUpdateItem(item.id, { quantity: nextQty });
                            }}
                            aria-label={`Aumentar quantidade de ${item.name}`}
                            className="w-8 h-8 inline-flex items-center justify-center text-light-on-surface-variant dark:text-dark-on-surface-variant hover:text-light-on-surface dark:hover:text-dark-on-surface"
                          >
                            <span className="material-symbols-outlined text-[16px]">
                              add
                            </span>
                          </button>
                        </div>

                        {isEditingPrice ? (
                          <div className="inline-flex items-center gap-1">
                            <input
                              type="text"
                              inputMode="decimal"
                              value={priceDraft}
                              onChange={(e) => setPriceDraft(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  handleSaveInlinePrice(item.id);
                                }
                              }}
                              aria-label={`Preço unitário de ${item.name}`}
                              className="w-20 rounded bg-light-surface dark:bg-dark-surface border border-light-primary dark:border-dark-primary px-2 py-1 font-mono text-label-sm text-light-on-surface dark:text-dark-on-surface tabular-nums"
                            />
                            <button
                              type="button"
                              onClick={() => handleSaveInlinePrice(item.id)}
                              className="px-2 py-1 rounded bg-light-primary dark:bg-dark-primary text-light-on-primary dark:text-dark-on-primary font-body text-label-sm font-semibold"
                            >
                              OK
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingPriceId(item.id);
                              setPriceDraft(
                                item.estimatedPrice > 0
                                  ? String(item.estimatedPrice).replace('.', ',')
                                  : ''
                              );
                            }}
                            title="Toque para informar ou editar o preço unitário"
                            className="min-h-[34px] px-2.5 rounded-md border border-light-outline-variant dark:border-dark-outline-variant text-right hover:border-light-primary dark:hover:border-dark-primary"
                          >
                            <span className="font-mono text-body-sm text-light-on-surface dark:text-dark-on-surface tabular-nums block">
                              {subtotal > 0 ? formatBRL(subtotal) : 'Sem preço'}
                            </span>
                            <span className="font-mono text-[10px] text-light-on-surface-variant dark:text-dark-on-surface-variant tabular-nums block">
                              {item.estimatedPrice > 0
                                ? `${formatBRL(item.estimatedPrice)}/${item.unit}`
                                : 'Editar R$'}
                            </span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            onDeleteItem(item.id);
                            onShowToast(`"${item.name}" removido da lista.`);
                          }}
                          aria-label={`Remover ${item.name}`}
                          className="inline-flex items-center justify-center w-9 h-9 rounded-full text-light-on-surface-variant dark:text-dark-on-surface-variant hover:text-light-error dark:hover:text-dark-error"
                        >
                          <span className="material-symbols-outlined text-[18px]">
                            delete_outline
                          </span>
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}

            {/* Checkout / Finalize Purchase Bar */}
            {cartItems.length > 0 && (
              <form
                onSubmit={handleFinishCheckout}
                className="rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-cat-emerald/50 p-4 flex flex-col gap-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="font-headline text-title-md text-light-on-surface dark:text-dark-on-surface">
                      Finalizar Compra do Carrinho
                    </h3>
                    <p className="font-body text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
                      {cartItems.length} item(ns) no carrinho · Total{' '}
                      <span className="font-mono text-cat-emerald font-semibold tabular-nums">
                        {formatBRL(cartTotal)}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 items-end">
                  <div className="flex flex-col gap-1">
                    <label
                      htmlFor="gro-store"
                      className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant"
                    >
                      Nome do mercado
                    </label>
                    <input
                      id="gro-store"
                      type="text"
                      value={storeName}
                      onChange={(e) => setStoreName(e.target.value)}
                      placeholder="Ex.: Atacadão, Mercado..."
                      className="rounded-md bg-light-surface dark:bg-dark-surface border border-light-outline-variant dark:border-dark-outline-variant px-3 py-2 font-body text-body-sm text-light-on-surface dark:text-dark-on-surface focus:outline-none focus:border-light-primary dark:focus:border-dark-primary"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label
                      htmlFor="gro-pay"
                      className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant"
                    >
                      Forma de pagamento
                    </label>
                    <select
                      id="gro-pay"
                      value={checkoutPayment}
                      onChange={(e) =>
                        setCheckoutPayment(e.target.value as PaymentMethod)
                      }
                      className="rounded-md bg-light-surface dark:bg-dark-surface border border-light-outline-variant dark:border-dark-outline-variant px-3 py-2 font-body text-body-sm text-light-on-surface dark:text-dark-on-surface focus:outline-none focus:border-light-primary dark:focus:border-dark-primary"
                    >
                      {PAYMENT_METHODS.map((pm) => (
                        <option key={pm} value={pm}>
                          {pm}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="submit"
                    className="min-h-[42px] px-4 rounded-lg bg-cat-emerald text-dark-on-primary font-body text-body-sm font-semibold inline-flex items-center justify-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      shopping_bag
                    </span>
                    <span>Concluir compra</span>
                  </button>
                </div>

                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={recordInFinance}
                    onChange={(e) => setRecordInFinance(e.target.checked)}
                    className="w-4 h-4 accent-cat-emerald"
                  />
                  <span className="font-body text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
                    Lançar automaticamente como gasto pago em Finanças (Alimentação)
                  </span>
                </label>
              </form>
            )}
          </section>
        )}

        {/* TAB 2: DESPENSA EM CASA */}
        {subTab === 'despensa' && (
          <section className="flex flex-col gap-4">
            <div>
              <h2 className="font-headline text-title-md text-light-on-surface dark:text-dark-on-surface">
                Despensa e Estoque de Casa
              </h2>
              <p className="font-body text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
                Controle o que já tem no armário ou geladeira e envie direto para a lista quando estiver acabando.
              </p>
            </div>

            <form
              onSubmit={handleCreatePantryItem}
              className="rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 items-end"
            >
              <div className="flex flex-col gap-1">
                <label
                  htmlFor="pan-name"
                  className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant"
                >
                  Produto em casa
                </label>
                <input
                  id="pan-name"
                  type="text"
                  value={pantryName}
                  onChange={(e) => setPantryName(e.target.value)}
                  placeholder="Ex.: Azeite, Detergente..."
                  className="rounded-md bg-light-surface dark:bg-dark-surface border border-light-outline-variant dark:border-dark-outline-variant px-3 py-2 font-body text-body-sm text-light-on-surface dark:text-dark-on-surface focus:outline-none focus:border-light-primary dark:focus:border-dark-primary"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label
                  htmlFor="pan-cat"
                  className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant"
                >
                  Categoria
                </label>
                <select
                  id="pan-cat"
                  value={pantryCategory}
                  onChange={(e) => setPantryCategory(e.target.value as GroceryCategory)}
                  className="rounded-md bg-light-surface dark:bg-dark-surface border border-light-outline-variant dark:border-dark-outline-variant px-2.5 py-2 font-body text-body-sm text-light-on-surface dark:text-dark-on-surface focus:outline-none focus:border-light-primary dark:focus:border-dark-primary"
                >
                  {GROCERY_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label
                  htmlFor="pan-qty"
                  className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant"
                >
                  Quantidade atual
                </label>
                <input
                  id="pan-qty"
                  type="text"
                  value={pantryQtyLabel}
                  onChange={(e) => setPantryQtyLabel(e.target.value)}
                  placeholder="Ex.: 2 pacotes"
                  className="rounded-md bg-light-surface dark:bg-dark-surface border border-light-outline-variant dark:border-dark-outline-variant px-3 py-2 font-body text-body-sm text-light-on-surface dark:text-dark-on-surface focus:outline-none focus:border-light-primary dark:focus:border-dark-primary"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label
                  htmlFor="pan-status"
                  className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant"
                >
                  Situação / Validade
                </label>
                <div className="flex gap-1.5">
                  <select
                    id="pan-status"
                    value={pantryStatus}
                    onChange={(e) => setPantryStatus(e.target.value as PantryStatus)}
                    className="flex-1 rounded-md bg-light-surface dark:bg-dark-surface border border-light-outline-variant dark:border-dark-outline-variant px-2 py-2 font-body text-body-sm text-light-on-surface dark:text-dark-on-surface focus:outline-none focus:border-light-primary dark:focus:border-dark-primary"
                  >
                    <option value="ok">Em dia</option>
                    <option value="acabando">Acabando</option>
                    <option value="em_falta">Em falta</option>
                  </select>
                  <input
                    type="date"
                    value={pantryExpiry}
                    onChange={(e) => setPantryExpiry(e.target.value)}
                    aria-label="Validade opcional"
                    className="w-32 rounded-md bg-light-surface dark:bg-dark-surface border border-light-outline-variant dark:border-dark-outline-variant px-2 py-2 font-mono text-label-sm text-light-on-surface dark:text-dark-on-surface"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="min-h-[42px] px-4 rounded-lg bg-light-primary dark:bg-dark-primary text-light-on-primary dark:text-dark-on-primary font-body text-body-sm font-semibold"
              >
                Salvar na despensa
              </button>
            </form>

            {pantry.length === 0 ? (
              <p className="font-body text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant p-4">
                Nenhum item cadastrado na despensa.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {pantry.map((pItem) => {
                  const meta = PANTRY_STATUS_META[pItem.status];
                  return (
                    <article
                      key={pItem.id}
                      className="rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant p-3.5 flex items-center justify-between gap-3"
                    >
                      <button
                        type="button"
                        onClick={() => onCyclePantryStatus(pItem.id)}
                        className="flex items-start gap-3 min-w-0 flex-1 text-left"
                      >
                        <span
                          className={`material-symbols-outlined text-[22px] mt-0.5 shrink-0 ${meta.colorClass} ${
                            pItem.status === 'ok' ? 'material-symbols-filled' : ''
                          }`}
                        >
                          {meta.icon}
                        </span>
                        <div className="min-w-0">
                          <span className={`font-body text-label-sm ${meta.colorClass}`}>
                            {meta.label} · {pItem.category}
                            {pItem.expiryDate
                              ? ` · Val. ${formatDateShort(pItem.expiryDate)}`
                              : ''}
                          </span>
                          <h3 className="font-body text-label-lg text-light-on-surface dark:text-dark-on-surface truncate">
                            {pItem.name}
                          </h3>
                          <p className="font-body text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant truncate">
                            {pItem.quantityLabel}
                          </p>
                        </div>
                      </button>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleSendPantryToGroceryList(pItem)}
                          className="min-h-[36px] px-2.5 rounded-md border border-light-primary/40 dark:border-dark-primary/40 text-light-primary dark:text-dark-primary font-body text-label-sm font-medium hover:bg-light-primary/10 dark:hover:bg-dark-primary/10"
                        >
                          + Lista
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            onDeletePantryItem(pItem.id);
                            onShowToast(`"${pItem.name}" removido da despensa.`);
                          }}
                          aria-label={`Remover ${pItem.name}`}
                          className="inline-flex items-center justify-center w-9 h-9 rounded-full text-light-on-surface-variant dark:text-dark-on-surface-variant hover:text-light-error dark:hover:text-dark-error"
                        >
                          <span className="material-symbols-outlined text-[18px]">
                            delete_outline
                          </span>
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* TAB 3: COMPARADOR DE PREÇOS & DICAS */}
        {subTab === 'comparador' && (
          <section className="flex flex-col gap-5">
            <div className="rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant p-4 flex flex-col gap-4">
              <div>
                <h2 className="font-headline text-title-md text-light-on-surface dark:text-dark-on-surface">
                  Comparador: Qual Embalagem Compensa Mais?
                </h2>
                <p className="font-body text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
                  Compare dois tamanhos ou marcas diferentes e descubra na hora qual sai mais barato por kg, litro ou unidade.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-1 p-1 rounded-lg bg-light-surface dark:bg-dark-surface border border-light-outline-variant dark:border-dark-outline-variant">
                {(
                  [
                    { id: 'peso', label: 'Peso (g / kg)' },
                    { id: 'volume', label: 'Volume (ml / L)' },
                    { id: 'unidade', label: 'Unidades' },
                  ] as { id: CompareMode; label: string }[]
                ).map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => handleSwitchCompareMode(m.id)}
                    className={`min-h-[36px] px-2 rounded-md font-body text-body-sm transition-colors ${
                      compareMode === m.id
                        ? 'bg-light-primary dark:bg-dark-primary text-light-on-primary dark:text-dark-on-primary font-semibold'
                        : 'text-light-on-surface-variant dark:text-dark-on-surface-variant'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Option A */}
                <div className="rounded-md bg-light-surface dark:bg-dark-surface border border-light-outline-variant dark:border-dark-outline-variant p-3.5 flex flex-col gap-2.5">
                  <span className="font-headline text-label-lg text-cat-blue">
                    Opção A
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="flex flex-col gap-1">
                      <label
                        htmlFor="cmp-a-price"
                        className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant"
                      >
                        Preço (R$)
                      </label>
                      <input
                        id="cmp-a-price"
                        type="text"
                        inputMode="decimal"
                        value={prodAPrice}
                        onChange={(e) => setProdAPrice(e.target.value)}
                        className="rounded-md bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant px-2.5 py-2 font-mono text-body-sm text-light-on-surface dark:text-dark-on-surface tabular-nums"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label
                        htmlFor="cmp-a-qty"
                        className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant"
                      >
                        Quantidade
                      </label>
                      <input
                        id="cmp-a-qty"
                        type="text"
                        inputMode="decimal"
                        value={prodAQty}
                        onChange={(e) => setProdAQty(e.target.value)}
                        className="rounded-md bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant px-2.5 py-2 font-mono text-body-sm text-light-on-surface dark:text-dark-on-surface tabular-nums"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label
                        htmlFor="cmp-a-unit"
                        className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant"
                      >
                        Medida
                      </label>
                      <select
                        id="cmp-a-unit"
                        value={prodAUnit}
                        onChange={(e) =>
                          setProdAUnit(e.target.value as typeof prodAUnit)
                        }
                        className="rounded-md bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant px-2 py-2 font-body text-body-sm text-light-on-surface dark:text-dark-on-surface"
                      >
                        {compareMode === 'peso' && (
                          <>
                            <option value="g">g</option>
                            <option value="kg">kg</option>
                          </>
                        )}
                        {compareMode === 'volume' && (
                          <>
                            <option value="ml">ml</option>
                            <option value="L">L</option>
                          </>
                        )}
                        {compareMode === 'unidade' && <option value="un">un</option>}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Option B */}
                <div className="rounded-md bg-light-surface dark:bg-dark-surface border border-light-outline-variant dark:border-dark-outline-variant p-3.5 flex flex-col gap-2.5">
                  <span className="font-headline text-label-lg text-accent-gold">
                    Opção B
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="flex flex-col gap-1">
                      <label
                        htmlFor="cmp-b-price"
                        className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant"
                      >
                        Preço (R$)
                      </label>
                      <input
                        id="cmp-b-price"
                        type="text"
                        inputMode="decimal"
                        value={prodBPrice}
                        onChange={(e) => setProdBPrice(e.target.value)}
                        className="rounded-md bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant px-2.5 py-2 font-mono text-body-sm text-light-on-surface dark:text-dark-on-surface tabular-nums"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label
                        htmlFor="cmp-b-qty"
                        className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant"
                      >
                        Quantidade
                      </label>
                      <input
                        id="cmp-b-qty"
                        type="text"
                        inputMode="decimal"
                        value={prodBQty}
                        onChange={(e) => setProdBQty(e.target.value)}
                        className="rounded-md bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant px-2.5 py-2 font-mono text-body-sm text-light-on-surface dark:text-dark-on-surface tabular-nums"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label
                        htmlFor="cmp-b-unit"
                        className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant"
                      >
                        Medida
                      </label>
                      <select
                        id="cmp-b-unit"
                        value={prodBUnit}
                        onChange={(e) =>
                          setProdBUnit(e.target.value as typeof prodBUnit)
                        }
                        className="rounded-md bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant px-2 py-2 font-body text-body-sm text-light-on-surface dark:text-dark-on-surface"
                      >
                        {compareMode === 'peso' && (
                          <>
                            <option value="g">g</option>
                            <option value="kg">kg</option>
                          </>
                        )}
                        {compareMode === 'volume' && (
                          <>
                            <option value="ml">ml</option>
                            <option value="L">L</option>
                          </>
                        )}
                        {compareMode === 'unidade' && <option value="un">un</option>}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {comparisonResult && (
                <div className="rounded-md bg-light-surface dark:bg-dark-surface border border-cat-emerald/50 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="font-headline text-title-md text-cat-emerald block">
                      {comparisonResult.winner === 'empate'
                        ? 'As duas opções têm praticamente o mesmo preço'
                        : `Opção ${comparisonResult.winner} compensa mais (${comparisonResult.diffPct}% mais barata)`}
                    </span>
                    <span className="font-mono text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant tabular-nums">
                      Opção A: {formatBRL(comparisonResult.unitPriceA)}{' '}
                      {comparisonResult.unitLabel} · Opção B:{' '}
                      {formatBRL(comparisonResult.unitPriceB)} {comparisonResult.unitLabel}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Supermarket Tips */}
            <div className="flex flex-col gap-3">
              <h2 className="font-headline text-title-md text-light-on-surface dark:text-dark-on-surface">
                Dicas para Economizar no Mercado
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {SUPERMARKET_TIPS.map((tip) => (
                  <article
                    key={tip.id}
                    className="rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant p-4 flex flex-col gap-1.5"
                  >
                    <span className="font-body text-label-sm text-cat-emerald">
                      {tip.category}
                    </span>
                    <h3 className="font-headline text-title-md text-light-on-surface dark:text-dark-on-surface">
                      {tip.title}
                    </h3>
                    <p className="font-body text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant text-pretty">
                      {tip.detail}
                    </p>
                  </article>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* TAB 4: HISTÓRICO DE COMPRAS */}
        {subTab === 'historico' && (
          <section className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="font-headline text-title-md text-light-on-surface dark:text-dark-on-surface">
                  Histórico de Compras de Supermercado
                </h2>
                <p className="font-body text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
                  Acompanhe quanto você já gastou nas idas ao mercado.
                </p>
              </div>
              <span className="font-mono text-title-md text-light-on-surface dark:text-dark-on-surface tabular-nums">
                Total registrado: {formatBRL(historyTotal)}
              </span>
            </div>

            {purchases.length === 0 ? (
              <div className="rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant p-6 text-center flex flex-col items-center gap-2">
                <span className="material-symbols-outlined text-[32px] text-light-on-surface-variant dark:text-dark-on-surface-variant">
                  receipt_long
                </span>
                <p className="font-body text-body-md text-light-on-surface dark:text-dark-on-surface">
                  Nenhuma compra concluída registrada ainda.
                </p>
                <p className="font-body text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
                  Ao marcar itens no carrinho na aba Lista e clicar em &ldquo;Concluir compra&rdquo;, ela aparece aqui.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-2.5">
                {purchases.map((rec) => (
                  <article
                    key={rec.id}
                    className="rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant p-4 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <span className="font-mono text-label-sm text-cat-blue tabular-nums">
                        {formatDateShort(rec.date)} · {rec.itemCount} item(ns) ·{' '}
                        {rec.paymentMethod}
                      </span>
                      <h3 className="font-headline text-title-md text-light-on-surface dark:text-dark-on-surface truncate">
                        {rec.storeName}
                      </h3>
                      {rec.notes && (
                        <p className="font-body text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant truncate">
                          {rec.notes}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-mono text-title-md text-light-on-surface dark:text-dark-on-surface tabular-nums">
                        {formatBRL(rec.totalAmount)}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          onDeletePurchaseRecord(rec.id);
                          onShowToast('Registro removido do histórico.');
                        }}
                        aria-label={`Remover compra em ${rec.storeName}`}
                        className="inline-flex items-center justify-center w-9 h-9 rounded-full text-light-on-surface-variant dark:text-dark-on-surface-variant hover:text-light-error dark:hover:text-dark-error"
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          delete_outline
                        </span>
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
};
