/**
 * The set of gaming platforms Endcard knows how to model.
 *
 * Adding a platform here is the FIRST step of supporting it. Nothing in the UI,
 * AI, or storage layers may branch on a literal platform string outside of a
 * connector implementation — they all operate on the normalized model below.
 */
export const PLATFORMS = ['psn', 'xbox', 'steam', 'nintendo'] as const;

export type Platform = (typeof PLATFORMS)[number];

export function isPlatform(value: unknown): value is Platform {
  return typeof value === 'string' && (PLATFORMS as readonly string[]).includes(value);
}

/** Human-facing, factual labels. Used for nominative references only — never as Endcard's own brand. */
export const PLATFORM_LABELS: Record<Platform, string> = {
  psn: 'PlayStation Network',
  xbox: 'Xbox',
  steam: 'Steam',
  nintendo: 'Nintendo',
};

/**
 * Which connectors are actually wired up and shippable right now.
 * PSN is first; the rest are declared in the model so the architecture is
 * provably platform-agnostic, but are not yet implemented.
 */
export const IMPLEMENTED_PLATFORMS: readonly Platform[] = ['psn'];

export function isImplemented(platform: Platform): boolean {
  return IMPLEMENTED_PLATFORMS.includes(platform);
}
