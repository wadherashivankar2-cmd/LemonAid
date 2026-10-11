#!/usr/bin/env python3
"""
Repeat test verification script for Mr.Roast.
Simulates 100 consecutive requests to ensure the recent-served anti-repetition queue
guarantees that no roast repeats within a 10-request window.
"""

import os
import sys
from collections import deque
from pathlib import Path

# Disable rate limit for repeated test simulation
os.environ["DISABLE_RATE_LIMIT"] = "1"

from fastapi.testclient import TestClient

# Add api directory to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent))

from main import app, recent_served


def run_repeat_test():
    print("Initializing TestClient for 100-request repeat verification...")
    # Clear any previous server state
    recent_served.clear()
    client = TestClient(app)

    base_inputs = [
        "I got promoted to senior associate today",
        "Ran my first 5k this morning in the rain",
        "Had a wonderful first date at a coffee shop",
        "Finally saved 10k in my emergency fund",
        "Shipped my full stack web application today",
        "Baked my first sourdough loaf from scratch",
        "Arrived in Tokyo for a solo vacation",
        "Cleaned my whole apartment this morning",
        "Aced my linear algebra midterm exam",
        "Our team won first place in the hackathon",
        "Had dinner with my best childhood friends",
        "Benched 100 kg clean PR this morning",
        "Signed an offer letter for 20 LPA",
        "Celebrated one year anniversary with my partner",
        "Paid off my student loans completely",
    ]
    inputs = [base_inputs[i % len(base_inputs)] for i in range(100)]

    served_ids = []
    window = deque(maxlen=10)
    repeats_found = 0

    print("Executing 100 requests through /roast pipeline...")

    for i, thought in enumerate(inputs):
        res = client.post("/roast", json={"happy_thought": thought})
        data = res.json()
        assert data["kind"] == "roast", f"Expected roast, got: {data}"
        roast_id = data["id"]

        # Check if roast_id was served in the last 10 requests
        if roast_id in window:
            print(f"[REPEAT DETECTED] Roast '{roast_id}' repeated within {len(window)} requests at step {i}!")
            repeats_found += 1

        window.append(roast_id)
        served_ids.append(roast_id)

    print(f"\n--- Repeat Test Results ---")
    print(f"Total Requests: {len(inputs)}")
    print(f"Distinct Roasts Served: {len(set(served_ids))}")
    print(f"Window Collisions (<10 steps): {repeats_found}")

    if repeats_found == 0:
        print("\nPASS: Anti-repetition queue satisfied (zero repeats within 10 requests)!")
        return True
    else:
        print(f"\nFAIL: {repeats_found} repeats detected within 10-request window.", file=sys.stderr)
        return False


if __name__ == "__main__":
    success = run_repeat_test()
    sys.exit(0 if success else 1)
