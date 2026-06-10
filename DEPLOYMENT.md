# Liturgia: Web → GitHub → Render → Android APK

How this project goes from web code → hosted app → APK, with GitHub in the middle.

## The big picture

```
Your PC          GitHub              Cloud hosting         Android phone
  │                │                       │                    │
  │  git push      │   auto deploy         │   API calls        │
  ├───────────────►│──────────────────────►│◄───────────────────┤
  │                │                       │                    │
React + Vite       Source code repo    Render.com web       Liturgia-debug.apk
Node/Express API                       PostgreSQL / Neon    (Capacitor WebView)
```

Liturgia is **not** rewritten as native Android. The APK is still your React UI in a WebView, packaged with Capacitor, talking to the same backend on Render.

| Layer | What it is | Where it lives |
|-------|------------|----------------|
| Source code | React + Node app | GitHub repo |
| Live web app | Full stack (UI + API) | Render |
| Data | Members, masses, schedule | Neon/Postgres (`DATABASE_URL`) |
| Android app | Web UI in WebView | APK on phone |
| APK backend | Same API as website | `https://YOUR-APP.onrender.com/api` |

---

## 1. Web app (starting point)

- **Frontend:** React + TypeScript + Vite (`client/`)
- **Backend:** Node + Express (`server/`)
- **Database:** SQLite locally; PostgreSQL (Neon/Render) in production

Run locally:

```powershell
npm run install-all
npm run dev
```

- UI: http://localhost:5173
- API: http://localhost:3000/api/health

---

## 2. GitHub (source + deploy trigger)

Push code to GitHub:

```powershell
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/vidyageorge/Liturgia.git
git push -u origin main
```

GitHub holds **source only** — not `liturgia.db`, backups, or `.env` (see `.gitignore`).

### Connect Render

1. Go to [render.com](https://render.com) → **New +** → **Web Service**
2. Connect this GitHub repo
3. Configure:
   - **Build command:** `npm install && npm run build`
   - **Start command:** `npm start`
   - **Environment variables:**
     - `DATABASE_URL` — Neon PostgreSQL connection string
     - `NODE_ENV` — `production`
4. Deploy. Your live URL will be something like `https://liturgia.onrender.com`

Every push to `main` can redeploy the web app automatically.

See [HOSTING_NEON.md](HOSTING_NEON.md) for Neon database setup and data migration.

### Keep Render awake (free tier)

On Render's free plan, the server sleeps after ~15 minutes. Add a GitHub secret:

- **Name:** `RENDER_APP_URL`
- **Value:** `https://liturgia.onrender.com` (no trailing slash)

Workflow `.github/workflows/keep-render-warm.yml` pings `/api/health` every 14 minutes.

---

## 3. Web → APK (Capacitor wrapper)

When you need an APK, wrap the existing web app — don't rebuild in Kotlin/Java.

### What was added

| Piece | Purpose |
|-------|---------|
| Capacitor (`@capacitor/core`, `@capacitor/android`) | Turns the built web app into an Android project |
| `client/capacitor.config.ts` | App id `com.stmathias.liturgia`, name "Liturgia", `webDir: 'dist'` |
| `client/src/api.ts` | `VITE_API_URL` so the mobile app hits Render, not localhost |
| `client/vite.config.ts` | `base: './'` for APK builds; `base: '/'` for Render web |
| `client/.env.android` | `VITE_API_URL=https://liturgia.onrender.com/api` |
| `scripts/build-android-apk.ps1` | Local build script |
| `npm run build:apk` | Runs that script from the repo root |

### Build pipeline (local or CI)

1. **Build web client** → `npm run build:android` (Vite → `client/dist/`)
2. **Sync to Android** → `npx cap sync android` (copies `dist/` into the Android project)
3. **Compile APK** → Gradle `assembleDebug` → `app-debug.apk`

The APK does **not** bundle the Node server. It's a thin shell that loads your React UI and calls the hosted API on Render.

---

## 4. Two ways to get the APK

### A. On your PC (`npm run build:apk`)

Requires Java 21+ and the Android SDK (often via Android Studio).

```powershell
npm run build:apk
```

Output: `Liturgia-debug.apk` in the project root.

Override the API URL:

```powershell
$env:VITE_API_URL = "https://YOUR-APP.onrender.com/api"
npm run build:apk
```

### B. GitHub Actions (no Android Studio on your PC)

Workflow: `.github/workflows/build-android-apk.yml`

Runs on GitHub's Ubuntu runners (SDK + Java already there):

1. Checkout code
2. `npm ci` (root + client)
3. Build with `VITE_API_URL` → Render API
4. `npx cap add android` (if needed) + `cap sync`
5. `./gradlew assembleDebug`
6. Upload artifact `Liturgia-debug-apk`

**Triggers:**

- **Manual:** Actions → Build Android APK → Run workflow
- **Auto:** push to `main` when `client/**` or the workflow/script changes

**Download:** Actions → latest run → Artifacts → `Liturgia-debug-apk`

Optional repo secret `VITE_API_URL` overrides the default Render API URL.

---

## 5. Quick reference — do it again today

### Deploy / update web app

```powershell
git add .
git commit -m "Your message"
git push origin main
```

(Render redeploys from GitHub.)

### Get a fresh APK (no local SDK)

1. Push client changes to `main`, or
2. GitHub → Actions → **Build Android APK** → Run workflow
3. Download the artifact and install on the phone (`adb install` or sideload)

### Build APK locally (if SDK is installed)

```powershell
npm run build:apk
```

### After first Render deploy

Update these to your real Render URL:

1. `client/.env.android` → `VITE_API_URL`
2. GitHub secret `VITE_API_URL` (for Actions APK builds)
3. GitHub secret `RENDER_APP_URL` (for keep-warm workflow)

---

## TL;DR

**GitHub** stores and deploys the web app to **Render**. **Capacitor** packages the same React UI as an Android app that talks to Render over the network. **GitHub Actions** builds the APK in the cloud so you don't need Android Studio on your laptop.
