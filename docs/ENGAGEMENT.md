# Healthy engagement & notifications

The rule: **every reason to open the app is a celebration or a curiosity hook — never
guilt, shame, streak-anxiety, or manufactured FOMO.** We drive retention with things
people are genuinely happy to see.

## What's built now (in-app, no push needed)

- **Milestone engine** — `DerivedStats.milestones` (computed in `statsService.ts`) tracks
  hours / trophies / platinums / games thresholds and the "top 1% rarity" badge. The Home
  **MilestonesCard** celebrates the biggest thing reached and dangles the next target
  ("Next: 5,000 trophies — 80% there"). Pure encouragement.
- **Personas** — a flattering archetype every user gets, free.
- **Recap Battles** — a fun, opt-in reason to bring friends in.

## What's designed, pending a dev build (push delivery)

Push requires `expo-notifications` + a Custom Dev Build + a `push_tokens` table + a sender
(Expo Push API on a small backend cron). The **content rules and schedule** below are the
spec to implement when you do a dev build:

| Trigger | Cadence | Example copy (kind, curious — never naggy) |
| --- | --- | --- |
| **Milestone hit** | On detection | "🏆 You just crossed 1,000 hours. Legendary." |
| **New rare trophy** | On detection | "👀 You earned a top-1% trophy — come see how rare." |
| **Monthly mini-recap** | 1st of month | "Your month in games is ready ✨" |
| **Seasonal year-end drop** | Mid-Dec | "Your {year} PSN Wrapped just dropped 🎉" |

Hard "no" list (never send): "You haven't played in a while", "Don't lose your streak",
"Your friends are ahead of you", anything implying you *should* play more. Celebrations and
curiosity only.

## Implementation sketch (when ready)

1. Add `expo-notifications`; request permission post-onboarding (soft-ask first).
2. `push_tokens (user_id, token, platform)` table; register the Expo push token on login.
3. A backend job (cron) detects newly-crossed milestones (compare new vs previous
   `cached_stats`) and monthly/seasonal windows, then sends via the Expo Push API.
4. Respect a per-user notification preference in Settings (and quiet hours).
