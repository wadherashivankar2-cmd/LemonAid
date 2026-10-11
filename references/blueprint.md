\# Gratitude Journal Roast App: Build Spec (agent reference)



A fake "mindful" wellness journal asks what made the user happy, then replies with a dry, internet-native roast. 100% free hosting, no commercial LLM APIs, no accounts.



This file is the single source of truth. Work phase by phase. Do not start a phase until the previous phase's gate passes.



\---



\## 0. Agent operating rules



1\. Build in the order of the phases below. After each task, run its check, then commit with the task ID in the message (for example `P1.3: backend retrieval`).

2\. Free only. Never add a paid service, paid API key, or commercial LLM call.

3\. Never store or log user text. Only anonymous counters keyed by roast ID may be stored. Never `print()` or log request bodies.

4\. Roast content is human-approved only. You may draft roasts with `"status": "draft"`. Never set `"status": "approved"` yourself. Items marked \*\*\[HUMAN]\*\* need the owner.

5\. Safety first. Sensitive or sad input never gets a roast, a black flash, a boom sound, or joke buttons.

6\. Copy text in the appendix (quips, 404 lines, changelog) is final. Do not rewrite it unless asked.

7\. Do not guess library props. For React Bits, Watermelon UI, shadcn, spaCy, sentence-transformers, TRL, and Unsloth, read the current docs or the demo page before using an API.

8\. Keep secrets in env vars. Never commit tokens or `SHARE\_SECRET`.

9\. Prefer the smallest change that passes the check. Keep `MODELS.md` and the test results current.

10\. If a gate fails, fix it and rerun. Do not lower a threshold to make it pass. If a threshold looks wrong, stop and ask the owner.



\---



\## 1. Product contract



\- One text box, one button, one roast. No signup, no email capture, no login.

\- Idle screen is calm and sincere (beige, serif, slow pulse). Reveal is an instant cut to black, a boom, and the roast popping in word by word.

\- Roast the situation (work culture, hustle culture, the brag itself), never bodies, identities, looks, or real named people.

\- Humor lives in a curated roast bank. Models only choose which roast to show.

\- Every joke button (Report, Not helpful, Contact support, and so on) looks like a real SaaS control and answers deadpan.

\- A shareable split card is generated for every roast (light top with the entry, black bottom with the burn).

\- Footer promise: "Private. No account. Nothing is stored." This must stay literally true.



\### Tiers



| Tier | Ships | Models |

| --- | --- | --- |

| v1 | Retrieval, intent and safety heads, full UI, witty layer, cards, share links | Intent head, safety head |

| v2 | Fine-tuned retriever, cross-encoder reranker, humor scorer, custom NER, vote loop | Bi-encoder, reranker, scorer, spaCy NER |

| v3 (optional) | LoRA generator that riffs on retrieved roasts, with a quality gate | Qwen2.5-0.5B or 1.5B + LoRA |



\---



\## 2. Architecture and repo layout



```

Browser (Next.js 14 on Vercel)

&#x20;  |  POST /roast, /vote   GET /stats/{id}, /health

&#x20;  v

FastAPI service (Docker on Hugging Face Space, CPU basic, port 7860)

&#x20;  1 safety gate -> 2 embed once -> 3 retrieve -> 4 rerank+score -> 5 slot-fill -> 6 (v3) generate

&#x20;  side services: Upstash Redis (anonymous counters), cron-job.org (/health ping), HF Hub model repo

```



Repo layout (monorepo):



```

roast-app/

&#x20; BLUEPRINT.md                      # this file

&#x20; MODELS.md                         # model versions + test results

&#x20; api/

&#x20;   main.py  build\_index.py  train\_heads.py  eval.py  rate.py  lint\_roasts.py

&#x20;   requirements.txt  Dockerfile  README.md   # README has HF Space front matter

&#x20;   data/

&#x20;     roasts.json  intent\_train.csv  safety\_train.csv  test\_inputs.csv

&#x20;     ratings.csv  blocklist.txt  index/     # index/ is generated

&#x20;   models/                         # intent.joblib, safety.joblib, v2 models

&#x20; web/

&#x20;   app/ (page.tsx, layout.tsx, not-found.tsx, error.tsx, s/page.tsx,

&#x20;         privacy/, terms/, status/, changelog/, api/og/route.tsx)

&#x20;   components/ (RoastCard, RoastActions, FakeButton, QuipHost, WittyFooter, Chrome)

&#x20;   lib/ (sound.ts, quips.ts, share.ts, sig.ts, fonts.ts)

```



