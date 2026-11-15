# Deploying MedPredict

Three services, one GitHub repo. You push the **whole repo** once; each host is
told which folder is its own.

```
GitHub repo (rohit-anish/medpredict)
├── frontend/  ──►  Vercel   (static site)       https://<name>.vercel.app
├── backend/   ──►  Render   (FastAPI + model)   https://<name>.onrender.com
└── (no folder) ─►  Neon     (Postgres: users and sessions)
```

How they talk to each other:

```
Browser ──► Vercel site ──(VITE_API_URL)──► Render API ──(DATABASE_URL)──► Neon
                         ◄──(ALLOWED_ORIGINS lets the site call the API)──
```

Do the steps **in this order** — each one produces a URL the next one needs.

---

## 0. Push the code to GitHub

From the repo folder (`medpredict/`):

```bash
git rm -r --cached frontend/dist      # build output; Vercel builds its own
git add -A
git status                            # check: no .venv/, no medpredict.db
git commit -m "Auth, home page, clinical redesign, deploy config"
git push origin main
```

---

## 1. Database — Neon (free Postgres)

1. Sign up at **neon.tech** → **Create project**.
   - Region: pick the one closest to where you'll run Render (e.g. both in Singapore,
     or both in US East). Distance between API and database adds delay to every sign-in.
2. On the project dashboard, click **Connect** and copy the connection string. It looks like:
   ```
   postgresql://neondb_owner:XXXX@ep-something-123.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
   ```
   This is your **`DATABASE_URL`**. Treat it like a password: never commit it.

You don't create any tables. The backend creates `users` and `sessions` itself on first start.

**Optional, recommended — test it locally first:**

```bash
cd backend
.venv\Scripts\activate
set DATABASE_URL=postgresql://...your string...        # PowerShell: $env:DATABASE_URL="postgresql://..."
uvicorn main:app --port 8000
```
Register a user in the app, then open Neon's **Tables** view: you should see it in `users`.

---

## 2. Backend — Render

1. Sign up at **render.com** with GitHub → **New → Web Service** → pick the `medpredict` repo.
2. Settings:

   | Field | Value |
   |---|---|
   | Root Directory | `backend` |
   | Runtime | Python |
   | Build Command | `pip install -r requirements.txt` |
   | Start Command | `uvicorn main:app --host 0.0.0.0 --port $PORT` |
   | Health Check Path (Advanced) | `/health` |
   | Instance type | Free (sleeps when idle) or Starter ($7/mo, always on) |

3. **Environment variables** (Environment tab):

   | Key | Value | Why |
   |---|---|---|
   | `DATABASE_URL` | the Neon string from step 1 | store users in Postgres, not on Render's temporary disk |
   | `ALLOWED_ORIGINS` | `http://localhost:3000` for now | updated in step 4 |
   | `PYTHON_VERSION` | `3.14.7` | matches the version this was tested on |

4. **Create Web Service** and wait for the build. Your API URL is shown at the top,
   e.g. `https://medpredict-api.onrender.com`.
5. Check it: open `https://<your-api>.onrender.com/health` → `{"status":"ok"}`.
   That proves the model loaded **and** the database connection works.

> Free tier: the service sleeps after ~15 min without traffic. The first request after that
> takes 30–60 s while it wakes; the app shows "It may be waking up — try again in a minute".

---

## 3. Frontend — Vercel

1. Sign up at **vercel.com** with GitHub → **Add New → Project** → import `medpredict`.
2. Settings:

   | Field | Value |
   |---|---|
   | Root Directory | `frontend` (click **Edit** next to it) |
   | Framework Preset | Vite (auto-detected) |
   | Build Command | `npm run build` |
   | Output Directory | `dist` |

3. **Environment Variables** — add **before** clicking Deploy:

   | Key | Value |
   |---|---|
   | `VITE_API_URL` | your Render URL, e.g. `https://medpredict-api.onrender.com` (no trailing `/`) |

   Vite bakes this into the site at build time. If you change it later, you must
   **redeploy** (Deployments → ⋯ → Redeploy) for it to take effect.

4. **Deploy.** Your site URL appears when it finishes, e.g. `https://medpredict.vercel.app`.

---

## 4. Connect them — allow the site to call the API

Back in **Render → Environment**, set:

| Key | Value |
|---|---|
| `ALLOWED_ORIGINS` | `https://medpredict.vercel.app` (your exact Vercel URL, no trailing `/`) |

Save → Render redeploys automatically. For several sites (e.g. a custom domain later),
separate them with commas: `https://medpredict.vercel.app,https://www.yourdomain.com`.

---

## 5. Test the live site

1. Open your Vercel URL → **Create account** → register a new user.
2. You land on the dashboard. Turn **Demo** off → **Predict health risk** → a real model result.
3. **Log out** → sign in again with the same account.

### If something fails

| Symptom | Cause | Fix |
|---|---|---|
| "Can't reach the server" every time | Wrong `VITE_API_URL`, or Render still asleep/building | Check the URL in Vercel env vars, redeploy; open `/health` directly |
| Browser console: *blocked by CORS policy* | `ALLOWED_ORIGINS` doesn't exactly match the site URL | Copy the Vercel URL exactly (https, no trailing `/`) |
| `/health` returns 500 | `DATABASE_URL` wrong or Neon project paused | Re-copy the string from Neon → Connect |
| Users disappear after a redeploy | `DATABASE_URL` not set, so it fell back to SQLite on Render's temporary disk | Set `DATABASE_URL` |
| Render build fails on Python version | Render doesn't offer that exact version | Set `PYTHON_VERSION` to `3.13.9` and redeploy |

---

## Environment variables at a glance

| Where | Variable | Local dev | Production |
|---|---|---|---|
| Render | `DATABASE_URL` | *(unset → SQLite file)* | Neon connection string |
| Render | `ALLOWED_ORIGINS` | *(unset → localhost)* | your Vercel URL |
| Render | `PYTHON_VERSION` | — | `3.14.7` |
| Vercel | `VITE_API_URL` | *(unset → http://localhost:8000)* | your Render URL |

After setup, every `git push` to `main` redeploys both Vercel and Render automatically.
