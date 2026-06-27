# Getting PSN Wrapped onto TestFlight

A start-to-finish runbook. Roughly an afternoon the first time. Costs: **Apple
Developer Program $99/yr** (unavoidable). Everything else here uses free tiers.

> **Do you need RevenueCat?** No — not for TestFlight. It's only for charging money
> (App Store launch). For testing, set `ALLOW_DEV_PRO=true` on the backend and the in-app
> "Start Pro" button unlocks Pro for testers. Set it back to `false` before a paid launch.

---

## Step 0 — Put the code on GitHub (needed by both Render & EAS)

Both the backend host and the app builder pull from git.

```bash
cd "C:\Users\Jonny\Desktop\PSN APP"
git init && git add . && git commit -m "PSN Wrapped"
# create a new (private is fine) repo on github.com, then:
git remote add origin https://github.com/<you>/psn-wrapped.git
git branch -M main && git push -u origin main
```

`.gitignore` already excludes `.env` and `node_modules`, so **no secrets get pushed.** ✅

## Step 1 — Deploy the backend (Render, free)

The TestFlight app runs on your phone, so it can't reach `localhost` — the backend must be
public.

1. Go to **render.com** → **New** → **Blueprint** → connect your GitHub repo. It reads
   [`render.yaml`](../render.yaml).
2. In the new service's **Environment** tab, paste the 5 secrets (the same values from your
   local `apps/backend/.env`): `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
   `SUPABASE_JWT_SECRET`, `TOKEN_ENC_KEY`, `GROQ_API_KEY`.
3. Deploy. When it's live, copy the URL (e.g. `https://psn-wrapped-backend.onrender.com`).
4. Test it: open `https://YOUR-URL/health` — you should see `{"status":"ok",...}`.

> Run the SQL once on your Supabase project if you haven't: `schema.sql` **and**
> `migrations/0002_recap_ai.sql`.

## Step 2 — Point the app at the deployed backend

In [`apps/mobile/eas.json`](../apps/mobile/eas.json), replace **all three**
`https://REPLACE-with-your-backend-url` with your Render URL.

## Step 3 — Apple + EAS setup

1. Join the **Apple Developer Program** ($99/yr) at developer.apple.com.
2. Create a free **Expo account** at expo.dev.
3. Install the CLI and log in:
   ```bash
   npm i -g eas-cli
   eas login
   cd "C:\Users\Jonny\Desktop\PSN APP\apps\mobile"
   eas init           # links this app to an Expo project (writes the project id)
   ```

## Step 4 — Build for iOS

```bash
eas build -p ios --profile production
```
EAS will ask to log in to Apple and will create the App Store Connect app + signing
certificates for you (just say yes to the prompts). The build runs in the cloud (~15–20 min).

## Step 5 — Submit to TestFlight

```bash
eas submit -p ios --latest
```
This uploads the build to App Store Connect. In **appstoreconnect.apple.com → your app →
TestFlight**, add yourself as an **Internal Tester** (no Apple review needed for internal).
Install **TestFlight** from the App Store on your iPhone and you'll get the build.

🎉 Now image export, haptics, secure storage — everything — works on a real device.

---

## Still to do before a *public* launch (not needed for TestFlight)

- [ ] **App icon + splash** — design a 1024×1024 icon (the brand mark: the aurora gradient
      square + white play triangle on `#0B0B12`). Drop it at `apps/mobile/assets/icon.png`
      and set `"icon"` in `app.json`. TestFlight tolerates the default; the App Store wants a real one.
- [ ] **Rename** off "PSN Wrapped" (see the trademark warning in the README / PUBLISHING.md).
- [ ] **RevenueCat + real IAP** to charge money; set `ALLOW_DEV_PRO=false`.
- [ ] Fill the **App Store privacy** labels (see [PUBLISHING.md](PUBLISHING.md)).
- [ ] Push notifications (optional; needs `expo-notifications` — see [ENGAGEMENT.md](ENGAGEMENT.md)).
