import { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { ArrowDownLeft, ArrowUpRight, Bell, CirclePlus, ReceiptText, WalletCards } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useGlobalSearchParams, router } from 'expo-router';
import { AddExpenseModal } from '@/components/AddExpenseModal';
import { addExpense, getBudget, getExpenses, getRecurringBills, getSettings } from '@/storage';
import { getCategories, seedDefaultCategories } from '@/lib/seed';
import { calculateSafeToSpend, computeRolloverBalance, endOfMonth, startOfMonth } from '@/lib/budget';
import { useCurrency } from '@/context/CurrencyContext';
import type { Budget, Category, Expense, RecurringBill, Settings } from '@/types';
import { colors, radii, shadows, spacing, typography } from '@/theme';

const emptyBudget: Budget = {
  monthly: 0,
  rollover: false,
  anchorDate: new Date().toISOString(),
};

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { currencySymbol, formatAmount } = useCurrency();
  const params = useGlobalSearchParams<{ addExpense?: string }>();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [budget, setBudget] = useState<Budget>(emptyBudget);
  const [bills, setBills] = useState<RecurringBill[]>([]);
  const [pacingMode, setPacingMode] = useState<Settings['pacingMode']>('even');
  const [isModalVisible, setModalVisible] = useState(false);
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const today = new Date();

  useFocusEffect(useCallback(() => {
    let active = true;
    async function loadHome() {
      try {
        await seedDefaultCategories();
        const [storedExpenses, storedCategories, storedBudget, storedBills, storedSettings] = await Promise.all([
          getExpenses(),
          getCategories(),
          getBudget(),
          getRecurringBills(),
          getSettings(),
        ]);
        if (active) {
          setExpenses(storedExpenses);
          setCategories(storedCategories);
          if (storedBudget) setBudget(storedBudget);
          setBills(storedBills);
          if (storedSettings?.pacingMode) setPacingMode(storedSettings.pacingMode);
          setError(null);
        }
      } catch {
        if (active) setError('Your offline data could not be loaded.');
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadHome();
    return () => { active = false; };
  }, []));

  useEffect(() => {
    if (params.addExpense === 'true' && !isLoading && categories.length > 0) {
      setModalVisible(true);
    }
  }, [params.addExpense, isLoading, categories.length]);

  const rolloverBalance = useMemo(() => {
    if (!budget.rollover) return 0;

    const prevMonthRef = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const prevStart = startOfMonth(prevMonthRef);
    const prevEnd = endOfMonth(prevMonthRef);

    // Guard against phantom rollover: only carry a balance forward if the
    // user actually had activity before this month (i.e. this isn't their
    // first month using the app / the budget).
    const hasHistoryBeforeThisMonth = expenses.some((e) => new Date(e.createdAt) < startOfMonth(today));
    if (!hasHistoryBeforeThisMonth) return 0;

    return computeRolloverBalance(budget, expenses, prevStart, prevEnd);
  }, [budget, expenses]);

  const summary = useMemo(
    () => calculateSafeToSpend(budget, expenses, today, rolloverBalance, bills, pacingMode),
    [budget, expenses, rolloverBalance, bills, pacingMode],
  );

  const categoriesById = useMemo(
    () => new Map(categories.map((category) => [category.id, category])),
    [categories],
  );

  async function handleSave(amount: number, category: Category): Promise<void> {
    const expense: Expense = {
      id: `${Date.now()}`,
      amount,
      categoryId: category.id,
      createdAt: new Date().toISOString(),
    };
    const updated = await addExpense(expense);
    setExpenses(updated);
  }

  const dayLabel = today.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
  const monthLabel = today.toLocaleDateString(undefined, { month: 'long' });
  const spentPercent = budget.monthly > 0 ? Math.min(100, (summary.spentThisMonth / budget.monthly) * 100) : 0;
  const remainingPercent = 100 - spentPercent;

  const recentExpenses = expenses.slice(0, 6);

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={[styles.container, { paddingBottom: 120 }]} showsVerticalScrollIndicator={false}>
        <View style={styles.topBar}>
          <View>
            <Text style={styles.eyebrow}>{dayLabel}</Text>
            <Text style={styles.title}>Good evening</Text>
          </View>
          <Pressable style={styles.iconButton} onPress={() => router.navigate('/bills')} accessibilityLabel="View bills">
            <Bell color={colors.text} size={20} strokeWidth={2} />
            <View style={styles.notificationDot} />
          </Pressable>
        </View>

        <View style={styles.heroCard}>
          <View style={styles.heroTop}>
            <View style={styles.heroLabelRow}>
              <View style={styles.heroIconBadge}>
                <WalletCards color={colors.white} size={16} strokeWidth={2.4} />
              </View>
              <Text style={styles.heroLabel}>Safe to spend</Text>
            </View>
            <Text style={styles.heroPeriod}>Today</Text>
          </View>
          {isLoading ? (
            <ActivityIndicator color={colors.secondary} style={styles.loader} />
          ) : (
            <>
              <Text style={styles.heroValue}>{formatAmount(summary.daily)}</Text>
              <Text style={styles.heroHint}>
                {budget.monthly > 0 ? `${monthLabel} budget remaining` : 'Set your budget to unlock your daily number'}
              </Text>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${remainingPercent}%` }]} />
              </View>
              <View style={styles.heroFooter}>
                <Text style={styles.footerText}>{formatAmount(summary.spentThisMonth)} spent</Text>
                <Text style={styles.footerText}>{summary.daysLeft} days left</Text>
              </View>
              {summary.reservedForBills > 0 && (
                <Text style={styles.reservedText}>{formatAmount(summary.reservedForBills)} reserved for upcoming bills</Text>
              )}
              {budget.rollover && summary.rolloverBalance !== 0 && (
                <Text style={styles.reservedText}>
                  {summary.rolloverBalance > 0
                    ? `${formatAmount(summary.rolloverBalance)} carried over from last month`
                    : `${formatAmount(Math.abs(summary.rolloverBalance))} over budget carried in from last month`}
                </Text>
              )}
              {summary.effectivePacingMode !== 'even' && (
                <Text style={styles.reservedText}>
                  {summary.effectivePacingMode === 'weekday'
                    ? "Weighted to your usual weekday spending"
                    : summary.effectivePacingMode === 'front'
                      ? 'Front-loaded: more room earlier in the month'
                      : 'Back-loaded: more room later in the month'}
                </Text>
              )}
              {pacingMode === 'weekday' && summary.effectivePacingMode === 'even' && (
                <Text style={styles.reservedText}>Log a bit more history to unlock pattern-based pacing</Text>
              )}
            </>
          )}
        </View>

        <View style={styles.actionRow}>
          <Pressable style={[styles.actionButton, styles.primaryAction]} onPress={() => setModalVisible(true)}>
            <CirclePlus color={colors.white} size={19} strokeWidth={2.5} />
            <Text style={styles.primaryActionText}>Add expense</Text>
          </Pressable>
          <Pressable style={styles.actionButton} onPress={() => router.navigate('/settings')}>
            <ArrowUpRight color={colors.text} size={18} strokeWidth={2} />
            <Text style={styles.actionText}>Set budget</Text>
          </Pressable>
        </View>

        {error && <Text style={styles.errorText}>{error}</Text>}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent activity</Text>
          <Text style={styles.sectionMeta}>{expenses.length} total</Text>
        </View>
        {recentExpenses.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <ReceiptText color={colors.accent} size={22} strokeWidth={1.8} />
            </View>
            <View style={styles.emptyCopy}>
              <Text style={styles.emptyTitle}>Nothing logged yet</Text>
              <Text style={styles.emptySubtitle}>Tap + to record your first expense.</Text>
            </View>
          </View>
        ) : (
          recentExpenses.map((expense) => {
            const category = categoriesById.get(expense.categoryId);
            return (
              <View key={expense.id} style={styles.expenseCard}>
                <View style={[styles.expenseIcon, { backgroundColor: `${category?.color ?? colors.primary}22` }]}>
                  <ArrowDownLeft color={category?.color ?? colors.primary} size={18} strokeWidth={2.2} />
                </View>
                <View style={styles.expenseCopy}>
                  <Text style={styles.expenseTitle}>{category?.name ?? 'Expense'}</Text>
                  <Text style={styles.expenseMeta}>{new Date(expense.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</Text>
                </View>
                <Text style={styles.expenseAmount}>-{formatAmount(expense.amount)}</Text>
              </View>
            );
          })
        )}
      </ScrollView>

      <Pressable
        style={[styles.fab, { bottom: 76 + insets.bottom }]}
        onPress={() => setModalVisible(true)}
        accessibilityLabel="Add expense">
        <CirclePlus color={colors.white} size={27} strokeWidth={2.4} />
      </Pressable>

      <AddExpenseModal
        visible={isModalVisible}
        categories={categories}
        currencySymbol={currencySymbol}
        onClose={() => setModalVisible(false)}
        onSave={handleSave}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  container: { paddingHorizontal: spacing.lg, paddingTop: spacing.xl },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg },
  eyebrow: { color: colors.textDim, fontSize: typography.caption, fontFamily: 'Inter-Medium', marginBottom: 4 },
  title: { color: colors.text, fontSize: typography.title, fontFamily: 'Inter-SemiBold' },
  iconButton: { width: 44, height: 44, borderRadius: radii.pill, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  notificationDot: { position: 'absolute', top: 10, right: 10, width: 6, height: 6, borderRadius: radii.pill, backgroundColor: colors.secondary },
  heroCard: { backgroundColor: colors.surface, borderRadius: radii.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.border, ...shadows.card },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroLabelRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  heroIconBadge: { width: 30, height: 30, borderRadius: radii.sm, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  heroLabel: { color: colors.text, fontSize: typography.body, fontFamily: 'Inter-SemiBold' },
  heroPeriod: { color: colors.textDim, fontSize: typography.caption, fontFamily: 'Inter-Medium' },
  heroValue: { color: colors.text, fontSize: 44, lineHeight: 52, fontFamily: 'Inter-Bold', marginTop: spacing.md },
  heroHint: { color: colors.textMuted, fontSize: typography.caption, fontFamily: 'Inter-Regular', marginTop: 2 },
  loader: { height: 114 },
  progressTrack: { height: 8, backgroundColor: colors.surfaceMuted, borderRadius: radii.pill, marginTop: spacing.lg, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: colors.secondary, borderRadius: radii.pill },
  heroFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.sm },
  footerText: { color: colors.textDim, fontSize: typography.micro, fontFamily: 'Inter-Medium' },
  reservedText: { color: colors.textDim, fontSize: typography.micro, fontFamily: 'Inter-Regular', marginTop: spacing.xs },
  actionRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  actionButton: { flex: 1, minHeight: 52, paddingHorizontal: spacing.md, borderRadius: radii.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs },
  primaryAction: { backgroundColor: colors.primary, borderColor: colors.primary },
  primaryActionText: { color: colors.white, fontSize: typography.caption, fontFamily: 'Inter-SemiBold' },
  actionText: { color: colors.text, fontSize: typography.caption, fontFamily: 'Inter-SemiBold' },
  errorText: { color: colors.error, fontSize: typography.caption, fontFamily: 'Inter-Medium', marginTop: spacing.sm },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.xl, marginBottom: spacing.sm },
  sectionTitle: { color: colors.text, fontSize: typography.heading, fontFamily: 'Inter-SemiBold' },
  sectionMeta: { color: colors.textDim, fontSize: typography.caption, fontFamily: 'Inter-Medium' },
  emptyCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radii.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border },
  expenseCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radii.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.sm },
  expenseIcon: { width: 40, height: 40, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center', marginRight: spacing.md },
  emptyIcon: { width: 44, height: 44, borderRadius: radii.sm, backgroundColor: colors.surfaceRaised, alignItems: 'center', justifyContent: 'center', marginRight: spacing.sm },
  emptyCopy: { flex: 1 },
  emptyTitle: { color: colors.text, fontSize: typography.caption, fontFamily: 'Inter-SemiBold', marginBottom: 4 },
  emptySubtitle: { color: colors.textDim, fontSize: typography.micro, fontFamily: 'Inter-Regular' },
  expenseCopy: { flex: 1 },
  expenseTitle: { color: colors.text, fontSize: typography.caption, fontFamily: 'Inter-SemiBold', marginBottom: 4 },
  expenseMeta: { color: colors.textDim, fontSize: typography.micro, fontFamily: 'Inter-Regular' },
  expenseAmount: { color: colors.error, fontSize: typography.body, fontFamily: 'Inter-SemiBold' },
  fab: { position: 'absolute', right: spacing.lg, width: 60, height: 60, borderRadius: radii.pill, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', shadowColor: colors.primary, shadowOpacity: 0.4, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 8 },
});
