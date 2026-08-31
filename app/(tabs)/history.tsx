import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { CalendarDays, ChevronDown, ReceiptText, Trash2 } from 'lucide-react-native';
import { useFocusEffect } from 'expo-router';
import { AddExpenseModal } from '@/components/AddExpenseModal';
import { deleteExpense, getExpenses, updateExpense } from '@/storage';
import { getCategories } from '@/lib/seed';
import { useCurrency } from '@/context/CurrencyContext';
import type { Category, Expense } from '@/types';
import { colors, radii, shadows, spacing, typography } from '@/theme';

export default function HistoryScreen() {
  const { currencySymbol, formatAmount } = useCurrency();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  useFocusEffect(useCallback(() => {
    let active = true;
    async function load() {
      try {
        const [storedExpenses, storedCategories] = await Promise.all([getExpenses(), getCategories()]);
        if (active) { setExpenses(storedExpenses); setCategories(storedCategories); setError(null); }
      } catch {
        if (active) setError('Could not load your history.');
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, []));

  const categoryMap = new Map(categories.map((category) => [category.id, category]));
  const now = new Date();
  const monthExpenses = expenses.filter((expense) => { const date = new Date(expense.createdAt); return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth(); });
  const visibleExpenses = showAll ? expenses : monthExpenses;
  const monthTotal = monthExpenses.reduce((sum, expense) => sum + expense.amount, 0);

  const prevMonthRef = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonthExpenses = expenses.filter((expense) => {
    const date = new Date(expense.createdAt);
    return date.getFullYear() === prevMonthRef.getFullYear() && date.getMonth() === prevMonthRef.getMonth();
  });
  const prevMonthTotal = prevMonthExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  const hasComparison = prevMonthTotal > 0 && now.getDate() > 1;
  const percentChange = hasComparison ? Math.round(((monthTotal - prevMonthTotal) / prevMonthTotal) * 100) : 0;

  async function removeExpense(id: string) {
    try { setExpenses(await deleteExpense(id)); } catch { setError('Could not remove that expense.'); }
  }

  async function handleEditSave(amount: number, category: Category): Promise<void> {
    if (!editingExpense) return;
    const updated: Expense = { ...editingExpense, amount, categoryId: category.id };
    const refreshed = await updateExpense(updated);
    setExpenses(refreshed);
    setEditingExpense(null);
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.headerRow}>
        <View><Text style={styles.eyebrow}>Your spending</Text><Text style={styles.title}>History</Text></View>
        <View style={styles.headerIcon}><CalendarDays color={colors.text} size={20} strokeWidth={2} /></View>
      </View>
      <View style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>This month</Text>
        <Text style={styles.summaryValue}>{formatAmount(monthTotal)}</Text>
        <Text style={styles.summaryHint}>{monthExpenses.length} {monthExpenses.length === 1 ? 'expense' : 'expenses'} recorded</Text>
        {hasComparison && (
          <View style={[styles.comparisonBadge, percentChange <= 0 ? styles.comparisonBadgeGood : styles.comparisonBadgeWarn]}>
            <Text style={[styles.comparisonText, percentChange <= 0 ? styles.comparisonTextGood : styles.comparisonTextWarn]}>
              {percentChange === 0
                ? 'Same pace as last month'
                : percentChange < 0
                  ? `${Math.abs(percentChange)}% less than last month`
                  : `${percentChange}% more than last month`}
            </Text>
          </View>
        )}
      </View>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{showAll ? 'All activity' : 'This month'}</Text>
        <Pressable style={styles.filterButton} onPress={() => setShowAll((value) => !value)}>
          <Text style={styles.filterText}>{showAll ? 'This month' : 'All time'}</Text>
          <ChevronDown color={colors.textMuted} size={15} />
        </Pressable>
      </View>
      {error && <Text style={styles.error}>{error}</Text>}
      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={styles.loader} />
      ) : visibleExpenses.length === 0 ? (
        <View style={styles.emptyCard}>
          <View style={styles.emptyIcon}><ReceiptText color={colors.primary} size={22} strokeWidth={1.8} /></View>
          <View style={styles.emptyCopy}>
            <Text style={styles.emptyTitle}>Your history is clear</Text>
            <Text style={styles.emptySubtitle}>Logged expenses will appear here.</Text>
          </View>
        </View>
      ) : (
        visibleExpenses.map((expense) => {
          const category = categoryMap.get(expense.categoryId);
          const date = new Date(expense.createdAt);
          return (
            <View key={expense.id} style={styles.expenseCard}>
              <Pressable
                style={styles.expenseRowMain}
                onPress={() => setEditingExpense(expense)}
                accessibilityLabel={`Edit ${category?.name ?? 'expense'}`}>
                <View style={[styles.expenseDot, { backgroundColor: category?.color ?? colors.secondary }]} />
                <View style={styles.expenseCopy}>
                  <Text style={styles.expenseTitle}>{category?.name ?? 'Expense'}</Text>
                  <Text style={styles.expenseMeta}>{date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} · {date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}</Text>
                </View>
                <Text style={styles.expenseAmount}>-{formatAmount(expense.amount)}</Text>
              </Pressable>
              <Pressable style={styles.deleteButton} onPress={() => removeExpense(expense.id)} accessibilityLabel={`Delete ${category?.name ?? 'expense'}`}>
                <Trash2 color={colors.textDim} size={17} />
              </Pressable>
            </View>
          );
        })
      )}

      <AddExpenseModal
        visible={editingExpense !== null}
        categories={categories}
        currencySymbol={currencySymbol}
        editingExpense={editingExpense}
        onClose={() => setEditingExpense(null)}
        onSave={handleEditSave}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  container: { paddingHorizontal: spacing.lg, paddingTop: spacing.xl, paddingBottom: 120 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg },
  eyebrow: { color: colors.textMuted, fontSize: typography.caption, fontFamily: 'Inter-Medium', marginBottom: 4 },
  title: { color: colors.text, fontSize: typography.title, fontFamily: 'Inter-SemiBold' },
  headerIcon: { width: 44, height: 44, borderRadius: radii.pill, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  summaryCard: { backgroundColor: colors.surface, borderRadius: radii.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.xl, ...shadows.card },
  summaryLabel: { color: colors.textMuted, fontSize: typography.caption, fontFamily: 'Inter-Medium' },
  summaryValue: { color: colors.text, fontSize: 34, fontFamily: 'Inter-Bold', marginTop: spacing.sm },
  summaryHint: { color: colors.textDim, fontSize: typography.caption, fontFamily: 'Inter-Regular', marginTop: 4 },
  comparisonBadge: { alignSelf: 'flex-start', borderRadius: radii.pill, paddingHorizontal: spacing.sm, paddingVertical: 4, marginTop: spacing.sm },
  comparisonBadgeGood: { backgroundColor: `${colors.secondary}22` },
  comparisonBadgeWarn: { backgroundColor: `${colors.warning}22` },
  comparisonText: { fontSize: typography.micro, fontFamily: 'Inter-SemiBold' },
  comparisonTextGood: { color: colors.secondary },
  comparisonTextWarn: { color: colors.warning },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  sectionTitle: { color: colors.text, fontSize: typography.heading, fontFamily: 'Inter-SemiBold' },
  filterButton: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: spacing.xs },
  filterText: { color: colors.textMuted, fontSize: typography.caption, fontFamily: 'Inter-Medium' },
  loader: { marginTop: spacing.lg },
  error: { color: colors.error, fontSize: typography.caption, fontFamily: 'Inter-Medium', marginBottom: spacing.sm },
  emptyCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radii.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border },
  emptyIcon: { width: 44, height: 44, borderRadius: radii.sm, backgroundColor: colors.surfaceRaised, alignItems: 'center', justifyContent: 'center', marginRight: spacing.sm },
  emptyCopy: { flex: 1 },
  emptyTitle: { color: colors.text, fontSize: typography.caption, fontFamily: 'Inter-SemiBold', marginBottom: 4 },
  emptySubtitle: { color: colors.textDim, fontSize: typography.caption, fontFamily: 'Inter-Regular' },
  expenseCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radii.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.sm },
  expenseRowMain: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  expenseDot: { width: 12, height: 12, borderRadius: radii.pill, marginRight: spacing.md },
  expenseCopy: { flex: 1 },
  expenseTitle: { color: colors.text, fontSize: typography.caption, fontFamily: 'Inter-SemiBold' },
  expenseMeta: { color: colors.textDim, fontSize: typography.micro, fontFamily: 'Inter-Regular', marginTop: 4 },
  expenseAmount: { color: colors.error, fontSize: typography.body, fontFamily: 'Inter-SemiBold', marginRight: spacing.sm },
  deleteButton: { padding: spacing.xs },
});
