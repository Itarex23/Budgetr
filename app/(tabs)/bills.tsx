import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import {
  AlertCircle,
  CalendarClock,
  Check,
  Pencil,
  Plus,
  Receipt,
  Trash2,
} from 'lucide-react-native';
import { useFocusEffect } from 'expo-router';
import { deleteRecurringBill, getRecurringBills, markBillPaid, saveRecurringBill } from '@/storage';
import { BillModal } from '@/components/BillModal';
import { useCurrency } from '@/context/CurrencyContext';
import type { RecurringBill, RepeatInterval } from '@/types';
import { colors, radii, shadows, spacing, typography } from '@/theme';
import { daysUntil, formatBillDate, getOverdueBills, getUpcomingBills } from '@/lib/notifications';

export default function BillsScreen() {
  const { currencySymbol, formatAmount } = useCurrency();
  const [bills, setBills] = useState<RecurringBill[]>([]);
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingBill, setEditingBill] = useState<RecurringBill | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useFocusEffect(useCallback(() => {
    let active = true;
    async function load() {
      try {
        const stored = await getRecurringBills();
        if (active) { setBills(stored); setError(null); }
      } catch {
        if (active) setError('Could not load your bills.');
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, []));

  const upcoming = getUpcomingBills(bills);
  const overdue = getOverdueBills(bills);
  const totalMonthly = bills
    .filter((b) => b.repeatInterval === 'monthly')
    .reduce((sum, b) => sum + b.amount, 0);
  const totalYearly = bills
    .filter((b) => b.repeatInterval === 'yearly')
    .reduce((sum, b) => sum + b.amount, 0);

  function openCreate() {
    setEditingBill(null);
    setModalVisible(true);
  }

  function openEdit(bill: RecurringBill) {
    setEditingBill(bill);
    setModalVisible(true);
  }

  async function handleSave(name: string, amount: number, dueDate: string, repeatInterval: RepeatInterval) {
    if (editingBill) {
      const updated: RecurringBill = { ...editingBill, name, amount, dueDate, repeatInterval };
      const refreshed = await saveRecurringBill(updated);
      setBills(refreshed);
    } else {
      const newBill: RecurringBill = {
        id: `bill_${Date.now()}`,
        name,
        amount,
        dueDate,
        repeatInterval,
        reminderEnabled: true,
        lastPaidDate: null,
      };
      const refreshed = await saveRecurringBill(newBill);
      setBills(refreshed);
    }
  }

  async function handleDelete(id: string) {
    setBusyId(id);
    try {
      const refreshed = await deleteRecurringBill(id);
      setBills(refreshed);
      setError(null);
    } catch {
      setError('Could not delete that bill.');
    } finally {
      setBusyId(null);
    }
  }

  async function handlePaid(bill: RecurringBill) {
    setBusyId(bill.id);
    try {
      const refreshed = await markBillPaid(bill.id, bill);
      setBills(refreshed);
      setError(null);
    } catch {
      setError('Could not mark that bill as paid.');
    } finally {
      setBusyId(null);
    }
  }

  async function toggleReminder(bill: RecurringBill) {
    const updated = { ...bill, reminderEnabled: !bill.reminderEnabled };
    try {
      const refreshed = await saveRecurringBill(updated);
      setBills(refreshed);
    } catch {
      setError('Could not update that reminder.');
    }
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.eyebrow}>Scheduled</Text>
          <Text style={styles.title}>Recurring Bills</Text>
        </View>
        <Pressable style={styles.addButton} onPress={openCreate} accessibilityLabel="Add bill">
          <Plus color={colors.white} size={22} strokeWidth={2.5} />
        </Pressable>
      </View>

      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Monthly total</Text>
          <Text style={styles.summaryValue}>{formatAmount(totalMonthly)}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Yearly total</Text>
          <Text style={styles.summaryValue}>{formatAmount(totalYearly)}</Text>
        </View>
      </View>

      {error && <Text style={styles.errorText}>{error}</Text>}

      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={styles.loader} />
      ) : bills.length === 0 ? (
        <View style={styles.emptyCard}>
          <View style={styles.emptyIcon}><Receipt color={colors.accent} size={22} strokeWidth={1.8} /></View>
          <View style={styles.emptyCopy}>
            <Text style={styles.emptyTitle}>No recurring bills yet</Text>
            <Text style={styles.emptySubtitle}>Track rent, subscriptions, and other repeating payments.</Text>
          </View>
        </View>
      ) : (
        <>
          {overdue.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Overdue</Text>
              {overdue.map((bill) => (
                <BillCard
                  key={bill.id}
                  bill={bill}
                  overdue
                  busy={busyId === bill.id}
                  onEdit={() => openEdit(bill)}
                  onDelete={() => handleDelete(bill.id)}
                  onPaid={() => handlePaid(bill)}
                  onToggleReminder={() => toggleReminder(bill)}
                />
              ))}
            </>
          )}

          <Text style={styles.sectionTitle}>Upcoming</Text>
          {upcoming.length === 0 ? (
            <Text style={styles.emptyInline}>All caught up — nothing due soon.</Text>
          ) : (
            upcoming.map((bill) => (
              <BillCard
                key={bill.id}
                bill={bill}
                busy={busyId === bill.id}
                onEdit={() => openEdit(bill)}
                onDelete={() => handleDelete(bill.id)}
                onPaid={() => handlePaid(bill)}
                onToggleReminder={() => toggleReminder(bill)}
              />
            ))
          )}
        </>
      )}

      <BillModal
        visible={modalVisible}
        bill={editingBill}
        currencySymbol={currencySymbol}
        onClose={() => setModalVisible(false)}
        onSave={handleSave}
      />
    </ScrollView>
  );
}

