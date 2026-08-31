import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { X } from 'lucide-react-native';
import type { RecurringBill, RepeatInterval } from '@/types';
import { colors, radii, spacing, typography } from '@/theme';

const intervals: { label: string; value: RepeatInterval }[] = [
  { label: 'Weekly', value: 'weekly' },
  { label: 'Monthly', value: 'monthly' },
  { label: 'Yearly', value: 'yearly' },
];

type BillModalProps = {
  visible: boolean;
  bill: RecurringBill | null;
  currencySymbol?: string;
  onClose: () => void;
  onSave: (name: string, amount: number, dueDate: string, repeatInterval: RepeatInterval) => Promise<void>;
};

export function BillModal({ visible, bill, currencySymbol = '$', onClose, onSave }: BillModalProps) {
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [interval, setInterval_] = useState<RepeatInterval>('monthly');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setName(bill?.name ?? '');
      setAmount(bill ? bill.amount.toString() : '');
      setDueDate(bill?.dueDate ?? new Date().toISOString().slice(0, 10));
      setInterval_(bill?.repeatInterval ?? 'monthly');
      setError(null);
      setSaving(false);
    }
  }, [visible, bill]);

  function close() {
    if (saving) return;
    onClose();
  }

  async function handleSave() {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Give your bill a name.');
      return;
    }
    const parsedAmount = Number.parseFloat(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError('Enter a valid amount.');
      return;
    }
    if (!dueDate) {
      setError('Pick a due date.');
      return;
    }
    setSaving(true);
    try {
      await onSave(trimmedName, Math.round(parsedAmount * 100) / 100, dueDate, interval);
      onClose();
    } catch {
      setSaving(false);
      setError('Could not save this bill. Try again.');
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={close} />
        <View style={styles.sheet}>
          <View style={styles.sheetHeader}>
            <View>
              <Text style={styles.sheetEyebrow}>{bill ? 'Edit' : 'New'}</Text>
              <Text style={styles.sheetTitle}>{bill ? 'Edit bill' : 'Add recurring bill'}</Text>
            </View>
            <Pressable style={styles.closeButton} onPress={close} accessibilityLabel="Close">
              <X color={colors.textMuted} size={20} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.sheetBody}>
            <Text style={styles.fieldLabel}>Name</Text>
            <TextInput
              value={name}
              onChangeText={(value: string) => { setName(value); setError(null); }}
              placeholder="e.g. Rent, Netflix, Phone"
              placeholderTextColor={colors.textDim}
              style={styles.textInput}
              accessibilityLabel="Bill name"
            />

            <Text style={styles.fieldLabel}>Amount</Text>
            <View style={styles.amountField}>
              <Text style={styles.currency}>{currencySymbol}</Text>
              <TextInput
                value={amount}
                onChangeText={(value: string) => { setAmount(value.replace(/[^0-9.]/g, '')); setError(null); }}
                placeholder="0.00"
                placeholderTextColor={colors.textDim}
                keyboardType="decimal-pad"
                style={styles.amountInput}
                accessibilityLabel="Bill amount"
              />
            </View>

            <Text style={styles.fieldLabel}>Due date</Text>
            <TextInput
              value={dueDate}
              onChangeText={(value: string) => { setDueDate(value); setError(null); }}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.textDim}
              style={styles.textInput}
              accessibilityLabel="Due date"
            />

            <Text style={styles.fieldLabel}>Repeats</Text>
            <View style={styles.intervalRow}>
              {intervals.map((opt) => {
                const selected = interval === opt.value;
                return (
                  <Pressable
                    key={opt.value}
                    onPress={() => setInterval_(opt.value)}
                    style={[styles.intervalButton, selected && styles.intervalSelected]}
                    accessibilityLabel={`Repeat ${opt.label}`}>
                    <Text style={[styles.intervalText, selected && styles.intervalTextSelected]}>
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {error && <Text style={styles.errorText}>{error}</Text>}
          </ScrollView>

          <Pressable
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={saving}
            accessibilityLabel="Save bill">
            <Text style={styles.saveButtonText}>{saving ? 'Saving…' : 'Save bill'}</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: '#00000099' },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: 32, borderTopRightRadius: 32, paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xl, borderTopWidth: 1, borderColor: colors.border, maxHeight: '85%' },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg },
  sheetEyebrow: { color: colors.primary, fontSize: typography.micro, fontFamily: 'Inter-SemiBold', textTransform: 'uppercase', letterSpacing: 1 },
  sheetTitle: { color: colors.text, fontSize: typography.title, fontFamily: 'Inter-SemiBold', marginTop: 4 },
  closeButton: { width: 40, height: 40, borderRadius: radii.pill, backgroundColor: colors.surfaceRaised, alignItems: 'center', justifyContent: 'center' },
  sheetBody: { paddingBottom: spacing.lg },
  fieldLabel: { color: colors.textMuted, fontSize: typography.caption, fontFamily: 'Inter-SemiBold', marginTop: spacing.md, marginBottom: spacing.sm },
  textInput: { backgroundColor: colors.surfaceRaised, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border, color: colors.text, fontSize: typography.body, fontFamily: 'Inter-Medium', paddingHorizontal: spacing.md, minHeight: 52 },
  amountField: { backgroundColor: colors.surfaceRaised, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, minHeight: 52 },
  currency: { color: colors.primary, fontSize: 22, fontFamily: 'Inter-SemiBold', marginRight: spacing.xs },
  amountInput: { color: colors.text, flex: 1, fontSize: typography.body, fontFamily: 'Inter-Medium', padding: 0 },
  intervalRow: { flexDirection: 'row', gap: spacing.sm },
  intervalButton: { flex: 1, paddingVertical: spacing.sm, borderRadius: radii.md, backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  intervalSelected: { backgroundColor: `${colors.primary}22`, borderColor: colors.primary },
  intervalText: { color: colors.textMuted, fontSize: typography.caption, fontFamily: 'Inter-Medium' },
  intervalTextSelected: { color: colors.primary, fontFamily: 'Inter-SemiBold' },
  errorText: { color: colors.error, fontSize: typography.caption, fontFamily: 'Inter-Medium', marginTop: spacing.sm },
  saveButton: { backgroundColor: colors.primary, borderRadius: radii.md, minHeight: 54, alignItems: 'center', justifyContent: 'center', marginTop: spacing.lg },
  saveButtonDisabled: { opacity: 0.6 },
  saveButtonText: { color: colors.white, fontSize: typography.body, fontFamily: 'Inter-SemiBold' },
});
