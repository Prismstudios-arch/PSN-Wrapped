/** Small, shared formatting helpers for stat display. */

export function formatHours(minutes: number | undefined): string {
  if (!minutes || minutes <= 0) return '0h';
  const hours = minutes / 60;
  if (hours < 1) return `${Math.round(minutes)}m`;
  if (hours < 100) return `${Math.round(hours * 10) / 10}h`;
  return `${Math.round(hours).toLocaleString()}h`;
}

export function formatNumber(n: number): string {
  return n.toLocaleString();
}

/** "0.1%" rarity, kept compact. */
export function formatRarity(percent: number | undefined): string {
  if (percent === undefined) return '—';
  if (percent < 0.1) return '<0.1%';
  if (percent < 10) return `${Math.round(percent * 10) / 10}%`;
  return `${Math.round(percent)}%`;
}

/** "just now" / "3h ago" / "2d ago" from an ISO timestamp. */
export function formatRelativeTime(iso: string | undefined): string {
  if (!iso) return '';
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return '';
  const diff = Date.now() - t;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
