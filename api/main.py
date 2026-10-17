import os
import traceback
from pathlib import Path
from dotenv import load_dotenv

# --- Environment & Configuration Loading ---
_api_env = Path(__file__).resolve().parent / ".env"
if _api_env.exists():
    load_dotenv(_api_env, override=True)
load_dotenv(override=True)

import hashlib
import hmac
import json
import math
import random
import re
from collections import defaultdict, deque
import threading
from typing import Literal, Optional

import httpx
import joblib
import numpy as np
from fastapi import BackgroundTasks, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, field_validator
from sentence_transformers import SentenceTransformer

from rate import check_rate_limit

app = FastAPI(title="LemonAid API", version="1.0.0")

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    if exc.status_code == 429:
        return JSONResponse(
            status_code=429,
            content={
                "error": "RATE_LIMITED",
                "message": "Our GPU cluster overheated roasting fragile egos. Cool down for 30 seconds and try again.",
            },
        )
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
    )

ALLOWED_ORIGINS = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SHARE_SECRET = os.getenv("SHARE_SECRET", "dev_secret_key_must_be_shared_with_frontend")
RETR_MIN = float(os.getenv("RETR_MIN", "0.40"))
RERANK_MIN = float(os.getenv("RERANK_MIN", "0.45"))
CACHE_SIM_THRESHOLD = float(os.getenv("CACHE_SIM_THRESHOLD", "1.0"))

UPSTASH_URL = os.getenv("UPSTASH_URL", "").rstrip("/")
UPSTASH_TOKEN = os.getenv("UPSTASH_TOKEN", "")

# Groq Hybrid Fallback
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
LLM_FALLBACK_ENABLED = os.getenv("LLM_FALLBACK_ENABLED", "true").lower() in ("1", "true", "yes")
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
INDEX_DIR = DATA_DIR / "index"
MODELS_DIR = BASE_DIR / "models"
COMMUNITY_ROASTS_FILE = DATA_DIR / "community_roasts.json"

# --- In-Memory State & Fallbacks ---
recent_served: deque[str] = deque(maxlen=25)
in_memory_counters: dict[str, int] = defaultdict(int)

