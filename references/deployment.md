# Deployment Guide: Vercel & Hugging Face Space

## 1. Backend: Hugging Face Space (Docker CPU Basic)

The FastAPI service runs in a Docker container on Hugging Face Spaces on port 7860.

### Configuration
- Repository type: Space
- SDK: Docker
- Instance: CPU Basic (Free)
- Port: `7860` (defined in `api/README.md` front matter)

### Environment Variables & Secrets
- `ALLOWED_ORIGINS`: Comma-separated allowed frontend origins (e.g., `https://mr-roast.vercel.app,http://localhost:3000`).
- `SHARE_SECRET`: Cryptographic random string matching the Vercel secret for HMAC signing.
- `RETR_MIN`: Retrieval cosine similarity threshold (default `0.40`).
- `RERANK_MIN`: Cross-encoder threshold (default `0.45`).
- `UPSTASH_URL`: (Optional) Upstash Redis REST URL.
- `UPSTASH_TOKEN`: (Optional) Upstash Redis REST Bearer token.

### Free Tier Keep-Alive
- Configure a free monitor on [cron-job.org](https://cron-job.org) to ping `GET /health` every 30 minutes to prevent cold spin-down.

---

## 2. Frontend: Vercel (Next.js 14)

### Configuration
- Framework Preset: Next.js
- Root Directory: `web`
- Node.js Version: 20.x or 22.x

### Environment Variables
- `NEXT_PUBLIC_API_URL`: URL of the Hugging Face Space (e.g., `https://username-roast-api.hf.space`).
- `NEXT_PUBLIC_SITE_URL`: Canonical public URL of the deployed app (e.g., `https://mr-roast.vercel.app`).
- `SHARE_SECRET`: Cryptographic random string matching the backend secret for verifying share cards.
