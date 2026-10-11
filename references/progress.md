# Mr.Roast Project Progress & Tracking

## Current Status
- **Current Checkpoint**: CP6 (Hardening & Audits) Complete -> Moving to CP7 (Deploy Readiness)
- **Active Task**: Benchmarks (safety 200-case 100% recall / 5% false block, RETR_MIN sweep recall@3 100%, 100-request repeat test 0 repeats), a11y & edge-case hardening, and unified check.py runner verified.

## Roadmap & Milestones

| Checkpoint | Status | Description |
| :--- | :--- | :--- |
| **CP0 Housekeeping** | Done (Tagged) | Clean blueprint, scaffolds for `web/` and `api/`, `.env.example`, references notes. |
| **CP1 Data & Models** | Done (Tagged) | Dev fixtures (32 drafts, intent & safety sets), `lint_roasts.py` clean, heads trained, index built. |
| **CP2 Backend** | Done (Tagged) | FastAPI pipeline (/roast, /vote, /stats, /health), rate limits, signatures, fallbacks, smoke tests pass. |
| **CP3 Frontend Core** | Done (Tagged) | Design tokens, Idle -> Loading -> Reveal flow, sound engine, early /health wake up, live API tested. |
| **CP4 Witty Layer** | Done (Tagged) | Quips engine, FakeButtons, joke escalation, footer, cookie banner, mood faces, 404/error/utility pages. |
| **CP5 Cards & Sharing** | Done (Tagged) | RoastCard export, Web Share API, X intent, signed share links, `/s` route, dynamic OG image. |
| **CP6 Hardening** | Done (Tagged) | Edge cases, safety & retrieval evaluations, accessibility audit, unit & smoke tests, `check.py`. |
| **CP7 Deploy Readiness**| Next | Production builds, Docker build, environment verification, deployment guides. |
| **CP8 v2 Prep** | Pending | Retriever fine-tuning scripts, cross-encoder reranker, humor scorer, spaCy custom NER. |

## Open Questions
- None currently blocking.

## Human Owner To-Do List (Blocked for Agent)
- [ ] Review and approve production roast bank (`api/data/roasts.json`) – agent strictly marks drafts.
- [ ] Provide human ratings for pair evaluations (`ratings.csv`).
- [ ] Provide support/contact email and verify helpline URL/numbers.
- [ ] Create Hugging Face Space (Docker CPU basic) and configure Space secrets (`ALLOWED_ORIGINS`, `SHARE_SECRET`, `UPSTASH_URL`, `UPSTASH_TOKEN`).
- [ ] Create Upstash Redis database and obtain credentials.
- [ ] Set up free cron-job.org monitor for `/health` ping every 30 minutes.
- [ ] Connect `web/` to Vercel (Root Directory: `web`) and set env vars (`NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SITE_URL`, `SHARE_SECRET`).