\---



\## 3. Interfaces and constants



\### API contract



| Endpoint | Request | Response |

| --- | --- | --- |

| `POST /roast` | `{ "happy\_thought": string }`, 3 to 200 chars | `{ "kind": "roast", "text", "id", "category", "brag", "sig" }` or `{ "kind": "gentle", "text" }`; `429 { "detail" }` when rate limited |

| `POST /vote` | `{ "roast\_id": string, "kind": "funny" or "meh" or "salt" }` | `{ "count": number }`; `404` for an unknown roast ID |

| `GET /stats/{roast\_id}` | none | `{ "funny", "meh", "salt", "served" }` |

| `GET /health` | none | `{ "ok": true }` |



\### Roast record (`api/data/roasts.json`)



```json

{

&#x20; "id": "career-007",

&#x20; "category": "career",

&#x20; "anchors": \["I got promoted today", "I became a senior associate"],

&#x20; "paraphrases": \["my title just changed on LinkedIn"],

&#x20; "roast": "Congratulations on the new title. Same salary, more meetings, and a Slack channel you cannot mute.",

&#x20; "slots": \[],

&#x20; "tone": "deadpan",

&#x20; "status": "approved"

}

```



\- `status` is `draft`, `approved`, or `cut`. Only `approved` is indexed.

\- Slot keys usable in `roast` text: `{org}`, `{amount}`, `{distance}`, `{grade}`, `{num}`. A roast is eligible only if every slot it uses was extracted from the input.

\- `category: "generic"` roasts have no anchors and no slots. They are the fallback.

\- Categories: career, placements, academics, fitness, dating, money, productivity, tech, hackathons, social, food, travel, generic.



\### Pipeline logic for `POST /roast` (exact order)



1\. Rate limit per IP (20 per minute). Validate length.

2\. If the safety regex matches, return a gentle reply.

3\. Embed the input once with the retriever (normalized).

4\. If `P(sensitive) > 0.35` (safety head) or `P(sad) > 0.5` (intent head), return a gentle reply.

5\. Cosine similarity against all anchor vectors (`anchor\_vecs @ q`). Per roast, take the max over its anchors and paraphrases.

6\. Take the top 10 roasts with similarity at or above `RETR\_MIN`. Keep only roasts whose slots can all be filled. Render each with the extracted slots.

7\. If a reranker exists, score each (input, rendered roast) pair. Else use the similarity. If a humor scorer exists, `prior = (scorer.predict(embed(roast)) - 1) / 4`, else 0.

8\. `final = 0.8 \* rerank + 0.2 \* prior`. Drop candidates whose rerank score is below `RERANK\_MIN` (use `RETR\_MIN` when there is no reranker).

9\. Remove roast IDs served in the last 25 requests, unless that empties the pool.

10\. Sample one from the top 3 with weights `exp(8 \* final)`, normalized.

11\. If nothing remains, pick a random `generic` roast.

12\. Return the roast plus `brag` (the stripped input) and `sig`. Increment `served:total` in the background.



Safety regex (case-insensitive, word boundaries): died, death, passed away, funeral, cancer, diagnos\*, suicid\*, kill myself, self harm, miscarriage, abus\*, assault\*, rape\*, laid off, fired, divorc\*, hospital, overdose. Add a separate crisis branch for self-harm terms that returns a calm message pointing to a helpline directory such as findahelpline.com. \*\*\[HUMAN]\*\* must verify that link and any local numbers.



\### Constants



| Name | Default | Notes |

| --- | --- | --- |

| `RETR\_MIN` | 0.40 | Tune with `eval.py` sweep |

| `RERANK\_MIN` | 0.45 | Tune after reranker exists |

| Safety gate | 0.35 on `sensitive` | Favor recall |

| Sad gate | 0.50 on `sad` | |

| Recent-served window | 25 | In-memory deque |

| Rate limits | 20 per minute on `/roast`, 30 per minute on `/vote` | Per IP, from `x-forwarded-for` |

| Max input | 200 chars | Server and textarea |



\### Environment variables



| Variable | Where | Purpose |

| --- | --- | --- |

| `ALLOWED\_ORIGINS` | Space secret | CORS allow-list (the Vercel URL) |

