export type CurrencyOption = {
  code: string;
  symbol: string;
  label: string;
};

// Naira listed first since Budgetr is built for Nigerians.
export const CURRENCIES: CurrencyOption[] = [
  { code: 'NGN', symbol: '₦', label: 'Nigerian Naira' },
  { code: 'GHS', symbol: '₵', label: 'Ghanaian Cedi' },
  { code: 'USD', symbol: '$', label: 'US Dollar' },
  { code: 'GBP', symbol: '£', label: 'British Pound' },
  { code: 'EUR', symbol: '€', label: 'Euro' },
  { code: 'KES', symbol: 'KSh', label: 'Kenyan Shilling' },
  { code: 'ZAR', symbol: 'R', label: 'South African Rand' },
];

export const DEFAULT_CURRENCY_CODE = 'NGN';

export function getCurrencySymbol(code: string | undefined | null): string {
  if (!code) return CURRENCIES[0].symbol;
  return CURRENCIES.find((c) => c.code === code)?.symbol ?? code;
}

export function formatCurrency(amount: number, code: string | undefined | null): string {
  return `${getCurrencySymbol(code)}${amount.toFixed(2)}`;
}