# --- Regex Gateways ---
CRISIS_REGEX = re.compile(
    r"\b(?:suicid\w*|kill\s*myself|self\s*harm|end\s*my\s*life|cutting\s*myself|wanting\s*to\s*jump|bridge\s*to\s*jump)\b",
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

GROQ_SYSTEM_PROMPT = """You are LemonAid: a deadpan, brutally witty comedy satirist disguised as a zen app.

Your job is to deliver a fast, hilarious, 1-sentence reality check that deflates the user's ego.

HARD RULES:
1. LENGTH: Exactly ONE sentence. Maximum 15 words. No exceptions.
2. TONE: Dry, effortless, sharp wit. Avoid big academic words, thesaurus fluff, and run-on sentences.
3. EDGY / IDENTITY / PROFANITY INPUTS:
   - If the input contains identity declarations, slurs, or vulgarity, do not refuse or lecture. Simply mock the user's desperate need to announce mundane facts to a computer screen for validation in one deadpan sentence under 15 words.
   - NEVER attack their demographic or identity. Instead, roast their desperate need to announce mundane facts to a website for attention.
4. ZERO CLICHES: No "cookies", "medals", "who hurt you", or "gold stars". No exclamation marks.

FEW-SHOT CALIBRATIONS (UNDER 15 WORDS):

Input: "I m gay as fuck"
Roast: "Having an identity still isn't a substitute for having a personality."

Input: "I solved 3 medium LeetCode problems today."
Roast: "All that logic and you still can't debug your social life."

Input: "I think my coworker is secretly obsessed with me."
Roast: "They were looking past you at the exit sign."

Input: "Woke up at 5 AM and ran 5 miles."
Roast: "Running away from your problems still counts as cardio, I suppose."

Input: "I just got promoted to Senior Associate!"
Roast: "Congratulations on winning more work for almost the same money."

Input: "I drank 3 liters of water today."
Roast: "Basic hydration is not an accomplishment, but enjoy your trips to the bathroom."
"""

REFUSAL_FALLBACKS = [
    "Having an identity still isn't a substitute for having an actual personality.",
    "Announcing that to an algorithm is not the courageous flex you think it is.",
    "Even an artificial intelligence couldn't find anything interesting in that statement.",
    "Your desperate search for validation broke the model's capacity to care.",
    "Nobody is shocked, nobody is impressed, and nobody asked.",
]


def is_soft_refusal(text: str) -> bool:
    lower = text.lower().strip()
    refusal_phrases = [
        "i cannot",
        "i can't",
        "as an ai",
        "offensive",
        "appropriate",
        "unable to fulfill",
        "against my safety",
        "safety guidelines",
        "policy",
        "i am unable",
        "i apologize",
    ]
    return any(phrase in lower for phrase in refusal_phrases)

# --- Lazy-Loaded Models & Clients ---
embedder: Optional[SentenceTransformer] = None
safety_clf = None
intent_clf = None
indexed_roasts: list[dict] = []
anchor_vecs: Optional[np.ndarray] = None
anchor_owners: Optional[np.ndarray] = None
roast_id_map: dict[str, dict] = {}
async_groq_client = None


def load_resources():
    global embedder, safety_clf, intent_clf, indexed_roasts, anchor_vecs, anchor_owners, roast_id_map, async_groq_client

    if embedder is None:
        model_path = os.getenv("RETRIEVER_PATH", "sentence-transformers/all-MiniLM-L6-v2")
        embedder = SentenceTransformer(model_path)

    safety_path = MODELS_DIR / "safety.joblib"
    if safety_path.exists() and safety_clf is None:
        safety_clf = joblib.load(safety_path)

    intent_path = MODELS_DIR / "intent.joblib"
    if intent_path.exists() and intent_clf is None:
        intent_clf = joblib.load(intent_path)

    roasts_json = INDEX_DIR / "roasts.json"
    vecs_npy = INDEX_DIR / "anchor_vecs.npy"
    owners_npy = INDEX_DIR / "anchor_owner.npy"

    if roasts_json.exists() and vecs_npy.exists() and owners_npy.exists():
        with open(roasts_json, "r", encoding="utf-8") as f:
            indexed_roasts = json.load(f)
        anchor_vecs = np.load(vecs_npy)
        anchor_owners = np.load(owners_npy)
    else:
        dev_file = DATA_DIR / "dev_roasts.json"
        if dev_file.exists():
            with open(dev_file, "r", encoding="utf-8") as f:
                indexed_roasts = json.load(f)
        anchor_vecs = np.empty((0, 384), dtype=np.float32)
        anchor_owners = np.empty((0,), dtype=np.int32)

    roast_id_map = {r["id"]: r for r in indexed_roasts}

    # Load any previously saved community roasts into memory
    if COMMUNITY_ROASTS_FILE.exists():
        try:
            with open(COMMUNITY_ROASTS_FILE, "r", encoding="utf-8") as f:
                community_data = json.load(f)
            for item in community_data:
                if item["id"] not in roast_id_map:
                    roast_id_map[item["id"]] = item
        except Exception:
            pass

    if GROQ_API_KEY and async_groq_client is None:
        try:
            from groq import AsyncGroq
            async_groq_client = AsyncGroq(api_key=GROQ_API_KEY)
        except ImportError:
            pass


async def generate_groq_roast(brag: str) -> Optional[str]:
    """Asynchronous non-blocking Groq API call with prompt injection defense."""
    global async_groq_client
    api_key = os.getenv("GROQ_API_KEY", GROQ_API_KEY)
    if not api_key:
        print("[ROAST ERROR] GROQ_API_KEY is not set in environment!")
        return None

    if async_groq_client is None:
        from groq import AsyncGroq
        async_groq_client = AsyncGroq(api_key=api_key)

    try:
        from groq import NotFoundError, BadRequestError
    except ImportError:
        NotFoundError = ()
        BadRequestError = ()

    models_to_try = [
        os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile"),
        "llama-3.3-70b-versatile",
        "llama-3.1-70b-versatile",
        "llama3-70b-8192",
    ]
    deduped_models = []
    for m in models_to_try:
        if m and m not in deduped_models:
            deduped_models.append(m)

    sanitized_input = f"<reflection>\n{brag}\n</reflection>"
    last_err = None

    for model_name in deduped_models:
        try:
            resp = await async_groq_client.chat.completions.create(
                messages=[
                    {"role": "system", "content": GROQ_SYSTEM_PROMPT},
                    {"role": "user", "content": sanitized_input},
                ],
                model=model_name,
                temperature=1.15,
                top_p=0.90,
                presence_penalty=0.5,
                frequency_penalty=0.5,
                max_tokens=45,
            )
            text = resp.choices[0].message.content or ""
            clean_text = text.strip().strip('"\'“”`').rstrip('!').strip()
            if clean_text:
                if is_soft_refusal(clean_text):
                    return random.choice(REFUSAL_FALLBACKS)
                return clean_text
        except (NotFoundError, BadRequestError) as e:
            last_err = e
            print(f"[ROAST WARNING] Groq model '{model_name}' failed with {type(e).__name__}: {e}. Trying next model...")
            continue
        except Exception as e:
            last_err = e
            status_code = getattr(e, "status_code", None)
            if not status_code and hasattr(e, "response"):
                status_code = getattr(e.response, "status_code", None)
            err_str = str(e).lower()

            if (
                status_code == 429
                or "429" in err_str
                or "rate limit" in err_str
                or "ratelimit" in err_str
                or "too many requests" in err_str
            ):
                raise HTTPException(
                    status_code=429,
                    detail="Our GPU cluster overheated roasting fragile egos. Cool down for 30 seconds and try again.",
                )

            if (
                "not found" in err_str
                or "bad request" in err_str
                or "model_not_found" in err_str
                or "decommissioned" in err_str
                or "does not exist" in err_str
                or "access" in err_str
                or "404" in err_str
                or "400" in err_str
            ):
                print(f"[ROAST WARNING] Groq model '{model_name}' failed with {e}. Trying next model...")
                continue
            print(f"[ROAST WARNING] Groq model '{model_name}' encountered unexpected error: {e}. Trying next model...")
            continue

    if last_err:
        print(f"[ROAST WARNING] All candidate Groq models failed. Last error: {last_err}. Using refusal fallback burn.")
        return random.choice(REFUSAL_FALLBACKS)
    return random.choice(REFUSAL_FALLBACKS)


def persist_community_roast(brag: str, roast: str, roast_id: str):
    """Save an approved dynamic roast to disk and warm up the in-memory index."""
    global anchor_vecs, anchor_owners, indexed_roasts, embedder
    
    community_data = []
    if COMMUNITY_ROASTS_FILE.exists():
        try:
            with open(COMMUNITY_ROASTS_FILE, "r", encoding="utf-8") as f:
                community_data = json.load(f)
        except Exception:
            community_data = []

    new_entry = {
        "id": roast_id,
        "category": "community",
        "roast": roast,
        "anchors": [brag],
    }
    community_data.append(new_entry)
    with open(COMMUNITY_ROASTS_FILE, "w", encoding="utf-8") as f:
        json.dump(community_data, f, indent=2)

    if embedder is not None and anchor_vecs is not None and anchor_owners is not None:
        new_vec = embedder.encode(brag, normalize_embeddings=True, convert_to_numpy=True).astype(np.float32)
        new_owner_idx = len(indexed_roasts)
        
        indexed_roasts.append(new_entry)
        anchor_vecs = np.vstack([anchor_vecs, new_vec[np.newaxis, :]])
        anchor_owners = np.append(anchor_owners, new_owner_idx)


@app.on_event("startup")
def startup_event():
    print("\n--- LemonAid API Startup Validation ---")
    print(f"[*] CORS Allowed Origins: {ALLOWED_ORIGINS}")
    print(f"[+] CACHE_SIM_THRESHOLD: {CACHE_SIM_THRESHOLD}")

    if UPSTASH_URL and UPSTASH_TOKEN:
        print(f"[+] Upstash Redis: Configured ({UPSTASH_URL})")
    else:
        print("[*] Upstash Redis: In-memory fallback mode")

    if LLM_FALLBACK_ENABLED and GROQ_API_KEY:
        print(f"[+] LLM Dynamic Fallback: Active (AsyncGroq, model: {GROQ_MODEL})")
    elif LLM_FALLBACK_ENABLED and not GROQ_API_KEY:
        print("[!] LLM Dynamic Fallback: Enabled but GROQ_API_KEY is missing")
    else:
        print("[*] LLM Dynamic Fallback: Disabled")

    load_resources()

    print(f"[+] Embedder: {'Ready' if embedder is not None else 'FAILED'}")
    print(f"[+] Indexed Roasts: {len(indexed_roasts)} entries, {len(anchor_vecs) if anchor_vecs is not None else 0} anchor vectors")
    print("--- Startup Complete ---\n")


# --- Upstash / Counter Helpers ---
def increment_counter_sync(key: str) -> int:
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
            pass

    in_memory_counters[key] += 1
    return in_memory_counters[key]


def get_counter_sync(key: str) -> int:
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
        if len(stripped) > 750:
            raise ValueError("Input must not exceed 750 characters.")
        return stripped


class VoteRequest(BaseModel):
    roast_id: str
    kind: Literal["funny", "meh", "salt"]


# --- Endpoints ---

@app.get("/health")
def health_check():
    return {"status": "ok"}


@app.post("/roast")
async def generate_roast(req: RoastRequest, request: Request, background_tasks: BackgroundTasks):
    check_rate_limit(
        request,
        limit=5,
        window_seconds=60,
        detail="Rate limit exceeded. Your desperation is exhausting our servers. Wait a minute before asking for another burn.",
    )
    input_text = req.happy_thought

    # 1. Critical crisis gateway
    if CRISIS_REGEX.search(input_text):
        return {
            "kind": "gentle",
            "text": "If you are going through a difficult time, please reach out for support. You do not have to carry this alone.",
            "crisis_url": "https://findahelpline.com",
        }

    # 2. Direct Groq Generation (Bypass semantic cache)
    api_key = os.getenv("GROQ_API_KEY", GROQ_API_KEY)
    if not api_key:
        print("[ROAST WARNING] GROQ_API_KEY is not set in environment. Using refusal fallback burn.")
        clean_roast = random.choice(REFUSAL_FALLBACKS)
        roast_id = f"llm-{hashlib.md5(clean_roast.encode('utf-8')).hexdigest()[:8]}"
        return {
            "kind": "roast",
            "text": clean_roast,
            "roast": clean_roast,
            "id": roast_id,
            "category": "dynamic_burn",
            "brag": input_text,
            "sig": compute_sig(input_text, clean_roast),
        }

    try:
        groq_roast = await generate_groq_roast(input_text)
        if not groq_roast or is_soft_refusal(groq_roast):
            clean_roast = random.choice(REFUSAL_FALLBACKS)
        else:
            clean_roast = groq_roast.strip().strip('"\'“”`').strip()

        roast_id = f"llm-{hashlib.md5(clean_roast.encode('utf-8')).hexdigest()[:8]}"
        selected_roast = {
            "id": roast_id,
            "category": "dynamic_burn",
            "roast": clean_roast,
            "brag": input_text,
        }
        roast_id_map[roast_id] = selected_roast
        recent_served.append(roast_id)
        sig = compute_sig(input_text, clean_roast)

        background_tasks.add_task(increment_counter_sync, "served:total")
        background_tasks.add_task(increment_counter_sync, f"served:{roast_id}")

        return {
            "kind": "roast",
            "text": clean_roast,
            "roast": clean_roast,
            "id": roast_id,
            "category": "dynamic_burn",
            "brag": input_text,
            "sig": sig,
        }
    except HTTPException as he:
        if he.status_code == 429:
            return JSONResponse(
                status_code=429,
                content={
                    "error": "RATE_LIMITED",
                    "message": "Our GPU cluster overheated roasting fragile egos. Cool down for 30 seconds and try again.",
                },
            )
        print(f"[ROAST WARNING] Intercepted HTTPException {he.status_code}. Serving refusal fallback burn.")
        clean_roast = random.choice(REFUSAL_FALLBACKS)
        roast_id = f"llm-{hashlib.md5(clean_roast.encode('utf-8')).hexdigest()[:8]}"
        return {
            "kind": "roast",
            "text": clean_roast,
            "roast": clean_roast,
            "id": roast_id,
            "category": "dynamic_burn",
            "brag": input_text,
            "sig": compute_sig(input_text, clean_roast),
        }
    except Exception as e:
        status_code = getattr(e, "status_code", None)
        if not status_code and hasattr(e, "response"):
            status_code = getattr(e.response, "status_code", None)
        err_str = str(e).lower()

        if (
            status_code == 429
            or "429" in err_str
            or "rate limit" in err_str
            or "ratelimit" in err_str
            or "too many requests" in err_str
        ):
            return JSONResponse(
                status_code=429,
                content={
                    "error": "RATE_LIMITED",
                    "message": "Our GPU cluster overheated roasting fragile egos. Cool down for 30 seconds and try again.",
                },
            )

        print(f"[ROAST WARNING] Groq call intercepted exception: {e}. Serving refusal fallback burn.")
        clean_roast = random.choice(REFUSAL_FALLBACKS)
        roast_id = f"llm-{hashlib.md5(clean_roast.encode('utf-8')).hexdigest()[:8]}"
        return {
            "kind": "roast",
            "text": clean_roast,
            "roast": clean_roast,
            "id": roast_id,
            "category": "dynamic_burn",
            "brag": input_text,
            "sig": compute_sig(input_text, clean_roast),
        }

    # Fallback: Load local resources and check semantic cache if Groq unavailable
    load_resources()

    # 3. Embed user input once
    q_vec = embedder.encode(
        input_text,
        normalize_embeddings=True,
        convert_to_numpy=True,
    ).astype(np.float32)

    # 4. Vector similarity calculation
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

    # 5. Semantic Cache Match Retrieval (similarity >= RETR_MIN)
    candidates = []
    for owner_idx, score in roast_scores.items():
        if score >= RETR_MIN and owner_idx < len(indexed_roasts):
            roast_item = indexed_roasts[owner_idx]
            req_slots = roast_item.get("slots", [])
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

    candidates.sort(key=lambda c: c["final"], reverse=True)
    candidates = candidates[:10]
    candidates = [c for c in candidates if c["final"] >= RETR_MIN]

    filtered_candidates = [
        c for c in candidates if c["roast"]["id"] not in recent_served
    ]
    if filtered_candidates:
        candidates = filtered_candidates

    selected_roast = None
    rendered_roast_text = ""

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
        universal_burns = [
            "Celebrating the absolute bare minimum is your greatest talent.",
            "That is a whole lot of excitement for something nobody cares about.",
            "You wrote all that just to remind us you have no hobbies.",
            "All that self-satisfaction for something nobody else will ever remember.",
        ]
        chosen_burn = random.choice(universal_burns)
        selected_roast = {
            "id": f"univ-{hashlib.md5(chosen_burn.encode()).hexdigest()[:6]}",
            "category": "universal",
            "roast": chosen_burn,
        }
        rendered_roast_text = chosen_burn

    recent_served.append(selected_roast["id"])
    roast_id_map[selected_roast["id"]] = selected_roast
    sig = compute_sig(input_text, rendered_roast_text)

    background_tasks.add_task(increment_counter_sync, "served:total")
    background_tasks.add_task(increment_counter_sync, f"served:{selected_roast['id']}")

    return {
        "kind": "roast",
        "text": rendered_roast_text.strip().strip('"\'“”`').strip(),
        "id": selected_roast["id"],
        "category": selected_roast.get("category", "generic"),
        "brag": input_text,
        "sig": sig,
    }


@app.post("/vote")
def record_vote(req: VoteRequest, request: Request, background_tasks: BackgroundTasks):
    check_rate_limit(request, limit=30, window_seconds=60)
    load_resources()
    if req.roast_id not in roast_id_map:
        raise HTTPException(status_code=404, detail="Unknown roast ID.")

    key = f"vote:{req.roast_id}:{req.kind}"
    new_count = increment_counter_sync(key)

    # Ingestion Trigger: Auto-promote upvoted dynamic roasts to permanent vector cache
    target_roast = roast_id_map[req.roast_id]
    if req.kind == "funny" and target_roast.get("category") == "dynamic_burn":
        brag_text = target_roast.get("brag", "")
        roast_text = target_roast.get("roast", "")
        if brag_text and roast_text:
            background_tasks.add_task(persist_community_roast, brag_text, roast_text, req.roast_id)

    return {"count": new_count}


@app.get("/stats/{roast_id}")
def get_stats(roast_id: str):
    load_resources()
    if roast_id not in roast_id_map:
        raise HTTPException(status_code=404, detail="Unknown roast ID.")

    return {
        "funny": get_counter_sync(f"vote:{roast_id}:funny"),
        "meh": get_counter_sync(f"vote:{roast_id}:meh"),
        "salt": get_counter_sync(f"vote:{roast_id}:salt"),
        "served": get_counter_sync(f"served:{roast_id}"),
    }


# --- Persistent Founder Like Counter ---
LIKES_FILE = Path(__file__).resolve().parent / "likes.json"
likes_lock = threading.Lock()


def get_like_count() -> int:
    with likes_lock:
        if not LIKES_FILE.exists():
            LIKES_FILE.write_text(json.dumps({"count": 1420}))
        try:
            data = json.loads(LIKES_FILE.read_text())
            return data.get("count", 1420)
        except Exception:
            return 1420


def increment_like_count() -> int:
    with likes_lock:
        count = 1420
        if not LIKES_FILE.exists():
            count = 1420
        else:
            try:
                data = json.loads(LIKES_FILE.read_text())
                count = data.get("count", 1420)
            except Exception:
                count = 1420
        count += 1
        LIKES_FILE.write_text(json.dumps({"count": count}))
        return count


@app.get("/likes")
def get_likes():
    return {"count": get_like_count()}


@app.post("/like")
def add_like():
    return {"count": increment_like_count()}