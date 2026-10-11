# Data Schemas & Model Architecture

## Roast Record Schema (`api/data/roasts.json`)

```json
{
  "id": "career-007",
  "category": "career",
  "anchors": [
    "I got promoted today",
    "I became a senior associate",
    "Finally made partner after 5 years"
  ],
  "paraphrases": [
    "my title just changed on LinkedIn"
  ],
  "roast": "Congratulations on the new title. Same salary, more meetings, and a Slack channel you cannot mute.",
  "slots": [],
  "tone": "deadpan",
  "status": "approved"
}
```

### Fields & Validation Rules
- `id`: Unique slug identifier (category + 3-digit index).
- `category`: One of `career`, `placements`, `academics`, `fitness`, `dating`, `money`, `productivity`, `tech`, `hackathons`, `social`, `food`, `travel`, `generic`.
- `anchors`: Array of >= 3 typical bragging inputs.
- `paraphrases`: Array of variant colloquialisms, typos, or slang expressions.
- `roast`: The crisp punchline. Under 200 characters, targeting <= 140.
- `slots`: Supported extraction slots: `{org}`, `{amount}`, `{distance}`, `{grade}`, `{num}`. If a roast includes `{slot}` in its text, it must be listed in `slots` and must be extracted from the user's input to be eligible.
- `status`: One of `draft`, `approved`, `cut`.
  - In production, only `approved` roasts are indexed.
  - In development, setting `ALLOW_DRAFT=1` allows indexing `draft` roasts for testing.

## Model Components

### 1. Vector Retriever
- Model: `sentence-transformers/all-MiniLM-L6-v2` (384-d normalized embeddings).
- Index: Precomputed dense matrix `anchor_vecs.npy` with parallel `anchor_owner.npy` mapping to roast records.

### 2. Intent Classifier (`models/intent.joblib`)
- Architecture: `LogisticRegression(max_iter=2000, C=4, class_weight="balanced")` on MiniLM embeddings.
- Classes: `brag`, `sad`, `neutral`.
- Threshold: If `P(sad) > 0.50`, divert to gentle response.

### 3. Safety Classifier (`models/safety.joblib`)
- Architecture: `LogisticRegression(max_iter=2000, C=4, class_weight="balanced")` on MiniLM embeddings.
- Classes: `sensitive`, `fine`.
- Threshold: If `P(sensitive) > 0.35`, divert to gentle response.

### 4. (v2 Optional) Reranker & Custom NER
- Reranker: `cross-encoder/ms-marco-MiniLM-L-6-v2`.
- Custom NER: spaCy pipeline for entity slot extraction (`COMPANY`, `AMOUNT`, `DISTANCE`, `GRADE`).
