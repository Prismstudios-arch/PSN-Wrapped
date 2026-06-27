import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import type { DerivedStats } from '@endcard/shared';
import { Button } from '@/components/Button';
import { Row, Spacer, ThemedText } from '@/components/ui';
import { Wordmark } from '@/components/Brand';
import { CountUp, gameGradient } from '@/components/recap';
import { Typewriter } from '@/components/Typewriter';
import { useStats } from '@/state/useStats';
import { useSession } from '@/state/session';
import { useTheme } from '@/theme/ThemeProvider';
import { AURORA_GRADIENT } from '@/theme/tokens';
import { api, ApiError, type Persona } from '@/lib/api';
import { formatHours, formatNumber, formatRarity } from '@/lib/format';
import { haptics } from '@/lib/haptics';

const { height: SCREEN_H, width: SCREEN_W } = Dimensions.get('window');

type CardKey = 'intro' | 'hours' | 'topgame' | 'persona' | 'ai' | 'rarest' | 'outro';

export default function Story() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { stats, loading } = useStats();
  const { token } = useSession();
  const scrollRef = useRef<ScrollView>(null);
  const [index, setIndex] = useState(0);

  const [persona, setPersona] = useState<Persona | null>(null);

  // Free persona on open (no LLM, no cost).
  useEffect(() => {
    if (!token) return;
    let active = true;
    api
      .persona(token)
      .then((r) => active && setPersona(r.persona))
      .catch(() => undefined);
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
        <ThemedText variant="headline" center>
          No recap yet — sync your stats first.
        </ThemedText>
        <Button label="Close" variant="secondary" onPress={() => router.back()} />
      </View>
    );
  }

  const cards: CardKey[] = ['intro', 'hours', 'topgame', 'persona', 'ai'];
  if (stats.rarestAchievement) cards.push('rarest');
  cards.push('outro');

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.round(e.nativeEvent.contentOffset.y / SCREEN_H);
    if (i !== index) {
      setIndex(i);
      haptics.select();
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      <ScrollView
        ref={scrollRef}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        decelerationRate="fast"
      >
        {cards.map((key, i) => (
          <StoryCard key={key}>
            {key === 'intro' && <IntroCard stats={stats} />}
            {key === 'hours' && <HoursCard stats={stats} active={index === i} />}
            {key === 'topgame' && <TopGameCard stats={stats} active={index === i} />}
            {key === 'persona' && <PersonaCard persona={persona} />}
            {key === 'ai' && <AiCard token={token} active={index === i} personaFallback={persona} />}
            {key === 'rarest' && <RarestCard stats={stats} />}
            {key === 'outro' && <OutroCard stats={stats} />}
          </StoryCard>
        ))}
      </ScrollView>

      {/* Progress segments */}
      <View style={{ position: 'absolute', top: insets.top + 8, left: 16, right: 16, flexDirection: 'row', gap: 4 }}>
        {cards.map((_, i) => (
          <View
            key={i}
            style={{
              flex: 1,
              height: 3,
              borderRadius: 2,
              backgroundColor: i <= index ? theme.colors.text : theme.colors.surfaceAlt,
              opacity: i <= index ? 0.95 : 0.5,
            }}
          />
        ))}
      </View>

      {/* Close */}
      <Pressable
        onPress={() => router.back()}
        hitSlop={14}
        style={{ position: 'absolute', top: insets.top + 18, right: 18 }}
        accessibilityRole="button"
        accessibilityLabel="Close recap"
      >
        <ThemedText variant="headline" color={theme.colors.textMuted}>
          ✕
        </ThemedText>
      </Pressable>

      {/* Swipe hint on first card */}
      {index === 0 ? (
        <View style={{ position: 'absolute', bottom: insets.bottom + 26, left: 0, right: 0, alignItems: 'center' }}>
          <ThemedText variant="caption" color={theme.colors.textFaint}>
            swipe up ↑
          </ThemedText>
        </View>
      ) : null}
    </View>
  );
}

