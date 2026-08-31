import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { Bell, ChevronRight, Clock, Coins, Download, Fingerprint, FileJson, FileSpreadsheet, Info, TrendingUp, WalletCards } from 'lucide-react-native';
import { useFocusEffect } from 'expo-router';
import { BudgetModal } from '@/components/BudgetModal';
import { PinSetupModal, hashPin } from '@/components/LockScreen';
import { getBudget, getCategories, getExpenses, getRecurringBills, getSettings, saveBudget, saveSettings } from '@/storage';
import { formatReminderTime, notificationsSupported, requestNotificationPermission } from '@/lib/notifications';
import { downloadFile, expensesToCsv, exportToJson, generateExportFilename } from '@/lib/export';
import { CURRENCIES, DEFAULT_CURRENCY_CODE, getCurrencySymbol } from '@/lib/currency';
import { useCurrency } from '@/context/CurrencyContext';
import type { Budget, Settings } from '@/types';
import { colors, radii, shadows, spacing, typography } from '@/theme';

const initialBudget: Budget = { monthly: 0, rollover: false, anchorDate: new Date().toISOString() };
const initialSettings: Settings = { currency: DEFAULT_CURRENCY_CODE, reminderEnabled: false, reminderHour: 20, reminderMinute: 0, appLockEnabled: false, pinHash: null, pacingMode: 'even' };

const PACING_OPTIONS: { value: Settings['pacingMode']; label: string }[] = [
  { value: 'even', label: 'Even' },
  { value: 'weekday', label: 'My pattern' },
  { value: 'front', label: 'Front-load' },
  { value: 'back', label: 'Back-load' },
];

const PACING_LABELS: Record<Settings['pacingMode'], string> = {
  even: 'Same amount every day',
  weekday: 'Weighted to your usual weekday spending',
  front: 'More early in the month, less later',
  back: 'Conservative early, more room later',
};