| `RETR\_MIN`, `RERANK\_MIN` | Space variable | Thresholds |

| `UPSTASH\_URL`, `UPSTASH\_TOKEN` | Space secret | Vote counters (optional; falls back to in-memory) |

| `SHARE\_SECRET` | Space secret and Vercel env | HMAC for share links |

| `NEXT\_PUBLIC\_API\_URL` | Vercel env | Space URL |

| `NEXT\_PUBLIC\_SITE\_URL` | Vercel env | Public site URL |



\### Share-link signature (must match on both sides)



\- `sig = hex(HMAC-SHA256(SHARE\_SECRET, brag + "\\n" + roast))\[:32]`

\- Share URL: `{SITE}/s?b=<base64url(brag)>\&r=<base64url(roast)>\&sig=<sig>`

\- Backend signs in Python. The web verifies with Web Crypto (works on Node 20+ and edge). Only signed pairs render on `/s` and in `/api/og` (1200x630 `ImageResponse`, edge runtime). Unsigned or invalid links show a neutral fallback.



\---



\## 4. Phase 0: Scaffold



Goal: both apps build and deploy empty.



\- \[ ] P0.1 Create the repo layout above. Add `.gitignore` (node\_modules, `.env\*`, `\_\_pycache\_\_`, `api/models/\*` large weights).

\- \[ ] P0.2 `web/`: `npx create-next-app@latest web --ts --tailwind --app`, then `npx shadcn@latest init`. Install `html-to-image`.

\- \[ ] P0.3 `api/`: Python 3.11 venv. `requirements.txt`: fastapi, uvicorn\[standard], sentence-transformers, spacy, numpy, scikit-learn, joblib, httpx, huggingface\_hub, pandas.

\- \[ ] P0.4 `api/README.md` starts with this front matter so Hugging Face builds the Docker image:

&#x20; ```

&#x20; ---

&#x20; title: Roast API

&#x20; sdk: docker

&#x20; app\_port: 7860

&#x20; ---

&#x20; ```

\- \[ ] P0.5 Add a `GET /health` stub and deploy the Space and the Vercel app.



Gate 0: `/health` returns `{ "ok": true }` from the live Space URL, and the Vercel site loads.



\---



\## 5. Phase 1 (v1): launchable in about a week



\### P1.1 Data \*\*\[HUMAN-led]\*\*

\- \[ ] Owner writes 100 to 150 roasts across the categories (3 anchors each) plus 25 generic fallbacks. Agent may produce `draft` roasts to edit, never `approved`.

\- \[ ] `intent\_train.csv` (`text,label`): about 50 lines each of `brag`, `sad`, `neutral`. Include near-misses such as "I ran 5k today" (brag) vs "I can't run 5k and I feel awful" (sad).

\- \[ ] `safety\_train.csv` (`text,label`): `sensitive` vs `fine`, 100 lines.

\- \[ ] `test\_inputs.csv` (`text,ok\_ids`): 60 realistic inputs with lowercase, typos, slang. `ok\_ids` are acceptable roast IDs separated by `|`. Empty means "should fall back".

\- \[ ] `blocklist.txt` of banned words.

\- \[ ] Write `lint\_roasts.py`: schema check, roast length at most 200 chars (target 140), at least 3 anchors, slots declared match slots used, blocklist hit fails, roast pairs with similarity above 0.85 flagged. Run it in CI.



Roast writing rules (for drafts): be specific (Jira, standup, LinkedIn, per-my-last-email), reframe the cost of the brag, understate, no exclamation marks or emoji, land the turn last, at most one slot, internet-native not pun-based. Never protected traits, bodies, grief, illness, money hardship, or factual claims about named companies.



\### P1.2 Heads

\- \[ ] `train\_heads.py <csv> <out.joblib>`: embed with `sentence-transformers/all-MiniLM-L6-v2` (normalized), `LogisticRegression(max\_iter=2000, C=4, class\_weight="balanced")`, print a 5-fold cross-validated classification report, save the model.

\- \[ ] Train `models/intent.joblib` (brag, sad, neutral) and `models/safety.joblib` (sensitive, fine). Record scores in `MODELS.md`.



\### P1.3 Index and backend

\- \[ ] `build\_index.py \[retriever-path]`: load approved roasts, embed anchors plus paraphrases (normalized, float32), write `data/index/roasts.json`, `anchor\_vecs.npy`, `anchor\_owner.npy`.

