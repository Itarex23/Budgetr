import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { X } from 'lucide-react-native';
import { categoryIcons } from '@/components/CategoryModal';
import type { Category, Expense } from '@/types';
import { colors, radii, spacing, typography } from '@/theme';

type AddExpenseModalProps = {
  visible: boolean;
  categories: Category[];
  currencySymbol?: string;
  editingExpense?: Expense | null;
  onClose: () => void;
  onSave: (amount: number, category: Category) => Promise<void>;
};

export function AddExpenseModal({ visible, categories, currencySymbol = '$', editingExpense = null, onClose, onSave }: AddExpenseModalProps) {
  const isEditing = editingExpense != null;
  const [amount, setAmount] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    if (editingExpense) {
      setAmount(String(editingExpense.amount));
      setSelectedCategoryId(editingExpense.categoryId);
    } else {
      setAmount('');
      setSelectedCategoryId(null);
    }
    setError(null);
    setSaving(false);
  }, [visible, editingExpense]);

  function reset() {
    setAmount('');
    setSelectedCategoryId(null);
    setError(null);
    setSaving(false);
  }

  function close() {
    if (saving) return;
    reset();
    onClose();
  }

  async function handleCategoryPress(category: Category) {
    const parsedAmount = Number.parseFloat(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError('Enter an amount before choosing a category.');
      return;
    }

    setSaving(true);
    try {
      await onSave(Math.round(parsedAmount * 100) / 100, category);
      reset();
      onClose();
    } catch {
      setSaving(false);
      setError(isEditing ? 'Could not save your changes. Try again.' : 'Could not save this expense. Try again.');
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
              <Text style={styles.sheetEyebrow}>{isEditing ? 'Edit entry' : 'Quick log'}</Text>
              <Text style={styles.sheetTitle}>{isEditing ? 'Edit expense' : 'Add expense'}</Text>
            </View>
            <Pressable style={styles.closeButton} onPress={close} accessibilityLabel="Close">
              <X color={colors.textMuted} size={20} />
            </Pressable>
          </View>

          <View style={styles.amountField}>
            <Text style={styles.currency}>{currencySymbol}</Text>
            <TextInput
              autoFocus
              value={amount}
              onChangeText={(value: string) => {
                setAmount(value.replace(/[^0-9.]/g, ''));
                setError(null);
              }}
              placeholder="0.00"
              placeholderTextColor={colors.textDim}
              keyboardType="decimal-pad"
              returnKeyType="done"
              style={styles.amountInput}
              accessibilityLabel="Expense amount"
            />
          </View>

          <View style={styles.categoryHeader}>
            <Text style={styles.categoryTitle}>{isEditing ? 'Change category' : 'Choose a category'}</Text>
            <Text style={styles.categoryHint}>Tap to save</Text>
          </View>
          <View style={styles.categoryGrid}>
            {categories.map((category) => {
              const Icon = categoryIcons[category.icon as keyof typeof categoryIcons] ?? categoryIcons.CircleDot;
              const isSelected = isEditing && category.id === selectedCategoryId;
              return (
                <Pressable
                  key={category.id}
                  disabled={saving}
                  onPress={() => handleCategoryPress(category)}
                  style={({ pressed }) => [styles.categoryButton, (pressed || isSelected) && styles.categoryPressed]}>
                  <View style={[styles.categoryIcon, { backgroundColor: `${category.color}22` }]}>
                    <Icon color={category.color} size={20} strokeWidth={2} />
                  </View>
                  <Text style={styles.categoryName} numberOfLines={1}>{category.name}</Text>
                </Pressable>
              );
            })}
          </View>
          {error && <Text style={styles.errorText}>{error}</Text>}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: '#00000099' },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: 32, borderTopRightRadius: 32, paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xl, borderTopWidth: 1, borderColor: colors.border },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg },
  sheetEyebrow: { color: colors.primary, fontSize: typography.micro, fontFamily: 'Inter-SemiBold', textTransform: 'uppercase', letterSpacing: 1 },
  sheetTitle: { color: colors.text, fontSize: typography.title, fontFamily: 'Inter-SemiBold', marginTop: 4 },
  closeButton: { width: 40, height: 40, borderRadius: radii.pill, backgroundColor: colors.surfaceRaised, alignItems: 'center', justifyContent: 'center' },
  amountField: { backgroundColor: colors.surfaceRaised, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, minHeight: 72 },
  currency: { color: colors.primary, fontSize: 30, fontFamily: 'Inter-SemiBold', marginRight: spacing.xs },
  amountInput: { color: colors.text, flex: 1, fontSize: 32, fontFamily: 'Inter-SemiBold', padding: 0 },
  categoryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.lg, marginBottom: spacing.sm },
  categoryTitle: { color: colors.text, fontSize: typography.body, fontFamily: 'Inter-SemiBold' },
  categoryHint: { color: colors.textDim, fontSize: typography.micro, fontFamily: 'Inter-Medium' },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  categoryButton: { width: '23%', alignItems: 'center', paddingVertical: spacing.xs, borderRadius: radii.sm },
  categoryPressed: { backgroundColor: colors.surfaceRaised },
  categoryIcon: { width: 46, height: 46, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  categoryName: { color: colors.textMuted, fontSize: 10, fontFamily: 'Inter-Medium', textAlign: 'center' },
  errorText: { color: colors.error, fontSize: typography.caption, fontFamily: 'Inter-Medium', marginTop: spacing.sm },
});
