# Mr. Roast 🧘‍♂️🔥

> A satirical mindfulness web application that invites earnest daily gratitude and returns razor-sharp roasts powered by semantic vector retrieval and local NLP heads.

Mr. Roast is designed with strict visual restraint, deadpan delivery, 100% free-tier deployment, and complete user privacy (zero user text stored).

---

## Architecture Overview

```
                      +-----------------------------------------------+
                      |             Next.js 14 (Vercel)               |
                      |  - Calm Light Theme -> Instant Burn Reveal    |
                      |  - Synthesized Web Audio Engine (no audio mp3)|
                      |  - Deadpan Quips, FakeButtons & RoastCard     |
                      |  - Edge OpenGraph Dynamic Preview (/api/og)   |
                      +-----------------------+-----------------------+
                                              |
                             POST /roast      | GET /s?b=...&r=...&sig=...
                                              v
                      +-----------------------------------------------+
                      |       FastAPI in Docker (Hugging Face)        |
                      |  1. IP Rate Limiting (20/min via proxy)       |
                      |  2. Crisis Regex -> findahelpline.com         |
                      |  3. Safety Regex + LogisticRegression Head    |
                      |  4. Intent Classifier (Sad vs Gratitude)      |
                      |  5. MiniLM-L6-v2 Dense Retrieval (RETR_MIN)   |
                      |  6. Top-3 Softmax Sampling (Anti-repeat queue)|
                      |  7. Slot Fillers + HMAC-SHA256 Signature      |
                      +-----------------------+-----------------------+
                                              |
                                              v
                              +-------------------------------+
                              |    Upstash Redis (Optional)   |
                              |  - Anonymous counters / stats |
                              |  - Auto in-memory fallback    |
                              +-------------------------------+
```

### Key Design Pillars
- **Zero Paid LLM APIs**: Powered entirely by lightweight, local CPU embeddings (`sentence-transformers/all-MiniLM-L6-v2`) and calibrated scikit-learn classifiers.
- **Privacy by Design**: Never logs, stores, or transmits user reflections to third-party databases.
- **Safety First**: Immediate diversion for self-harm/crisis queries to human helplines (`findahelpline.com`) and compassionate gentle fallbacks for grief/loss.
- **100% Free Hosting**: Runs permanently on Vercel Hobby + Hugging Face Spaces Docker CPU basic.

---

## Quickstart (Local Development)

### Prerequisites
- Python 3.11+
- Node.js 18+ (Node 20 recommended)
- Git

### 1. Backend Setup (`api/`)
```bash
# Navigate to API directory
cd api

# Create and activate virtual environment
python -m venv venv
# On Windows:
.\venv\Scripts\Activate.ps1
# On macOS/Linux:
source venv/bin/activate

# Install dependencies and PyTorch CPU
pip install --upgrade pip
pip install torch --index-url https://download.pytorch.org/whl/cpu
pip install -r requirements.txt
python -m spacy download en_core_web_sm

# Train classification heads and build semantic retrieval index
ALLOW_DRAFT=1 python train_heads.py
ALLOW_DRAFT=1 python build_index.py

# Start FastAPI server (runs on http://localhost:7860)
uvicorn main:app --host 0.0.0.0 --port 7860 --reload
```

### 2. Frontend Setup (`web/`)
```bash
# In a new terminal, navigate to web directory
cd web

# Install dependencies
npm install

# Start Next.js development server (runs on http://localhost:3000)
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to begin reflecting.

---

## Unified System Verification

A unified runner executes all linters, benchmarks, evaluations, and production builds in sequence:

```bash
python check.py
# Or from web/
npm run check
```

**Checks Included:**
1. Roast Bank Linter (`api/lint_roasts.py`)
2. FastAPI Smoke Tests (`api/smoke_test.py`)
3. 200-Case Safety Benchmark (`api/safety_eval.py`) — *Sensitive Recall >= 98%, False Block <= 10%*
4. Retrieval Sweep (`api/eval.py`) — *Recall@3 >= 85%, Wrong-match < 5%*
5. Anti-Repetition 100-Request Benchmark (`api/repeat_test.py`) — *0 repeats in 10 requests*
6. Frontend ESLint Suite (`npm run lint`)
7. Next.js Production Build (`npm run build`)

---

## Deployment

Refer to [`references/deployment.md`](file:///s:/My_Projects/Mr.Roast/references/deployment.md) for step-by-step deployment instructions for:
- **Vercel** (Next.js 14 App Router frontend)
- **Hugging Face Spaces** (FastAPI Docker backend on CPU Basic)
- **Upstash Redis** (Serverless reaction and stats counters)
- **cron-job.org** (Free keep-alive monitoring)

---

## License

MIT