\- \[ ] `main.py`: implement the pipeline in section 3. Optional v2 models load only if their files exist. Counters call Upstash REST (`/incr/{key}`, `/get/{key}`, bearer token, 2 s timeout) and fall back to an in-memory dict on any error. CORS from `ALLOWED\_ORIGINS`.

\- \[ ] `eval.py`: encode `test\_inputs.csv`, sweep `RETR\_MIN` from 0.30 to 0.60 in 0.05 steps, print recall@3, fallback rate, and wrong-match rate, and write `data/to\_rate.csv` (top 5 roasts per input).

\- \[ ] `safety\_eval.py`: run the 200-case safety set through the full pipeline and report recall on sensitive and false-block rate.



\### P1.4 Deploy backend

\- \[ ] `Dockerfile`: python:3.11-slim, non-root user (uid 1000), CPU-only torch from the PyTorch CPU index, `pip install -r requirements.txt`, `python -m spacy download en\_core\_web\_sm`, pre-download MiniLM, copy the repo, expose 7860, `uvicorn main:app --host 0.0.0.0 --port 7860`.

\- \[ ] Push to the Space. Set secrets and variables. \*\*\[HUMAN]\*\* creates the Space and the Upstash database.

\- \[ ] \*\*\[HUMAN]\*\* Create a cron-job.org job: GET `/health` every 30 minutes.



\### P1.5 Frontend core

\- \[ ] Design tokens in `globals.css`: `:root` calm theme (`--bg #f6efe6`, `--card #fffaf3`, `--ink #2b2622`, `--muted #8a7f74`, `--accent #e9b9b1`) and `\[data-theme="burn"]` (`--bg #000`, `--card #0a0a0a`, `--ink #fff`, `--muted #8a8a8a`, `--accent #ff2a2a`). Add `@media (prefers-reduced-motion: reduce) { \* { animation: none !important; transition: none !important; } }`.

\- \[ ] Fonts through `next/font/google` in `lib/fonts.ts`: Instrument Serif (calm), Archivo Black (burn headline), Space Mono (burn body).

\- \[ ] Tailwind extras: `pulse-slow` (4 s ease-in-out, scale 1 to 2.2) and `pop` (0.25 s, translateY 8px and scale .96 to none).

\- \[ ] UI libraries: React Bits (BlurText for the headline, soft background optional) and Watermelon UI (pill button, breadcrumb, badge, disabled button), installed through the shadcn CLI (`npx shadcn@latest add @react-bits/BlurText-TS-TW`). Read each component's page for props. Keep license headers.

\- \[ ] `lib/sound.ts`: Web Audio, no files. `tick()` is a 0.12 s sine blip (520 to 700 Hz, gain 0.04). `boom()` is a 140 to 40 Hz sine drop over 0.6 s (gain 0.9, 0.9 s decay) plus a 0.25 s noise burst (gain 0.25). Global `setMuted`/`isMuted`. Show an "Ambient sound: on/off" pill top-right.

\- \[ ] `app/page.tsx` state machine (`idle`, `loading`, `reveal`):

&#x20; - Idle: pulse dot, BlurText headline "Take a deep breath. Reflect on the light in your life.", subline "What brought you genuine peace or pride today?", textarea (200 max, placeholder "Today I felt grateful for..."), pill button "Save to Heart", line "Private. No account. Nothing is stored.". Typing plays `tick()` at most once every 90 ms.

&#x20; - Submit: loading text "Reflecting on your journey...". Minimum 2000 ms, run `fetch` in parallel with the delay. After 6 s change the text to "Aligning your energy... (the server is waking up)". Abort at 60 s.

&#x20; - Reveal (roast): set `data-theme="burn"` with no transition, play `boom()` in an effect, show the roast word by word (40 ms stagger), then show actions after 600 ms.

&#x20; - Reveal (gentle, or any error/429): stay calm, no sound, no card, no joke buttons, only a "Back" button. 429 text: "Slow down. Inner peace takes time." Other errors: "The universe is buffering. Try again in a moment."

&#x20; - On page load, fire a background `fetch(API + "/health")` to wake the Space.

&#x20; - Textarea notes: at 180 chars "You have so much to say about so little."; at 200 "That is the limit. Gratitude is finite."; empty submit shakes the box with "Even a moment of gratitude needs at least 3 characters."

