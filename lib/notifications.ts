import { Platform } from 'react-native';
import type { RecurringBill, Settings } from '@/types';
import { formatCurrency } from '@/lib/currency';

const STORAGE_KEY = 'dm.lastReminder';
const DEEP_LINK_ACTION = 'add-expense';

export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS !== 'web') return false;
  if (typeof globalThis.Notification === 'undefined') return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const result = await Notification.requestPermission();
  return result === 'granted';
}

export function notificationsSupported(): boolean {
  return Platform.OS === 'web' && typeof globalThis.Notification !== 'undefined';
}

export function formatReminderTime(hour: number, minute: number): string {
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  const displayMinute = minute.toString().padStart(2, '0');
  return `${displayHour}:${displayMinute} ${period}`;
}

export function startReminderScheduler(
  settings: Settings,
  bills: RecurringBill[],
  onOpenAddExpense: () => void,
): () => void {
  if (!notificationsSupported() || !settings.reminderEnabled) {
    return () => {};
  }

  let cancelled = false;

  async function checkAndFire() {
    if (cancelled) return;
    if (Notification.permission !== 'granted') return;

    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const todayKey = now.toISOString().slice(0, 10);

    const lastFired = globalThis.localStorage?.getItem(STORAGE_KEY);
    if (lastFired === todayKey) return;

    if (currentHour > settings.reminderHour || (currentHour === settings.reminderHour && currentMinute >= settings.reminderMinute)) {
      globalThis.localStorage?.setItem(STORAGE_KEY, todayKey);
      fireDailyReminder(bills, settings.currency, onOpenAddExpense);
    }
  }

  void checkAndFire();
  const interval = setInterval(checkAndFire, 60_000);

  return () => {
    cancelled = true;
    clearInterval(interval);
  };
}

function fireDailyReminder(bills: RecurringBill[], currency: string, onOpenAddExpense: () => void) {
  const dueSoon = getBillsDueSoon(bills, 3);
  let title = 'Time to log your expenses';
  let body = 'Tap to add your spending for today.';

  if (dueSoon.length > 0) {
    const nextBill = dueSoon[0];
    title = `${nextBill.name} due soon`;
    body = `${formatCurrency(nextBill.amount, currency)} due on ${formatBillDate(nextBill.dueDate)}. Tap to log expenses.`;
  }

  try {
    const notification = new Notification(title, {
      body,
      tag: 'daily-reminder',
      data: { action: DEEP_LINK_ACTION },
    });
    notification.onclick = () => {
      globalThis.window?.focus();
      onOpenAddExpense();
      notification.close();
    };
  } catch {
    // Notification construction can fail in some browsers; ignore gracefully.
  }
}

export function getBillsDueSoon(bills: RecurringBill[], withinDays: number): RecurringBill[] {
  const now = new Date();
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() + withinDays);
  return bills
    .filter((bill) => bill.reminderEnabled)
    .filter((bill) => {
      const due = new Date(bill.dueDate + 'T00:00:00');
      return due >= startOfDay(now) && due <= cutoff;
    })
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
}

export function getUpcomingBills(bills: RecurringBill[]): RecurringBill[] {
  const now = startOfDay(new Date());
  return bills
    .filter((bill) => new Date(bill.dueDate + 'T00:00:00') >= now)
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
}

export function getOverdueBills(bills: RecurringBill[]): RecurringBill[] {
  const now = startOfDay(new Date());
  return bills
    .filter((bill) => new Date(bill.dueDate + 'T00:00:00') < now)
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
}

export function daysUntil(dueDate: string): number {
  const now = startOfDay(new Date());
  const due = new Date(dueDate + 'T00:00:00');
  const diff = due.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function formatBillDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function formatFullDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}