function StoryCard({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{
        width: SCREEN_W,
        height: SCREEN_H,
        paddingTop: insets.top + 40,
        paddingBottom: insets.bottom + 30,
        paddingHorizontal: 28,
        justifyContent: 'center',
      }}
    >
      {children}
    </View>
  );
}

function IntroCard({ stats }: { stats: DerivedStats }) {
  const theme = useTheme();
  return (
    <View style={{ gap: 16 }}>
      <Wordmark size="md" />
      <Spacer size={20} />
      <ThemedText variant="kicker" color={theme.colors.accentAlt}>
        YOUR YEAR IN GAMES
      </ThemedText>
      <ThemedText variant="display">Let’s look back at everything you played.</ThemedText>
      <ThemedText variant="body" color={theme.colors.textMuted}>
        {stats.totals.gameCount} games. {stats.totals.achievementsEarned.toLocaleString()} trophies. One big year.
      </ThemedText>
    </View>
  );
}

function HoursCard({ stats, active }: { stats: DerivedStats; active: boolean }) {
  const theme = useTheme();
  return (
    <View style={{ gap: 10 }}>
      <ThemedText variant="kicker" color={theme.colors.textMuted}>
        YOU PLAYED FOR
      </ThemedText>
      <CountUp value={stats.totals.totalMinutes} format={formatHours} play={active} />
      <ThemedText variant="headline" color={theme.colors.textMuted}>
        across {stats.totals.gameCount} games
      </ThemedText>
      <Spacer size={8} />
      <ThemedText variant="body" color={theme.colors.textFaint}>
        That’s {formatNumber(Math.round(stats.totals.totalMinutes / 60 / 24))} full days of play.
      </ThemedText>
    </View>
  );
}

function TopGameCard({ stats, active }: { stats: DerivedStats; active: boolean }) {
  const theme = useTheme();
  const top = stats.topGames[0];
  if (!top) return null;
  const [a, b] = gameGradient(top.game.name);
  const mins = top.playtime?.totalMinutes ?? 0;
  return (
    <>
      {/* Blurred art background */}
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
        <LinearGradient colors={[a, b]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1 }} />
        <BlurView intensity={70} tint="dark" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: theme.colors.bg + 'AA' }} />
      </View>
      <View style={{ gap: 10 }}>
        <ThemedText variant="kicker" color={theme.colors.accentAlt}>
          YOUR #1 GAME
        </ThemedText>
        <ThemedText variant="display">{top.game.name}</ThemedText>
        <Row style={{ alignItems: 'flex-end', gap: 8 }}>
          <CountUp value={mins} format={formatHours} variant="title" color={theme.colors.accentAlt} play={active} />

          <View style={{ paddingBottom: 4 }}>
            <ThemedText variant="body" color={theme.colors.textMuted}>
              of your year
            </ThemedText>
          </View>
        </Row>
      </View>
    </>
  );
}

function PersonaCard({ persona }: { persona: Persona | null }) {
  const theme = useTheme();
  return (
    <View style={{ gap: 14 }}>
      <ThemedText variant="kicker" color={theme.colors.accentPink}>
        YOUR GAMER PERSONA
      </ThemedText>
      <LinearGradient
        colors={AURORA_GRADIENT as unknown as [string, string, string]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ borderRadius: theme.radius.xl, padding: 2 }}
      >
        <View style={{ backgroundColor: theme.colors.bg, borderRadius: theme.radius.xl - 2, padding: 24, gap: 12 }}>
          <ThemedText variant="display">{persona?.title ?? '…'}</ThemedText>
          <ThemedText variant="headline" color={theme.colors.textMuted}>
            {persona?.blurb ?? ''}
          </ThemedText>
        </View>
      </LinearGradient>
    </View>
  );
}

