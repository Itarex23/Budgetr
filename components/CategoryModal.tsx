import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  Car,
  CircleDot,
  Clapperboard,
  HeartPulse,
  ReceiptText,
  ShoppingBag,
  ShoppingCart,
  Tag,
  UtensilsCrossed,
  X,
} from 'lucide-react-native';
import type { Category } from '@/types';
import { colors, radii, spacing, typography } from '@/theme';

export const categoryIcons = {
  UtensilsCrossed,
  Car,
  ShoppingCart,
  ReceiptText,
  Clapperboard,
  HeartPulse,
  ShoppingBag,
  CircleDot,
} as const;

export const categoryIconNames = Object.keys(categoryIcons) as (keyof typeof categoryIcons)[];

const colorPalette = [
  '#FF7B8A',
  '#6FA8FF',
  '#63E6B3',
  '#FFD166',
  '#B084FF',
  '#FF9F6B',
  '#5DD4E0',
  '#A6ACCC',
  '#F57BF5',
  '#7CFC9F',
  '#FFB347',
  '#85C1FF',
];

type CategoryModalProps = {
  visible: boolean;
  category: Category | null;
  onClose: () => void;
  onSave: (name: string, color: string, icon: string, isEssential: boolean) => Promise<void>;
};

export function CategoryModal({ visible, category, onClose, onSave }: CategoryModalProps) {
  const [name, setName] = useState('');
  const [color, setColor] = useState(colorPalette[0]);
  const [icon, setIcon] = useState<keyof typeof categoryIcons>('CircleDot');
  const [isEssential, setIsEssential] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setName(category?.name ?? '');
      setColor(category?.color ?? colorPalette[0]);
      setIcon((category?.icon as keyof typeof categoryIcons) ?? 'CircleDot');
      setIsEssential(category?.isEssential ?? false);
      setError(null);
      setSaving(false);
    }
  }, [visible, category]);

  function close() {
    if (saving) return;
    onClose();
  }

  async function handleSave() {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Give your category a name.');
      return;
    }
    setSaving(true);
    try {
      await onSave(trimmed, color, icon, isEssential);
      onClose();
    } catch {
      setSaving(false);
      setError('Could not save this category. Try again.');
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
              <Text style={styles.sheetEyebrow}>{category ? 'Edit' : 'New'}</Text>
              <Text style={styles.sheetTitle}>{category ? 'Edit category' : 'New category'}</Text>
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
              placeholder="e.g. Coffee, Rent, Gym"
              placeholderTextColor={colors.textDim}
              style={styles.textInput}
              accessibilityLabel="Category name"
            />

            <Text style={styles.fieldLabel}>Color</Text>
            <View style={styles.colorGrid}>
              {colorPalette.map((swatch) => (
                <Pressable
                  key={swatch}
                  onPress={() => setColor(swatch)}
                  style={[
                    styles.colorSwatch,
                    { backgroundColor: swatch },
                    color === swatch && styles.colorSwatchSelected,
                  ]}
                  accessibilityLabel={`Color ${swatch}`}
                />
              ))}
            </View>

            <Text style={styles.fieldLabel}>Icon</Text>
            <View style={styles.iconGrid}>
              {categoryIconNames.map((iconName) => {
                const Icon = categoryIcons[iconName];
                const selected = icon === iconName;
                return (
                  <Pressable
                    key={iconName}
                    onPress={() => setIcon(iconName)}
                    style={[
                      styles.iconButton,
                      { backgroundColor: selected ? `${color}22` : colors.surfaceRaised },
                      selected && { borderColor: color },
                    ]}
                    accessibilityLabel={`Icon ${iconName}`}>
                    <Icon color={selected ? color : colors.textMuted} size={20} strokeWidth={2} />
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.essentialRow}>
              <View style={styles.essentialCopy}>
                <Text style={styles.fieldLabel}>Essential spending</Text>
                <Text style={styles.essentialHint}>Rent, transport, or anything you can't skip — helps separate must-spend from flexible spending.</Text>
              </View>
              <Switch
                value={isEssential}
                onValueChange={setIsEssential}
                trackColor={{ false: colors.surfaceMuted, true: colors.primary }}
                thumbColor={colors.white}
              />
            </View>

            {error && <Text style={styles.errorText}>{error}</Text>}
          </ScrollView>

          <Pressable
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={saving}
            accessibilityLabel="Save category">
            <Text style={styles.saveButtonText}>{saving ? 'Saving…' : 'Save category'}</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export { colorPalette };

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: '#00000099' },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: 32, borderTopRightRadius: 32, paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xl, borderTopWidth: 1, borderColor: colors.border, maxHeight: '85%' },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg },
  sheetEyebrow: { color: colors.primary, fontSize: typography.micro, fontFamily: 'Inter-SemiBold', textTransform: 'uppercase', letterSpacing: 1 },
  sheetTitle: { color: colors.text, fontSize: typography.title, fontFamily: 'Inter-SemiBold', marginTop: 4 },
  closeButton: { width: 40, height: 40, borderRadius: radii.pill, backgroundColor: colors.surfaceRaised, alignItems: 'center', justifyContent: 'center' },
  sheetBody: { paddingBottom: spacing.lg },
  fieldLabel: { color: colors.textMuted, fontSize: typography.caption, fontFamily: 'Inter-SemiBold', marginTop: spacing.md, marginBottom: spacing.sm },
  textInput: { backgroundColor: colors.surfaceRaised, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border, color: colors.text, fontSize: typography.body, fontFamily: 'Inter-Medium', paddingHorizontal: spacing.md, minHeight: 52 },
  colorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  colorSwatch: { width: 40, height: 40, borderRadius: radii.pill, borderWidth: 2, borderColor: 'transparent' },
  colorSwatchSelected: { borderColor: colors.white, borderWidth: 3 },
  iconGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  iconButton: { width: 52, height: 52, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'transparent' },
  essentialRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.lg, gap: spacing.sm },
  essentialCopy: { flex: 1 },
  essentialHint: { color: colors.textDim, fontSize: typography.micro, fontFamily: 'Inter-Regular', marginTop: 2 },
  errorText: { color: colors.error, fontSize: typography.caption, fontFamily: 'Inter-Medium', marginTop: spacing.sm },
  saveButton: { backgroundColor: colors.primary, borderRadius: radii.md, minHeight: 54, alignItems: 'center', justifyContent: 'center', marginTop: spacing.lg },
  saveButtonDisabled: { opacity: 0.6 },
  saveButtonText: { color: colors.white, fontSize: typography.body, fontFamily: 'Inter-SemiBold' },
});
