import { useEffect, useState } from 'react';
import { getSettings } from '@/storage';
import type { Settings } from '@/types';

const DEFAULT_SETTINGS: Settings = {
  currency: 'USD',
  reminderEnabled: false,
  reminderHour: 20,
  reminderMinute: 0,
  appLockEnabled: false,
  pinHash: null,
  pacingMode: 'even',
};

export function useLockGate() {
  const [isLocked, setIsLocked] = useState(false);
  const [pinHash, setPinHash] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const settings = await getSettings() ?? DEFAULT_SETTINGS;
        if (active) {
          setPinHash(settings.pinHash);
          if (settings.appLockEnabled && settings.pinHash) {
            setIsLocked(true);
          }
        }
      } catch {
        // If settings can't load, don't lock the user out.
      } finally {
        if (active) setIsReady(true);
      }
    }
    void load();
    return () => { active = false; };
  }, []);

  function unlock() {
    setIsLocked(false);
  }

  function lock() {
    if (pinHash) {
      setIsLocked(true);
    }
  }

  function refreshLockState(settings: Settings) {
    setPinHash(settings.pinHash);
    if (!settings.appLockEnabled || !settings.pinHash) {
      setIsLocked(false);
    }
  }

  return { isLocked, pinHash, isReady, unlock, lock, refreshLockState };
}