type BillCardProps = {
  bill: RecurringBill;
  overdue?: boolean;
  busy: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onPaid: () => void;
  onToggleReminder: () => void;
};

function BillCard({ bill, overdue, busy, onEdit, onDelete, onPaid, onToggleReminder }: BillCardProps) {
  const { formatAmount } = useCurrency();
  const days = daysUntil(bill.dueDate);
  const intervalLabel = bill.repeatInterval.charAt(0).toUpperCase() + bill.repeatInterval.slice(1);

  return (
    <View style={[styles.billCard, overdue && styles.billCardOverdue]}>
      <View style={[styles.billIcon, { backgroundColor: overdue ? `${colors.error}22` : `${colors.primary}22` }]}>
        {overdue ? <AlertCircle color={colors.error} size={18} strokeWidth={2} /> : <CalendarClock color={colors.primary} size={18} strokeWidth={2} />}
      </View>
      <View style={styles.billCopy}>
        <Text style={styles.billName}>{bill.name}</Text>
        <Text style={styles.billMeta}>
          {formatBillDate(bill.dueDate)} · {intervalLabel}
          {overdue ? ` · ${Math.abs(days)} ${Math.abs(days) === 1 ? 'day' : 'days'} overdue` : days === 0 ? ' · Today' : ` · in ${days} ${days === 1 ? 'day' : 'days'}`}
        </Text>
      </View>
      <View style={styles.billRight}>
        <Text style={[styles.billAmount, overdue && styles.billAmountOverdue]}>{formatAmount(bill.amount)}</Text>
        <View style={styles.billActions}>
          <Pressable style={styles.billAction} onPress={onPaid} disabled={busy} accessibilityLabel="Mark as paid">
            {busy ? <ActivityIndicator color={colors.secondary} size={14} /> : <Check color={colors.secondary} size={16} />}
          </Pressable>
          <Pressable style={styles.billAction} onPress={onEdit} accessibilityLabel="Edit bill">
            <Pencil color={colors.textDim} size={15} />
          </Pressable>
          <Pressable style={styles.billAction} onPress={onDelete} disabled={busy} accessibilityLabel="Delete bill">
            {busy ? null : <Trash2 color={colors.error} size={15} />}
          </Pressable>
        </View>
        <View style={styles.reminderRow}>
          <Text style={styles.reminderLabel}>Reminder</Text>
          <Switch
            value={bill.reminderEnabled}
            onValueChange={onToggleReminder}
            trackColor={{ false: colors.surfaceMuted, true: colors.primary }}
            thumbColor={colors.white}
            style={styles.switch}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  container: { paddingHorizontal: spacing.lg, paddingTop: spacing.xl, paddingBottom: 120 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg },
  eyebrow: { color: colors.textMuted, fontSize: typography.caption, fontFamily: 'Inter-Medium', marginBottom: 4 },
  title: { color: colors.text, fontSize: typography.title, fontFamily: 'Inter-SemiBold' },
  addButton: { width: 44, height: 44, borderRadius: radii.pill, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  summaryRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xl },
  summaryCard: { flex: 1, backgroundColor: colors.surface, borderRadius: radii.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border, ...shadows.card },
  summaryLabel: { color: colors.textMuted, fontSize: typography.micro, fontFamily: 'Inter-Medium' },
  summaryValue: { color: colors.text, fontSize: 24, fontFamily: 'Inter-Bold', marginTop: spacing.xs },
  sectionTitle: { color: colors.text, fontSize: typography.heading, fontFamily: 'Inter-SemiBold', marginBottom: spacing.sm },
  loader: { marginTop: spacing.lg },
  errorText: { color: colors.error, fontSize: typography.caption, fontFamily: 'Inter-Medium', marginBottom: spacing.sm },
  emptyCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radii.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border },
  emptyIcon: { width: 44, height: 44, borderRadius: radii.sm, backgroundColor: colors.surfaceRaised, alignItems: 'center', justifyContent: 'center', marginRight: spacing.sm },
  emptyCopy: { flex: 1 },
  emptyTitle: { color: colors.text, fontSize: typography.caption, fontFamily: 'Inter-SemiBold', marginBottom: 4 },
  emptySubtitle: { color: colors.textDim, fontSize: typography.micro, fontFamily: 'Inter-Regular' },
  emptyInline: { color: colors.textDim, fontSize: typography.caption, fontFamily: 'Inter-Regular', paddingVertical: spacing.md },
  billCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radii.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.sm },
  billCardOverdue: { borderColor: `${colors.error}44` },
  billIcon: { width: 40, height: 40, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center', marginRight: spacing.md },
  billCopy: { flex: 1 },
  billName: { color: colors.text, fontSize: typography.caption, fontFamily: 'Inter-SemiBold', marginBottom: 4 },
  billMeta: { color: colors.textDim, fontSize: typography.micro, fontFamily: 'Inter-Regular' },
  billRight: { alignItems: 'flex-end' },
  billAmount: { color: colors.text, fontSize: typography.body, fontFamily: 'Inter-SemiBold', marginBottom: spacing.xs },
  billAmountOverdue: { color: colors.error },
  billActions: { flexDirection: 'row', gap: 4, marginBottom: spacing.xs },
  billAction: { padding: 4 },
  reminderRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  reminderLabel: { color: colors.textDim, fontSize: 9, fontFamily: 'Inter-Medium' },
  switch: { transform: [{ scale: 0.7 }] },
});
