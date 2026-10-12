import hashlib
import hmac
import json
import math
import os
import random
import re
from collections import defaultdict, deque
from pathlib import Path
from typing import Literal, Optional

import httpx
import joblib
import numpy as np
from dotenv import load_dotenv
from fastapi import BackgroundTasks, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator
from sentence_transformers import SentenceTransformer

from rate import check_rate_limit

# --- Environment & Configuration Loading ---
load_dotenv()
_local_env = Path(__file__).resolve().parent / ".env"
if _local_env.exists():
    load_dotenv(_local_env)

app = FastAPI(title="Mr.Roast API", version="1.0.0")

# --- Environment Configuration ---
ALLOWED_ORIGINS_RAW = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000")
ALLOWED_ORIGINS = [o.strip() for o in ALLOWED_ORIGINS_RAW.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS if ALLOWED_ORIGINS else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SHARE_SECRET = os.getenv("SHARE_SECRET", "dev_secret_key_must_be_shared_with_frontend")
RETR_MIN = float(os.getenv("RETR_MIN", "0.40"))
RERANK_MIN = float(os.getenv("RERANK_MIN", "0.45"))
UPSTASH_URL = os.getenv("UPSTASH_URL", "").rstrip("/")
UPSTASH_TOKEN = os.getenv("UPSTASH_TOKEN", "")

# Groq Hybrid Fallback
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
LLM_FALLBACK_ENABLED = os.getenv("LLM_FALLBACK_ENABLED", "false").lower() in ("1", "true", "yes")
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.1-8b-instant")

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
INDEX_DIR = DATA_DIR / "index"
MODELS_DIR = BASE_DIR / "models"

# --- In-Memory State & Fallbacks ---
recent_served: deque[str] = deque(maxlen=25)
in_memory_counters: dict[str, int] = defaultdict(int)

# --- Regex Gateways ---
CRISIS_REGEX = re.compile(
    r"\b(?:suicid\w*|kill\s*myself|self\s*harm|end\s*my\s*life|cutting\s*myself|wanting\s*to\s*jump|bridge\s*to\s*jump)\b",
    re.IGNORECASE,
)
SAFETY_REGEX = re.compile(
    r"\b(?:died|death|passed\s*away|funeral|cancer|diagnos\w*|miscarriage|abus\w*|assault\w*|rape\w*|laid\s*off|fired|divorc\w*|hospital|overdose)\b",
    re.IGNORECASE,
)

# Regex slot extractors
SLOT_PATTERNS = {
    "amount": re.compile(
        r"(?:(?:\$|€|£|₹)\s*\d+(?:[.,]\d+)?\s*(?:k|m|b|lakhs?|crores?|lpa)?|\b\d+(?:[.,]\d+)?\s*(?:k|lpa|lakhs?|crores?|dollars?|euros?|pounds?)\b)",
        re.IGNORECASE,
    ),
    "distance": re.compile(
        r"\b(?:\d+(?:[.,]\d+)?\s*(?:k|km|kms|miles?|meters?)|marathon|half\s*marathon)\b",
        re.IGNORECASE,
    ),
    "grade": re.compile(
        r"\b(?:\d+(?:[.,]\d+)?\s*(?:gpa|cgpa)|straight\s*as|a\s*plus)\b",
        re.IGNORECASE,
    ),
    "num": re.compile(r"\b\d+\b"),
    "org": re.compile(
        r"\b(?:google|microsoft|amazon|meta|apple|netflix|uber|goldman|mckinsey)\b",
        re.IGNORECASE,
    ),
}

# --- Lazy-Loaded Models & Index ---
embedder: Optional[SentenceTransformer] = None
safety_clf = None
intent_clf = None
indexed_roasts: list[dict] = []
anchor_vecs: Optional[np.ndarray] = None
anchor_owners: Optional[np.ndarray] = None
roast_id_map: dict[str, dict] = {}


def load_resources():
    global embedder, safety_clf, intent_clf, indexed_roasts, anchor_vecs, anchor_owners, roast_id_map

    # 1. Load SentenceTransformer Embedder
    if embedder is None:
        model_path = os.getenv("RETRIEVER_PATH", "sentence-transformers/all-MiniLM-L6-v2")
        embedder = SentenceTransformer(model_path)

    # 2. Load Intent & Safety Classifiers
    safety_path = MODELS_DIR / "safety.joblib"
    if safety_path.exists() and safety_clf is None:
        safety_clf = joblib.load(safety_path)

    intent_path = MODELS_DIR / "intent.joblib"
    if intent_path.exists() and intent_clf is None:
        intent_clf = joblib.load(intent_path)

    # 3. Load Index Artifacts
    roasts_json = INDEX_DIR / "roasts.json"
    vecs_npy = INDEX_DIR / "anchor_vecs.npy"
    owners_npy = INDEX_DIR / "anchor_owner.npy"

    if roasts_json.exists() and vecs_npy.exists() and owners_npy.exists():
        with open(roasts_json, "r", encoding="utf-8") as f:
            indexed_roasts = json.load(f)
        anchor_vecs = np.load(vecs_npy)
        anchor_owners = np.load(owners_npy)
    else:
        # Fallback to dev_roasts if index hasn't been built yet
        dev_file = DATA_DIR / "dev_roasts.json"
        if dev_file.exists():
            with open(dev_file, "r", encoding="utf-8") as f:
                indexed_roasts = json.load(f)
        anchor_vecs = np.empty((0, 384), dtype=np.float32)
        anchor_owners = np.empty((0,), dtype=np.int32)

    roast_id_map = {r["id"]: r for r in indexed_roasts}


def generate_groq_roast(brag: str) -> Optional[str]:
    """Call Groq API for deadpan cynical roast under 15 words on unusual brag."""
    if not GROQ_API_KEY:
        return None
    try:
        from groq import Groq, NotFoundError
        client = Groq(api_key=GROQ_API_KEY)
        system_prompt = (
            "You are a deadpan, deeply cynical satirist. "
            "Read the user's reflection or brag and output a single, ruthlessly observant roast under 15 words. "
            "Puncture their ego, vanity, or wasted effort directly. "
            "No hashtags, no emojis, no exclamation points, no introductory filler."
        )

        models_to_try = [GROQ_MODEL]
        for alt in ["openai/gpt-oss-20b", "qwen/qwen3.8-27b"]:
            if alt not in models_to_try:
                models_to_try.append(alt)

        for model_name in models_to_try:
            try:
                resp = client.chat.completions.create(
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": brag},
                    ],
                    model=model_name,
                    temperature=0.7,
                    max_tokens=60,
                )
                text = resp.choices[0].message.content or ""
                clean_text = text.strip().strip('"\'').rstrip('!').strip()
                if clean_text:
                    return clean_text
            except NotFoundError:
                continue
            except Exception as e:
                print(f"[!] Groq error with {model_name}: {e}")
                break
        return None
    except Exception as e:
        print(f"[!] Groq client error: {e}")
        return None


