import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import * as SplashScreen from 'expo-splash-screen';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { useReminderScheduler } from '@/hooks/useReminderScheduler';
import { useLockGate } from '@/hooks/useLockGate';
import { LockScreen } from '@/components/LockScreen';
import { CurrencyProvider } from '@/context/CurrencyContext';
import { colors } from '@/theme';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useFrameworkReady();
  useReminderScheduler();
  const { isLocked, pinHash, isReady, unlock } = useLockGate();

  const [fontsLoaded, fontError] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-Medium': Inter_500Medium,
    'Inter-SemiBold': Inter_600SemiBold,
    'Inter-Bold': Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  if (isReady && isLocked && pinHash) {
    return (
      <>
        <LockScreen pinHash={pinHash} onUnlock={unlock} />
        <StatusBar style="light" />
      </>
    );
  }

  return (
    <CurrencyProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="light" />
    </CurrencyProvider>
  );
}
