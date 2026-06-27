import { useState } from 'react';
import { Alert, Pressable, Switch, View } from 'react-native';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Screen, Card, Row, Spacer, ThemedText } from '@/components/ui';
import { AuroraBackground } from '@/components/AuroraBackground';
import { NotAffiliated } from '@/components/Brand';
import { useTheme, useThemeContext } from '@/theme/ThemeProvider';
import { AURORA_GRADIENT, TEXT_SCALE_RANGE } from '@/theme/tokens';
import { useSession } from '@/state/session';
import { usePro } from '@/state/pro';
import { haptics } from '@/lib/haptics';

export default function Settings() {
  const theme = useTheme();
  const { prefs, setReduceMotion, setHighContrast, setTextScale } = useThemeContext();
  const { connectedPlatforms, disconnect } = useSession();
  const { isPro } = usePro();
  const [busy, setBusy] = useState(false);

  const confirmDisconnect = () => {
    Alert.alert(
      'Disconnect & delete everything?',
      'This deletes your stored tokens and all your cached stats from PSN Wrapped. You can reconnect anytime.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: async () => {
            setBusy(true);
            haptics.warning();
            await disconnect();
            // The tabs auth-gate redirects to onboarding once signed out.
          },
        },
      ],
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      <AuroraBackground intensity={0.4} />
      <Screen scroll tabBarInset>
        <ThemedText variant="title">Settings</ThemedText>
        <Spacer size={20} />

        {/* Membership */}
        <SectionLabel text="MEMBERSHIP" />
        {isPro ? (
          <Card>
            <Row style={{ justifyContent: 'space-between' }}>
              <ThemedText variant="bodyStrong">PSN Wrapped Pro</ThemedText>
              <View style={{ backgroundColor: theme.colors.accentAlt + '22', borderRadius: theme.radius.pill, paddingHorizontal: 12, paddingVertical: 4 }}>
                <ThemedText variant="label" color={theme.colors.accentAlt}>ACTIVE</ThemedText>
              </View>
            </Row>
            <Spacer size={6} />
            <ThemedText variant="caption" color={theme.colors.textMuted}>
              Clean exports, full history, premium themes, and the deep AI tier are unlocked. Gift Pro to friends from the Friends tab.
            </ThemedText>
          </Card>
        ) : (
          <Pressable onPress={() => { haptics.tap(); router.push('/paywall'); }} accessibilityRole="button">
            <LinearGradient colors={AURORA_GRADIENT as unknown as [string, string, string]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: theme.radius.lg, padding: 2 }}>
              <View style={{ backgroundColor: theme.colors.bg, borderRadius: theme.radius.lg - 2, padding: theme.spacing.lg }}>
                <ThemedText variant="bodyStrong">Go Pro ✨</ThemedText>
                <Spacer size={4} />
                <ThemedText variant="caption" color={theme.colors.textMuted}>
                  Clean exports, full history, deeper analytics, and the deep AI tier.
                </ThemedText>
              </View>
            </LinearGradient>
          </Pressable>
        )}

        <Spacer size={24} />

        {/* Accessibility */}
        <SectionLabel text="ACCESSIBILITY" />
        <Card padded={false}>
          <ToggleRow
            label="Reduce motion"
            hint="Calms animations and the aurora drift."
            value={prefs.reduceMotion}
            onValueChange={setReduceMotion}
          />
          <Divider />
          <ToggleRow
            label="High contrast"
            hint="Brighter text and stronger separators."
            value={prefs.highContrast}
            onValueChange={setHighContrast}
          />
          <Divider />
          <View style={{ padding: theme.spacing.lg, gap: theme.spacing.md }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <View style={{ flex: 1 }}>
                <ThemedText variant="body">Text size</ThemedText>
                <ThemedText variant="caption" color={theme.colors.textMuted}>
                  {Math.round(prefs.textScale * 100)}%
                </ThemedText>
              </View>
              <Row style={{ gap: theme.spacing.sm }}>
                <Stepper label="A−" onPress={() => setTextScale(prefs.textScale - TEXT_SCALE_RANGE.step)} disabled={prefs.textScale <= TEXT_SCALE_RANGE.min} />
                <Stepper label="A＋" onPress={() => setTextScale(prefs.textScale + TEXT_SCALE_RANGE.step)} disabled={prefs.textScale >= TEXT_SCALE_RANGE.max} />
              </Row>
            </Row>
            <View style={{ backgroundColor: theme.colors.surfaceAlt, borderRadius: theme.radius.md, padding: theme.spacing.md }}>
              <ThemedText variant="body">The quick brown fox earned a platinum.</ThemedText>
            </View>
          </View>
        </Card>

        <Spacer size={24} />

        {/* Account */}
        <SectionLabel text="ACCOUNT" />
        <Card padded={false}>
          <View style={{ padding: theme.spacing.lg }}>
            <ThemedText variant="caption" color={theme.colors.textMuted}>
              CONNECTED
            </ThemedText>
            <Spacer size={6} />
            <ThemedText variant="body">
              {connectedPlatforms.includes('psn') ? 'PlayStation Network' : 'No platform connected'}
            </ThemedText>
          </View>
          <Divider />
          <Pressable
            onPress={confirmDisconnect}
            disabled={busy}
            style={{ padding: theme.spacing.lg }}
            accessibilityRole="button"
          >
            <ThemedText variant="bodyStrong" color={theme.colors.danger}>
              {busy ? 'Disconnecting…' : 'Disconnect & delete everything'}
            </ThemedText>
            <Spacer size={4} />
            <ThemedText variant="caption" color={theme.colors.textMuted}>
              Wipes your tokens and cached stats from PSN Wrapped.
            </ThemedText>
          </Pressable>
        </Card>

        <Spacer size={24} />

        {/* About */}
        <SectionLabel text="ABOUT" />
        <Card>
          <ThemedText variant="caption" color={theme.colors.textMuted}>
            We never store your PlayStation password or your raw session token. We keep only the
            derived stats you see in the app — deleted instantly when you disconnect.
          </ThemedText>
          <Spacer size={14} />
          <NotAffiliated />
        </Card>

        <Spacer size={16} />
        <ThemedText variant="caption" color={theme.colors.textFaint} center>
          PSN Wrapped v{Constants.expoConfig?.version ?? '0.1.0'}
        </ThemedText>
      </Screen>
    </View>
  );
}

