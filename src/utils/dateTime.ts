export const MONTH_NAMES_PT = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
] as const;

export const WEEKDAY_NAMES_PT = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
] as const;

export const WEEKDAY_SHORT_PT = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'] as const;

export function getGreetingForDate(date: Date = new Date()): 'Bom dia' | 'Boa tarde' | 'Boa noite' {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) return 'Bom dia';
  if (hour >= 12 && hour < 18) return 'Boa tarde';
  return 'Boa noite';
}

export function toLocalDateKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseLocalDateKey(dateKey: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey.trim());
  if (!match) return new Date();
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const parsed = new Date(year, month, day, 12, 0, 0, 0);
  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month ||
    parsed.getDate() !== day
  ) {
    return new Date();
  }
  return parsed;
}

export function formatTimeHHMM(date: Date = new Date()): string {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

export function formatFullDatePtBr(dateInput: string | Date): string {
  const date = typeof dateInput === 'string' ? parseLocalDateKey(dateInput) : dateInput;
  const weekday = WEEKDAY_NAMES_PT[date.getDay()];
  const day = String(date.getDate()).padStart(2, '0');
  const month = MONTH_NAMES_PT[date.getMonth()];
  const year = date.getFullYear();
  return `${weekday}, ${day} de ${month} de ${year}`;
}

export function formatShortDatePtBr(dateKey: string): string {
  const date = parseLocalDateKey(dateKey);
  const day = String(date.getDate()).padStart(2, '0');
  const month = MONTH_NAMES_PT[date.getMonth()];
  const year = date.getFullYear();
  return `${day} de ${month} de ${year}`;
}

export function formatMonthYearPtBr(year: number, monthIndex0: number): string {
  const normalized = ((monthIndex0 % 12) + 12) % 12;
  return `${MONTH_NAMES_PT[normalized]} de ${year}`;
}

export interface CalendarCell {
  dateKey: string;
  day: number;
  inMonth: boolean;
}

export function getMonthCalendarCells(year: number, monthIndex0: number): CalendarCell[] {
  const firstDayOfMonth = new Date(year, monthIndex0, 1);
  const startWeekday = firstDayOfMonth.getDay(); // 0 (Dom) - 6 (Sáb)
  const daysInMonth = new Date(year, monthIndex0 + 1, 0).getDate();
  const prevMonthDays = new Date(year, monthIndex0, 0).getDate();

  const cells: CalendarCell[] = [];

  for (let i = startWeekday - 1; i >= 0; i--) {
    const day = prevMonthDays - i;
    const d = new Date(year, monthIndex0 - 1, day);
    cells.push({
      dateKey: toLocalDateKey(d),
      day,
      inMonth: false,
    });
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, monthIndex0, day);
    cells.push({
      dateKey: toLocalDateKey(d),
      day,
      inMonth: true,
    });
  }

  const remaining = (7 - (cells.length % 7)) % 7;
  for (let day = 1; day <= remaining; day++) {
    const d = new Date(year, monthIndex0 + 1, day);
    cells.push({
      dateKey: toLocalDateKey(d),
      day,
      inMonth: false,
    });
  }

  return cells;
}
