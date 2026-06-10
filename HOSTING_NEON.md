# Liturgia: Hosting with PostgreSQL (Neon)

Host Liturgia on **Render** with a free **Neon** PostgreSQL database — same pattern as ChoirConnect.

| Component | Provider | Purpose |
|-----------|----------|---------|
| Web app | Render | Node/Express API + React frontend |
| Database | Neon | Persistent PostgreSQL (no expiration on free tier) |

## 1. Create Neon database

1. Go to [neon.tech](https://neon.tech) and create a project (e.g. `liturgia`).
2. Copy the **pooler** connection string:
   ```
   postgresql://neondb_owner:PASSWORD@ep-xxx-pooler.region.aws.neon.tech/neondb?sslmode=require
   ```

## 2. Migrate local data (optional)

If you have data in the old Flask `liturgia.db`:

```powershell
cd C:\Users\vidya.g\Documents\GitHub\Liturgia
$env:DATABASE_URL = "postgresql://..."
npm run migrate-to-postgres
```

## 3. Deploy on Render

1. Create a **Web Service** connected to this GitHub repo.
2. **Build command:** `npm install && npm run build`  
   (TypeScript and Vite are in `client` dependencies so this works with `NODE_ENV=production`.)
3. **Start command:** `npm start`
4. **Environment variables:**
   - `DATABASE_URL` — your Neon connection string (wrap in quotes if needed)
   - `NODE_ENV` — `production`

## 4. Verify

Open `https://YOUR-APP.onrender.com/api/health`:

```json
{ "ok": true, "driver": "postgresql", "host": "ep-....neon.tech", "database": "neondb" }
```

Then open the app URL and confirm members, masses, and schedule data load correctly.

## Local development

```powershell
npm run install-all
npm run dev
```

- API: http://localhost:3000
- UI: http://localhost:5173

Without `DATABASE_URL`, the app uses local SQLite (`liturgia.db`).