function AiCard({
  token,
  active,
  personaFallback,
}: {
  token: string | null;
  active: boolean;
  personaFallback: Persona | null;
}) {
  const theme = useTheme();
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'unavailable'>('idle');
  const [text, setText] = useState('');

  const reveal = async () => {
    if (!token) return;
    setState('loading');
    haptics.tap();
    try {
      const res = await api.commentary(token);
      setText(res.commentary);
      setState('done');
      haptics.success();
    } catch (err) {
      // Best-effort: if AI isn't available, fall back to the persona gracefully.
      if (err instanceof ApiError && (err.status === 503 || err.status === 502)) {
        setText(personaFallback?.blurb ?? 'Your year speaks for itself.');
        setState('unavailable');
      } else {
        setText('Couldn’t load the AI take right now.');
        setState('unavailable');
      }
    }
  };

  return (
    <View style={{ gap: 16 }}>
      <ThemedText variant="kicker" color={theme.colors.accentAlt}>
        THE AI TAKE {state === 'idle' ? '· OPTIONAL' : ''}
      </ThemedText>
      <View
        style={{
          backgroundColor: '#0A0A10',
          borderRadius: theme.radius.lg,
          borderWidth: 1,
          borderColor: theme.colors.border,
          padding: 20,
          minHeight: 180,
          justifyContent: 'center',
        }}
      >
        {state === 'idle' ? (
          <ThemedText variant="body" color={theme.colors.textMuted}>
            Want a playful, AI-written take on your year? It’s optional — tap to reveal.
          </ThemedText>
        ) : state === 'loading' ? (
          <Row style={{ gap: 10 }}>
            <ActivityIndicator color={theme.colors.accentAlt} />
            <ThemedText variant="body" color={theme.colors.textMuted}>
              Writing your take…
            </ThemedText>
          </Row>
        ) : (
          <Typewriter text={text} play={active} />
        )}
      </View>
      {state === 'idle' ? <Button label="Reveal my AI take" onPress={reveal} variant="secondary" /> : null}
    </View>
  );
}

function RarestCard({ stats }: { stats: DerivedStats }) {
  const theme = useTheme();
  const r = stats.rarestAchievement;
  if (!r) return null;
  return (
    <View style={{ gap: 12 }}>
      <ThemedText variant="kicker" color={theme.colors.gold}>
        YOUR RAREST TROPHY
      </ThemedText>
      <ThemedText variant="display">{r.achievement.name}</ThemedText>
      <ThemedText variant="headline" color={theme.colors.textMuted}>
        {r.gameName}
      </ThemedText>
      <Spacer size={8} />
      <View style={{ alignSelf: 'flex-start', backgroundColor: theme.colors.gold + '22', borderRadius: theme.radius.pill, paddingHorizontal: 16, paddingVertical: 8 }}>
        <ThemedText variant="bodyStrong" color={theme.colors.gold}>
          Only {formatRarity(r.achievement.rarityPercent)} of players have it
        </ThemedText>
      </View>
    </View>
  );
}

function OutroCard({ stats }: { stats: DerivedStats }) {
  const theme = useTheme();
  return (
    <View style={{ gap: 16 }}>
      <ThemedText variant="kicker" color={theme.colors.accentAlt}>
        THAT’S YOUR YEAR
      </ThemedText>
      <ThemedText variant="display">Nicely played.</ThemedText>
      <ThemedText variant="body" color={theme.colors.textMuted}>
        {stats.totals.gameCount} games, {formatHours(stats.totals.totalMinutes)}. Share it and see how your year stacks up.
      </ThemedText>
      <Spacer size={10} />
      <Button label="Share my year" onPress={() => router.push('/share')} hapticStyle="success" />
      <Button label="Done" variant="ghost" onPress={() => router.back()} />
      <ThemedText variant="caption" color={theme.colors.textFaint} center>
        Video export coming soon.
      </ThemedText>
    </View>
  );
}
