/**
 * Parse an ISO 8601 duration (e.g. PSN's `playDuration` like "PT47H17M9S")
 * into whole minutes. Returns undefined for missing/invalid input rather than
 * guessing — callers decide how to treat absent data.
 *
 * Supports the day/hour/minute/second components Endcard cares about. Years and
 * months are intentionally unsupported (ambiguous length, never present here).
 */
const ISO_DURATION = /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?)?$/;

export function parseIsoDurationToMinutes(input: string | null | undefined): number | undefined {
  if (!input) return undefined;
  const match = ISO_DURATION.exec(input.trim());
  if (!match) return undefined;

  const [, d, h, m, s] = match;
  // A bare "P"/"PT" with no components is not a meaningful duration.
  if (!d && !h && !m && !s) return undefined;

  const days = d ? Number(d) : 0;
  const hours = h ? Number(h) : 0;
  const minutes = m ? Number(m) : 0;
  const seconds = s ? Number(s) : 0;

  const total = days * 24 * 60 + hours * 60 + minutes + seconds / 60;
  return Math.round(total);
}
