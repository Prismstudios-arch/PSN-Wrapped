# PSN Wrapped

> ## ⚠️ HIGH trademark risk — change before any public launch
>
> The current name **"PSN Wrapped"** stacks **two** trademarks and is the riskiest naming
> choice:
> - **"PSN"** is Sony's own mark (PlayStation Network). Using a platform's trademark in your
>   **app name/icon** commonly triggers **App Store rejection** and invites a Sony
>   cease-and-desist. This also contradicts the project's own brand posture ("have its own
>   identity; reference PlayStation Network *descriptively only*").
> - **"Wrapped"** is strongly associated with *Spotify Wrapped*.
>
> This name is in use **for development only**. Before spending money on launch, get an IP
> lawyer's review and **strongly consider a trademark-free name** (e.g. *Trophy Rewind*,
> *Platinum Year*, *PlayBack*). Renaming is a quick, mechanical change.
>
> _The internal monorepo package scope is still `@endcard/*` (original codename) — an
> invisible code identifier, not the product name._

An unofficial, **year-in-review for your gaming history** — beautiful, shareable, with
opt-in AI commentary and a gamer-personality system. PSN Wrapped starts with
**PlayStation Network** and is built platform-agnostic so Xbox, Steam, and Nintendo slot
in later without a rewrite.

**PSN Wrapped is not affiliated with or endorsed by Sony Interactive Entertainment.**
"PlayStation Network" is referenced descriptively only.

---

## Phase 1 status: foundation, architecture & secure backend ✅

This repo currently contains everything from Phase 1 of the build plan:

- **`packages/shared`** — the platform-agnostic normalized model (`NormalizedGame`,
  `Playtime`, `NormalizedAchievement`, `DerivedStats`) and the `PlatformConnector`
  interface. Imported by both the backend and the app.
- **`apps/backend`** — a secure Express + TypeScript backend that owns all secrets and
  third-party calls. PSN is the first connector (via [`psn-api`](https://github.com/achievements-app/psn-api)).
  Endpoints: `/auth/connect`, `/stats/fetch`, `/account/disconnect` (+ `/health`,
  `GET /stats`, `GET /account`).
- **`apps/mobile`** — an Expo SDK 56 app, dark-mode-first, configured (Router,
  NativeWind, monorepo Metro) with a typed backend client. **No real UI yet** — a single
  placeholder screen confirms the pipeline runs. UI begins in Phase 2.
- **Supabase schema + RLS** — [`apps/backend/supabase/schema.sql`](apps/backend/supabase/schema.sql).
- **Docs** — [data-handling disclosure](docs/DATA_HANDLING.md) and
  [architecture / how a new platform plugs in](docs/ARCHITECTURE.md).

> The mobile UI is deliberately a stub in Phase 1. The thing to review now is the
> **backend + data architecture**.

---

## Layout

```
endcard/
├─ packages/shared/      # normalized model + PlatformConnector contract (the source of truth)
├─ apps/backend/         # Express API: routes → services → connectors
│  ├─ src/connectors/psn # the ONLY PSN-specific code
│  └─ supabase/schema.sql
├─ apps/mobile/          # Expo SDK 56 app (config + API client; UI in Phase 2)
└─ docs/
```

## Prerequisites

- **Node 20+** and npm 10+.
- A free **Supabase** project.
- An iOS device/simulator with **Expo Go** (or a dev build later) to run the app.
- A **PlayStation account** + its NPSSO token to test a real sync (see below).

---

## Setup

### 1. Install dependencies (from the repo root)

```bash
npm install
```

This installs all three workspaces. Then reconcile the mobile app to exact
**SDK-56-compatible** versions (recommended — the versions in `apps/mobile/package.json`
are a best-effort starting point):

```bash
npx expo install --fix --prefix apps/mobile
# or:  cd apps/mobile && npx expo install --fix
```

### 2. Create the Supabase schema

In your Supabase project → **SQL Editor**, paste and run
[`apps/backend/supabase/schema.sql`](apps/backend/supabase/schema.sql). It creates the
tables and Row Level Security policies (the app can read its own stats but **cannot**
read the encrypted token table).

### 3. Configure backend env

```bash
cp apps/backend/.env.example apps/backend/.env
npm run gen:keys -w @endcard/backend     # prints a TOKEN_ENC_KEY
```

Fill `apps/backend/.env`:

- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` — Supabase → Settings → API.
- `SUPABASE_JWT_SECRET` — Supabase → Settings → API → **JWT Settings → JWT Secret**.
  (The backend mints session JWTs with this so Supabase RLS trusts them.)
- `TOKEN_ENC_KEY` — paste the value from `gen:keys`.

### 4. Run the backend

```bash
npm run backend:dev
# → Endcard backend listening on http://localhost:4000
curl http://localhost:4000/health
```

### 5. Run the app (optional in Phase 1)

```bash
npm run mobile:start
```

If testing on a physical device, set `extra.apiBaseUrl` in `apps/mobile/app.json` to
your machine's LAN IP (e.g. `http://192.168.1.20:4000`) so the phone can reach the
backend.

---

## Testing the backend connection (end-to-end)

### Get your PSN NPSSO token

1. In a browser, **log in to <https://www.playstation.com>**.
2. Visit **<https://ca.account.sony.com/api/v1/ssocookie>**.
3. Copy the `npsso` value from the JSON (a long string).

> This token is your master session credential. Endcard uses it once server-side and
> never stores it — see [docs/DATA_HANDLING.md](docs/DATA_HANDLING.md).

### Connect, sync, read, disconnect

```bash
# 1) Connect — exchange the NPSSO for an Endcard session JWT
curl -s -X POST http://localhost:4000/auth/connect \
  -H 'Content-Type: application/json' \
  -d '{"platform":"psn","token":"YOUR_NPSSO"}'
# → { "token": "<JWT>", "user": {...}, "connection": {...}, ... }

TOKEN="<paste the JWT>"

# 2) Fetch + cache normalized stats
curl -s -X POST http://localhost:4000/stats/fetch \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d '{}'

# 3) Read cached stats
curl -s http://localhost:4000/stats -H "Authorization: Bearer $TOKEN"

# 4) Disconnect — wipes tokens + cached stats
curl -s -X POST http://localhost:4000/account/disconnect -H "Authorization: Bearer $TOKEN"
```

### Typecheck without credentials

```bash
npm run typecheck            # shared + backend
```

---

## Security model (the trust make-or-break)

- The **app holds no backend secret** and never sees your raw PSN token.
- The **raw NPSSO is never persisted** — used once in memory, then discarded.
- Derived PSN tokens are **encrypted at rest (AES-256-GCM)** with a TTL, only so recaps
  can refresh in the background. `/account/disconnect` deletes them.
- The app authenticates with a **short-lived JWT** scoped to one user, which also
  authorizes its direct, **RLS-protected** Supabase reads. Encrypted tokens live in a
  table the app role cannot read at all.

## ⚠️ Terms-of-Service & legal reality

Accessing PlayStation Network through unofficial APIs **violates Sony's Terms of
Service** and can be blocked or broken at any time. Build and operate defensively:

- The architecture isolates each platform in one connector, so a PSN breakage does not
  take down the rest of the product.
- This is **not legal advice.** Have a qualified IP/tech lawyer review the brand,
  disclaimers, and data handling **before** launch.

---

## What's next — Phase 2

Brand identity (Endcard's **own** palette — not PlayStation blue), demo-first
onboarding, the connect screen with an in-app NPSSO walkthrough, and the tab shell
(Home / Friends / Recap / Settings) with accessibility options from day one.