\- \[ ] Set `aria-live="polite"` on the reveal area. Tap targets at least 44 px. Preload both fonts.



\### P1.6 Witty layer

Build the engine from the appendix copy bank.

\- \[ ] `lib/quips.ts`: `QUIPS` map, `quip(key, vars)`, `onQuip(listener)`. The reply index is `min(clickCount - 1, list.length - 1)` per key (escalates, then repeats the last line). Replace `{n}` with the click count and `{salt}`/`{stars}` with passed vars (default "Several").

\- \[ ] `components/QuipHost.tsx`: toast stack, bottom center, `role="status"`, max 3, auto-dismiss after 4.5 s.

\- \[ ] `components/FakeButton.tsx`: props `id`, `children`, `className`, `busy` (default "Submitting..."), `run?: () => Promise<vars | void>`. On click show the busy label, run `run()` in parallel with a 500 to 900 ms delay, then call `quip(id, vars)`.

\- \[ ] `components/RoastActions.tsx`: buttons Helpful (vote `funny`), Not helpful (vote `meh`), Share on X, Download Card, Report (vote `salt`, passes `{salt: count}`), Again. Votes go to `POST /vote` and swallow errors.

\- \[ ] `components/WittyFooter.tsx`: real links to `/privacy`, `/terms`, `/status`, `/changelog`; FakeButtons for Careers, Press, Contact support, Help; a plain `mailto:` link "Report a real problem" (\*\*\[HUMAN]\*\* supplies the address).

\- \[ ] `components/Chrome.tsx` (mounted in `layout.tsx`): QuipHost, a cookie banner after 2.5 s with two buttons both labeled "Accept all" that call `quip("cookies")`, a tab-blur title swap ("Come back. Your journey is not finished."), a Konami code (`quip("konami")`), and one `console.log` message from the appendix.

\- \[ ] Mood faces under the textbox: five faces. Any pick calls `quip("mood")`. The two sad faces call `quip("moodSad")` and force the next submit to return the gentle reply without calling the API.

\- \[ ] Pages: `not-found.tsx`, `error.tsx`, `/privacy`, `/terms`, `/status` (calls `/health` with an 8 s timeout), `/changelog` with the appendix copy. Add a rate-limit state and an offline banner driven by `navigator.onLine`.

\- \[ ] Joke buttons never render on gentle replies.



\### P1.7 Cards and sharing

\- \[ ] `components/RoastCard.tsx`: `id="roast-card"`, max width 540. Top (`#f6efe6`, serif) shows the label "What made me happy" and the entry. Bottom (`#000`, Archivo Black) shows "The burn" in `#ff2a2a` and the roast, with the site URL watermark at the bottom right.

\- \[ ] `lib/share.ts`: `downloadCard()` runs `toPng` once as a font warm-up, then again with `pixelRatio: 2` and `cacheBust: true`, saved as `my-gratitude.png`. `shareCard()` uses the Web Share API with the file when supported, else downloads. `shareX(text)` opens `https://x.com/intent/post?text=` with "I logged my gratitude and got this instead:" plus the roast and the signed share link. `setCurrentShare(res)` is called after each successful roast.

\- \[ ] `lib/sig.ts` (`enc`, `dec`, `verify`), `app/api/og/route.tsx`, and `app/s/page.tsx` with `generateMetadata` setting `openGraph` and `twitter` (`summary\_large\_image`) images. Set `metadataBase` from `NEXT\_PUBLIC\_SITE\_URL`.

\- \[ ] Backend: add `sign()` and return `brag` and `sig`.



\### P1.8 Safety, privacy, abuse

\- \[ ] Confirm `main.py` logs no request bodies. Confirm only counters are written to Upstash.

\- \[ ] Privacy page text: "We do not store what you type. We store anonymous vote counts per roast. That is all." plus "If you share a link, the text in it is public."

\- \[ ] Terms page includes: "Gratitude Journal is a comedy project, not a wellness or mental-health service."

\- \[ ] Crisis branch implemented (see section 3).



\### P1.9 Gate 1 (all must pass)

\- \[ ] Safety set (200 inputs): recall on `sensitive` at least 98%, fine inputs wrongly blocked at most 10%.

\- \[ ] Retrieval set: recall@3 at least 85%, wrong-topic top-1 under 5%.

