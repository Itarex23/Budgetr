import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { router } from 'expo-router';
import { getRecurringBills } from '@/storage';
import { getSettings } from '@/storage';
import { startReminderScheduler } from '@/lib/notifications';
import type { RecurringBill, Settings } from '@/types';

const DEFAULT_SETTINGS: Settings = {
  currency: 'NGN',
  reminderEnabled: false,
  reminderHour: 20,
  reminderMinute: 0,
  appLockEnabled: false,
  pinHash: null,
  pacingMode: 'even',
};

export function useReminderScheduler() {
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (Platform.OS !== 'web') return;

    let cancelled = false;

    async function init() {
      try {
        const [settings, bills] = await Promise.all([
          getSettings() ?? DEFAULT_SETTINGS,
          getRecurringBills(),
        ]);

        if (cancelled) return;

        const resolvedSettings = settings ?? DEFAULT_SETTINGS;

        const openAddExpense = () => {
          router.navigate('/');
          setTimeout(() => {
            router.setParams({ addExpense: 'true' });
          }, 100);
        };

        cleanupRef.current = startReminderScheduler(
          resolvedSettings,
          bills as RecurringBill[],
          openAddExpense,
        );
      } catch {
        // Silently fail — notifications are a nice-to-have, not critical.
      }
    }

    void init();

    return () => {
      cancelled = true;
      cleanupRef.current?.();
      cleanupRef.current = null;
    };
  }, []);
}
