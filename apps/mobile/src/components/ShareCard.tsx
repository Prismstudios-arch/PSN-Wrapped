import { forwardRef } from 'react';
import { Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { DerivedStats } from '@endcard/shared';
import { BrandGlyph } from './Brand';
import { gameGradient } from './recap';
import { aurora } from '@/theme/tokens';
import { formatHours } from '@/lib/format';
import type { Persona } from '@/lib/api';

export type ShareFormat = 'square' | 'story';

/**
 * The shareable artifact. Canonical, fixed-size rendering (NOT theme/text-scale
 * dependent) so every export looks identical and on-brand. Free exports carry
 * the PSN Wrapped watermark — that's the growth engine; Pro unlocks clean
 * exports later. Captured to PNG by lib/share.ts via react-native-view-shot.
 */
export const ShareCard = forwardRef<
  View,
  { stats: DerivedStats; persona: Persona | null; format: ShareFormat; width: number; pro?: boolean }
>(
  function ShareCard({ stats, persona, format, width, pro = false }, ref) {
    const height = format === 'square' ? width : Math.round((width * 16) / 9);
    const s = width / 360; // scale unit
    const pad = 26 * s;

    const C = {
      text: '#F5F5FB',
      muted: '#AEAECB',
      faint: '#7E7E9A',
      teal: aurora.teal,
      gold: '#FFC247',
    };

    const hours = formatHours(stats.totals.totalMinutes);
    const top = stats.topGames.slice(0, 3);
    const rarest = stats.rarestAchievement;

    return (
      <View ref={ref} style={{ width, height, borderRadius: 24 * s, overflow: 'hidden', backgroundColor: '#0B0B12' }}>
        {/* Aurora backdrop */}
        <LinearGradient colors={['#1C1247', '#0B0B12']} start={{ x: 0, y: 0 }} end={{ x: 0.6, y: 1 }} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
        <View style={{ position: 'absolute', top: -40 * s, left: -30 * s, width: 220 * s, height: 220 * s, borderRadius: 200, backgroundColor: aurora.violet, opacity: 0.22 }} />
        <View style={{ position: 'absolute', bottom: -50 * s, right: -40 * s, width: 240 * s, height: 240 * s, borderRadius: 200, backgroundColor: aurora.pink, opacity: 0.16 }} />

        <View style={{ flex: 1, padding: pad }}>
          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 * s }}>
              <BrandGlyph size={26 * s} />
              <Text style={{ color: C.text, fontSize: 14 * s, fontWeight: '800', letterSpacing: 1 }}>CONSOLE WRAPPED</Text>
            </View>
            <Text style={{ color: C.faint, fontSize: 13 * s, fontWeight: '700' }}>2025</Text>
          </View>

          {/* Hero */}
          <View style={{ marginTop: format === 'story' ? 48 * s : 26 * s }}>
            <Text style={{ color: C.muted, fontSize: 12 * s, fontWeight: '800', letterSpacing: 3 }}>YOU PLAYED FOR</Text>
            <Text style={{ color: C.text, fontSize: (format === 'story' ? 76 : 58) * s, fontWeight: '800', letterSpacing: -1, marginTop: 4 * s }}>
              {hours}
            </Text>
            <Text style={{ color: C.muted, fontSize: 16 * s, fontWeight: '600' }}>
              across {stats.totals.gameCount} games · {stats.totals.achievementsEarned.toLocaleString()} trophies
            </Text>
          </View>

          {/* Top games */}
          <View style={{ marginTop: format === 'story' ? 44 * s : 24 * s, gap: 12 * s }}>
            <Text style={{ color: C.muted, fontSize: 12 * s, fontWeight: '800', letterSpacing: 2 }}>TOP GAMES</Text>
            {top.map((item, i) => {
              const [a, b] = gameGradient(item.game.name);
              const mins = item.playtime?.totalMinutes ?? 0;
              return (
                <View key={item.game.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 * s }}>
                  <Text style={{ color: C.faint, fontSize: 14 * s, fontWeight: '800', width: 16 * s }}>{i + 1}</Text>
                  <LinearGradient colors={[a, b]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: 38 * s, height: 38 * s, borderRadius: 9 * s, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ color: '#fff', fontSize: 16 * s, fontWeight: '800' }}>{item.game.name.trim().charAt(0).toUpperCase()}</Text>
                  </LinearGradient>
                  <Text numberOfLines={1} style={{ flex: 1, color: C.text, fontSize: 16 * s, fontWeight: '700' }}>{item.game.name}</Text>
                  <Text style={{ color: C.teal, fontSize: 15 * s, fontWeight: '800' }}>{formatHours(mins)}</Text>
                </View>
              );
            })}
          </View>

          {/* Persona / rarest (story has room for both) */}
          <View style={{ marginTop: 22 * s, gap: 10 * s }}>
            {persona ? (
              <View style={{ alignSelf: 'flex-start', backgroundColor: aurora.violet + '2A', borderRadius: 999, paddingHorizontal: 14 * s, paddingVertical: 6 * s }}>
                <Text style={{ color: '#CDBFFF', fontSize: 14 * s, fontWeight: '800' }}>{persona.title}</Text>
              </View>
            ) : null}
            {format === 'story' && rarest ? (
              <Text style={{ color: C.gold, fontSize: 14 * s, fontWeight: '700' }}>
                Rarest: {rarest.achievement.name} — {rarest.gameName}
              </Text>
            ) : null}
          </View>

          {/* Footer watermark — free exports carry the mark (Pro = clean). */}
          <View style={{ flex: 1, justifyContent: 'flex-end' }}>
            {!pro ? (
              <Text style={{ color: C.faint, fontSize: 12 * s, fontWeight: '700', textAlign: 'center' }}>
                Made with PSN Wrapped · psnwrapped.app
              </Text>
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 * s }}>
                <BrandGlyph size={16 * s} />
                <Text style={{ color: C.faint, fontSize: 11 * s, fontWeight: '700' }}>PSN Wrapped</Text>
              </View>
            )}
          </View>
        </View>
      </View>
    );
  },
);
