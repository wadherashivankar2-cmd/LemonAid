# Mr.Roast Project Progress & Tracking

## Current Status
- **Current Checkpoint**: CP0 (Housekeeping & Scaffolding)
- **Active Task**: Creating repo structure, `web/` and `api/` scaffolds, environment configurations, and reference notes.

## Roadmap & Milestones

| Checkpoint | Status | Description |
| :--- | :--- | :--- |
| **CP0 Housekeeping** | In Progress | Clean blueprint, scaffolds for `web/` and `api/`, `.env.example`, references notes. |
| **CP1 Data & Models** | Pending | Dev fixtures (30 drafts, intent & safety sets), `build_index.py`, `train_heads.py`, `lint_roasts.py`. |
| **CP2 Backend** | Pending | FastAPI pipeline (/roast, /vote, /stats, /health), rate limits, signatures, fallbacks, Dockerfile. |
| **CP3 Frontend Core** | Pending | Design tokens, Idle -> Loading -> Reveal flow, sound engine, early /health wake up. |
| **CP4 Witty Layer** | Pending | Quips engine, FakeButtons, joke escalation, footer, cookie banner, mood faces, 404/500/utility pages. |
| **CP5 Cards & Sharing** | Pending | RoastCard export, Web Share API, X intent, signed share links, `/s` route, dynamic OG image. |
| **CP6 Hardening** | Pending | Edge cases, safety & retrieval evaluations, accessibility audit, unit & smoke tests, `make check`. |
| **CP7 Deploy Readiness**| Pending | Production builds, Docker build, environment verification, deployment guides. |
| **CP8 v2 Prep** | Pending | Retriever fine-tuning scripts, cross-encoder reranker, humor scorer, spaCy custom NER. |

## Open Questions
- None currently blocking. All requirements specified in `references/blueprint.md` and user directives.

## Human Owner To-Do List (Blocked for Agent)
- [ ] Review and approve production roast bank (`api/data/roasts.json`) – agent strictly marks drafts.
- [ ] Provide human ratings for pair evaluations (`ratings.csv`).
- [ ] Provide support/contact email and verify helpline URL/numbers.
- [ ] Create Hugging Face Space (Docker CPU basic) and configure Space secrets (`ALLOWED_ORIGINS`, `SHARE_SECRET`, `UPSTASH_URL`, `UPSTASH_TOKEN`).
- [ ] Create Upstash Redis database and obtain credentials.
- [ ] Set up free cron-job.org monitor for `/health` ping every 30 minutes.
- [ ] Connect `web/` to Vercel (Root Directory: `web`) and set env vars (`NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SITE_URL`, `SHARE_SECRET`).
