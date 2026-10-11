# Testing Strategy & Evaluation Gates

## Automated Checks Suite (`make check` / script)

| Test Script | Target Metric / Pass Criteria | Description |
| :--- | :--- | :--- |
| `lint_roasts.py` | 100% schema compliance | Validates IDs, character limits, anchors count, slot symmetry, blocklist, and deduplication. |
| `safety_eval.py` | Recall >= 98%, False-Block <= 10% | Tests against 200-case safety benchmark (`sensitive` vs `fine`). |
| `eval.py` | Recall@3 >= 85%, Wrong-topic < 5% | Sweeps retrieval thresholds against benchmark inputs. |
| `repeat_test.py` | Zero repeats in 10 requests | Verifies recent-served queue anti-repetition mechanism. |
| `smoke_test.py` | 100% assertions pass | Verifies safe input, sensitive input, length limit, and rate limit burst. |
| `npm run lint` & `npm run build` | Zero errors/warnings | Next.js type check, ESLint, and production build verification. |

## Evaluation Datasets
- `safety_train.csv` / `safety_dev.csv`: Ground truth for crisis, grief, illness, violence vs normal entries.
- `intent_train.csv` / `intent_dev.csv`: Ground truth for brag, sad, and neutral sentiment.
- `test_inputs.csv`: Ground truth pairs linking colloquial inputs to valid roast IDs.

## Test Efficiency Protocol
- In development tasks, execute only the targeted test corresponding to modified code.
- Full suite is executed at Gate 1 (CP6) and pre-release verification (CP7).
