import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { X } from 'lucide-react-native';
import type { Budget } from '@/types';
import { colors, radii, spacing, typography } from '@/theme';

type BudgetModalProps = {
  visible: boolean;
  budget: Budget;
  currencySymbol?: string;
  onClose: () => void;
  onSave: (budget: Budget) => Promise<void>;
};

export function BudgetModal({ visible, budget, currencySymbol = '$', onClose, onSave }: BudgetModalProps) {
  const [amount, setAmount] = useState('');
  const [rollover, setRollover] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setAmount(budget.monthly > 0 ? budget.monthly.toFixed(2) : '');
    setRollover(budget.rollover);
    setError(null);
  }, [visible, budget]);

  async function handleSave() {
    const monthly = Number.parseFloat(amount);
    if (!Number.isFinite(monthly) || monthly <= 0) {
      setError('Enter a monthly amount greater than zero.');
      return;
    }
    setSaving(true);
    try {
      await onSave({ monthly: Math.round(monthly * 100) / 100, rollover, anchorDate: budget.anchorDate });
      onClose();
    } catch {
      setError('Could not save your budget. Try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View>
              <Text style={styles.eyebrow}>Monthly plan</Text>
              <Text style={styles.title}>Set your budget</Text>
            </View>
            <Pressable style={styles.closeButton} onPress={onClose} accessibilityLabel="Close">
              <X color={colors.textMuted} size={20} />
            </Pressable>
          </View>
          <View style={styles.amountField}>
            <Text style={styles.currency}>{currencySymbol}</Text>
            <TextInput
              autoFocus
              value={amount}
              onChangeText={(value: string) => { setAmount(value.replace(/[^0-9.]/g, '')); setError(null); }}
              placeholder="0.00"
              placeholderTextColor={colors.textDim}
              keyboardType="decimal-pad"
              style={styles.input}
              accessibilityLabel="Monthly budget amount"
            />
          </View>
          <View style={styles.optionRow}>
            <View style={styles.optionCopy}>
              <Text style={styles.optionTitle}>Carry over leftovers</Text>
              <Text style={styles.optionHint}>Add unused money to next month&apos;s available pool.</Text>
            </View>
            <Switch value={rollover} onValueChange={setRollover} trackColor={{ false: colors.surfaceMuted, true: colors.primary }} thumbColor={colors.text} />
          </View>
          {error && <Text style={styles.error}>{error}</Text>}
          <Pressable disabled={saving} style={({ pressed }) => [styles.saveButton, pressed && styles.pressed]} onPress={handleSave}>
            <Text style={styles.saveText}>{saving ? 'Saving…' : 'Save budget'}</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: '#00000099' },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: spacing.lg, paddingBottom: spacing.xl, borderTopWidth: 1, borderColor: colors.border },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg },
  eyebrow: { color: colors.primary, fontSize: typography.micro, fontFamily: 'Inter-SemiBold', textTransform: 'uppercase', letterSpacing: 1 },
  title: { color: colors.text, fontSize: typography.title, fontFamily: 'Inter-SemiBold', marginTop: 4 },
  closeButton: { width: 40, height: 40, borderRadius: radii.pill, backgroundColor: colors.surfaceRaised, alignItems: 'center', justifyContent: 'center' },
  amountField: { minHeight: 72, backgroundColor: colors.surfaceRaised, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md },
  currency: { color: colors.primary, fontSize: 30, fontFamily: 'Inter-SemiBold', marginRight: spacing.xs },
  input: { color: colors.text, flex: 1, fontSize: 32, fontFamily: 'Inter-SemiBold', padding: 0 },
  optionRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.border },
  optionCopy: { flex: 1, paddingRight: spacing.md },
  optionTitle: { color: colors.text, fontSize: typography.body, fontFamily: 'Inter-Medium' },
  optionHint: { color: colors.textDim, fontSize: typography.caption, fontFamily: 'Inter-Regular', marginTop: 4, lineHeight: 19 },
  error: { color: colors.error, fontSize: typography.caption, fontFamily: 'Inter-Medium', marginTop: spacing.sm },
  saveButton: { minHeight: 52, borderRadius: radii.md, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginTop: spacing.lg },
  pressed: { opacity: 0.82 },
  saveText: { color: colors.background, fontSize: typography.body, fontFamily: 'Inter-SemiBold' },
});
