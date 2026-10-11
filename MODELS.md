# Models Registry & Evaluation Log

## Active Models & Heads (v1 Baseline)

| Model / Head | Architecture | File Path | Baseline Metric (5-Fold CV) | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Retriever** | `all-MiniLM-L6-v2` | Hugging Face Cache | 384-d Normalized Embeddings | Active (v1) |
| **Intent Classifier** | LogisticRegression (C=4, balanced) | `api/models/intent.joblib` | Accuracy: **0.90**, Sad Recall: **0.92**, Sad F1: **0.96** | Trained (Dev) |
| **Safety Classifier** | LogisticRegression (C=4, balanced) | `api/models/safety.joblib` | Accuracy: **0.99**, Sensitive Recall: **1.00**, F1: **0.99** | Trained (Dev) |
| **Reranker (v2)** | `ms-marco-MiniLM-L-6-v2` | `api/models/reranker-v1` | N/A | Optional (v2) |
| **NER (v2)** | spaCy custom pipeline | `api/models/ner-v1` | F1 >= 0.90 target | Optional (v2) |

## Index Metrics
- **Roast Count**: 32 indexed roasts (Dev draft bank, categories: career, placements, academics, fitness, dating, money, productivity, tech, hackathons, social, food, travel, generic).
- **Dense Vector Count**: 135 anchor and paraphrase embeddings (`(135, 384)` float32).
- **Index Files**: `api/data/index/roasts.json`, `anchor_vecs.npy`, `anchor_owner.npy`.
