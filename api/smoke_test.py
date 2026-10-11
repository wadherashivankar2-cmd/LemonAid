#!/usr/bin/env python3
"""
API smoke test suite for Mr.Roast.
Verifies:
  1. GET /health
  2. POST /roast - safe bragging input
  3. POST /roast - crisis & self harm branch
  4. POST /roast - grief & sensitive branch
  5. POST /roast - input validation (under 3 chars, over 200 chars)
  6. POST /roast - rate limit burst (21 requests -> 429)
  7. POST /vote & GET /stats
"""

import sys
from pathlib import Path
from fastapi.testclient import TestClient

# Add api directory to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent))

from main import app, compute_sig


def run_smoke_tests():
    print("Initializing TestClient...")
    client = TestClient(app)

    # 1. Health check
    print("\n[1] Testing GET /health...")
    r = client.get("/health")
    assert r.status_code == 200, f"Expected 200, got {r.status_code}"
    assert r.json() == {"ok": True}, f"Unexpected response: {r.json()}"
    print("PASS: /health OK")

    # 2. Safe brag input
    print("\n[2] Testing POST /roast (safe bragging input)...")
    brag = "I got promoted to senior associate today"
    r = client.post("/roast", json={"happy_thought": brag})
    assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
    data = r.json()
    assert data["kind"] == "roast", f"Expected kind=='roast', got {data.get('kind')}"
    assert "text" in data and len(data["text"]) > 0
    assert "id" in data
    assert data["brag"] == brag
    # Verify HMAC signature
    expected_sig = compute_sig(brag, data["text"])
    assert data["sig"] == expected_sig, f"Signature mismatch: {data['sig']} vs {expected_sig}"
    print(f"PASS: Roast served [{data['id']}]: '{data['text']}'")

    # 3. Crisis self-harm input
    print("\n[3] Testing POST /roast (crisis self-harm branch)...")
    r = client.post("/roast", json={"happy_thought": "I want to kill myself and end my life"})
    assert r.status_code == 200
    data = r.json()
    assert data["kind"] == "gentle", f"Expected gentle response, got: {data}"
    assert "findahelpline.com" in data.get("crisis_url", ""), f"Missing crisis helpline: {data}"
    print("PASS: Crisis branch correctly triggered helpline referral")

    # 4. Sensitive grief input
    print("\n[4] Testing POST /roast (grief/sensitive branch)...")
    r = client.post("/roast", json={"happy_thought": "My grandmother passed away from cancer yesterday"})
    assert r.status_code == 200
    data = r.json()
    assert data["kind"] == "gentle", f"Expected gentle response, got: {data}"
    print(f"PASS: Sensitive input safely deferred to gentle reply: '{data['text']}'")

    # 5. Input length validations (422)
    print("\n[5] Testing input validations (<3 chars and >200 chars)...")
    r_short = client.post("/roast", json={"happy_thought": "ok"})
    assert r_short.status_code == 422, f"Expected 422 for short input, got {r_short.status_code}"

    r_long = client.post("/roast", json={"happy_thought": "a" * 201})
    assert r_long.status_code == 422, f"Expected 422 for long input, got {r_long.status_code}"
    print("PASS: Input length bounds validated (422 returned)")

    # 6. Vote & Stats
    print("\n[6] Testing POST /vote and GET /stats...")
    roast_id = "career-001"
    r_vote = client.post("/vote", json={"roast_id": roast_id, "kind": "funny"})
    assert r_vote.status_code == 200, f"Expected 200, got {r_vote.status_code}"
    vote_count = r_vote.json()["count"]
    assert vote_count >= 1

    r_stats = client.get(f"/stats/{roast_id}")
    assert r_stats.status_code == 200
    stats = r_stats.json()
    assert stats["funny"] >= 1
    assert "meh" in stats and "salt" in stats and "served" in stats
    print(f"PASS: Voting & stats functional (funny={stats['funny']})")

    r_vote_404 = client.post("/vote", json={"roast_id": "non-existent-id-999", "kind": "funny"})
    assert r_vote_404.status_code == 404, "Expected 404 for unknown roast ID"
    print("PASS: Unknown roast vote returns 404")

    # 7. Rate limit burst (20/min limit on /roast)
    print("\n[7] Testing rate limiting burst on /roast (20 limit)...")
    # Send rapid requests until hitting 429
    hit_429 = False
    for i in range(25):
        res = client.post(
            "/roast",
            json={"happy_thought": f"Burst request iteration number {i}"},
            headers={"X-Forwarded-For": "203.0.113.195"}  # Isolated IP
        )
        if res.status_code == 429:
            hit_429 = True
            assert res.json().get("detail") == "Slow down. Inner peace takes time."
            print(f"PASS: Hit rate limit 429 on request #{i+1} as expected")
            break

    assert hit_429, "Failed to trigger rate limit 429 after 25 rapid requests"

    print("\n==========================================")
    print("ALL API SMOKE TESTS PASSED SUCCESSFULLY!")
    print("==========================================")


if __name__ == "__main__":
    run_smoke_tests()
