import React, { useEffect, useMemo, useState } from 'react';
import { CalcHistoryEntry, MarketRatesSnapshot } from '../types';

interface CalculatorViewProps {
  history: CalcHistoryEntry[];
  marketRates: MarketRatesSnapshot;
  onAddHistory: (entry: Omit<CalcHistoryEntry, 'id' | 'time'>) => void;
  onClearHistory: () => void;
  onBack: () => void;
  onShowToast: (msg: string) => void;
}

// Safe recursive-descent arithmetic evaluator (supports +, -, *, /, parentheses)
function evaluateArithmetic(rawExpr: string): number | null {
  const expr = rawExpr
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .replace(/−/g, '-')
    .replace(/\s+/g, '');

  if (!expr || !/^[0-9+\-*/().]+$/.test(expr)) return null;

  let pos = 0;

  const parseExpression = (): number | null => {
    let left = parseTerm();
    if (left === null) return null;

    while (pos < expr.length && (expr[pos] === '+' || expr[pos] === '-')) {
      const op = expr[pos];
      pos += 1;
      const right = parseTerm();
      if (right === null) return null;
      left = op === '+' ? left + right : left - right;
    }
    return left;
  };

  const parseTerm = (): number | null => {
    let left = parseFactor();
    if (left === null) return null;

    while (pos < expr.length && (expr[pos] === '*' || expr[pos] === '/')) {
      const op = expr[pos];
      pos += 1;
      const right = parseFactor();
      if (right === null) return null;
      if (op === '/') {
        if (right === 0) return null;
        left = left / right;
      } else {
        left = left * right;
      }
    }
    return left;
  };

  const parseFactor = (): number | null => {
    if (pos < expr.length && expr[pos] === '+') {
      pos += 1;
      return parseFactor();
    }
    if (pos < expr.length && expr[pos] === '-') {
      pos += 1;
      const val = parseFactor();
      return val === null ? null : -val;
    }
    if (pos < expr.length && expr[pos] === '(') {
      pos += 1;
      const val = parseExpression();
      if (val === null || expr[pos] !== ')') return null;
      pos += 1;
      return val;
    }

    const start = pos;
    let hasDot = false;
    while (pos < expr.length && (/[0-9]/.test(expr[pos]) || (expr[pos] === '.' && !hasDot))) {
      if (expr[pos] === '.') hasDot = true;
      pos += 1;
    }
    if (pos === start) return null;
    const num = Number(expr.slice(start, pos));
    return Number.isFinite(num) ? num : null;
  };

  const value = parseExpression();
  if (value === null || pos !== expr.length || !Number.isFinite(value)) return null;
  return value;
}

function formatNumberResult(n: number): string {
  if (!Number.isFinite(n)) return 'Erro';
  const rounded = Math.round(n * 1e10) / 1e10;
  return String(rounded);
}

function parseDecimalInput(raw: string): number {
  const cleaned = raw.replace(/[^\d.,-]/g, '').trim();
  if (!cleaned) return 0;
  const hasComma = cleaned.includes(',');
  const hasDot = cleaned.includes('.');
  if (hasComma && hasDot) {
    return cleaned.lastIndexOf(',') > cleaned.lastIndexOf('.')
      ? parseFloat(cleaned.replace(/\./g, '').replace(',', '.')) || 0
      : parseFloat(cleaned.replace(/,/g, '')) || 0;
  }
  if (hasComma) return parseFloat(cleaned.replace(',', '.')) || 0;
  if (hasDot) {
    const parts = cleaned.split('.');
    if (parts.length > 2 || (parts.length === 2 && parts[1].length === 3)) {
      return parseFloat(cleaned.replace(/\./g, '')) || 0;
    }
    return parseFloat(cleaned) || 0;
  }
  return parseFloat(cleaned) || 0;
}

