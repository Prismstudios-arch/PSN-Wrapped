import type { DerivedStats } from '@endcard/shared';

/**
 * Deterministic gamer-persona engine. Rule-based (no LLM) so a persona is always
 * available — even on the free tier or with AI commentary turned off — and never
 * costs a token. Flattering by design.
 */
export interface Persona {
  title: string;
  blurb: string;
}

function nightOwlScore(stats: DerivedStats): number {
  const hm = stats.heatmap;
  if (!hm) return 0;
  let night = 0;
  let total = 0;
  for (const day of hm) {
    for (let h = 0; h < 24; h++) {
      const v = day[h] ?? 0;
      total += v;
      if (h >= 22 || h < 5) night += v;
    }
  }
  return total > 0 ? night / total : 0;
}

export function derivePersona(stats: DerivedStats): Persona {
  const { totals, topGames, rarestAchievement } = stats;
  const games = totals.gameCount || 1;
  const totalHours = totals.totalMinutes / 60;
  const topName = topGames[0]?.game.name;
  const topHours = (topGames[0]?.playtime?.totalMinutes ?? 0) / 60;
  const topShare = totalHours > 0 ? topHours / totalHours : 0;
  const rarity = rarestAchievement?.achievement.rarityPercent;
  const platinums = totals.platinums;
  const night = nightOwlScore(stats);

  // Highest-priority distinctive trait wins; each blurb leans on real numbers.
  if (platinums >= 10) {
    return {
      title: 'The Completionist',
      blurb: `${platinums} platinums and counting. You don’t just finish games — you finish them.`,
    };
  }
  if (rarity !== undefined && rarity <= 1) {
    return {
      title: 'The Trophy Hunter',
      blurb: `You own a trophy only ${rarity < 0.1 ? 'a sliver of a percent' : `${Math.round(rarity * 10) / 10}%`} of players have. You go where others quit.`,
    };
  }
  if (topShare >= 0.4 && topName) {
    return {
      title: 'The Devotee',
      blurb: `${Math.round(topHours).toLocaleString()} hours in ${topName}. When you love a game, you really move in.`,
    };
  }
  if (totalHours >= 1500) {
    return {
      title: 'The Marathoner',
      blurb: `${Math.round(totalHours).toLocaleString()} hours played. Most people watch a series — you live in your games.`,
    };
  }
  if (games >= 40) {
    return {
      title: 'The Explorer',
      blurb: `${games} games and always one more in the backlog. You’re here for everything the medium can do.`,
    };
  }
  if (night >= 0.45) {
    return {
      title: 'The Night Owl',
      blurb: 'Your best runs happen when the rest of the house is asleep. The late shift suits you.',
    };
  }
  return {
    title: 'The All-Rounder',
    blurb: `${games} games, ${Math.round(totalHours).toLocaleString()} hours, a bit of everything. A well-rounded year.`,
  };
}
