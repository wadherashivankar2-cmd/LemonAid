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
from fastapi import BackgroundTasks, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator
from sentence_transformers import SentenceTransformer

from rate import check_rate_limit

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

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
INDEX_DIR = DATA_DIR / "index"
MODELS_DIR = BASE_DIR / "models"

# --- In-Memory State & Fallbacks ---
recent_served: deque[str] = deque(maxlen=25)
in_memory_counters: dict[str, int] = defaultdict(int)

# --- Regex Gateways ---
CRISIS_REGEX = re.compile(
    r"\b(?:suicid\w*|kill\s*myself|self\s*harm|end\s*my\s*life|cutting\s*myself)\b",
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


@app.on_event("startup")
def startup_event():
    load_resources()


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

    if anchor_vecs is not None and len(anchor_vecs) > 0:
        sims = anchor_vecs @ q_vec
        for sim, owner_idx in zip(sims, anchor_owners):
            sim_f = float(sim)
            if sim_f > roast_scores[owner_idx]:
                roast_scores[owner_idx] = sim_f

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
