# System Architecture Overview

Mr.Roast is a privacy-first, satirical gratitude journal application designed with zero persistent storage of user text, zero accounts, and 100% free hosting tiers.

## System Topology

```
                  +--------------------------------+
                  | Browser Client (Next.js 14)    |
                  | Hosted on Vercel (Root: web/)  |
                  +---------------+----------------+
                                  |
                                  | HTTPS (POST /roast, /vote; GET /stats, /health)
                                  v
                  +--------------------------------+
                  | FastAPI Application (Port 7860)|
                  | Docker on Hugging Face Space   |
                  +---------------+----------------+
                                  |
            +---------------------+---------------------+
            |                                           |
            v                                           v
+-----------------------+                   +-----------------------+
| In-Memory Cache       |                   | Upstash Redis (Opt.)  |
| - Recent roast queue  |                   | - Anonymous counters  |
| - Per-IP rate limiter |                   | - Served totals       |
+-----------------------+                   +-----------------------+
```

## Backend ML Pipeline (`POST /roast`)

1. **Rate Limiting**: Check client IP (from `X-Forwarded-For`), cap at 20 req/min. Validate input length (3 to 200 characters).
2. **Safety Regex**: Match word-bounded crisis and sensitive keywords (grief, illness, violence, self-harm). Crisis keywords yield a dedicated support referral; other hits yield a gentle reply.
3. **Embedding Step**: Compute normalized 384-dimensional dense vector using `all-MiniLM-L6-v2`.
4. **Classifier Gates**:
   - Safety Head: `P(sensitive) > 0.35` -> Gentle reply.
   - Intent Head: `P(sad) > 0.50` -> Gentle reply.
5. **Candidate Retrieval**:
   - Cosine similarity: `anchor_vecs @ query_vec`.
   - Max similarity across anchors and paraphrases per roast.
   - Filter candidates >= `RETR_MIN` (default 0.40).
6. **Slot Filling & Eligibility**:
   - Extract entities/quantities (`{org}`, `{amount}`, `{distance}`, `{grade}`, `{num}`).
   - Retain only roasts where all declared slots are filled.
7. **Reranking & Scoring (v1/v2)**:
   - v1: Rank by retrieval similarity.
   - v2: Blend cross-encoder score and humor prior (`0.8 * rerank + 0.2 * prior`).
8. **Anti-Repetition & Sampling**:
   - Exclude roast IDs served in the last 25 requests (unless pool empties).
   - Sample from top 3 candidates weighted by `softmax(8 * score)`.
   - Fall back to a randomized `generic` category roast if pool is empty.
9. **Signing & Response**:
   - Compute `HMAC-SHA256(SHARE_SECRET, brag + "\n" + roast)[:32]`.
   - Asynchronously increment served counter. Return JSON payload.

## Privacy & Security Guarantees
- No logging of `happy_thought` or raw user inputs.
- No database tables for journal entries.
- Share cards require verified cryptographic HMAC signature to prevent open redirection or arbitrary statement forgery.