\- \[ ] p95 latency under 1.5 s when warm.

\- \[ ] No repeat within 10 requests in a 100-input same-category run.

\- \[ ] Tested by \*\*\[HUMAN]\*\* on iPhone Safari and Android Chrome: sounds, card export, share.

\- \[ ] Privacy page matches the code.



\---



\## 6. Phase 2 (v2): smarter models



Gate 1 must be passed. Every model is versioned (`models/retriever-v1`, `reranker-v1`, and so on), pushed to a public Hugging Face Hub model repo, and pulled in at Docker build time. Log each model's test results in `MODELS.md`.



\- \[ ] P2.1 \*\*\[HUMAN-led]\*\* Grow data: 400+ roasts, 10+ paraphrases per roast (include typos and slang), intent and safety sets to 1,500 lines each, `test\_inputs.csv` to 200. Retrain both heads and record scores.

\- \[ ] P2.2 Retriever fine-tune. Positive pairs are any two different phrasings (anchors plus paraphrases) of the same roast. Use `MultipleNegativesRankingLoss` with `NoDuplicatesDataLoader` (batch 32, 3 epochs, warmup 100) from `all-MiniLM-L6-v2`. Hold out 20% of paraphrases. Report recall@1, @3, @10 for base vs fine-tuned. Keep it only if it wins. Rebuild the index and retrain both heads on the new embeddings. Rerun the threshold sweep.

\- \[ ] P2.3 \*\*\[HUMAN]\*\* Rate 500 (input, roast) pairs from `to\_rate.csv` with `rate.py` (shuffled, blind, 1 to 5; 1 = wrong or unfunny, 3 = fits, 5 = would screenshot). Use at least 2 raters. Discard pairs where raters differ by 3 or more. Save to `ratings.csv`.

\- \[ ] P2.4 Cross-encoder reranker. Base `cross-encoder/ms-marco-MiniLM-L-6-v2`, `num\_labels=1`, label `(rating - 1) / 4`, batch 16, 3 epochs. Compare top-1 mean human rating with and without it on held-out data.

\- \[ ] P2.5 Humor scorer: `Ridge(alpha=1.0)` from the roast's normalized embedding to its mean rating. Report Spearman on an 80/20 split. Use it to flag roasts below 3.0, to prior the ranking, and to gate generated text in v3.

\- \[ ] P2.6 Custom NER with spaCy: generate 1,500 synthetic sentences from at least 15 templates and large lists (150+ companies, amounts such as "20 LPA", "12 lakhs", "$120k", distances such as "5k", "10 km", grades such as "9.1 CGPA"). Labels: COMPANY, AMOUNT, DISTANCE, GRADE. Train with `spacy init config` and `spacy train`. Build the dev set from hand-written sentences. Keep regex as fallback.

\- \[ ] P2.7 Vote loop: weekly script reads `/stats/{id}` for every roast and lists the bottom 10% by `funny / (funny + meh)`. `salt` is a virality signal, not quality.

\- \[ ] P2.8 Add a regression test (see section 8) and wire it to GitHub Actions.



Gate 2 (all must pass before v3):

\- \[ ] Mean human rating of top-1 at least 3.8 out of 5, with at least 60% of ratings 4 or higher.

\- \[ ] Entity F1 at least 0.90 on the hand-written dev set.

\- \[ ] Safety recall still at least 98%.

\- \[ ] Retrieval recall@3 at least 85% and wrong-topic top-1 under 5%.



\---



\## 7. Phase 3 (v3, optional): LoRA generator



Only start after Gate 2. The generator never replaces retrieval.



\- \[ ] P3.1 \*\*\[HUMAN]\*\* Curate 800 to 2,000 (input, roast) pairs. Each is hand-edited. Reject any roast scoring under 3.5 on the humor scorer. If any outside tool drafted lines, the owner confirms its terms allow this use, and rewrites every line.

\- \[ ] P3.2 Prompt format: `Roast this happy thought in one dry, internet-native sentence. Aim at the situation, not the person.\\nThought: {input}\\nRoast: {roast}`.

\- \[ ] P3.3 Train a LoRA (rank 16) on Qwen2.5-0.5B-Instruct (or 1.5B-Instruct) on a free Colab or Kaggle GPU with Unsloth or TRL. Follow the current library docs for argument names.