@app.on_event("startup")
def startup_event():
    import logging
    logger = logging.getLogger("mrroast.startup")
    logger.setLevel(logging.INFO)

    print("\n--- Mr.Roast API Startup Validation ---")
    
    # 1. Environment Validations
    print(f"[*] CORS Allowed Origins: {ALLOWED_ORIGINS}")
    
    if SHARE_SECRET == "dev_secret_key_must_be_shared_with_frontend":
        print("[!] WARNING: SHARE_SECRET is using the insecure default dev key. Set a secret in production.")
    else:
        print("[+] SHARE_SECRET: Configured with custom secret.")

    if not (0.1 <= RETR_MIN <= 0.9):
        print(f"[!] WARNING: RETR_MIN={RETR_MIN} is outside standard [0.1, 0.9] bounds.")
    else:
        print(f"[+] RETR_MIN: {RETR_MIN} (optimal threshold from eval sweep)")

    if UPSTASH_URL and UPSTASH_TOKEN:
        print(f"[+] Upstash Redis: Configured ({UPSTASH_URL})")
    else:
        print("[*] Upstash Redis: Not configured (falling back to in-memory counters)")

    if LLM_FALLBACK_ENABLED and GROQ_API_KEY:
        print(f"[+] LLM Hybrid Fallback: Enabled (Groq, model: {GROQ_MODEL})")
    elif LLM_FALLBACK_ENABLED and not GROQ_API_KEY:
        print("[!] LLM Hybrid Fallback: Enabled in env but GROQ_API_KEY is not set")
    else:
        print("[*] LLM Hybrid Fallback: Disabled")

    # 2. Resource Preloading
    load_resources()

    print(f"[+] Embedder: {'Ready' if embedder is not None else 'FAILED'}")
    print(f"[+] Safety Classifier: {'Ready' if safety_clf is not None else 'MISSING'}")
    print(f"[+] Intent Classifier: {'Ready' if intent_clf is not None else 'MISSING'}")
    print(f"[+] Indexed Roasts: {len(indexed_roasts)} entries, {len(anchor_vecs) if anchor_vecs is not None else 0} anchor vectors")
    print("--- Startup Complete ---\n")


# --- Upstash / Counter Helpers ---
def increment_counter_sync(key: str) -> int:
    """Increment counter in Upstash REST or fallback in-memory."""
    if UPSTASH_URL and UPSTASH_TOKEN:
        try:
            url = f"{UPSTASH_URL}/incr/{key}"
            headers = {"Authorization": f"Bearer {UPSTASH_TOKEN}"}
            with httpx.Client(timeout=2.0) as client:
                res = client.post(url, headers=headers)
                if res.status_code == 200:
                    data = res.json()
                    return int(data.get("result", 1))
        except Exception:
            pass  # Fall back to in-memory on any network error or timeout

    in_memory_counters[key] += 1
    return in_memory_counters[key]


