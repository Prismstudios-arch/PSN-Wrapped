import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { AuroraBackground } from '@/components/AuroraBackground';
import { Button } from '@/components/Button';
import { Card, Row, Spacer, ThemedText } from '@/components/ui';
import { NotAffiliated } from '@/components/Brand';
import { useTheme } from '@/theme/ThemeProvider';
import { useSession } from '@/state/session';
import { ApiError } from '@/lib/api';
import { haptics } from '@/lib/haptics';

const SSO_URL = 'https://ca.account.sony.com/api/v1/ssocookie';
const SIGNIN_URL = 'https://www.playstation.com';

export default function Connect() {
  const theme = useTheme();
  const { connect } = useSession();
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmed = token.trim();
  const canSubmit = trimmed.length >= 8 && !busy;

  const onConnect = async () => {
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    try {
      await connect('psn', trimmed);
      haptics.success();
      router.replace('/');
    } catch (err) {
      haptics.error();
      const message =
        err instanceof ApiError
          ? err.message
          : 'Could not reach PSN Wrapped. Check your connection and try again.';
      setError(message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      <AuroraBackground intensity={0.7} />
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <Row style={{ justifyContent: 'space-between', paddingHorizontal: theme.spacing.xl, paddingTop: theme.spacing.sm }}>
            <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole="button" accessibilityLabel="Back">
              <ThemedText variant="label" color={theme.colors.textMuted}>
                ‹ Back
              </ThemedText>
            </Pressable>
          </Row>

          <ScrollView
            contentContainerStyle={{ padding: theme.spacing.xl, gap: theme.spacing.lg }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View>
              <ThemedText variant="kicker" color={theme.colors.accentAlt}>
                PLAYSTATION NETWORK
              </ThemedText>
              <Spacer size={6} />
              <ThemedText variant="title">Connect your account</ThemedText>
              <Spacer size={6} />
              <ThemedText variant="body" color={theme.colors.textMuted}>
                We never see your password. You paste a one-time session token that you generate
                yourself — and we never store it.
              </ThemedText>
            </View>

            {/* Step-by-step */}
            <Card>
              <ThemedText variant="label" color={theme.colors.textMuted}>
                HOW TO GET YOUR TOKEN
              </ThemedText>
              <Spacer size={12} />
              <Step n={1} text="Sign in to PlayStation in your browser." action="Open PlayStation" onPress={() => Linking.openURL(SIGNIN_URL)} />
              <Step n={2} text="In the same browser, open the token page below." action="Open token page" onPress={() => Linking.openURL(SSO_URL)} />
              <Step
                n={3}
                text="Copy the long value after “npsso” and paste it here."
                last
              />
            </Card>

            {/* Input */}
            <View>
              <TextInput
                value={token}
                onChangeText={(t) => {
                  setToken(t);
                  if (error) setError(null);
                }}
                placeholder="Paste your npsso token"
                placeholderTextColor={theme.colors.textFaint}
                autoCapitalize="none"
                autoCorrect={false}
                secureTextEntry
                multiline
                editable={!busy}
                style={{
                  minHeight: 56,
                  backgroundColor: theme.colors.surface,
                  borderRadius: theme.radius.md,
                  borderWidth: 1,
                  borderColor: error ? theme.colors.danger : theme.colors.border,
                  color: theme.colors.text,
                  paddingHorizontal: theme.spacing.lg,
                  paddingVertical: theme.spacing.md,
                  fontSize: theme.fontSize(15),
                }}
              />
              {error ? (
                <>
                  <Spacer size={8} />
                  <ThemedText variant="caption" color={theme.colors.danger}>
                    {error}
                  </ThemedText>
                </>
              ) : null}
            </View>

            <Button label="Connect PlayStation Network" onPress={onConnect} disabled={!canSubmit} loading={busy} hapticStyle="success" />

            {/* Transparency disclosure */}
            <Card tone="surfaceAlt">
              <ThemedText variant="label" color={theme.colors.accentAlt}>
                EXACTLY WHAT WE DO
              </ThemedText>
              <Spacer size={10} />
              <Bullet text="Read-only: your games, playtime, and trophies. Nothing else." />
              <Bullet text="Your token is used once on our server, then discarded — never stored." />
              <Bullet text="We keep only your derived stats, and you can wipe everything in one tap." />
            </Card>

            <NotAffiliated />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

function Step({
  n,
  text,
  action,
  onPress,
  last,
}: {
  n: number;
  text: string;
  action?: string;
  onPress?: () => void;
  last?: boolean;
}) {
  const theme = useTheme();
  return (
    <Row style={{ alignItems: 'flex-start', gap: theme.spacing.md, marginBottom: last ? 0 : theme.spacing.md }}>
      <View
        style={{
          width: 26,
          height: 26,
          borderRadius: 13,
          backgroundColor: theme.colors.accent + '22',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <ThemedText variant="label" color={theme.colors.accent}>
          {n}
        </ThemedText>
      </View>
      <View style={{ flex: 1, gap: 6 }}>
        <ThemedText variant="body">{text}</ThemedText>
        {action && onPress ? (
          <Pressable onPress={onPress} hitSlop={8} accessibilityRole="link">
            <ThemedText variant="label" color={theme.colors.accentAlt}>
              {action} ↗
            </ThemedText>
          </Pressable>
        ) : null}
      </View>
    </Row>
  );
}

function Bullet({ text }: { text: string }) {
  const theme = useTheme();
  return (
    <Row style={{ alignItems: 'flex-start', gap: theme.spacing.sm, marginBottom: theme.spacing.sm }}>
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: theme.colors.accentAlt, marginTop: 8 }} />
      <ThemedText variant="body" color={theme.colors.textMuted} style={{ flex: 1 }}>
        {text}
      </ThemedText>
    </Row>
  );
}
