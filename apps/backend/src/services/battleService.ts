import type { BattleCategory, BattleResult, DerivedStats } from '@endcard/shared';
import { supabaseAdmin } from '../lib/supabase.js';
import { HttpError } from '../lib/httpError.js';
import { getCachedStats } from './statsService.js';
import { assertFriends } from './friendsService.js';

/** Recap Battle — only callable between mutually-accepted friends (both consented). */
export async function buildBattle(meId: string, otherId: string): Promise<BattleResult> {
  await assertFriends(meId, otherId);

  const [aStats, bStats] = await Promise.all([getCachedStats(meId), getCachedStats(otherId)]);
  if (!aStats) throw HttpError.badRequest('Sync your stats first.');
  if (!bStats) throw HttpError.badRequest('Your friend hasn’t synced their stats yet.');

  const names = await displayNames([meId, otherId]);

  const categories: BattleCategory[] = [
    numCat('hours', 'Hours played', Math.round(aStats.totals.totalMinutes / 60), Math.round(bStats.totals.totalMinutes / 60), 'hours'),
    numCat('trophies', 'Trophies', aStats.totals.achievementsEarned, bStats.totals.achievementsEarned, 'number'),
    numCat('platinums', 'Platinums', aStats.totals.platinums, bStats.totals.platinums, 'number'),
    numCat('games', 'Games', aStats.totals.gameCount, bStats.totals.gameCount, 'number'),
    rarityCat(aStats, bStats),
  ];

  let aWins = 0;
  let bWins = 0;
  for (const c of categories) {
    if (c.winner === 'a') aWins++;
    else if (c.winner === 'b') bWins++;
  }
  const overallWinner: 'a' | 'b' | 'tie' = aWins === bWins ? 'tie' : aWins > bWins ? 'a' : 'b';

  return {
    a: { userId: meId, displayName: names.get(meId) ?? 'You' },
    b: { userId: otherId, displayName: names.get(otherId) ?? 'Friend' },
    categories,
    compatibility: compatibilityScore(aStats, bStats),
    overallWinner,
  };
}

function numCat(key: string, label: string, a: number, b: number, format: 'hours' | 'number'): BattleCategory {
  const winner: 'a' | 'b' | 'tie' = a === b ? 'tie' : a > b ? 'a' : 'b';
  return { key, label, a, b, winner, format };
}

function rarityCat(aStats: DerivedStats, bStats: DerivedStats): BattleCategory {
  // Lower rarity % = rarer = better. Missing → treated as 101 (no rare trophy).
  const a = aStats.rarestAchievement?.achievement.rarityPercent ?? 101;
  const b = bStats.rarestAchievement?.achievement.rarityPercent ?? 101;
  const winner: 'a' | 'b' | 'tie' = a === b ? 'tie' : a < b ? 'a' : 'b';
  return { key: 'rarest', label: 'Rarest trophy', a, b, winner, format: 'rarity', lowerWins: true };
}

/** A playful 0–100 gaming-taste compatibility score. */
export function compatibilityScore(a: DerivedStats, b: DerivedStats): number {
  // Shared top games (by name) — the strongest taste signal.
  const namesA = new Set(a.topGames.slice(0, 10).map((g) => g.game.name.toLowerCase()));
  const namesB = new Set(b.topGames.slice(0, 10).map((g) => g.game.name.toLowerCase()));
  const inter = [...namesA].filter((n) => namesB.has(n)).length;
  const union = new Set([...namesA, ...namesB]).size || 1;
  const jaccard = inter / union;
  const overlap = Math.min(1, jaccard * 3); // sharing even a couple games means a lot

  // Trophy-tier "style" similarity.
  const tierSim = tierSimilarity(a, b);

  return Math.round(100 * (0.6 * overlap + 0.4 * tierSim));
}

function tierSimilarity(a: DerivedStats, b: DerivedStats): number {
  const ratios = (s: DerivedStats): number[] => {
    const t = s.achievementProfile?.earnedByTier;
    if (!t) return [0.25, 0.25, 0.25, 0.25];
    const total = t.bronze + t.silver + t.gold + t.platinum || 1;
    return [t.bronze / total, t.silver / total, t.gold / total, t.platinum / total];
  };
  const ra = ratios(a);
  const rb = ratios(b);
  const diff = ra.reduce((sum, v, i) => sum + Math.abs(v - (rb[i] ?? 0)), 0) / 2; // 0..1
  return 1 - diff;
}

async function displayNames(ids: string[]): Promise<Map<string, string>> {
  const { data } = await supabaseAdmin.from('users').select('id, display_name').in('id', ids);
  return new Map((data ?? []).map((u) => [u.id, u.display_name ?? 'Player']));
}