export const CalculatorView: React.FC<CalculatorViewProps> = ({
  history,
  marketRates,
  onAddHistory,
  onClearHistory,
  onBack,
  onShowToast,
}) => {
  const [mode, setMode] = useState<'padrao' | 'financeira'>('padrao');
  const [expression, setExpression] = useState('');
  const [display, setDisplay] = useState('0');
  const [memory, setMemory] = useState<number>(0);
  const [justEvaluated, setJustEvaluated] = useState(false);

  // Financial helper inputs
  const [pctValue, setPctValue] = useState('15');
  const [pctBase, setPctBase] = useState('1200');
  const [loanPrice, setLoanPrice] = useState('3000');
  const [loanDown, setLoanDown] = useState('500');
  const [loanMonths, setLoanMonths] = useState('12');
  const [loanRateMonthly, setLoanRateMonthly] = useState('1.99');
  const [fxAmount, setFxAmount] = useState('1000');
  const [fxCurrency, setFxCurrency] = useState<'BRL' | 'USD' | 'EUR' | 'BTC'>('BRL');

  const appendToken = (token: string) => {
    const isOp = ['+', '−', '×', '÷'].includes(token);
    if (justEvaluated) {
      setJustEvaluated(false);
      if (isOp) {
        setExpression(`${display}${token}`);
        setDisplay(`${display}${token}`);
        return;
      }
      setExpression(token);
      setDisplay(token);
      return;
    }

    const next = (expression === '' && display === '0' && !isOp && token !== '.')
      ? token
      : `${expression}${token}`;
    setExpression(next);
    setDisplay(next || '0');
  };

  const handleClearAll = () => {
    setExpression('');
    setDisplay('0');
    setJustEvaluated(false);
  };

  const handleBackspace = () => {
    if (justEvaluated) {
      handleClearAll();
      return;
    }
    const next = expression.slice(0, -1);
    setExpression(next);
    setDisplay(next || '0');
  };

  const handleEvaluate = () => {
    const target = expression || display;
    const val = evaluateArithmetic(target);
    if (val === null) {
      setDisplay('Expressão inválida');
      setJustEvaluated(true);
      return;
    }
    const formatted = formatNumberResult(val);
    onAddHistory({ expression: target, result: formatted });
    setDisplay(formatted);
    setExpression(formatted);
    setJustEvaluated(true);
  };

  const handleUnary = (op: 'sqrt' | 'sq' | 'inv' | 'neg' | 'pct') => {
    const currentVal = evaluateArithmetic(expression || display);
    if (currentVal === null) return;
    let nextVal: number | null = null;
    let label = '';

    if (op === 'sqrt') {
      if (currentVal < 0) return;
      nextVal = Math.sqrt(currentVal);
      label = `√(${currentVal})`;
    } else if (op === 'sq') {
      nextVal = currentVal * currentVal;
      label = `(${currentVal})²`;
    } else if (op === 'inv') {
      if (currentVal === 0) return;
      nextVal = 1 / currentVal;
      label = `1/(${currentVal})`;
    } else if (op === 'neg') {
      nextVal = -currentVal;
      const str = formatNumberResult(nextVal);
      setExpression(str);
      setDisplay(str);
      return;
    } else if (op === 'pct') {
      nextVal = currentVal / 100;
      label = `${currentVal}%`;
    }

    if (nextVal !== null && Number.isFinite(nextVal)) {
      const str = formatNumberResult(nextVal);
      onAddHistory({ expression: label, result: str });
      setExpression(str);
      setDisplay(str);
      setJustEvaluated(true);
    }
  };

  const handleCopyDisplay = async () => {
    try {
      await navigator.clipboard.writeText(display);
      onShowToast('Resultado copiado!');
    } catch {
      onShowToast(`Valor: ${display}`);
    }
  };

  useEffect(() => {
    if (mode !== 'padrao') return;
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if (/^[0-9.()]$/.test(e.key)) {
        e.preventDefault();
        appendToken(e.key);
      } else if (e.key === '+') {
        e.preventDefault();
        appendToken('+');
      } else if (e.key === '-') {
        e.preventDefault();
        appendToken('−');
      } else if (e.key === '*') {
        e.preventDefault();
        appendToken('×');
      } else if (e.key === '/') {
        e.preventDefault();
        appendToken('÷');
      } else if (e.key === 'Enter' || e.key === '=') {
        e.preventDefault();
        handleEvaluate();
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleBackspace();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleClearAll();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  // Financial Calculations
  const pctNum = parseDecimalInput(pctValue);
  const pctBaseNum = parseDecimalInput(pctBase);
  const pctPart = (pctBaseNum * pctNum) / 100;
  const pctDiscount = pctBaseNum - pctPart;
  const pctIncrease = pctBaseNum + pctPart;

  const principal = Math.max(
    0,
    parseDecimalInput(loanPrice) - parseDecimalInput(loanDown)
  );
  const nMonths = Math.max(1, parseInt(loanMonths, 10) || 1);
  const iMonthly = Math.max(0, parseDecimalInput(loanRateMonthly) / 100);
  const installment = useMemo(() => {
    if (principal === 0) return 0;
    if (iMonthly === 0) return principal / nMonths;
    const factor = Math.pow(1 + iMonthly, nMonths);
    return (principal * (iMonthly * factor)) / (factor - 1);
  }, [principal, nMonths, iMonthly]);
  const totalLoanPaid = installment * nMonths;
  const totalLoanInterest = Math.max(0, totalLoanPaid - principal);

  const fxNum = Math.max(0, parseDecimalInput(fxAmount));
  const fxInBrl = useMemo(() => {
    if (fxCurrency === 'BRL') return fxNum;
    if (fxCurrency === 'USD') return fxNum * marketRates.usdBrl;
    if (fxCurrency === 'EUR') return fxNum * marketRates.eurBrl;
    return fxNum * marketRates.btcBrl;
  }, [fxNum, fxCurrency, marketRates]);

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
              Calculadora
            </h1>
            <p className="font-body text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant truncate">
              Cálculos rápidos, porcentagem, parcelamento e câmbio.
            </p>
          </div>
        </div>
      </header>

      <main className="px-4 lg:px-8 pb-28 lg:pb-12 flex flex-col gap-5">
        <div className="flex items-center gap-1 p-1 rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant w-fit">
          <button
            type="button"
            onClick={() => setMode('padrao')}
            className={`min-h-[40px] px-4 py-1.5 rounded-md font-body text-body-sm font-semibold whitespace-nowrap transition-colors ${
              mode === 'padrao'
                ? 'bg-light-primary dark:bg-dark-primary text-light-on-primary dark:text-dark-on-primary'
                : 'text-light-on-surface-variant dark:text-dark-on-surface-variant hover:text-light-on-surface dark:hover:text-dark-on-surface'
            }`}
          >
            Calculadora Padrão
          </button>
          <button
            type="button"
            onClick={() => setMode('financeira')}
            className={`min-h-[40px] px-4 py-1.5 rounded-md font-body text-body-sm font-semibold whitespace-nowrap transition-colors ${
              mode === 'financeira'
                ? 'bg-light-primary dark:bg-dark-primary text-light-on-primary dark:text-dark-on-primary'
                : 'text-light-on-surface-variant dark:text-dark-on-surface-variant hover:text-light-on-surface dark:hover:text-dark-on-surface'
            }`}
          >
            Financeira, % e Câmbio
          </button>
        </div>

        {mode === 'padrao' ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* Keypad & Display */}
            <section className="lg:col-span-7 rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant p-4 flex flex-col gap-3">
              {/* Screen */}
              <div className="rounded-md bg-light-surface-container-lowest dark:bg-dark-surface-container-lowest border border-light-outline-variant dark:border-dark-outline-variant p-4 flex flex-col items-end gap-1.5">
                <div className="w-full flex items-center justify-between gap-2">
                  <span className="font-mono text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant tabular-nums">
                    {memory !== 0 ? `M: ${formatNumberResult(memory)}` : 'Memória vazia'}
                  </span>
                  <button
                    type="button"
                    onClick={() => void handleCopyDisplay()}
                    className="inline-flex items-center gap-1 min-h-[32px] px-2 rounded text-label-sm font-body text-light-primary dark:text-dark-primary hover:bg-light-primary/10 dark:hover:bg-dark-primary/10"
                  >
                    <span className="material-symbols-outlined text-[15px]">content_copy</span>
                    <span>Copiar</span>
                  </button>
                </div>
                <p className="font-mono text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant truncate w-full text-right tabular-nums min-h-[18px]">
                  {expression || ' '}
                </p>
                <p
                  aria-live="polite"
                  className="font-mono text-display-lg text-light-on-surface dark:text-dark-on-surface truncate w-full text-right tabular-nums"
                >
                  {display}
                </p>
              </div>

              {/* Memory Row */}
              <div className="grid grid-cols-4 gap-2">
                {[
                  {
                    label: 'MC',
                    onClick: () => setMemory(0),
                  },
                  {
                    label: 'MR',
                    onClick: () => {
                      const str = formatNumberResult(memory);
                      setExpression((prev) => `${prev}${str}`);
                      setDisplay((prev) => (prev === '0' ? str : `${prev}${str}`));
                    },
                  },
                  {
                    label: 'M+',
                    onClick: () => {
                      const val = evaluateArithmetic(expression || display);
                      if (val !== null) setMemory((m) => m + val);
                    },
                  },
                  {
                    label: 'M−',
                    onClick: () => {
                      const val = evaluateArithmetic(expression || display);
                      if (val !== null) setMemory((m) => m - val);
                    },
                  },
                ].map((btn) => (
                  <button
                    key={btn.label}
                    type="button"
                    onClick={btn.onClick}
                    className="min-h-[40px] rounded-md bg-light-surface-container dark:bg-dark-surface-container border border-light-outline-variant dark:border-dark-outline-variant font-mono text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant hover:border-light-primary dark:hover:border-dark-primary"
                  >
                    {btn.label}
                  </button>
                ))}
              </div>

              {/* Scientific-lite + Clear Row */}
              <div className="grid grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => handleUnary('pct')}
                  className="min-h-[48px] rounded-md bg-light-surface-container dark:bg-dark-surface-container border border-light-outline-variant dark:border-dark-outline-variant font-mono text-title-md text-light-on-surface dark:text-dark-on-surface hover:border-light-primary dark:hover:border-dark-primary"
                >
                  %
                </button>
                <button
                  type="button"
                  onClick={() => handleUnary('sqrt')}
                  className="min-h-[48px] rounded-md bg-light-surface-container dark:bg-dark-surface-container border border-light-outline-variant dark:border-dark-outline-variant font-mono text-title-md text-light-on-surface dark:text-dark-on-surface hover:border-light-primary dark:hover:border-dark-primary"
                >
                  √x
                </button>
                <button
                  type="button"
                  onClick={() => handleUnary('sq')}
                  className="min-h-[48px] rounded-md bg-light-surface-container dark:bg-dark-surface-container border border-light-outline-variant dark:border-dark-outline-variant font-mono text-title-md text-light-on-surface dark:text-dark-on-surface hover:border-light-primary dark:hover:border-dark-primary"
                >
                  x²
                </button>
                <button
                  type="button"
                  onClick={() => handleUnary('inv')}
                  className="min-h-[48px] rounded-md bg-light-surface-container dark:bg-dark-surface-container border border-light-outline-variant dark:border-dark-outline-variant font-mono text-title-md text-light-on-surface dark:text-dark-on-surface hover:border-light-primary dark:hover:border-dark-primary"
                >
                  1/x
                </button>
              </div>

              {/* Main Keypad */}
              <div className="grid grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="min-h-[52px] rounded-md bg-light-error-container/60 dark:bg-dark-error-container/50 border border-light-outline-variant dark:border-dark-outline-variant font-headline text-title-md text-light-error dark:text-dark-error"
                >
                  C
                </button>
                <button
                  type="button"
                  onClick={() => appendToken('(')}
                  className="min-h-[52px] rounded-md bg-light-surface-container dark:bg-dark-surface-container border border-light-outline-variant dark:border-dark-outline-variant font-mono text-title-md text-light-on-surface dark:text-dark-on-surface"
                >
                  (
                </button>
                <button
                  type="button"
                  onClick={() => appendToken(')')}
                  className="min-h-[52px] rounded-md bg-light-surface-container dark:bg-dark-surface-container border border-light-outline-variant dark:border-dark-outline-variant font-mono text-title-md text-light-on-surface dark:text-dark-on-surface"
                >
                  )
                </button>
                <button
                  type="button"
                  onClick={handleBackspace}
                  aria-label="Apagar"
                  className="min-h-[52px] rounded-md bg-light-surface-container dark:bg-dark-surface-container border border-light-outline-variant dark:border-dark-outline-variant font-mono text-title-md text-light-on-surface dark:text-dark-on-surface flex items-center justify-center"
                >
                  <span className="material-symbols-outlined text-[20px]">backspace</span>
                </button>

                {['7', '8', '9'].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => appendToken(d)}
                    className="min-h-[52px] rounded-md bg-light-surface-container-lowest dark:bg-dark-surface-container-high border border-light-outline-variant dark:border-dark-outline-variant font-mono text-headline-md text-light-on-surface dark:text-dark-on-surface hover:border-light-primary dark:hover:border-dark-primary tabular-nums"
                  >
                    {d}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => appendToken('÷')}
                  className="min-h-[52px] rounded-md bg-light-surface-container-high dark:bg-dark-surface-container border border-light-outline-variant dark:border-dark-outline-variant font-mono text-headline-md text-light-primary dark:text-dark-primary"
                >
                  ÷
                </button>

                {['4', '5', '6'].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => appendToken(d)}
                    className="min-h-[52px] rounded-md bg-light-surface-container-lowest dark:bg-dark-surface-container-high border border-light-outline-variant dark:border-dark-outline-variant font-mono text-headline-md text-light-on-surface dark:text-dark-on-surface hover:border-light-primary dark:hover:border-dark-primary tabular-nums"
                  >
                    {d}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => appendToken('×')}
                  className="min-h-[52px] rounded-md bg-light-surface-container-high dark:bg-dark-surface-container border border-light-outline-variant dark:border-dark-outline-variant font-mono text-headline-md text-light-primary dark:text-dark-primary"
                >
                  ×
                </button>

                {['1', '2', '3'].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => appendToken(d)}
                    className="min-h-[52px] rounded-md bg-light-surface-container-lowest dark:bg-dark-surface-container-high border border-light-outline-variant dark:border-dark-outline-variant font-mono text-headline-md text-light-on-surface dark:text-dark-on-surface hover:border-light-primary dark:hover:border-dark-primary tabular-nums"
                  >
                    {d}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => appendToken('−')}
                  className="min-h-[52px] rounded-md bg-light-surface-container-high dark:bg-dark-surface-container border border-light-outline-variant dark:border-dark-outline-variant font-mono text-headline-md text-light-primary dark:text-dark-primary"
                >
                  −
                </button>

                <button
                  type="button"
                  onClick={() => handleUnary('neg')}
                  className="min-h-[52px] rounded-md bg-light-surface-container-lowest dark:bg-dark-surface-container-high border border-light-outline-variant dark:border-dark-outline-variant font-mono text-title-md text-light-on-surface dark:text-dark-on-surface"
                >
                  ±
                </button>
                <button
                  type="button"
                  onClick={() => appendToken('0')}
                  className="min-h-[52px] rounded-md bg-light-surface-container-lowest dark:bg-dark-surface-container-high border border-light-outline-variant dark:border-dark-outline-variant font-mono text-headline-md text-light-on-surface dark:text-dark-on-surface hover:border-light-primary dark:hover:border-dark-primary tabular-nums"
                >
                  0
                </button>
                <button
                  type="button"
                  onClick={() => appendToken('.')}
                  className="min-h-[52px] rounded-md bg-light-surface-container-lowest dark:bg-dark-surface-container-high border border-light-outline-variant dark:border-dark-outline-variant font-mono text-headline-md text-light-on-surface dark:text-dark-on-surface"
                >
                  .
                </button>
                <button
                  type="button"
                  onClick={() => appendToken('+')}
                  className="min-h-[52px] rounded-md bg-light-surface-container-high dark:bg-dark-surface-container border border-light-outline-variant dark:border-dark-outline-variant font-mono text-headline-md text-light-primary dark:text-dark-primary"
                >
                  +
                </button>
              </div>

              <button
                type="button"
                onClick={handleEvaluate}
                className="w-full min-h-[52px] rounded-md bg-light-primary dark:bg-dark-primary text-light-on-primary dark:text-dark-on-primary font-mono text-headline-md font-bold"
              >
                =
              </button>
            </section>

            {/* History Tape */}
            <aside className="lg:col-span-5 rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-headline text-title-md text-light-on-surface dark:text-dark-on-surface">
                  Histórico de Cálculos
                </h2>
                {history.length > 0 && (
                  <button
                    type="button"
                    onClick={onClearHistory}
                    className="font-body text-body-sm text-light-primary dark:text-dark-primary hover:underline"
                  >
                    Limpar
                  </button>
                )}
              </div>

              {history.length === 0 ? (
                <p className="font-body text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant py-6 text-center">
                  Seus cálculos aparecerão aqui para reutilização rápida. Você também pode usar o teclado físico.
                </p>
              ) : (
                <ul className="flex flex-col divide-y divide-light-outline-variant dark:divide-dark-outline-variant max-h-[420px] overflow-y-auto">
                  {history.map((item) => (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setExpression(item.result);
                          setDisplay(item.result);
                          setJustEvaluated(false);
                        }}
                        className="w-full py-2.5 px-1 flex items-center justify-between gap-2 text-left hover:bg-light-surface-container/60 dark:hover:bg-dark-surface-container/60 rounded"
                      >
                        <div className="min-w-0">
                          <span className="font-mono text-body-sm text-light-on-surface-variant dark:text-dark-on-surface-variant block truncate tabular-nums">
                            {item.expression} =
                          </span>
                          <span className="font-mono text-title-md text-light-on-surface dark:text-dark-on-surface tabular-nums">
                            {item.result}
                          </span>
                        </div>
                        <span className="font-mono text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant shrink-0 tabular-nums">
                          {item.time}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </aside>
          </div>
        ) : (
          /* Financial & Percentage Tools */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
            {/* Tool 1: Percentage & Discount */}
            <section className="rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant p-4 flex flex-col gap-3">
              <h2 className="font-headline text-title-md text-light-on-surface dark:text-dark-on-surface">
                Porcentagem e Desconto
              </h2>
              <div className="grid grid-cols-2 gap-2.5">
                <div className="flex flex-col gap-1">
                  <label className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
                    Percentual (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={pctValue}
                    onChange={(e) => setPctValue(e.target.value)}
                    className="rounded bg-light-surface-container-lowest dark:bg-dark-surface-container border border-light-outline-variant dark:border-dark-outline-variant px-3 py-2 font-mono text-body-md tabular-nums text-light-on-surface dark:text-dark-on-surface"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
                    Valor Base (R$)
                  </label>
                  <input
                    type="number"
                    step="1"
                    value={pctBase}
                    onChange={(e) => setPctBase(e.target.value)}
                    className="rounded bg-light-surface-container-lowest dark:bg-dark-surface-container border border-light-outline-variant dark:border-dark-outline-variant px-3 py-2 font-mono text-body-md tabular-nums text-light-on-surface dark:text-dark-on-surface"
                  />
                </div>
              </div>
              <div className="border-t border-light-outline-variant dark:border-dark-outline-variant pt-3 flex flex-col gap-2 text-body-sm">
                <div className="flex justify-between">
                  <span className="text-light-on-surface-variant dark:text-dark-on-surface-variant">
                    {pctNum}% de {pctBaseNum}:
                  </span>
                  <span className="font-mono text-light-primary dark:text-dark-primary tabular-nums font-semibold">
                    {pctPart.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-light-on-surface-variant dark:text-dark-on-surface-variant">
                    Com {pctNum}% de desconto:
                  </span>
                  <span className="font-mono text-cat-emerald tabular-nums font-semibold">
                    {pctDiscount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-light-on-surface-variant dark:text-dark-on-surface-variant">
                    Com {pctNum}% de acréscimo:
                  </span>
                  <span className="font-mono text-light-on-surface dark:text-dark-on-surface tabular-nums font-semibold">
                    {pctIncrease.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                </div>
              </div>
            </section>

            {/* Tool 2: Installments (Tabela Price) */}
            <section className="rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant p-4 flex flex-col gap-3">
              <h2 className="font-headline text-title-md text-light-on-surface dark:text-dark-on-surface">
                Parcelamento e Juros
              </h2>
              <div className="grid grid-cols-2 gap-2.5">
                <div className="flex flex-col gap-1">
                  <label className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
                    Valor Total (R$)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={loanPrice}
                    onChange={(e) => setLoanPrice(e.target.value)}
                    className="rounded bg-light-surface-container-lowest dark:bg-dark-surface-container border border-light-outline-variant dark:border-dark-outline-variant px-3 py-2 font-mono text-body-md tabular-nums text-light-on-surface dark:text-dark-on-surface"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
                    Entrada (R$)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={loanDown}
                    onChange={(e) => setLoanDown(e.target.value)}
                    className="rounded bg-light-surface-container-lowest dark:bg-dark-surface-container border border-light-outline-variant dark:border-dark-outline-variant px-3 py-2 font-mono text-body-md tabular-nums text-light-on-surface dark:text-dark-on-surface"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
                    Parcelas (meses)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="360"
                    value={loanMonths}
                    onChange={(e) => setLoanMonths(e.target.value)}
                    className="rounded bg-light-surface-container-lowest dark:bg-dark-surface-container border border-light-outline-variant dark:border-dark-outline-variant px-3 py-2 font-mono text-body-md tabular-nums text-light-on-surface dark:text-dark-on-surface"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
                    Juros (% ao mês)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={loanRateMonthly}
                    onChange={(e) => setLoanRateMonthly(e.target.value)}
                    className="rounded bg-light-surface-container-lowest dark:bg-dark-surface-container border border-light-outline-variant dark:border-dark-outline-variant px-3 py-2 font-mono text-body-md tabular-nums text-light-on-surface dark:text-dark-on-surface"
                  />
                </div>
              </div>
              <div className="border-t border-light-outline-variant dark:border-dark-outline-variant pt-3 flex flex-col gap-2 text-body-sm">
                <div className="flex justify-between">
                  <span className="text-light-on-surface-variant dark:text-dark-on-surface-variant">
                    Valor da parcela ({nMonths}x):
                  </span>
                  <span className="font-mono text-light-primary dark:text-dark-primary tabular-nums font-semibold">
                    {installment.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-light-on-surface-variant dark:text-dark-on-surface-variant">
                    Total financiado pago:
                  </span>
                  <span className="font-mono text-light-on-surface dark:text-dark-on-surface tabular-nums">
                    {totalLoanPaid.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-light-on-surface-variant dark:text-dark-on-surface-variant">
                    Custo total de juros:
                  </span>
                  <span className="font-mono text-light-error dark:text-dark-error tabular-nums">
                    {totalLoanInterest.toLocaleString('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                    })}
                  </span>
                </div>
              </div>
            </section>

            {/* Tool 3: Live Currency Converter */}
            <section className="rounded-lg bg-light-surface-container-low dark:bg-dark-surface-container-low border border-light-outline-variant dark:border-dark-outline-variant p-4 flex flex-col gap-3">
              <h2 className="font-headline text-title-md text-light-on-surface dark:text-dark-on-surface">
                Conversor de Moedas
              </h2>
              <div className="grid grid-cols-2 gap-2.5">
                <div className="flex flex-col gap-1">
                  <label className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
                    Quantia
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={fxAmount}
                    onChange={(e) => setFxAmount(e.target.value)}
                    className="rounded bg-light-surface-container-lowest dark:bg-dark-surface-container border border-light-outline-variant dark:border-dark-outline-variant px-3 py-2 font-mono text-body-md tabular-nums text-light-on-surface dark:text-dark-on-surface"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-body text-label-sm text-light-on-surface-variant dark:text-dark-on-surface-variant">
                    Moeda de origem
                  </label>
                  <select
                    value={fxCurrency}
                    onChange={(e) =>
                      setFxCurrency(e.target.value as 'BRL' | 'USD' | 'EUR' | 'BTC')
                    }
                    className="rounded bg-light-surface-container-lowest dark:bg-dark-surface-container border border-light-outline-variant dark:border-dark-outline-variant px-3 py-2 font-body text-body-md text-light-on-surface dark:text-dark-on-surface"
                  >
                    <option value="BRL">Real (BRL)</option>
                    <option value="USD">Dólar (USD)</option>
                    <option value="EUR">Euro (EUR)</option>
                    <option value="BTC">Bitcoin (BTC)</option>
                  </select>
                </div>
              </div>

              <div className="border-t border-light-outline-variant dark:border-dark-outline-variant pt-3 flex flex-col gap-2 text-body-sm">
                <div className="flex justify-between">
                  <span className="text-light-on-surface-variant dark:text-dark-on-surface-variant">
                    Real (BRL):
                  </span>
                  <span className="font-mono text-light-on-surface dark:text-dark-on-surface tabular-nums font-semibold">
                    {fxInBrl.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-light-on-surface-variant dark:text-dark-on-surface-variant">
                    Dólar (USD):
                  </span>
                  <span className="font-mono text-light-on-surface dark:text-dark-on-surface tabular-nums">
                    US$ {(fxInBrl / Math.max(0.01, marketRates.usdBrl)).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-light-on-surface-variant dark:text-dark-on-surface-variant">
                    Euro (EUR):
                  </span>
                  <span className="font-mono text-light-on-surface dark:text-dark-on-surface tabular-nums">
                    € {(fxInBrl / Math.max(0.01, marketRates.eurBrl)).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-light-on-surface-variant dark:text-dark-on-surface-variant">
                    Bitcoin (BTC):
                  </span>
                  <span className="font-mono text-light-primary dark:text-dark-primary tabular-nums">
                    {(fxInBrl / Math.max(1, marketRates.btcBrl)).toFixed(6)} BTC
                  </span>
                </div>
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
};