def get_counter_sync(key: str) -> int:
    """Retrieve counter from Upstash REST or fallback in-memory."""
    if UPSTASH_URL and UPSTASH_TOKEN:
        try:
            url = f"{UPSTASH_URL}/get/{key}"
            headers = {"Authorization": f"Bearer {UPSTASH_TOKEN}"}
            with httpx.Client(timeout=2.0) as client:
                res = client.get(url, headers=headers)
                if res.status_code == 200:
                    data = res.json()
                    val = data.get("result")
                    if val is not None:
                        return int(val)
                    return 0
        except Exception:
            pass

    return in_memory_counters.get(key, 0)


def compute_sig(brag: str, roast: str) -> str:
    message = f"{brag}\n{roast}".encode("utf-8")
    return hmac.new(SHARE_SECRET.encode("utf-8"), message, hashlib.sha256).hexdigest()[:32]


def extract_slots(text: str) -> dict[str, str]:
    extracted = {}
    for slot_name, pattern in SLOT_PATTERNS.items():
        match = pattern.search(text)
        if match:
            extracted[slot_name] = match.group(0).strip()
    return extracted


# --- Request & Response Models ---
class RoastRequest(BaseModel):
    happy_thought: str = Field(..., description="The user's gratitude entry")

    @field_validator("happy_thought")
    def validate_length(cls, v: str) -> str:
        stripped = v.strip()
        if len(stripped) < 3:
            raise ValueError("Input must be at least 3 characters.")
        if len(stripped) > 200:
            raise ValueError("Input must not exceed 200 characters.")
        return stripped


class VoteRequest(BaseModel):
    roast_id: str
    kind: Literal["funny", "meh", "salt"]


# --- Endpoints ---

@app.get("/health")
def health():
    return {"ok": True}