function SectionLabel({ text }: { text: string }) {
  const theme = useTheme();
  return (
    <>
      <ThemedText variant="label" color={theme.colors.textFaint}>
        {text}
      </ThemedText>
      <Spacer size={10} />
    </>
  );
}

function Divider() {
  const theme = useTheme();
  return <View style={{ height: 1, backgroundColor: theme.colors.hairline, marginLeft: theme.spacing.lg }} />;
}

function ToggleRow({
  label,
  hint,
  value,
  onValueChange,
}: {
  label: string;
  hint: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
}) {
  const theme = useTheme();
  return (
    <Row style={{ justifyContent: 'space-between', padding: theme.spacing.lg, gap: theme.spacing.md }}>
      <View style={{ flex: 1 }}>
        <ThemedText variant="body">{label}</ThemedText>
        <ThemedText variant="caption" color={theme.colors.textMuted}>
          {hint}
        </ThemedText>
      </View>
      <Switch
        value={value}
        onValueChange={(v) => {
          haptics.select();
          onValueChange(v);
        }}
        trackColor={{ false: theme.colors.surfaceAlt, true: theme.colors.accent }}
        thumbColor="#FFFFFF"
        ios_backgroundColor={theme.colors.surfaceAlt}
      />
    </Row>
  );
}

function Stepper({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={() => {
        haptics.select();
        onPress();
      }}
      disabled={disabled}
      style={{
        width: 48,
        height: 44,
        borderRadius: theme.radius.md,
        backgroundColor: theme.colors.surfaceAlt,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: disabled ? 0.4 : 1,
      }}
      accessibilityRole="button"
      accessibilityLabel={label === 'A−' ? 'Decrease text size' : 'Increase text size'}
    >
      <ThemedText variant="bodyStrong">{label}</ThemedText>
    </Pressable>
  );
}