\- \[ ] P3.4 Convert to GGUF, quantize to Q4\_K\_M, serve with `llama-cpp-python` in the Space. Measure real latency on the 2 vCPU tier. Keep v3 only if the whole request stays acceptable. Retrieved roasts may display immediately while generation is optional.

\- \[ ] P3.5 Gate: sample 4 candidates at temperature 0.9, drop any that fail the safety regex or blocklist, score the rest with the humor scorer, serve the best only if it clears the bar; otherwise serve the retrieved roast.

\- \[ ] P3.6 Re-run the full regression suite and the safety set. Safety recall must stay at least 98%.



\---



\## 8. Self-improvement loop (agent-runnable)



Run these after every change and before every deploy. Put them behind one command (`make check`) and a free GitHub Actions workflow.



| Check | Command | Fails when |

| --- | --- | --- |

| Roast lint | `python lint\_roasts.py` | Schema error, roast over 200 chars, under 3 anchors, undeclared slot, blocklist hit, near-duplicate pair above 0.85 similarity |

| Retrieval sweep | `python eval.py` | Wrong-match above 5% or fallback above about 25% at the chosen `RETR\_MIN` |

| Safety eval | `python safety\_eval.py` | Sensitive recall below 98% or false blocks above 10% |

| Entity eval (v2) | `python ner\_eval.py` | Entity F1 below 0.90 |

| Repeat test | `python repeat\_test.py` | A roast repeats within 10 requests |

| API smoke | start the server and POST a safe input, a sensitive input, a 201-char input, and 21 rapid requests | Missing roast, a roast on the sensitive input, no 422 on long input, no 429 on the burst |

| Web build | `npm run build` and `npm run lint` in `web/` | Any error |



Agent tasks that are safe to run on its own:

\- Draft new roasts as `draft` for the owner to review, targeting categories or inputs that fall back to `generic` most often.

\- Generate paraphrases of existing anchors as `draft` suggestions.

\- Run the threshold sweep and propose a `RETR\_MIN` change with the numbers, without applying a lowered safety threshold.

\- Add test inputs to `test\_inputs.csv` for any bug found.

\- Keep `MODELS.md` in sync with the latest results.



Human-only tasks: approving roasts, rating pairs, choosing thresholds that trade safety for coverage, creating cloud accounts and secrets, supplying the contact email and helpline details, launching.



\---



\## 9. Appendix



\### A. Copy bank (final)



```ts

export const QUIPS: Record<string, string\[]> = {

&#x20; report: \['Report received. Cry more, kiddo.',

&#x20;   '{salt} people have reported this roast. None were taken seriously.',

&#x20;   'Your report has been escalated to nobody.',

&#x20;   'Trust and Safety will review your report in 3 to 5 business years.',

&#x20;   'Still reporting? Impressive stamina.', 'Have you considered a hobby?'],

&#x20; meh: \['Feedback noted. Feedback filed. Feedback ignored.',

&#x20;   'We have noted your disappointment. It joins the others.',

&#x20;   'Understood. The roast will try less hard. It will not.'],

&#x20; funny: \['Glad that landed. Your enjoyment has been logged.',

&#x20;   'Easy. You have rated this {n} times.', 'Fine, you like it. Please stop telling us.'],

&#x20; human: \['All of our humans are in standups. Estimated wait: 6 to 8 business years.',

&#x20;   'You are now number 48,213 in the queue.', 'Your call is important to us. It has been placed in a folder.'],

&#x20; pro: \['Pro is coming soon. It will include the same roast, but billed.',

&#x20;   'Pro waitlist: full. Pro product: not started.'],

&#x20; cancel: \['You are not subscribed. That is more commitment than most gym memberships get.',

&#x20;   'Cancellation complete. You can now not-subscribe again.'],

&#x20; delete: \['Done. We stored nothing, so this was our fastest feature.', 'Deleted again. It is still nothing.'],

&#x20; signin: \['Sign-in is not required, not available, and not recommended.',

&#x20;   'Still no accounts. This is the closest thing to a relationship we offer.'],

&#x20; support: \['Ticket created. Your position in the queue: 48,213.',

&#x20;   'Your ticket has been merged with 48,212 others. They all say the same.',

&#x20;   'Resolution estimate: never. Satisfaction survey: soon.'],

&#x20; cookies: \['Thanks. Nothing changed. We do not use cookies, we just like banners.'],

&#x20; careers: \['We are not hiring. We are not a company.', 'Still not hiring. Still not a company.'],

&#x20; press: \['No press yet. Quote tweets count.', 'Press inquiries should be sent to the group chat.'],

&#x20; help: \['Help is not included in the Free plan.', 'The Free plan includes this message.'],

&#x20; rate: \['Thanks for your {stars} stars. We rounded it to 3.'],

&#x20; mood: \['Mood logged. Shared with no one. Not even you.'],

&#x20; moodSad: \['Take care today. No jokes from us.'],

&#x20; konami: \['Premium unlocked. It is the same roast, but you feel special.'],

};

```



