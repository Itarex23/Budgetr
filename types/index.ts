export type CategoryId = string;

export type Expense = {
  id: string;
  amount: number;
  categoryId: CategoryId;
  note?: string;
  createdAt: string;
};

export type Category = {
  id: CategoryId;
  name: string;
  color: string;
  icon: string;
  isDefault?: boolean;
  isEssential?: boolean;
};

export type Budget = {
  monthly: number;
  rollover: boolean;
  anchorDate: string;
};

export type PacingMode = 'even' | 'weekday' | 'front' | 'back';

export type Settings = {
  currency: string;
  reminderEnabled: boolean;
  reminderHour: number;
  reminderMinute: number;
  appLockEnabled: boolean;
  pinHash: string | null;
  pacingMode: PacingMode;
};

export type SafeToSpendResult = {
  daily: number;
  spentToday: number;
  spentThisMonth: number;
  remainingMonthly: number;
  daysLeft: number;
  rolloverBalance: number;
  reservedForBills: number;
  effectivePacingMode: PacingMode;
};

export type RepeatInterval = 'weekly' | 'monthly' | 'yearly';

export type RecurringBill = {
  id: string;
  name: string;
  amount: number;
  dueDate: string;
  repeatInterval: RepeatInterval;
  reminderEnabled: boolean;
  lastPaidDate: string | null;
};
