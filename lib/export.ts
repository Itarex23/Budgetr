import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import type { Category, Expense, RecurringBill } from '@/types';

type ExportData = {
  expenses: Expense[];
  categories: Category[];
  bills: RecurringBill[];
};

function escapeCsv(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function expensesToCsv(expenses: Expense[], categories: Category[]): string {
  const categoryMap = new Map(categories.map((c) => [c.id, c.name]));
  const header = 'Date,Category,Amount,Note';
  const rows = expenses.map((expense) => {
    const date = new Date(expense.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    const categoryName = categoryMap.get(expense.categoryId) ?? 'Unknown';
    const note = expense.note ?? '';
    return [escapeCsv(date), escapeCsv(categoryName), expense.amount.toFixed(2), escapeCsv(note)].join(',');
  });
  return [header, ...rows].join('\n');
}

export function exportToJson(data: ExportData): string {
  return JSON.stringify({
    exportedAt: new Date().toISOString(),
    expenses: data.expenses.map((e) => ({
      ...e,
      categoryName: data.categories.find((c) => c.id === e.categoryId)?.name ?? 'Unknown',
    })),
    categories: data.categories,
    recurringBills: data.bills,
  }, null, 2);
}

export async function downloadFile(content: string, filename: string, mimeType: string): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof globalThis.document === 'undefined') return;
    const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
    const url = globalThis.URL.createObjectURL(blob);
    const link = globalThis.document.createElement('a');
    link.href = url;
    link.download = filename;
    globalThis.document.body.appendChild(link);
    link.click();
    globalThis.document.body.removeChild(link);
    globalThis.URL.revokeObjectURL(url);
    return;
  }

  const uri = `${FileSystem.cacheDirectory}${filename}`;
  await FileSystem.writeAsStringAsync(uri, content, { encoding: FileSystem.EncodingType.UTF8 });
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('Sharing is not available on this device');
  }
  await Sharing.shareAsync(uri, { mimeType, dialogTitle: 'Export Budgetr data' });
}

export function generateExportFilename(format: 'csv' | 'json'): string {
  const date = new Date().toISOString().slice(0, 10);
  return `budgetr-export-${date}.${format}`;
}
