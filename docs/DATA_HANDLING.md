# What Endcard accesses, stores, and how to delete it

_This is the plain-language disclosure the app surfaces at the connect step (Phase 2)
and in Settings. It is written to be shown to users, not just developers._

## The short version

- **We never see your PlayStation password.** You paste a session token (NPSSO) that
  you generate yourself while logged in to PlayStation.
- **We never store that token.** It is used once, on our server, to obtain limited
  read-only access, and is then discarded.
- **You can wipe everything in one tap.** Disconnecting deletes every token and every
  derived stat we hold for you.

## What we access (read-only)

Using your session, our backend reads, from PlayStation Network:

- Your games and how long you've played them (PSN's reported play duration).
- Your trophies, including global rarity percentages.
- Your account's trophy summary (level and counts) and your public profile handle.

We do **not** post, message, change settings, spend money, or take any action on your
account. We only read.

## What we store

| Data | Stored? | Form | Lifetime |
| --- | --- | --- | --- |
| Your PSN **NPSSO** (master token) | ❌ Never written to disk | — | Used once in memory, then discarded |
| Derived PSN **access/refresh tokens** | ✅ Yes | **Encrypted** (AES‑256‑GCM) at rest | Until you disconnect, or the TTL elapses (`TOKEN_TTL_MINUTES`) |
| **Derived stats** (hours, top games, trophies, rarity) | ✅ Yes | Normalized JSON | Until you disconnect |
| Your **account id** + PSN handle | ✅ Yes | Plain | Until you disconnect |

The encrypted refresh token exists only so the app can refresh your recap in the
background without asking you to paste a token again. It cannot be used to sign in to
the PlayStation website — only to request the same read-only data again — and it is
deleted the moment you disconnect.

## How deletion works

Tapping **Disconnect & delete** (Settings) calls `POST /account/disconnect`, which:

1. Best-effort releases the platform session.
2. Deletes your `platform_connections` row (all tokens).
3. Deletes your `cached_stats` row (all derived data).

After this, Endcard holds no tokens and no gameplay data for you.

## Things we are honest about (PSN data limits)

- PSN does not expose per‑session timestamps, so the "when you game" heatmap is
  approximated from your trophy earn times (in UTC) rather than literal play sessions.
- PSN does not expose genre metadata, so genre breakdowns require a separate metadata
  source (not yet added).
- PSN does not expose purchase prices, so "best value" currently uses a most‑hours
  proxy rather than true cost‑per‑hour.

## Important caveat

Accessing PlayStation Network through unofficial means is against Sony's Terms of
Service and can be blocked or change without notice. Endcard is unofficial and is **not
affiliated with or endorsed by Sony Interactive Entertainment**. This document is a
transparency disclosure, not legal advice.
