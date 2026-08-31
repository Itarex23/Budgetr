import { useCallback, useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, View, Vibration } from 'react-native';
import { Delete, Lock, X } from 'lucide-react-native';
import { colors, radii, shadows, spacing, typography } from '@/theme';

export function hashPin(pin: string): string {
  let hash = 0;
  for (let i = 0; i < pin.length; i++) {
    hash = ((hash << 5) - hash) + pin.charCodeAt(i);
    hash |= 0;
  }
  return `h${hash}`;
}

type LockScreenProps = {
  pinHash: string | null;
  onUnlock: () => void;
};

export function LockScreen({ pinHash, onUnlock }: LockScreenProps) {
  const [entered, setEntered] = useState('');
  const [error, setError] = useState(false);

  const checkPin = useCallback((pin: string) => {
    if (pin.length < 4) return;
    if (hashPin(pin) === pinHash) {
      onUnlock();
    } else {
      setError(true);
      Vibration.vibrate(200);
      setTimeout(() => {
        setEntered('');
        setError(false);
      }, 600);
    }
  }, [pinHash, onUnlock]);

  function pressDigit(digit: string) {
    if (error) return;
    const next = entered + digit;
    setEntered(next);
    if (next.length === 4) {
      setTimeout(() => checkPin(next), 100);
    }
  }

  function pressDelete() {
    if (error) return;
    setEntered((prev) => prev.slice(0, -1));
  }

  return (
    <View style={styles.screen}>
      <View style={styles.content}>
        <View style={styles.iconBadge}>
          <Lock color={colors.white} size={28} strokeWidth={2} />
        </View>
        <Text style={styles.title}>Enter your PIN</Text>
        <Text style={styles.subtitle}>Enter your 4-digit code to unlock</Text>

        <View style={styles.dotsRow}>
          {[0, 1, 2, 3].map((i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i < entered.length && styles.dotFilled,
                error && styles.dotError,
              ]}
            />
          ))}
        </View>

        {error && <Text style={styles.errorText}>Incorrect PIN. Try again.</Text>}

        <View style={styles.keypad}>
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <Pressable
              key={digit}
              style={styles.key}
              onPress={() => pressDigit(digit)}
              accessibilityLabel={`Digit ${digit}`}>
              <Text style={styles.keyText}>{digit}</Text>
            </Pressable>
          ))}
          <View style={styles.keyPlaceholder} />
          <Pressable style={styles.key} onPress={() => pressDigit('0')} accessibilityLabel="Digit 0">
            <Text style={styles.keyText}>0</Text>
          </Pressable>
          <Pressable style={styles.key} onPress={pressDelete} accessibilityLabel="Delete">
            <Delete color={colors.textMuted} size={24} strokeWidth={2} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

type PinSetupModalProps = {
  visible: boolean;
  onClose: () => void;
  onConfirm: (pin: string) => void;
};

export function PinSetupModal({ visible, onClose, onConfirm }: PinSetupModalProps) {
  const [entered, setEntered] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [step, setStep] = useState<'enter' | 'confirm'>('enter');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setEntered('');
      setConfirmPin('');
      setStep('enter');
      setError(null);
    }
  }, [visible]);

  function pressDigit(digit: string) {
    if (step === 'enter' && entered.length < 4) {
      const next = entered + digit;
      setEntered(next);
      if (next.length === 4) {
        setStep('confirm');
      }
    } else if (step === 'confirm' && confirmPin.length < 4) {
      const next = confirmPin + digit;
      setConfirmPin(next);
      if (next.length === 4) {
        if (next === entered) {
          onConfirm(next);
        } else {
          setError('PINs do not match. Start over.');
          Vibration.vibrate(200);
          setTimeout(() => {
            setEntered('');
            setConfirmPin('');
            setStep('enter');
            setError(null);
          }, 800);
        }
      }
    }
  }

  function pressDelete() {
    if (step === 'enter') {
      setEntered((prev) => prev.slice(0, -1));
    } else {
      if (confirmPin.length > 0) {
        setConfirmPin((prev) => prev.slice(0, -1));
      } else {
        setStep('enter');
      }
    }
  }

  const displayPin = step === 'enter' ? entered : confirmPin;
  const stepLabel = step === 'enter' ? 'Create a 4-digit PIN' : 'Re-enter your PIN';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.sheetHeader}>
            <View>
              <Text style={styles.sheetEyebrow}>Security</Text>
              <Text style={styles.sheetTitle}>{stepLabel}</Text>
            </View>
            <Pressable style={styles.closeButton} onPress={onClose} accessibilityLabel="Close">
              <X color={colors.textMuted} size={20} />
            </Pressable>
          </View>

          <View style={styles.dotsRow}>
            {[0, 1, 2, 3].map((i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  i < displayPin.length && styles.dotFilled,
                  error && styles.dotError,
                ]}
              />
            ))}
          </View>

          {error && <Text style={styles.errorText}>{error}</Text>}

          <View style={styles.keypad}>
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
              <Pressable
                key={digit}
                style={styles.key}
                onPress={() => pressDigit(digit)}
                accessibilityLabel={`Digit ${digit}`}>
                <Text style={styles.keyText}>{digit}</Text>
              </Pressable>
            ))}
            <View style={styles.keyPlaceholder} />
            <Pressable style={styles.key} onPress={() => pressDigit('0')} accessibilityLabel="Digit 0">
              <Text style={styles.keyText}>0</Text>
            </Pressable>
            <Pressable style={styles.key} onPress={pressDelete} accessibilityLabel="Delete">
              <Delete color={colors.textMuted} size={24} strokeWidth={2} />
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' },
  content: { alignItems: 'center', width: '100%', maxWidth: 320 },
  iconBadge: { width: 64, height: 64, borderRadius: radii.lg, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.lg, ...shadows.card },
  title: { color: colors.text, fontSize: typography.title, fontFamily: 'Inter-SemiBold', marginBottom: spacing.xs },
  subtitle: { color: colors.textDim, fontSize: typography.caption, fontFamily: 'Inter-Regular', marginBottom: spacing.xl },
  dotsRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.lg, justifyContent: 'center' },
  dot: { width: 16, height: 16, borderRadius: radii.pill, borderWidth: 2, borderColor: colors.border },
  dotFilled: { backgroundColor: colors.primary, borderColor: colors.primary },
  dotError: { backgroundColor: colors.error, borderColor: colors.error },
  errorText: { color: colors.error, fontSize: typography.caption, fontFamily: 'Inter-Medium', marginBottom: spacing.md, textAlign: 'center' },
  keypad: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.sm },
  key: { width: 72, height: 72, borderRadius: radii.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  keyPlaceholder: { width: 72, height: 72 },
  keyText: { color: colors.text, fontSize: 28, fontFamily: 'Inter-SemiBold' },
  overlay: { flex: 1, justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: 32, borderTopRightRadius: 32, paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xl, borderTopWidth: 1, borderColor: colors.border },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg },
  sheetEyebrow: { color: colors.primary, fontSize: typography.micro, fontFamily: 'Inter-SemiBold', textTransform: 'uppercase', letterSpacing: 1 },
  sheetTitle: { color: colors.text, fontSize: typography.title, fontFamily: 'Inter-SemiBold', marginTop: 4 },
  closeButton: { width: 40, height: 40, borderRadius: radii.pill, backgroundColor: colors.surfaceRaised, alignItems: 'center', justifyContent: 'center' },
});
