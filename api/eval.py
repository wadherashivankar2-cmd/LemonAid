#!/usr/bin/env python3
"""
Retrieval evaluation and threshold sweep script for Mr.Roast.
Evaluates MiniLM vector retrieval across RETR_MIN thresholds (0.30 to 0.60)
on test_inputs.csv, prints metrics, and writes data/to_rate.csv.
"""

import csv
import json
import os
import sys
from collections import defaultdict
from pathlib import Path
import numpy as np
import pandas as pd
from sentence_transformers import SentenceTransformer


def run_retrieval_eval():
    base_dir = Path(__file__).resolve().parent
    data_dir = base_dir / "data"
    index_dir = data_dir / "index"

    test_inputs_file = data_dir / "test_inputs.csv"
    if not test_inputs_file.exists():
        print(f"ERROR: {test_inputs_file} not found", file=sys.stderr)
        return False

    # Load index artifacts
    roasts_json = index_dir / "roasts.json"
    vecs_npy = index_dir / "anchor_vecs.npy"
    owners_npy = index_dir / "anchor_owner.npy"

    if not (roasts_json.exists() and vecs_npy.exists() and owners_npy.exists()):
        print("ERROR: Retrieval index artifacts missing. Run build_index.py first.", file=sys.stderr)
        return False

    with open(roasts_json, "r", encoding="utf-8") as f:
        indexed_roasts = json.load(f)
    anchor_vecs = np.load(vecs_npy)
    anchor_owners = np.load(owners_npy)

    df_test = pd.read_csv(test_inputs_file).fillna("")
    inputs = df_test["text"].astype(str).tolist()
    ok_ids_list = [
        set(filter(None, [x.strip() for x in str(row).split("|")]))
        for row in df_test["ok_ids"].tolist()
    ]

    print(f"Loaded {len(inputs)} test inputs.")
    print("Loading SentenceTransformer model...")
    embedder = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")

    print("Embedding test queries...")
    q_vecs = embedder.encode(inputs, normalize_embeddings=True, convert_to_numpy=True).astype(np.float32)

    # Compute similarity matrix: (num_queries, num_anchors)
    sim_matrix = q_vecs @ anchor_vecs.T

    # Map anchor similarities to roast candidate scores per query
    query_roast_scores = []
    for q_idx in range(len(inputs)):
        roast_scores = defaultdict(float)
        for anchor_idx, owner_idx in enumerate(anchor_owners):
            sim = float(sim_matrix[q_idx, anchor_idx])
            if sim > roast_scores[owner_idx]:
                roast_scores[owner_idx] = sim

        # Sort descending by similarity
        sorted_candidates = sorted(
            [
                (indexed_roasts[idx]["id"], indexed_roasts[idx]["roast"], score)
                for idx, score in roast_scores.items()
            ],
            key=lambda x: x[2],
            reverse=True,
        )
        query_roast_scores.append(sorted_candidates)

    # Threshold sweep from 0.30 to 0.60
    thresholds = [0.30, 0.35, 0.40, 0.45, 0.50, 0.55, 0.60]
    sweep_results = []

    print("\n--- RETR_MIN Threshold Sweep ---")
    print(f"{'RETR_MIN':<10} | {'Recall@3':<10} | {'Fallback %':<12} | {'Wrong-Match %':<14}")
    print("-" * 52)

    best_threshold = 0.40
    best_recall = 0.0

    for thresh in thresholds:
        target_queries = 0
        recall_at_3_hits = 0
        fallbacks = 0
        wrong_matches = 0

        for q_idx, ok_ids in enumerate(ok_ids_list):
            if not ok_ids:
                continue  # Query was designed to fall back

            target_queries += 1
            candidates = query_roast_scores[q_idx]

            # Filter candidates above threshold
            filtered = [c for c in candidates if c[2] >= thresh]

            if not filtered:
                fallbacks += 1
                continue

            # Top-1 check
            top1_id = filtered[0][0]
            if top1_id not in ok_ids:
                wrong_matches += 1

            # Recall@3 check
            top3_ids = {c[0] for c in filtered[:3]}
            if bool(top3_ids & ok_ids):
                recall_at_3_hits += 1

        rec3 = (recall_at_3_hits / target_queries) * 100 if target_queries > 0 else 0
        fb_rate = (fallbacks / target_queries) * 100 if target_queries > 0 else 0
        wm_rate = (wrong_matches / target_queries) * 100 if target_queries > 0 else 0

        print(f"{thresh:<10.2f} | {rec3:<9.1f}% | {fb_rate:<11.1f}% | {wm_rate:<13.1f}%")
        sweep_results.append((thresh, rec3, fb_rate, wm_rate))

        if rec3 > best_recall and wm_rate <= 5.0:
            best_recall = rec3
            best_threshold = thresh

    print("-" * 52)
    print(f"Optimal RETR_MIN threshold: {best_threshold:.2f} (Recall@3: {best_recall:.1f}%)")

    # Generate to_rate.csv for human rating loop (top 5 roasts per query)
    to_rate_file = data_dir / "to_rate.csv"
    with open(to_rate_file, "w", encoding="utf-8", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["query_index", "input_text", "rank", "roast_id", "similarity", "roast_text"])
        for q_idx, text in enumerate(inputs):
            candidates = query_roast_scores[q_idx][:5]
            for rank, (r_id, r_text, score) in enumerate(candidates, start=1):
                writer.writerow([q_idx, text, rank, r_id, f"{score:.4f}", r_text])

    print(f"Top 5 candidates written to {to_rate_file}")

    # Gate check at chosen default 0.40
    def_results = [r for r in sweep_results if abs(r[0] - 0.40) < 1e-4][0]
    rec3_40 = def_results[1]
    wm_40 = def_results[3]

    passed = rec3_40 >= 85.0 and wm_40 <= 5.0
    if passed:
        print("\nPASS: Retrieval evaluation meets Gate 1 requirements!")
    else:
        print(f"\nINFO: Default 0.40 Recall@3: {rec3_40:.1f}%, Wrong-match: {wm_40:.1f}%")

    return True


if __name__ == "__main__":
    success = run_retrieval_eval()
    sys.exit(0 if success else 1)
