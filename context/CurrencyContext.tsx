import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { getSettings } from '@/storage';
import { DEFAULT_CURRENCY_CODE, formatCurrency, getCurrencySymbol } from '@/lib/currency';

type CurrencyContextValue = {
  currencyCode: string;
  currencySymbol: string;
  formatAmount: (amount: number) => string;
  refreshCurrency: () => Promise<void>;
};

const CurrencyContext = createContext<CurrencyContextValue>({
  currencyCode: DEFAULT_CURRENCY_CODE,
  currencySymbol: getCurrencySymbol(DEFAULT_CURRENCY_CODE),
  formatAmount: (amount: number) => formatCurrency(amount, DEFAULT_CURRENCY_CODE),
  refreshCurrency: async () => {},
});

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currencyCode, setCurrencyCode] = useState(DEFAULT_CURRENCY_CODE);

  const refreshCurrency = useCallback(async () => {
    try {
      const settings = await getSettings();
      if (settings?.currency) setCurrencyCode(settings.currency);
    } catch {
      // Keep the current/default currency if settings can't be loaded.
    }
  }, []);

  useEffect(() => {
    void refreshCurrency();
  }, [refreshCurrency]);

  const value = useMemo<CurrencyContextValue>(
    () => ({
      currencyCode,
      currencySymbol: getCurrencySymbol(currencyCode),
      formatAmount: (amount: number) => formatCurrency(amount, currencyCode),
      refreshCurrency,
    }),
    [currencyCode, refreshCurrency],
  );

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useCurrency() {
  return useContext(CurrencyContext);
}
