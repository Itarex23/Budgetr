import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Budget, Category, Expense, RecurringBill, RepeatInterval, Settings } from '@/types';

export const storageKeys = {
  expenses: 'budgetr.expenses',
  categories: 'budgetr.categories',
  budget: 'budgetr.budget',
  settings: 'budgetr.settings',
  recurringBills: 'budgetr.recurringBills',
} as const;

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'food', name: 'Food & Drink', color: '#FF7B8A', icon: 'UtensilsCrossed', isDefault: true },
  { id: 'transport', name: 'Transport', color: '#6FA8FF', icon: 'Car', isDefault: true },
  { id: 'groceries', name: 'Groceries', color: '#63E6B3', icon: 'ShoppingCart', isDefault: true },
  { id: 'bills', name: 'Bills', color: '#FFD166', icon: 'ReceiptText', isDefault: true },
  { id: 'entertainment', name: 'Entertainment', color: '#B084FF', icon: 'Clapperboard', isDefault: true },
  { id: 'health', name: 'Health', color: '#FF9F6B', icon: 'HeartPulse', isDefault: true },
  { id: 'shopping', name: 'Shopping', color: '#5DD4E0', icon: 'ShoppingBag', isDefault: true },
  { id: 'other', name: 'Other', color: '#A6ACCC', icon: 'CircleDot', isDefault: true },
];

async function readJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function writeJson<T>(key: string, value: T): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

// ── Expenses ──────────────────────────────────────────────────────────

export async function getExpenses(): Promise<Expense[]> {
  const expenses = await readJson<Expense[]>(storageKeys.expenses, []);
  return [...expenses].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function addExpense(expense: Expense): Promise<Expense[]> {
  const expenses = await readJson<Expense[]>(storageKeys.expenses, []);
  await writeJson(storageKeys.expenses, [...expenses, expense]);
  return getExpenses();
}

export async function deleteExpense(id: string): Promise<Expense[]> {
  const expenses = await readJson<Expense[]>(storageKeys.expenses, []);
  await writeJson(storageKeys.expenses, expenses.filter((e) => e.id !== id));
  return getExpenses();
}

export async function updateExpense(expense: Expense): Promise<Expense[]> {
  const expenses = await readJson<Expense[]>(storageKeys.expenses, []);
  const updated = expenses.map((e) => (e.id === expense.id ? expense : e));
  await writeJson(storageKeys.expenses, updated);
  return getExpenses();
}

// ── Categories ────────────────────────────────────────────────────────

export async function getCategories(): Promise<Category[]> {
  const categories = await readJson<Category[]>(storageKeys.categories, []);
  if (categories.length === 0) return DEFAULT_CATEGORIES;
  return categories;
}

export async function seedDefaultCategories(): Promise<void> {
  const categories = await readJson<Category[]>(storageKeys.categories, []);
  if (categories.length > 0) return;
  await writeJson(storageKeys.categories, DEFAULT_CATEGORIES);
}

export async function saveCategory(category: Category): Promise<Category[]> {
  const categories = await readJson<Category[]>(storageKeys.categories, []);
  const base = categories.length === 0 ? DEFAULT_CATEGORIES : categories;
  const existingIndex = base.findIndex((c) => c.id === category.id);
  const updated = existingIndex >= 0
    ? base.map((c, i) => (i === existingIndex ? category : c))
    : [...base, category];
  await writeJson(storageKeys.categories, updated);
  return getCategories();
}

export async function deleteCategory(id: string): Promise<Category[]> {
  const categories = await readJson<Category[]>(storageKeys.categories, []);
  const base = categories.length === 0 ? DEFAULT_CATEGORIES : categories;
  await writeJson(storageKeys.categories, base.filter((c) => c.id !== id));
  return getCategories();
}

export async function reorderCategories(categories: Category[]): Promise<Category[]> {
  await writeJson(storageKeys.categories, categories);
  return getCategories();
}

// ── Budget ────────────────────────────────────────────────────────────

export async function getBudget(): Promise<Budget | null> {
  return readJson<Budget | null>(storageKeys.budget, null);
}

export async function saveBudget(budget: Budget): Promise<void> {
  await writeJson(storageKeys.budget, budget);
}

// ── Settings ──────────────────────────────────────────────────────────

export async function getSettings(): Promise<Settings | null> {
  return readJson<Settings | null>(storageKeys.settings, null);
}

export async function saveSettings(settings: Settings): Promise<void> {
  await writeJson(storageKeys.settings, settings);
}

// ── Recurring bills ───────────────────────────────────────────────────

export async function getRecurringBills(): Promise<RecurringBill[]> {
  const bills = await readJson<RecurringBill[]>(storageKeys.recurringBills, []);
  return [...bills].sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
}

export async function saveRecurringBill(bill: RecurringBill): Promise<RecurringBill[]> {
  const bills = await readJson<RecurringBill[]>(storageKeys.recurringBills, []);
  const existingIndex = bills.findIndex((b) => b.id === bill.id);
  const updated = existingIndex >= 0
    ? bills.map((b, i) => (i === existingIndex ? bill : b))
    : [...bills, bill];
  await writeJson(storageKeys.recurringBills, updated);
  return getRecurringBills();
}

export async function deleteRecurringBill(id: string): Promise<RecurringBill[]> {
  const bills = await readJson<RecurringBill[]>(storageKeys.recurringBills, []);
  await writeJson(storageKeys.recurringBills, bills.filter((b) => b.id !== id));
  return getRecurringBills();
}

export async function markBillPaid(id: string, bill: RecurringBill): Promise<RecurringBill[]> {
  const today = new Date().toISOString().slice(0, 10);
  const nextDue = computeNextDueDate(bill.dueDate, bill.repeatInterval);
  const updated: RecurringBill = {
    ...bill,
    lastPaidDate: today,
    dueDate: nextDue,
  };
  return saveRecurringBill(updated);
}

function computeNextDueDate(dueDate: string, interval: RepeatInterval): string {
  const date = new Date(dueDate + 'T00:00:00');
  if (interval === 'weekly') {
    date.setDate(date.getDate() + 7);
  } else if (interval === 'monthly') {
    date.setMonth(date.getMonth() + 1);
  } else {
    date.setFullYear(date.getFullYear() + 1);
  }
  return date.toISOString().slice(0, 10);
}

// ── Reset (useful for the offboarding / "clear my data" case) ──────────

export async function clearAllLocalData(): Promise<void> {
  await Promise.all(Object.values(storageKeys).map((key) => AsyncStorage.removeItem(key)));
}