export default function SettingsScreen() {
  const { currencySymbol, formatAmount, refreshCurrency } = useCurrency();
  const [budget, setBudget] = useState(initialBudget);
  const [settings, setSettings] = useState(initialSettings);
  const [budgetModalVisible, setBudgetModalVisible] = useState(false);
  const [pinModalVisible, setPinModalVisible] = useState(false);
  const [exporting, setExporting] = useState(false);

  useFocusEffect(useCallback(() => {
    let active = true;
    async function load() {
      const [storedBudget, storedSettings] = await Promise.all([getBudget(), getSettings()]);
      if (active) { if (storedBudget) setBudget(storedBudget); if (storedSettings) setSettings({ ...initialSettings, ...storedSettings }); }
    }
    void load();
    return () => { active = false; };
  }, []));

  async function updateBudget(value: Budget) { await saveBudget(value); setBudget(value); }

  async function toggleReminder(value: boolean) {
    if (value && notificationsSupported()) {
      const granted = await requestNotificationPermission();
      if (!granted) {
        Alert.alert('Notifications blocked', 'Enable notifications in your browser settings to receive daily reminders.');
        return;
      }
    }
    const next = { ...settings, reminderEnabled: value };
    await saveSettings(next);
    setSettings(next);
  }

  async function changeReminderTime(hour: number, minute: number) {
    const next = { ...settings, reminderHour: hour, reminderMinute: minute };
    await saveSettings(next);
    setSettings(next);
  }

  async function changeCurrency(code: string) {
    const next = { ...settings, currency: code };
    await saveSettings(next);
    setSettings(next);
    await refreshCurrency();
  }

  async function changePacingMode(mode: Settings['pacingMode']) {
    const next = { ...settings, pacingMode: mode };
    await saveSettings(next);
    setSettings(next);
  }

  async function toggleAppLock(value: boolean) {
    if (value) {
      setPinModalVisible(true);
    } else {
      const next = { ...settings, appLockEnabled: false, pinHash: null };
      await saveSettings(next);
      setSettings(next);
    }
  }

  async function handlePinConfirm(pin: string) {
    const next = { ...settings, appLockEnabled: true, pinHash: hashPin(pin) };
    await saveSettings(next);
    setSettings(next);
    setPinModalVisible(false);
  }

  async function handleExportCsv() {
    setExporting(true);
    try {
      const [expenses, categories] = await Promise.all([getExpenses(), getCategories()]);
      const csv = expensesToCsv(expenses, categories);
      downloadFile(csv, generateExportFilename('csv'), 'text/csv');
    } catch {
      Alert.alert('Export failed', 'Could not export your data. Try again.');
    } finally {
      setExporting(false);
    }
  }

  async function handleExportJson() {
    setExporting(true);
    try {
      const [expenses, categories, bills] = await Promise.all([getExpenses(), getCategories(), getRecurringBills()]);
      const json = exportToJson({ expenses, categories, bills });
      downloadFile(json, generateExportFilename('json'), 'application/json');
    } catch {
      Alert.alert('Export failed', 'Could not export your data. Try again.');
    } finally {
      setExporting(false);
    }
  }

  const timeOptions = [
    { label: '6:00 PM', hour: 18, minute: 0 },
    { label: '7:00 PM', hour: 19, minute: 0 },
    { label: '8:00 PM', hour: 20, minute: 0 },
    { label: '9:00 PM', hour: 21, minute: 0 },
    { label: '10:00 PM', hour: 22, minute: 0 },
  ];

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.eyebrow}>Preferences</Text>
      <Text style={styles.title}>Settings</Text>
      <Text style={styles.subtitle}>Make Budgetr fit the way you manage your month.</Text>

      <View style={styles.group}>
        <Pressable style={styles.row} onPress={() => setBudgetModalVisible(true)}>
          <View style={styles.rowIcon}><WalletCards color={colors.primary} size={18} strokeWidth={2} /></View>
          <View style={styles.rowCopy}>
            <Text style={styles.rowTitle}>Monthly budget</Text>
            <Text style={styles.rowMeta}>{budget.monthly > 0 ? `${formatAmount(budget.monthly)} · ${budget.rollover ? 'rollover on' : 'rollover off'}` : 'Not set yet'}</Text>
          </View>
          <ChevronRight color={colors.textDim} size={18} />
        </Pressable>

        <View style={styles.row}>
          <View style={styles.rowIcon}><Bell color={colors.secondary} size={18} strokeWidth={2} /></View>
          <View style={styles.rowCopy}>
            <Text style={styles.rowTitle}>Daily reminder</Text>
            <Text style={styles.rowMeta}>{settings.reminderEnabled ? `Fires at ${formatReminderTime(settings.reminderHour, settings.reminderMinute)}` : 'A gentle evening nudge'}</Text>
          </View>
          <Switch value={settings.reminderEnabled} onValueChange={toggleReminder} trackColor={{ false: colors.surfaceMuted, true: colors.primary }} thumbColor={colors.white} />
        </View>

        {settings.reminderEnabled && (
          <View style={styles.subRow}>
            <View style={styles.rowIconSmall}><Clock color={colors.textDim} size={15} strokeWidth={2} /></View>
            <Text style={styles.subRowLabel}>Reminder time</Text>
            <View style={styles.timeOptions}>
              {timeOptions.map((opt) => {
                const selected = settings.reminderHour === opt.hour && settings.reminderMinute === opt.minute;
                return (
                  <Pressable
                    key={opt.label}
                    onPress={() => changeReminderTime(opt.hour, opt.minute)}
                    style={[styles.timeChip, selected && styles.timeChipSelected]}
                    accessibilityLabel={`Set reminder to ${opt.label}`}>
                    <Text style={[styles.timeChipText, selected && styles.timeChipTextSelected]}>{opt.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        <View style={styles.row}>
          <View style={styles.rowIcon}><Fingerprint color={colors.secondary} size={18} strokeWidth={2} /></View>
          <View style={styles.rowCopy}>
            <Text style={styles.rowTitle}>App lock</Text>
            <Text style={styles.rowMeta}>{settings.appLockEnabled ? 'PIN protection is on' : 'Require a PIN to open the app'}</Text>
          </View>
          <Switch value={settings.appLockEnabled} onValueChange={toggleAppLock} trackColor={{ false: colors.surfaceMuted, true: colors.primary }} thumbColor={colors.white} />
        </View>

        <View style={[styles.row, styles.rowLast]}>
          <View style={styles.rowIcon}><Coins color={colors.secondary} size={18} strokeWidth={2} /></View>
          <View style={styles.rowCopy}>
            <Text style={styles.rowTitle}>Currency</Text>
            <Text style={styles.rowMeta}>{CURRENCIES.find((c) => c.code === settings.currency)?.label ?? 'Nigerian Naira'}</Text>
          </View>
        </View>
        <View style={[styles.subRow, styles.subRowLast]}>
          <View style={styles.timeOptions}>
            {CURRENCIES.map((option) => {
              const selected = settings.currency === option.code;
              return (
                <Pressable
                  key={option.code}
                  onPress={() => changeCurrency(option.code)}
                  style={[styles.timeChip, selected && styles.timeChipSelected]}
                  accessibilityLabel={`Set currency to ${option.label}`}>
                  <Text style={[styles.timeChipText, selected && styles.timeChipTextSelected]}>{option.symbol} {option.code}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>

      <Text style={styles.sectionLabel}>Daily Pacing</Text>
      <View style={styles.group}>
        <View style={styles.row}>
          <View style={styles.rowIcon}><TrendingUp color={colors.secondary} size={18} strokeWidth={2} /></View>
          <View style={styles.rowCopy}>
            <Text style={styles.rowTitle}>How your daily number is spread</Text>
            <Text style={styles.rowMeta}>{PACING_LABELS[settings.pacingMode]}</Text>
          </View>
        </View>
        <View style={[styles.subRow, styles.subRowLast]}>
          <View style={styles.timeOptions}>
            {PACING_OPTIONS.map((option) => {
              const selected = settings.pacingMode === option.value;
              return (
                <Pressable
                  key={option.value}
                  onPress={() => changePacingMode(option.value)}
                  style={[styles.timeChip, selected && styles.timeChipSelected]}
                  accessibilityLabel={`Set pacing to ${option.label}`}>
                  <Text style={[styles.timeChipText, selected && styles.timeChipTextSelected]}>{option.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>

      <Text style={styles.sectionLabel}>Backup & Export</Text>
      <View style={styles.group}>
        <Pressable style={styles.row} onPress={handleExportCsv} disabled={exporting}>
          <View style={styles.rowIcon}><FileSpreadsheet color={colors.secondary} size={18} strokeWidth={2} /></View>
          <View style={styles.rowCopy}>
            <Text style={styles.rowTitle}>Export as CSV</Text>
            <Text style={styles.rowMeta}>Opens in Excel, Numbers, or any spreadsheet</Text>
          </View>
          <Download color={colors.textDim} size={18} />
        </Pressable>
        <Pressable style={[styles.row, styles.rowLast]} onPress={handleExportJson} disabled={exporting}>
          <View style={styles.rowIcon}><FileJson color={colors.secondary} size={18} strokeWidth={2} /></View>
          <View style={styles.rowCopy}>
            <Text style={styles.rowTitle}>Export as JSON</Text>
            <Text style={styles.rowMeta}>Full backup with categories and recurring bills</Text>
          </View>
          <Download color={colors.textDim} size={18} />
        </Pressable>
      </View>

      <Text style={styles.sectionLabel}>About</Text>
      <View style={styles.group}>
        <View style={[styles.row, styles.rowLast]}>
          <View style={styles.rowIcon}><Info color={colors.secondary} size={18} strokeWidth={2} /></View>
          <View style={styles.rowCopy}>
            <Text style={styles.rowTitle}>Budgetr</Text>
            <Text style={styles.rowMeta}>Version 1.0.0 · Built by Itarex</Text>
          </View>
        </View>
      </View>

      <BudgetModal visible={budgetModalVisible} budget={budget} currencySymbol={currencySymbol} onClose={() => setBudgetModalVisible(false)} onSave={updateBudget} />
      <PinSetupModal visible={pinModalVisible} onClose={() => setPinModalVisible(false)} onConfirm={handlePinConfirm} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  container: { paddingHorizontal: spacing.lg, paddingTop: spacing.xl, paddingBottom: 120 },
  eyebrow: { color: colors.textMuted, fontSize: typography.caption, fontFamily: 'Inter-Medium', marginBottom: 4 },
  title: { color: colors.text, fontSize: typography.title, fontFamily: 'Inter-SemiBold', marginBottom: spacing.sm },
  subtitle: { color: colors.textDim, fontSize: typography.body, fontFamily: 'Inter-Regular', lineHeight: 24 },
  sectionLabel: { color: colors.textMuted, fontSize: typography.caption, fontFamily: 'Inter-SemiBold', marginTop: spacing.xl, marginBottom: spacing.sm, marginLeft: spacing.xs },
  group: { backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', ...shadows.card },
  row: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  rowLast: { borderBottomWidth: 0 },
  rowIcon: { width: 36, height: 36, borderRadius: radii.sm, backgroundColor: colors.surfaceRaised, alignItems: 'center', justifyContent: 'center', marginRight: spacing.md },
  rowCopy: { flex: 1 },
  rowTitle: { color: colors.text, fontSize: typography.body, fontFamily: 'Inter-Medium' },
  rowMeta: { color: colors.textDim, fontSize: typography.micro, fontFamily: 'Inter-Regular', marginTop: 2 },
  subRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.background },
  subRowLast: { borderBottomWidth: 0 },
  rowIconSmall: { width: 28, height: 28, borderRadius: radii.sm, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', marginRight: spacing.sm },
  subRowLabel: { color: colors.textMuted, fontSize: typography.caption, fontFamily: 'Inter-Medium', marginRight: spacing.sm },
  timeOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, flex: 1 },
  timeChip: { paddingVertical: 6, paddingHorizontal: spacing.sm, borderRadius: radii.pill, backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.border },
  timeChipSelected: { backgroundColor: `${colors.primary}22`, borderColor: colors.primary },
  timeChipText: { color: colors.textMuted, fontSize: typography.micro, fontFamily: 'Inter-Medium' },
  timeChipTextSelected: { color: colors.primary, fontFamily: 'Inter-SemiBold' },
});
