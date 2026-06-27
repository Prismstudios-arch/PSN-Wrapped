import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Dimensions, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { AuroraBackground } from '@/components/AuroraBackground';
import { Button } from '@/components/Button';
import { Row, Spacer, ThemedText } from '@/components/ui';
import { ShareCard, type ShareFormat } from '@/components/ShareCard';
import { useStats } from '@/state/useStats';
import { useSession } from '@/state/session';
import { usePro } from '@/state/pro';
import { useTheme } from '@/theme/ThemeProvider';
import { api, type Persona } from '@/lib/api';
import { saveCardToPhotos, shareCard, ShareError } from '@/lib/share';
import { haptics } from '@/lib/haptics';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

export default function ShareScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { stats, loading } = useStats();
  const { token } = useSession();
  const { isPro } = usePro();
  const cardRef = useRef<View>(null);

  const [format, setFormat] = useState<ShareFormat>('story');
  const [persona, setPersona] = useState<Persona | null>(null);
  const [busy, setBusy] = useState<null | 'save' | 'share'>(null);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    let active = true;
    api.persona(token).then((r) => active && setPersona(r.persona)).catch(() => undefined);
    return () => {
      active = false;
    };
  }, [token]);

  if (loading && !stats) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={theme.colors.accent} />
      </View>
    );
  }
  if (!stats) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.bg, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16 }}>
        <ThemedText variant="headline" center>Sync your stats first to share.</ThemedText>
        <Button label="Close" variant="secondary" onPress={() => router.back()} />
      </View>
    );
  }

  // Size the card to fit the preview area at its natural aspect (no transform → crisp capture).
  const previewH = SCREEN_H - insets.top - insets.bottom - 250;
  const cardWidth =
    format === 'square'
      ? Math.min(SCREEN_W - 48, previewH)
      : Math.min(SCREEN_W - 80, Math.round((previewH * 9) / 16));

  const run = async (action: 'save' | 'share') => {
    setBusy(action);
    setNote(null);
    try {
      if (action === 'save') {
        await saveCardToPhotos(cardRef);
        haptics.success();
        setNote('Saved to your Photos ✓');
      } else {
        await shareCard(cardRef);
        haptics.success();
      }
    } catch (err) {
      haptics.error();
      setNote(err instanceof ShareError ? err.message : 'Something went wrong. Try again.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      <AuroraBackground intensity={0.4} />
      <View style={{ flex: 1, paddingTop: insets.top + 8, paddingBottom: insets.bottom + 16, paddingHorizontal: 20 }}>
        {/* Header */}
        <Row style={{ justifyContent: 'space-between' }}>
          <ThemedText variant="headline">Share your year</ThemedText>
          <Pressable onPress={() => router.back()} hitSlop={14} accessibilityRole="button" accessibilityLabel="Close">
            <ThemedText variant="headline" color={theme.colors.textMuted}>✕</ThemedText>
          </Pressable>
        </Row>

        {/* Format toggle */}
        <Spacer size={14} />
        <Row style={{ gap: 8, alignSelf: 'center', backgroundColor: theme.colors.surface, borderRadius: theme.radius.pill, padding: 4 }}>
          <FormatPill label="Story 9:16" active={format === 'story'} onPress={() => setFormat('story')} />
          <FormatPill label="Square 1:1" active={format === 'square'} onPress={() => setFormat('square')} />
        </Row>

        {/* Preview */}
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ShareCard ref={cardRef} stats={stats} persona={persona} format={format} width={cardWidth} pro={isPro} />
        </View>

        {!isPro ? (
          <Pressable onPress={() => router.push('/paywall')} style={{ alignSelf: 'center', marginBottom: 8 }}>
            <ThemedText variant="caption" color={theme.colors.accentPink}>✨ Remove the watermark with Pro</ThemedText>
          </Pressable>
        ) : null}

        {note ? (
          <ThemedText variant="caption" color={theme.colors.textMuted} center style={{ marginBottom: 10 }}>
            {note}
          </ThemedText>
        ) : null}

        {/* Actions */}
        <Row style={{ gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Button label="Save" variant="secondary" onPress={() => run('save')} loading={busy === 'save'} />
          </View>
          <View style={{ flex: 1 }}>
            <Button label="Share" onPress={() => run('share')} loading={busy === 'share'} hapticStyle="success" />
          </View>
        </Row>
      </View>
    </View>
  );
}

function FormatPill({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={() => {
        haptics.select();
        onPress();
      }}
      style={{
        paddingHorizontal: 18,
        paddingVertical: 8,
        borderRadius: theme.radius.pill,
        backgroundColor: active ? theme.colors.accent : 'transparent',
      }}
      accessibilityRole="button"
    >
      <ThemedText variant="label" color={active ? theme.colors.onAccent : theme.colors.textMuted}>
        {label}
      </ThemedText>
    </Pressable>
  );
}
