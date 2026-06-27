import { useRef, useState } from 'react';
import {
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { AuroraBackground } from '@/components/AuroraBackground';
import { Button } from '@/components/Button';
import { Card, Row, Spacer, ThemedText } from '@/components/ui';
import { NotAffiliated, Wordmark } from '@/components/Brand';
import { CountUp, RarestTrophyCard, TopGamesList } from '@/components/recap';
import { DEMO_PERSONA, DEMO_RECAP } from '@/demo/demoRecap';
import { useTheme } from '@/theme/ThemeProvider';
import { AURORA_GRADIENT } from '@/theme/tokens';
import { formatHours } from '@/lib/format';
import { haptics } from '@/lib/haptics';

const { width } = Dimensions.get('window');
const SLIDE_COUNT = 4;

export default function Onboarding() {
  const theme = useTheme();
  const scrollRef = useRef<ScrollView>(null);
  const [index, setIndex] = useState(0);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / width);
    if (i !== index) {
      setIndex(i);
      haptics.select();
    }
  };

  const goConnect = () => router.push('/connect');
  const next = () => {
    if (index >= SLIDE_COUNT - 1) {
      goConnect();
      return;
    }
    scrollRef.current?.scrollTo({ x: (index + 1) * width, animated: true });
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      <AuroraBackground />
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        {/* Header */}
        <Row style={{ justifyContent: 'space-between', paddingHorizontal: theme.spacing.xl, paddingTop: theme.spacing.sm }}>
          <Wordmark size="sm" />
          <Pressable onPress={goConnect} hitSlop={12} accessibilityRole="button">
            <ThemedText variant="label" color={theme.colors.textMuted}>
              Connect
            </ThemedText>
          </Pressable>
        </Row>

        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={16}
          style={{ flex: 1 }}
        >
          <SampleSlide />
          <IntroSlide
            kicker="THE RECAP"
            title="Your year in games."
            body="Total hours, your top titles, and the rarest trophy you own — turned into a story worth sharing."
            motif="hours"
          />
          <IntroSlide
            kicker="YOUR PERSONA"
            title="Get crowned."
            body="PSN Wrapped reads your library and names your archetype — with optional AI commentary that’s all fun, never mean."
            motif="persona"
          />
          <IntroSlide
            kicker="THE FLEX"
            title="Built to share."
            body="Export a clean card or a 9:16 video in your own palette. Your recap, your flex."
            motif="share"
          />
        </ScrollView>

        {/* Footer: dots + CTA */}
        <View style={{ paddingHorizontal: theme.spacing.xl, gap: theme.spacing.lg }}>
          <Row style={{ justifyContent: 'center', gap: 8 }}>
            {Array.from({ length: SLIDE_COUNT }).map((_, i) => (
              <View
                key={i}
                style={{
                  width: i === index ? 22 : 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: i === index ? theme.colors.accent : theme.colors.surfaceAlt,
                }}
              />
            ))}
          </Row>
          <Button label={index >= SLIDE_COUNT - 1 ? 'Connect your account' : 'Next'} onPress={next} />
          <NotAffiliated />
        </View>
      </SafeAreaView>
    </View>
  );
}

function SlideWrap({ children }: { children: React.ReactNode }) {
  const theme = useTheme();
  return (
    <ScrollView
      style={{ width }}
      contentContainerStyle={{ paddingHorizontal: theme.spacing.xl, paddingVertical: theme.spacing.lg, gap: theme.spacing.lg }}
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  );
}

function SampleSlide() {
  const theme = useTheme();
  const r = DEMO_RECAP;
  return (
    <SlideWrap>
      <Row style={{ justifyContent: 'space-between' }}>
        <ThemedText variant="title">A sample recap</ThemedText>
        <View style={{ backgroundColor: theme.colors.gold + '22', borderRadius: theme.radius.pill, paddingHorizontal: 12, paddingVertical: 4 }}>
          <ThemedText variant="label" color={theme.colors.gold}>
            SAMPLE
          </ThemedText>
        </View>
      </Row>

      <Card tone="surface" style={{ overflow: 'hidden' }}>
        <ThemedText variant="kicker" color={theme.colors.textMuted}>
          PLAYED IN 2025
        </ThemedText>
        <Spacer size={6} />
        <Row style={{ alignItems: 'flex-end', gap: 8 }}>
          <CountUp value={r.totals.totalMinutes} format={formatHours} />
          <View style={{ paddingBottom: 8 }}>
            <ThemedText variant="headline" color={theme.colors.textMuted}>
              across {r.totals.gameCount} games
            </ThemedText>
          </View>
        </Row>
      </Card>

      <Card>
        <ThemedText variant="label" color={theme.colors.textMuted}>
          TOP GAMES
        </ThemedText>
        <Spacer size={12} />
        <TopGamesList items={r.topGames} max={4} />
      </Card>

      <RarestTrophyCard stats={r} />

      <LinearGradient
        colors={AURORA_GRADIENT as unknown as [string, string, string]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ borderRadius: theme.radius.lg, padding: 2 }}
      >
        <View style={{ backgroundColor: theme.colors.bg, borderRadius: theme.radius.lg - 2, padding: theme.spacing.lg }}>
          <ThemedText variant="label" color={theme.colors.accentPink}>
            YOUR PERSONA
          </ThemedText>
          <Spacer size={6} />
          <ThemedText variant="headline">{DEMO_PERSONA.title}</ThemedText>
          <Spacer size={4} />
          <ThemedText variant="body" color={theme.colors.textMuted}>
            {DEMO_PERSONA.blurb}
          </ThemedText>
        </View>
      </LinearGradient>

      <ThemedText variant="caption" color={theme.colors.textFaint} center>
        This is example data. Connect your account to make it yours.
      </ThemedText>
    </SlideWrap>
  );
}

function IntroSlide({
  kicker,
  title,
  body,
  motif,
}: {
  kicker: string;
  title: string;
  body: string;
  motif: 'hours' | 'persona' | 'share';
}) {
  const theme = useTheme();
  return (
    <View style={{ width, paddingHorizontal: theme.spacing.xl, justifyContent: 'center', gap: theme.spacing.lg }}>
      <MotifGraphic kind={motif} />
      <ThemedText variant="kicker" color={theme.colors.accentAlt}>
        {kicker}
      </ThemedText>
      <ThemedText variant="display">{title}</ThemedText>
      <ThemedText variant="body" color={theme.colors.textMuted}>
        {body}
      </ThemedText>
    </View>
  );
}

function MotifGraphic({ kind }: { kind: 'hours' | 'persona' | 'share' }) {
  const theme = useTheme();
  return (
    <LinearGradient
      colors={AURORA_GRADIENT as unknown as [string, string, string]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ height: 160, borderRadius: theme.radius.xl, alignItems: 'center', justifyContent: 'center', marginBottom: theme.spacing.sm }}
    >
      <View style={{ backgroundColor: theme.colors.bg + 'D0', borderRadius: theme.radius.lg, paddingHorizontal: 22, paddingVertical: 14 }}>
        <ThemedText variant="display" color="#FFFFFF">
          {kind === 'hours' ? '696h' : kind === 'persona' ? '★' : '9:16'}
        </ThemedText>
      </View>
    </LinearGradient>
  );
}
