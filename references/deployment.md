# Comprehensive Zero-Cost Deployment Guide

Mr.Roast is engineered to run permanently on **100% free hosting tiers** without requiring external paid LLM APIs or infrastructure credits:
- **Frontend**: [Vercel](https://vercel.com) (Hobby Free Tier)
- **Backend**: [Hugging Face Spaces](https://huggingface.co/spaces) (Docker CPU Basic Free Tier, 2 vCPU / 16 GB RAM)
- **Counters/Rate-Limiting**: [Upstash Redis](https://upstash.com) (Free Serverless Tier, 10k commands/day) or automatic in-memory fallback
- **Keep-Alive**: [cron-job.org](https://cron-job.org) (Free recurring ping every 25 minutes)

---

## 1. Backend Deployment: Hugging Face Space (FastAPI Docker)

### Step 1.1: Create the Space
1. Log in to your [Hugging Face](https://huggingface.co) account.
2. Click **New Space** (`https://huggingface.co/new-space`).
3. Set the following fields:
   - **Space name**: `mrroast-api` (or preferred name).
   - **License**: `mit`.
   - **Space SDK**: **Docker** (Blank template).
   - **Space hardware**: **CPU Basic (Free - 2 vCPU · 16 GB · 50 GB disk)**.
   - **Visibility**: **Public**.
4. Click **Create Space**.

### Step 1.2: Connect Code
You can deploy using either GitHub repository sync or direct git push:
- **Option A (GitHub Sync / Subtree)**: Push the contents of the `api/` directory to the Space repository.
- **Option B (Direct Git remote)**:
  ```bash
  # Inside api/ directory
  git remote add hf https://huggingface.co/spaces/<your-username>/mrroast-api
  git push hf main
  ```

Ensure the Space root contains:
- `Dockerfile` (CPU-only PyTorch, pre-downloaded MiniLM, non-root `appuser:1000`, port 7860).
- `README.md` with Hugging Face front matter:
  ```yaml
  ---
  title: Roast API
  sdk: docker
  app_port: 7860
  ---
  ```
- `requirements.txt`, `main.py`, `rate.py`, `train_heads.py`, `build_index.py`, and `data/`.

### Step 1.3: Configure Space Secrets & Variables
In your Space settings (**Settings > Variables and secrets**):

#### Secrets (Encrypted):
| Secret Name | Value | Description |
| :--- | :--- | :--- |
| `SHARE_SECRET` | `<32-64 char random string>` | Cryptographic secret for HMAC-SHA256 share verification. **Must match frontend `SHARE_SECRET`**. |
| `ALLOWED_ORIGINS` | `https://mr-roast.vercel.app,http://localhost:3000` | Comma-separated list of allowed CORS origins. |
| `UPSTASH_URL` | `https://...upstash.io` *(Optional)* | Upstash Redis REST URL. Leave empty to use in-memory counters. |
| `UPSTASH_TOKEN` | `A...=` *(Optional)* | Upstash Redis REST token. Leave empty to use in-memory counters. |

#### Variables (Public):
| Variable Name | Value | Description |
| :--- | :--- | :--- |
| `RETR_MIN` | `0.30` | Optimal cosine similarity threshold determined by evaluation sweep. |
| `PORT` | `7860` | Server listening port. |
| `ALLOW_DRAFT` | `1` | Enables serving draft roasts during development/evaluations. |

### Step 1.4: Verify Backend Health
Once the container finishes building (typically 2-3 minutes), verify with:
```bash
curl https://<your-username>-mrroast-api.hf.space/health
# Response: {"status":"healthy","model_loaded":true,"index_size":42}
```

---

## 2. Serverless Database: Upstash Redis (Optional)

Mr.Roast automatically falls back to thread-safe in-memory counters if Upstash is not configured. To maintain persistent global counts (`total_roasts_served`, funny/meh/salt reaction votes) across container restarts:

1. Sign up for free at [Upstash](https://console.upstash.com).
2. Click **Create Database**:
   - Name: `mrroast-redis`
   - Type: Regional
   - Region: Select region closest to HF Space (e.g. `us-east-1`)
   - Eviction: None
3. In the database dashboard, scroll to **REST API** section.
4. Copy:
   - `UPSTASH_REDIS_REST_URL` -> configure as `UPSTASH_URL` in Space Secrets.
   - `UPSTASH_REDIS_REST_TOKEN` -> configure as `UPSTASH_TOKEN` in Space Secrets.

---

## 3. Keep-Alive Configuration: cron-job.org

Hugging Face Spaces on the free tier enter sleep mode after 48 hours of inactivity. The Next.js frontend has built-in early waking logic (firing a background ping to `/health` as soon as the user enters text), but you can eliminate cold starts entirely with a free ping service:

1. Register at [cron-job.org](https://cron-job.org) (100% free).
2. Click **Create Cronjob**:
   - **Title**: `Mr.Roast Keep-Alive`
   - **URL**: `https://<your-username>-mrroast-api.hf.space/health`
   - **Schedule**: User-defined / Every `25` minutes (`*/25 * * * *`).
   - **Request Method**: `GET`.
   - **Failure Alerts**: Enable email notification on repeated failure.
3. Save the job. The Space will stay warm 24/7 without consuming paid credits.

---

## 4. Frontend Deployment: Vercel (Next.js 14)

### Step 4.1: Import Repository
1. Log in to [Vercel](https://vercel.com).
2. Click **Add New... > Project**.
3. Select your GitHub repository: `Mr.Roast`.

### Step 4.2: Build & Project Settings
1. **Root Directory**: Click **Edit** and select `web`.
2. **Framework Preset**: Next.js (automatically detected).
3. **Build Command**: `npm run build` (default).
4. **Output Directory**: `.next` (default).
5. **Install Command**: `npm install` (default).

### Step 4.3: Environment Variables
Add the following in the Vercel **Environment Variables** section:

| Variable Name | Example Value | Description |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_API_URL` | `https://<your-username>-mrroast-api.hf.space` | Direct HTTPS URL to your running Hugging Face Space. |
| `NEXT_PUBLIC_SITE_URL` | `https://mr-roast.vercel.app` | Canonical public URL of your Vercel deployment. |
| `SHARE_SECRET` | `<same random string as HF Space>` | Secret used to sign and verify tamper-proof share cards. |

### Step 4.4: Deploy & Verify
1. Click **Deploy**.
2. Vercel will install dependencies, run type checking, and compile production static and dynamic Edge routes (`/api/og`, `/s`).
3. Once deployed, verify:
   - Root page: Serene gratitude journal loads in calm light mode.
   - Enter safe reflection: Triggers instant black burn reveal, sound engine tick/boom, and action buttons.
   - Click "Share on X": Pre-populates signed link.
   - Open `/s?b=...&r=...&sig=...`: Renders verified split card.
   - Alter any query parameter: Displays clean "Invalid Link" fallback card.

---

## 5. Post-Deployment Verification Checklist

- [ ] `GET https://<api-url>/health` returns `200` with `model_loaded: true`.
- [ ] Submitting reflection on Vercel frontend receives roast under 400ms (or shows "Waking up the philosopher..." after 6s cold start).
- [ ] Submitting crisis phrase ("want to end my life") safely diverts to `findahelpline.com` gentle referral card.
- [ ] Submitting grief/loss phrase ("passed away") safely diverts to gentle compassionate message without joke reactions.
- [ ] Social card preview (`https://<site-url>/api/og?b=...&r=...&sig=...`) generates dynamic PNG without Edge errors.
- [ ] Rate limits enforce HTTP 429 when exceeding 20 requests/min.
