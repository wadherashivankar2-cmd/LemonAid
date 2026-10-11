# Models Registry & Evaluation Log

## Production & Development Models

| Model | Architecture | File Path | Baseline Metric | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Retriever** | `all-MiniLM-L6-v2` | Cached / HuggingFace | 384-d Cosine Sim | Active (v1) |
| **Intent Classifier** | LogisticRegression (C=4, balanced) | `api/models/intent.joblib` | CV F1 Score pending | Dev Head |
| **Safety Classifier** | LogisticRegression (C=4, balanced) | `api/models/safety.joblib` | CV F1 Score pending | Dev Head |
| **Reranker (v2)** | `ms-marco-MiniLM-L-6-v2` | `api/models/reranker-v1` | N/A | Optional (v2) |
| **NER (v2)** | spaCy custom pipeline | `api/models/ner-v1` | F1 >= 0.90 target | Optional (v2) |
