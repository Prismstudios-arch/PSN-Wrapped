# Endcard architecture — and how a new platform plugs in

Endcard is **platform-agnostic by construction**. PlayStation Network is the first data
source, but Xbox, Steam, and Nintendo are meant to slot in without touching the UI, the
recap engine, the AI layer, or storage.

## The three layers

```
┌──────────────────────────────────────────────────────────────────┐
│  apps/mobile (Expo)                                                │
│  Talks ONLY to our backend. Holds no backend secret, no raw        │
│  platform credential. Reads its own cached stats (RLS-protected).  │
└───────────────▲──────────────────────────────────────────────────┘
                │ HTTPS + scoped JWT
┌───────────────┴──────────────────────────────────────────────────┐
│  apps/backend (Express)                                            │
│  Owns all secrets + third-party calls. Routes → services →         │
│  connectors. Normalizes everything into DerivedStats, caches it.   │
│                                                                    │
│   getConnector(platform): PlatformConnector                        │
│        └── connectors/psn/  ← the ONLY PSN-specific code           │
└───────────────▲──────────────────────────────────────────────────┘
                │ imports
┌───────────────┴──────────────────────────────────────────────────┐
│  packages/shared                                                   │
│  The normalized model (Game, Playtime, Achievement, DerivedStats)  │
│  + the PlatformConnector interface. Imported by BOTH sides.        │
│  No platform SDKs, no Node-only or RN-only APIs.                   │
└──────────────────────────────────────────────────────────────────┘
```

The rule that keeps it agnostic: **nothing outside a connector folder may branch on a
platform string.** The dashboard, recap engine, AI prompt builder, and sharing all
consume `DerivedStats`, which is platform-neutral.

## The contract: `PlatformConnector`

Defined in [`packages/shared/src/connector.ts`](../packages/shared/src/connector.ts):

```ts
interface PlatformConnector {
  readonly platform: Platform;
  connect(credentials): Promise<ConnectorSession>;   // raw credential → scoped session
  refresh(session): Promise<ConnectorSession>;       // rotate tokens
  fetchLibrary(session): Promise<NormalizedGame[]>;
  fetchPlaytime(session): Promise<Playtime[]>;
  fetchAchievements(session): Promise<AchievementSet>;
  disconnect(session): Promise<void>;
}
```

A connector's only job is **credential exchange + mapping raw payloads into the
normalized model**. It never persists tokens (the service layer does that, encrypted)
and never returns the user's raw credential.

## Adding a platform (e.g. Steam) — the whole checklist

1. Add `'steam'` to `PLATFORMS` and (when shippable) `IMPLEMENTED_PLATFORMS` in
   [`packages/shared/src/platform.ts`](../packages/shared/src/platform.ts).
2. Create `apps/backend/src/connectors/steam/`:
   - A thin client wrapper (the only file importing the platform SDK), mirroring
     [`psn/psnClient.ts`](../apps/backend/src/connectors/psn/psnClient.ts).
   - `steamConnector.ts` implementing `PlatformConnector`, mapping Steam payloads into
     `NormalizedGame` / `Playtime` / `AchievementSet`.
3. Register it in
   [`connectors/registry.ts`](../apps/backend/src/connectors/registry.ts) — one line.
4. If the auth shape differs (Steam uses OpenID + a Web API key rather than a pasted
   token), add its connect flow to `/auth/connect` behind the same interface.

That's it. `statsService`, every route, the cache schema, and the entire app are
unchanged. The `cached_stats.stats` JSON already carries a `platforms: Platform[]`
field, so a **unified cross-platform recap** is a merge step, not a rewrite — which is
exactly what Phase 6 proves.

## Why these boundaries

- **Security:** secrets and raw credentials never leave the backend. The app's only
  credential is a short-lived JWT scoped to one user, which also authorizes its direct,
  RLS-protected Supabase reads.
- **Resilience:** if a platform breaks an unofficial endpoint, the blast radius is one
  connector folder. The rest of the product keeps working for other platforms.
- **Velocity:** one normalized model means features (new recap cards, AI tiers, share
  formats) are built once and light up for every platform automatically.
