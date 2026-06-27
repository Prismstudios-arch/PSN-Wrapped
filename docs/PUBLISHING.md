# PSN Wrapped — App Store publishing checklist

A practical checklist for getting PSN Wrapped onto TestFlight and the App Store.
**Not legal advice** — have a qualified IP/tech lawyer review before a public launch.

## 1. Legal & brand (do this first)

- [ ] **⚠️ Rename before launch — "PSN Wrapped" is HIGH risk.** It uses **two** trademarks:
      **"PSN"** (Sony's own mark — using it in the app name commonly triggers App Store
      rejection and a Sony C&D) and **"Wrapped"** (Spotify). Get an IP lawyer's read and
      strongly prefer a trademark-free name (e.g. *Trophy Rewind*, *Platinum Year*).
- [ ] **"Not affiliated with Sony"** disclaimer is present (onboarding, connect, settings) ✓ built.
- [ ] **ToS risk acknowledged.** Accessing PSN via unofficial APIs violates Sony's terms and
      can break or be challenged at any time. The architecture isolates this in one connector
      so the rest of the product survives a breakage.
- [ ] PlayStation referenced **descriptively only** — no Sony logos, no PlayStation brand blue.

## 2. App Store privacy ("nutrition labels")

Fill these to match what the backend actually does (see [DATA_HANDLING.md](DATA_HANDLING.md)):

| Apple data type | Collected? | Linked to user? | Used for | Notes |
| --- | --- | --- | --- | --- |
| **User ID** | Yes | Yes | App functionality | Endcard user id + PSN account id |
| **Gameplay/Usage data** (hours, trophies) | Yes | Yes | App functionality | The derived stats |
| **User content** (PSN handle, friends) | Yes | Yes | App functionality | Handle used for friend search |
| Contacts, Location, Browsing, Financial, Health | **No** | — | — | Never collected |
| **PSN session token (NPSSO)** | **Not stored** | — | — | Used once server-side, discarded |

- [ ] **Third-party data sharing:** disclose **Supabase** (storage/DB) and **Groq** (AI
      commentary — receives minimal, non-identifying stats only when the user opts in).
      Groq does not train on inputs; note this.
- [ ] **Account deletion (required by Apple):** in-app one-tap delete exists — Settings →
      "Disconnect & delete everything" (`/account/disconnect`). ✓ built.
- [ ] **Tracking:** none. No ATT prompt needed unless you add ad/analytics SDKs.

## 3. Build type — Expo Go vs Custom Dev Build

Several features use native modules **not present in Expo Go**. You need a **Custom Dev
Build** (`npx expo run:ios`) or an **EAS Build** for:

- [ ] **Image export** (`react-native-view-shot`) — capture/save/share. *Fails in Expo Go.*
- [ ] **Custom app icon & splash** — needs a real build.
- [ ] **Push notifications** (`expo-notifications`, when added) — not supported in Expo Go (SDK 53+).
- [ ] In-app purchases (`react-native-purchases` / RevenueCat, when added) — native, build-only.

Expo Go is still fine for fast UI iteration on everything else (onboarding, dashboard,
story player previews, friends, paywall UI).

## 4. EAS / release setup

- [ ] Apple Developer Program membership ($99/yr).
- [ ] `npm i -g eas-cli`, `eas login`, `eas build:configure`.
- [ ] Set the **production** `apiBaseUrl` in `app.json` `extra` (your deployed backend URL).
- [ ] Deploy the backend somewhere (Render/Fly/Railway) with the same env vars; lock CORS.
- [ ] Design **app icon + splash** assets (1024² icon, splash) — *still to do*.
- [ ] `eas build -p ios --profile production` → `eas submit -p ios`.
- [ ] Permission strings present: photo-add ✓ (configured in `app.json`); add notifications
      string when push lands.

## 5. Pre-submission QA

- [ ] Cold start → onboarding → demo recap → connect → dashboard works on a real device.
- [ ] Disconnect & delete truly wipes (verify rows gone in Supabase).
- [ ] Accessibility: reduce-motion, high-contrast, text-scale all function.
- [ ] Image export saves/shares a clean 9:16 and square (Pro = no watermark).
- [ ] AI commentary opt-in works and degrades gracefully if the AI provider is down.
- [ ] Rate limits + the AI cache behave (no surprise costs).
- [ ] Run migrations `schema.sql` + `0002_recap_ai.sql` on the production Supabase project.

## 6. Backend production notes

- [ ] `NODE_ENV=production` — note this **disables the dev Pro grant** (`/pro/activate`),
      which must be replaced by RevenueCat receipt validation / webhook before charging.
- [ ] Rotate any secrets that were shared in plaintext during development.
- [ ] Confirm RLS is enabled on all tables (the schema does this) and the app only ever
      reads its own rows.