@app.post("/roast")
def generate_roast(req: RoastRequest, request: Request, background_tasks: BackgroundTasks):
    # 1. Rate limit per IP (20/min)
    check_rate_limit(request, limit=20, window_seconds=60)

    input_text = req.happy_thought

    # 2. Safety regex
    if CRISIS_REGEX.search(input_text):
        return {
            "kind": "gentle",
            "text": "If you are going through a difficult time, please reach out for support. You do not have to carry this alone.",
            "crisis_url": "https://findahelpline.com",
        }

    if SAFETY_REGEX.search(input_text):
        return {
            "kind": "gentle",
            "text": "Take care today. Some days are heavy, and that is okay.",
        }

    # Ensure resources loaded
    load_resources()

    # 3. Embed input once (normalized)
    q_vec = embedder.encode(
        input_text,
        normalize_embeddings=True,
        convert_to_numpy=True,
    ).astype(np.float32)

    # 4. Classifier Gates
    if safety_clf is not None:
        try:
            classes = list(safety_clf.classes_)
            if "sensitive" in classes:
                sens_idx = classes.index("sensitive")
                p_sensitive = safety_clf.predict_proba([q_vec])[0][sens_idx]
                if p_sensitive > 0.35:
                    return {
                        "kind": "gentle",
                        "text": "Take care today. Some days are heavy, and that is okay.",
                    }
        except Exception:
            pass

    if intent_clf is not None:
        try:
            classes = list(intent_clf.classes_)
            if "sad" in classes:
                sad_idx = classes.index("sad")
                p_sad = intent_clf.predict_proba([q_vec])[0][sad_idx]
                if p_sad > 0.50:
                    return {
                        "kind": "gentle",
                        "text": "Take care today. Some days are heavy, and that is okay.",
                    }
        except Exception:
            pass

    # 5. Cosine similarity against anchor vectors (anchor_vecs @ q)
    extracted_slots = extract_slots(input_text)
    roast_scores: dict[int, float] = defaultdict(float)
    max_sim = 0.0

    if anchor_vecs is not None and len(anchor_vecs) > 0:
        sims = anchor_vecs @ q_vec
        max_sim = float(np.max(sims)) if len(sims) > 0 else 0.0
        for sim, owner_idx in zip(sims, anchor_owners):
            sim_f = float(sim)
            if sim_f > roast_scores[owner_idx]:
                roast_scores[owner_idx] = sim_f

    # Hybrid Fallback: If similarity < 0.65 and LLM_FALLBACK_ENABLED is true with valid key
    if max_sim < 0.65 and LLM_FALLBACK_ENABLED and GROQ_API_KEY:
        groq_roast = generate_groq_roast(input_text)
        if groq_roast:
            roast_id = f"llm-{hashlib.md5(groq_roast.encode('utf-8')).hexdigest()[:8]}"
            selected_roast = {
                "id": roast_id,
                "category": "llm",
                "roast": groq_roast,
            }
            roast_id_map[roast_id] = selected_roast
            recent_served.append(roast_id)
            sig = compute_sig(input_text, groq_roast)

            background_tasks.add_task(increment_counter_sync, "served:total")
            background_tasks.add_task(increment_counter_sync, f"served:{roast_id}")

            return {
                "kind": "roast",
                "text": groq_roast,
                "id": roast_id,
                "category": "llm",
                "brag": input_text,
                "sig": sig,
            }

    # 6. Top 10 with similarity >= RETR_MIN & slot eligibility
    candidates = []
    for owner_idx, score in roast_scores.items():
        if score >= RETR_MIN and owner_idx < len(indexed_roasts):
            roast_item = indexed_roasts[owner_idx]
            req_slots = roast_item.get("slots", [])
            # Must satisfy all required slots
            if all(slot in extracted_slots for slot in req_slots):
                try:
                    rendered_text = roast_item["roast"].format(**extracted_slots)
                except KeyError:
                    continue

                candidates.append({
                    "roast": roast_item,
                    "rendered": rendered_text,
                    "score": score,
                    "final": score,
                })

    # Sort descending by score and keep top 10
    candidates.sort(key=lambda c: c["final"], reverse=True)
    candidates = candidates[:10]

    # 8. Filter by RERANK_MIN
    candidates = [c for c in candidates if c["final"] >= RETR_MIN]

    # 9. Anti-repetition: exclude recently served in last 25 requests
    filtered_candidates = [
        c for c in candidates if c["roast"]["id"] not in recent_served
    ]
    if filtered_candidates:
        candidates = filtered_candidates

    selected_roast = None
    rendered_roast_text = ""

    # 10. Sample from top 3 with weights exp(8 * final)
    if candidates:
        top_k = candidates[:3]
        scores = np.array([c["final"] for c in top_k], dtype=np.float64)
        exp_scores = np.exp(8.0 * (scores - np.max(scores)))
        probs = exp_scores / np.sum(exp_scores)
        chosen_idx = np.random.choice(len(top_k), p=probs)
        chosen = top_k[chosen_idx]
        selected_roast = chosen["roast"]
        rendered_roast_text = chosen["rendered"]
    else:
        # 11. Fallback to a random generic roast
        generics = [r for r in indexed_roasts if r.get("category") == "generic"]
        if generics:
            # Prefer not recently served
            available_generics = [g for g in generics if g["id"] not in recent_served]
            if not available_generics:
                available_generics = generics
            selected_roast = random.choice(available_generics)
            rendered_roast_text = selected_roast["roast"]
        elif indexed_roasts:
            selected_roast = random.choice(indexed_roasts)
            rendered_roast_text = selected_roast["roast"]
        else:
            selected_roast = {
                "id": "generic-000",
                "category": "generic",
                "roast": "Inner peace logged. The universe remains completely indifferent.",
            }
            rendered_roast_text = selected_roast["roast"]

    # 12. Record served, sign, and return
    recent_served.append(selected_roast["id"])
    sig = compute_sig(input_text, rendered_roast_text)

    # Background counter increment
    background_tasks.add_task(increment_counter_sync, "served:total")
    background_tasks.add_task(increment_counter_sync, f"served:{selected_roast['id']}")

    return {
        "kind": "roast",
        "text": rendered_roast_text,
        "id": selected_roast["id"],
        "category": selected_roast.get("category", "generic"),
        "brag": input_text,
        "sig": sig,
    }


@app.post("/vote")
def record_vote(req: VoteRequest, request: Request):
    # Rate limit: 30 per min
    check_rate_limit(request, limit=30, window_seconds=60)

    load_resources()
    if req.roast_id not in roast_id_map:
        raise HTTPException(status_code=404, detail="Unknown roast ID.")

    key = f"vote:{req.roast_id}:{req.kind}"
    new_count = increment_counter_sync(key)
    return {"count": new_count}


@app.get("/stats/{roast_id}")
def get_stats(roast_id: str):
    load_resources()
    if roast_id not in roast_id_map:
        raise HTTPException(status_code=404, detail="Unknown roast ID.")

    funny_count = get_counter_sync(f"vote:{roast_id}:funny")
    meh_count = get_counter_sync(f"vote:{roast_id}:meh")
    salt_count = get_counter_sync(f"vote:{roast_id}:salt")
    served_count = get_counter_sync(f"served:{roast_id}")

    return {
        "funny": funny_count,
        "meh": meh_count,
        "salt": salt_count,
        "served": served_count,
    }
