import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  ChevronDown,
  ChevronUp,
  CircleDot,
  Pencil,
  Plus,
  Tags,
  Trash2,
} from 'lucide-react-native';
import { useFocusEffect } from 'expo-router';
import { deleteCategory, getExpenses, reorderCategories, saveCategory } from '@/storage';
import { getCategories } from '@/lib/seed';
import { CategoryModal, categoryIcons } from '@/components/CategoryModal';
import { useCurrency } from '@/context/CurrencyContext';
import type { Category, Expense } from '@/types';
import { colors, radii, shadows, spacing, typography } from '@/theme';

export default function CategoriesScreen() {
  const { formatAmount } = useCurrency();
  const [categories, setCategories] = useState<Category[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useFocusEffect(useCallback(() => {
    let active = true;
    async function load() {
      try {
        const [storedCategories, storedExpenses] = await Promise.all([getCategories(), getExpenses()]);
        if (active) { setCategories(storedCategories); setExpenses(storedExpenses); setError(null); }
      } catch {
        if (active) setError('Could not load your categories.');
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, []));

  const now = new Date();
  const monthExpenses = expenses.filter((expense) => {
    const date = new Date(expense.createdAt);
    return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
  });
  const totals = new Map<string, number>();
  monthExpenses.forEach((expense) => totals.set(expense.categoryId, (totals.get(expense.categoryId) ?? 0) + expense.amount));
  const monthTotal = monthExpenses.reduce((sum, expense) => sum + expense.amount, 0);

  const categoryIsEssential = new Map(categories.map((c) => [c.id, c.isEssential ?? false]));
  const essentialTotal = monthExpenses.reduce((sum, e) => sum + (categoryIsEssential.get(e.categoryId) ? e.amount : 0), 0);
  const discretionaryTotal = monthTotal - essentialTotal;
  const hasAnyEssentialCategory = categories.some((c) => c.isEssential);

  function openCreate() {
    setEditingCategory(null);
    setModalVisible(true);
  }

  function openEdit(category: Category) {
    setEditingCategory(category);
    setModalVisible(true);
  }

  async function handleSave(name: string, color: string, icon: string, isEssential: boolean) {
    if (editingCategory) {
      const updated: Category = { ...editingCategory, name, color, icon, isEssential };
      const refreshed = await saveCategory(updated);
      setCategories(refreshed);
    } else {
      const newCategory: Category = {
        id: `cat_${Date.now()}`,
        name,
        color,
        icon,
        isDefault: false,
        isEssential,
      };
      const refreshed = await saveCategory(newCategory);
      setCategories(refreshed);
    }
  }

  async function handleDelete(id: string) {
    setBusyId(id);
    try {
      const refreshed = await deleteCategory(id);
      setCategories(refreshed);
      setError(null);
    } catch {
      setError('Could not delete that category.');
    } finally {
      setBusyId(null);
    }
  }

  async function handleMove(index: number, direction: 'up' | 'down') {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === categories.length - 1) return;
    const swapWith = direction === 'up' ? index - 1 : index + 1;
    const reordered = [...categories];
    [reordered[index], reordered[swapWith]] = [reordered[swapWith], reordered[index]];
    setCategories(reordered);
    try {
      const refreshed = await reorderCategories(reordered);
      setCategories(refreshed);
    } catch {
      setError('Could not save the new order.');
    }
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.eyebrow}>Organize</Text>
          <Text style={styles.title}>Categories</Text>
        </View>
        <Pressable style={styles.addButton} onPress={openCreate} accessibilityLabel="Add category">
          <Plus color={colors.white} size={22} strokeWidth={2.5} />
        </Pressable>
      </View>

      <View style={styles.summaryCard}>
        <View>
          <Text style={styles.summaryLabel}>This month</Text>
          <Text style={styles.summaryValue}>{formatAmount(monthTotal)}</Text>
        </View>
        <CircleDot color={colors.secondary} size={30} strokeWidth={1.5} />
      </View>

      {hasAnyEssentialCategory && (
        <View style={styles.splitRow}>
          <View style={styles.splitPill}>
            <View style={[styles.splitDot, { backgroundColor: colors.warning }]} />
            <Text style={styles.splitLabel}>Essential</Text>
            <Text style={styles.splitValue}>{formatAmount(essentialTotal)}</Text>
          </View>
          <View style={styles.splitPill}>
            <View style={[styles.splitDot, { backgroundColor: colors.accent }]} />
            <Text style={styles.splitLabel}>Discretionary</Text>
            <Text style={styles.splitValue}>{formatAmount(discretionaryTotal)}</Text>
          </View>
        </View>
      )}

      <Text style={styles.sectionTitle}>Spending by category</Text>

      {error && <Text style={styles.errorText}>{error}</Text>}

      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={styles.loader} />
      ) : categories.length === 0 ? (
        <View style={styles.emptyCard}>
          <View style={styles.emptyIcon}><Tags color={colors.accent} size={22} strokeWidth={1.8} /></View>
          <View style={styles.emptyCopy}>
            <Text style={styles.emptyTitle}>No categories yet</Text>
            <Text style={styles.emptySubtitle}>Tap + to create your first category.</Text>
          </View>
        </View>
      ) : (
        categories.map((category, index) => {
          const total = totals.get(category.id) ?? 0;
          const percentage = monthTotal > 0 ? Math.min(100, (total / monthTotal) * 100) : 0;
          const Icon = categoryIcons[category.icon as keyof typeof categoryIcons] ?? Tags;
          return (
            <View key={category.id} style={styles.categoryCard}>
              <View style={[styles.categoryIcon, { backgroundColor: `${category.color}22` }]}>
                <Icon color={category.color} size={18} strokeWidth={2} />
              </View>
              <View style={styles.categoryCopy}>
                <View style={styles.categoryHeader}>
                  <View style={styles.categoryNameRow}>
                    <Text style={styles.categoryName}>{category.name}</Text>
                    {category.isEssential && (
                      <View style={styles.essentialBadge}>
                        <Text style={styles.essentialBadgeText}>Essential</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.categoryAmount}>{formatAmount(total)}</Text>
                </View>
                <View style={styles.track}>
                  <View style={[styles.fill, { backgroundColor: category.color, width: `${percentage}%` }]} />
                </View>
              </View>
              <View style={styles.actions}>
                <Pressable style={styles.actionIcon} onPress={() => handleMove(index, 'up')} disabled={index === 0} accessibilityLabel="Move up">
                  <ChevronUp color={index === 0 ? colors.border : colors.textDim} size={16} />
                </Pressable>
                <Pressable style={styles.actionIcon} onPress={() => handleMove(index, 'down')} disabled={index === categories.length - 1} accessibilityLabel="Move down">
                  <ChevronDown color={index === categories.length - 1 ? colors.border : colors.textDim} size={16} />
                </Pressable>
                <Pressable style={styles.actionIcon} onPress={() => openEdit(category)} accessibilityLabel="Edit category">
                  <Pencil color={colors.textDim} size={15} />
                </Pressable>
                <Pressable style={styles.actionIcon} onPress={() => handleDelete(category.id)} disabled={busyId === category.id} accessibilityLabel="Delete category">
                  {busyId === category.id
                    ? <ActivityIndicator color={colors.error} size={15} />
                    : <Trash2 color={colors.error} size={15} />}
                </Pressable>
              </View>
            </View>
          );
        })
      )}

      <CategoryModal
        visible={modalVisible}
        category={editingCategory}
        onClose={() => setModalVisible(false)}
        onSave={handleSave}
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
  addButton: { width: 44, height: 44, borderRadius: radii.pill, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  summaryCard: { backgroundColor: colors.surface, borderRadius: radii.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.xl, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', ...shadows.card },
  summaryLabel: { color: colors.textMuted, fontSize: typography.caption, fontFamily: 'Inter-Medium' },
  summaryValue: { color: colors.text, fontSize: 32, fontFamily: 'Inter-Bold', marginTop: spacing.xs },
  splitRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  splitPill: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radii.sm, borderWidth: 1, borderColor: colors.border, paddingVertical: spacing.sm, paddingHorizontal: spacing.md, gap: spacing.xs },
  splitDot: { width: 8, height: 8, borderRadius: radii.pill },
  splitLabel: { color: colors.textMuted, fontSize: typography.micro, fontFamily: 'Inter-Medium', flex: 1 },
  splitValue: { color: colors.text, fontSize: typography.caption, fontFamily: 'Inter-SemiBold' },
  sectionTitle: { color: colors.text, fontSize: typography.heading, fontFamily: 'Inter-SemiBold', marginBottom: spacing.sm },
  loader: { marginTop: spacing.lg },
  errorText: { color: colors.error, fontSize: typography.caption, fontFamily: 'Inter-Medium', marginBottom: spacing.sm },
  emptyCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radii.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border },
  emptyIcon: { width: 44, height: 44, borderRadius: radii.sm, backgroundColor: colors.surfaceRaised, alignItems: 'center', justifyContent: 'center', marginRight: spacing.sm },
  emptyCopy: { flex: 1 },
  emptyTitle: { color: colors.text, fontSize: typography.caption, fontFamily: 'Inter-SemiBold', marginBottom: 4 },
  emptySubtitle: { color: colors.textDim, fontSize: typography.micro, fontFamily: 'Inter-Regular' },
  categoryCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radii.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.sm },
  categoryIcon: { width: 42, height: 42, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center', marginRight: spacing.md },
  categoryCopy: { flex: 1 },
  categoryHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm },
  categoryNameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexShrink: 1 },
  categoryName: { color: colors.text, fontSize: typography.caption, fontFamily: 'Inter-SemiBold' },
  essentialBadge: { backgroundColor: `${colors.warning}22`, borderRadius: radii.pill, paddingHorizontal: spacing.xs, paddingVertical: 2 },
  essentialBadgeText: { color: colors.warning, fontSize: 10, fontFamily: 'Inter-SemiBold' },
  categoryAmount: { color: colors.textMuted, fontSize: typography.caption, fontFamily: 'Inter-Medium' },
  track: { height: 6, backgroundColor: colors.surfaceRaised, borderRadius: radii.pill, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radii.pill },
  actions: { flexDirection: 'column', alignItems: 'center', gap: 2, marginLeft: spacing.sm },
  actionIcon: { padding: 4 },
});
