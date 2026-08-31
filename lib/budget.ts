import type { Budget, Expense, PacingMode, RecurringBill, SafeToSpendResult } from '@/types';

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
}

export function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

export function daysLeftInMonth(today: Date): number {
  const end = endOfMonth(today);
  const ms = end.getTime() - today.getTime();
  return Math.max(1, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function isSameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

export function sumExpenses(expenses: Expense[]): number {
  return expenses.reduce((total, e) => total + e.amount, 0);
}

export function expensesToday(expenses: Expense[], today: Date): Expense[] {
  return expenses.filter((e) => isSameDay(new Date(e.createdAt), today));
}

export function expensesThisMonth(expenses: Expense[], today: Date): Expense[] {
  return expenses.filter((e) => isSameMonth(new Date(e.createdAt), today));
}

/**
 * Sum of unpaid recurring bills still due before month-end, so the daily
 * number doesn't tell you money is "safe to spend" when it's actually
 * earmarked for rent or a subscription that hasn't been paid yet.
 */
export function upcomingUnpaidBillsThisMonth(bills: RecurringBill[], today: Date): number {
  const end = endOfMonth(today);
  return bills.reduce((total, bill) => {
    const due = new Date(bill.dueDate);
    const isDueThisMonthOrOverdue = due <= end;
    const alreadyPaidForThisCycle = bill.lastPaidDate
      ? isSameMonth(new Date(bill.lastPaidDate), today) && new Date(bill.lastPaidDate) >= due
      : false;
    if (isDueThisMonthOrOverdue && !alreadyPaidForThisCycle) {
      return total + bill.amount;
    }
    return total;
  }, 0);
}

/**
 * Average historical spend per weekday (0=Sun..6=Sat), based on a recent
 * lookback window. Returns null when there isn't enough history yet, so
 * callers can fall back to an even split for new users.
 */
export function averageSpendByWeekday(expenses: Expense[], referenceDate: Date, lookbackDays = 56): number[] | null {
  const cutoff = new Date(referenceDate);
  cutoff.setDate(cutoff.getDate() - lookbackDays);

  const relevant = expenses.filter((e) => {
    const d = new Date(e.createdAt);
    return d >= cutoff && d < referenceDate;
  });
  if (relevant.length < 10) return null;

  const totals = new Array(7).fill(0);
  const weekdayOccurrences = new Array(7).fill(0);

  relevant.forEach((e) => {
    totals[new Date(e.createdAt).getDay()] += e.amount;
  });
  for (let i = 0; i < lookbackDays; i++) {
    const d = new Date(cutoff);
    d.setDate(d.getDate() + i);
    weekdayOccurrences[d.getDay()] += 1;
  }

  const averages = totals.map((total, i) => (weekdayOccurrences[i] > 0 ? total / weekdayOccurrences[i] : 0));
  const peak = Math.max(...averages);
  if (peak <= 0) return null;

  // Floor every weekday at a fraction of the peak so a weekday with zero
  // recorded history so far doesn't get allocated literally nothing.
  const floor = peak * 0.15;
  return averages.map((a) => Math.max(a, floor));
}

/**
 * Weight for a single calendar day under a given pacing mode. Weights are
 * only meaningful relative to each other within the same month.
 */
export function dayPacingWeight(mode: PacingMode, date: Date, daysInMonth: number, weekdayAverages: number[] | null): number {
  if (mode === 'weekday' && weekdayAverages) {
    return weekdayAverages[date.getDay()];
  }
  if (mode === 'front') {
    return daysInMonth - date.getDate() + 1;
  }
  if (mode === 'back') {
    return date.getDate();
  }
  return 1;
}

function sumRemainingWeights(mode: PacingMode, today: Date, weekdayAverages: number[] | null): number {
  const end = endOfMonth(today);
  const daysInMonth = end.getDate();
  let sum = 0;
  const cursor = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  while (cursor <= end) {
    sum += dayPacingWeight(mode, cursor, daysInMonth, weekdayAverages);
    cursor.setDate(cursor.getDate() + 1);
  }
  return sum;
}


export function calculateSafeToSpend(
  budget: Budget,
  expenses: Expense[],
  today: Date,
  rolloverBalance = 0,
  bills: RecurringBill[] = [],
  pacingMode: PacingMode = 'even',
): SafeToSpendResult {
  const todayExpenses = expensesToday(expenses, today);
  const monthExpenses = expensesThisMonth(expenses, today);

  const spentToday = sumExpenses(todayExpenses);
  const spentThisMonth = sumExpenses(monthExpenses);

  const daysLeft = daysLeftInMonth(today);
  const remainingMonthly = budget.monthly - spentThisMonth;
  const reservedForBills = upcomingUnpaidBillsThisMonth(bills, today);
  const availablePool = remainingMonthly + (budget.rollover ? rolloverBalance : 0) - reservedForBills;

  const weekdayAverages = pacingMode === 'weekday' ? averageSpendByWeekday(expenses, today) : null;
  const effectiveMode: PacingMode = pacingMode === 'weekday' && !weekdayAverages ? 'even' : pacingMode;

  const totalWeight = sumRemainingWeights(effectiveMode, today, weekdayAverages);
  const todayWeight = dayPacingWeight(effectiveMode, today, endOfMonth(today).getDate(), weekdayAverages);
  const daily = totalWeight > 0 ? Math.max(0, (availablePool * todayWeight) / totalWeight) : 0;

  return {
    daily: Math.round(daily * 100) / 100,
    spentToday: Math.round(spentToday * 100) / 100,
    spentThisMonth: Math.round(spentThisMonth * 100) / 100,
    remainingMonthly: Math.round(remainingMonthly * 100) / 100,
    daysLeft,
    rolloverBalance: Math.round((budget.rollover ? rolloverBalance : 0) * 100) / 100,
    reservedForBills: Math.round(reservedForBills * 100) / 100,
    effectivePacingMode: effectiveMode,
  };
}

/**
 * Leftover (or overspend, if negative) from a given completed month.
 * Only meaningful once the app has real usage history for that month —
 * callers should guard against treating an unused month as "leftover."
 */
export function computeRolloverBalance(
  budget: Budget,
  expenses: Expense[],
  monthStart: Date,
  monthEnd: Date,
): number {
  const monthExpenses = expenses.filter((e) => {
    const d = new Date(e.createdAt);
    return d >= monthStart && d <= monthEnd;
  });
  const spent = sumExpenses(monthExpenses);
  return budget.monthly - spent;
}
