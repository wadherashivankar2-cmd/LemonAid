# API Specifications & Contracts

FastAPI service exposed on port 7860 (Hugging Face Docker Space).

## Endpoints

### 1. `POST /roast`
Evaluates a gratitude entry and returns either a roast or a compassionate gentle response.

- **Request Body**:
  ```json
  {
    "happy_thought": "I got promoted to senior associate today!"
  }
  ```
  - Validation: String, 3 <= length <= 200. Whitespace trimmed.

- **Successful Roast Response** (`200 OK`):
  ```json
  {
    "kind": "roast",
    "text": "Congratulations on the new title. Same salary, more meetings, and a Slack channel you cannot mute.",
    "id": "career-007",
    "category": "career",
    "brag": "I got promoted to senior associate today!",
    "sig": "3a8c7...32 hex characters"
  }
  ```

- **Gentle Response** (`200 OK` - Safety/Sad gate or crisis trigger):
  ```json
  {
    "kind": "gentle",
    "text": "Take care today. Some days are heavy, and that is okay.",
    "crisis_url": "https://findahelpline.com"
  }
  ```

- **Rate Limited** (`429 Too Many Requests`):
  ```json
  {
    "detail": "Slow down. Inner peace takes time."
  }
  ```

- **Validation Error** (`422 Unprocessable Entity`): standard Pydantic error.

---

### 2. `POST /vote`
Records anonymous user reaction to a served roast.

- **Request Body**:
  ```json
  {
    "roast_id": "career-007",
    "kind": "funny"
  }
  ```
  - `kind` enum: `"funny"`, `"meh"`, `"salt"`.
- **Response** (`200 OK`):
  ```json
  {
    "count": 42
  }
  ```
- **Error** (`404 Not Found` if roast ID is unknown).

---

### 3. `GET /stats/{roast_id}`
Returns public anonymous reaction counters for a specific roast.

- **Response** (`200 OK`):
  ```json
  {
    "funny": 120,
    "meh": 14,
    "salt": 3,
    "served": 137
  }
  ```

---

### 4. `GET /health`
Liveness and readiness probe for uptime monitors and frontend wake-up calls.

- **Response** (`200 OK`):
  ```json
  {
    "ok": true
  }
  ```
