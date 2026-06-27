import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { ThemeProvider, useThemeContext } from '@/theme/ThemeProvider';
import { SessionProvider, useSession } from '@/state/session';
import { ProProvider } from '@/state/pro';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <SessionProvider>
            <ProProvider>
              <RootNavigator />
            </ProProvider>
          </SessionProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function RootNavigator() {
  const { ready } = useThemeContext();
  const { status } = useSession();

  // Hide the native splash once theme prefs + session are resolved. The (tabs)
  // guard renders nothing until then, so the splash covers the cold start.
  useEffect(() => {
    if (ready && status !== 'loading') SplashScreen.hideAsync().catch(() => undefined);
  }, [ready, status]);

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#0B0B12' },
          animation: 'fade',
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="connect" options={{ presentation: 'card', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="story" options={{ presentation: 'fullScreenModal', animation: 'fade' }} />
        <Stack.Screen name="share" options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="battle" options={{ presentation: 'card', animation: 'slide_from_right' }} />
        <Stack.Screen name="paywall" options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }} />
      </Stack>
    </>
  );
}
