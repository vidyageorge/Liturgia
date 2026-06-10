# Liturgia

**Sacred Ministry Roster for St. Mathias English Community**

Manage church readers, liturgy assignments, and special event planning.

## Stack

- **Backend:** Node.js + Express
- **Frontend:** React + TypeScript + Vite
- **Database:** SQLite (local) or PostgreSQL on [Neon](https://neon.tech) (production)

## Local setup

```powershell
git clone <repository-url>
cd Liturgia
npm run install-all
npm run dev
```

- UI: http://localhost:5173
- API: http://localhost:3000/api/health

## Production (Render + Neon)

See [HOSTING_NEON.md](HOSTING_NEON.md) for database setup and [DEPLOYMENT.md](DEPLOYMENT.md) for the full web → GitHub → Render → Android APK guide.

## Android APK

Liturgia can be installed on Android as a Capacitor-wrapped WebView app that talks to your hosted Render API.

| Method | Command / location |
|--------|-------------------|
| GitHub Actions (no SDK needed) | Actions → **Build Android APK** → download artifact |
| Local build (needs Android SDK) | `npm run build:apk` → `Liturgia-debug.apk` |

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start API + React dev servers |
| `npm run build` | Build React app for production |
| `npm start` | Run production server |
| `npm run build:apk` | Build Android debug APK (local SDK required) |
| `npm run migrate-to-postgres` | Copy `liturgia.db` data to Neon |

## Features

- Reader and member management
- Mass scheduling with role assignments
- Special events (Christmas, Easter, Maundy Thursday apostles, All Souls Day, etc.)
- Mass history and Excel export
- Change log for audit trail
- Community roles (liturgy, choir, catechism, volunteers)

## Legacy Python app

The original Flask app (`app.py`, `models.py`, `templates/`) is kept for reference. Use the Node app above for all new development and hosting.
