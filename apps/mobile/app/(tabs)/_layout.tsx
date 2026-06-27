import { type ColorValue, Platform, StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { Redirect, Tabs } from 'expo-router';
import { TabIcon, type TabName } from '@/components/TabIcon';
import { useTheme } from '@/theme/ThemeProvider';
import { useSession } from '@/state/session';
import { haptics } from '@/lib/haptics';

/** Floating blur tab bar background. */
function TabBarBackground() {
  const theme = useTheme();
  return (
    <View style={StyleSheet.absoluteFill}>
      <BlurView
        intensity={Platform.OS === 'ios' ? 40 : 24}
        tint="dark"
        style={StyleSheet.absoluteFill}
      />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.colors.bg + 'B0' }]} />
      <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: theme.colors.hairline }} />
    </View>
  );
}

export default function TabsLayout() {
  const theme = useTheme();
  const { status } = useSession();

  // Auth gate: nothing until the session resolves, then onboarding if signed out.
  if (status === 'loading') return null;
  if (status === 'signedOut') return <Redirect href="/onboarding" />;

  const makeIcon = (name: TabName) =>
    ({ color }: { color: ColorValue }) => <TabIcon name={name} color={color as string} />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.accent,
        tabBarInactiveTintColor: theme.colors.textFaint,
        tabBarStyle: {
          position: 'absolute',
          borderTopWidth: 0,
          backgroundColor: 'transparent',
          height: Platform.OS === 'ios' ? 86 : 68,
          paddingTop: 8,
          elevation: 0,
        },
        tabBarBackground: () => <TabBarBackground />,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700', marginTop: 2 },
      }}
      screenListeners={{ tabPress: () => haptics.select() }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: makeIcon('home') }} />
      <Tabs.Screen name="friends" options={{ title: 'Friends', tabBarIcon: makeIcon('friends') }} />
      <Tabs.Screen name="recap" options={{ title: 'Recap', tabBarIcon: makeIcon('recap') }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings', tabBarIcon: makeIcon('settings') }} />
    </Tabs>
  );
}
