import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { AuroraBackground } from '@/components/AuroraBackground';
import { Button } from '@/components/Button';
import { Row, Spacer, ThemedText } from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';
import { usePro } from '@/state/pro';
import { ApiError } from '@/lib/api';
import { AURORA_GRADIENT } from '@/theme/tokens';
import { haptics } from '@/lib/haptics';

type Plan = 'lifetime' | 'season';

const PERKS = [
  'Clean exports — no watermark, highest resolution',
  'Your full multi-year history, not just this year',
  'Deeper analytics & premium recap themes',
  'The deep AI commentary tier',
  'Gift Pro to a friend',
];

export default function Paywall() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { isPro, activate } = usePro();
  const [plan, setPlan] = useState<Plan>('lifetime');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const onStart = async () => {
    setBusy(true);
    setNote(null);
    haptics.tap();
    try {
      await activate(plan);
      haptics.success();
      setNote('You’re Pro 🎉');
      setTimeout(() => router.back(), 700);
    } catch (err) {
      haptics.error();
      setNote(
        err instanceof ApiError && err.status === 501
          ? 'In-app purchases go live with the App Store launch.'
          : 'Couldn’t start Pro right now.',
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      <AuroraBackground intensity={0.7} />
      <View style={{ flex: 1, paddingTop: insets.top + 8, paddingBottom: insets.bottom + 16, paddingHorizontal: 22 }}>
        <Row style={{ justifyContent: 'flex-end' }}>
          <Pressable onPress={() => router.back()} hitSlop={14} accessibilityRole="button" accessibilityLabel="Close">
            <ThemedText variant="headline" color={theme.colors.textMuted}>✕</ThemedText>
          </Pressable>
        </Row>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: theme.spacing.lg, paddingBottom: 20 }}>
          <View>
            <ThemedText variant="kicker" color={theme.colors.accentPink}>CONSOLE WRAPPED</ThemedText>
            <Spacer size={4} />
            <ThemedText variant="display">Go Pro.</ThemedText>
            <Spacer size={6} />
            <ThemedText variant="body" color={theme.colors.textMuted}>
              Free is great — and stays free to share. Pro is for going deeper.
            </ThemedText>
          </View>

          {/* Perks */}
          <LinearGradient
            colors={AURORA_GRADIENT as unknown as [string, string, string]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ borderRadius: theme.radius.lg, padding: 2 }}
          >
            <View style={{ backgroundColor: theme.colors.bg, borderRadius: theme.radius.lg - 2, padding: 20, gap: 14 }}>
              {PERKS.map((p) => (
                <Row key={p} style={{ gap: 12, alignItems: 'flex-start' }}>
                  <ThemedText variant="bodyStrong" color={theme.colors.accentAlt}>✓</ThemedText>
                  <ThemedText variant="body" style={{ flex: 1 }}>{p}</ThemedText>
                </Row>
              ))}
            </View>
          </LinearGradient>

          {isPro ? (
            <View style={{ alignItems: 'center', gap: 12, paddingVertical: 10 }}>
              <ThemedText variant="title" center>You’re Pro 🎉</ThemedText>
              <Button label="Done" onPress={() => router.back()} />
            </View>
          ) : (
            <>
              {/* Plans */}
              <PlanRow
                selected={plan === 'lifetime'}
                onPress={() => { haptics.select(); setPlan('lifetime'); }}
                title="Lifetime"
                price="£24.99"
                sub="One-time. Yours forever."
                badge="BEST VALUE"
              />
              <PlanRow
                selected={plan === 'season'}
                onPress={() => { haptics.select(); setPlan('season'); }}
                title="This year’s recap"
                price="£4.99"
                sub="Unlock everything for a year."
              />

              {note ? (
                <ThemedText variant="caption" color={theme.colors.textMuted} center>{note}</ThemedText>
              ) : null}

              <Button label={`Start Pro — ${plan === 'lifetime' ? '£24.99' : '£4.99'}`} onPress={onStart} loading={busy} hapticStyle="success" />
              <ThemedText variant="caption" color={theme.colors.textFaint} center>
                Sharing is always free. Pro never gates the act of sharing — only depth & polish.
              </ThemedText>
            </>
          )}
        </ScrollView>
      </View>
    </View>
  );
}

function PlanRow({
  selected,
  onPress,
  title,
  price,
  sub,
  badge,
}: {
  selected: boolean;
  onPress: () => void;
  title: string;
  price: string;
  sub: string;
  badge?: string;
}) {
  const theme = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="button">
      <View
        style={{
          backgroundColor: theme.colors.surface,
          borderRadius: theme.radius.lg,
          borderWidth: 2,
          borderColor: selected ? theme.colors.accent : theme.colors.border,
          padding: theme.spacing.lg,
        }}
      >
        <Row style={{ justifyContent: 'space-between' }}>
          <Row style={{ gap: 8 }}>
            <ThemedText variant="headline">{title}</ThemedText>
            {badge ? (
              <View style={{ backgroundColor: theme.colors.accentPink + '22', borderRadius: theme.radius.pill, paddingHorizontal: 10, paddingVertical: 3, alignSelf: 'center' }}>
                <ThemedText variant="label" color={theme.colors.accentPink}>{badge}</ThemedText>
              </View>
            ) : null}
          </Row>
          <ThemedText variant="headline" color={theme.colors.accentAlt}>{price}</ThemedText>
        </Row>
        <Spacer size={4} />
        <ThemedText variant="caption" color={theme.colors.textMuted}>{sub}</ThemedText>
      </View>
    </Pressable>
  );
}