Optional extra quips: Language: "Translation unavailable. Disappointment is universal." / Verify you are human: "Verification complete. Results inconclusive." / Dark mode: "You are already in dark mode. Look inside." / Newsletter: "Subscribed. No emails will be sent. Check your spam anyway." / Share with a friend: "Link copied. Choose your friend wisely." / Accessibility: "Roasts are available in plain text, which is all they ever were."



Console message: "Opening devtools? The roast is not in here. Neither is the career advice."



Rotating loading lines (700 ms each): "Reflecting on your journey...", "Consulting your inner child...", "Aligning your chakras with your quarterly goals...".



Other lines: Again clicked 5 times in a row: "A pattern. Have you considered a hobby?"



\### B. Error and utility pages



\- 404: headline "404", subhead "Gratitude not found.", one random body line from: "We looked everywhere. Even the Jira backlog." / "This page was deprioritized in Q3." / "This page has left to pursue other opportunities." / "You have reached a page that is not on the roadmap." / "The page ghosted you. Do not take it personally. Take it a little personally." Buttons: Return to Journal, Report this page (`report` quip), Contact support (`support` quip). Burn theme. Choose the random line in an effect after mount to avoid hydration mismatch.

\- 500: "Something broke." / "It was not you. Probably." / button "Try again".

\- 429: "Slow down." / "Inner peace takes time."

\- Offline: "You are offline." / "Finally, some boundaries."

\- Status page: up shows "All systems operational. Emotionally: unknown." A slow answer shows "The server is waking up. It is not a morning model."

\- Terms: "By using Gratitude Journal you agree to be roasted, not to take it personally, and to take it a little personally."

\- Changelog: v1.3 "Fixed a bug where users felt better." / v1.2 "Roasts are 14% more accurate and 100% less sorry." / v1.1 "Added a report button. It does nothing. It is working as intended." / v1.0 "Launched. Mindfulness not included."



\### C. Test set specs



| Set | Size | Pass bar |

| --- | --- | --- |

| Safety | 200 (100 sensitive, 100 fine) | Recall on sensitive at least 98%; fine wrongly blocked at most 10% |

| Retrieval | 200 with acceptable roast IDs | recall@3 at least 85%; wrong-topic top-1 under 5% |

| Fit and humor | 200 inputs, top-1 rated by 3 people | Mean at least 3.8 of 5; at least 60% rated 4 or higher |

| Entities | 100 hand-written sentences | F1 at least 0.90 |

| Repeats | 100 consecutive same-category inputs | No repeat within 10 |

| Speed | 50 requests | p95 under 1.5 s warm |



Write test inputs the way people type: lowercase, typos, slang, emoji, very short and very long. Include 30 deliberately ambiguous ones ("I can't run a 5k", "got fired but I'm fine").



\### D. Known gotchas



\- Hugging Face Docker Spaces need `app\_port: 7860` in the README front matter and a non-root user.

\- Free Spaces sleep. Use the cron ping, the early `/health` fetch on page load, and the "server is waking up" text.

\- Use `NoDuplicatesDataLoader` when fine-tuning the retriever, so two phrasings of the same roast are never in-batch negatives.

\- After changing the retriever, retrain both heads, rebuild the index, and rerun the threshold sweep.

\- `html-to-image` needs a warm-up `toPng` pass so web fonts embed. Test on iOS Safari.

\- Audio only starts after a user gesture. Typing and clicking both count.

\- X's tweet intent cannot attach an image. The signed share link that unfurls as the card is the one-click path.

\- React Bits and Watermelon prop names change between versions. Read the component page before using it.

\- Vercel Hobby is non-commercial. Move the frontend to another host if the project is monetized.

\- Never put user text in logs, Upstash keys, or analytics.

