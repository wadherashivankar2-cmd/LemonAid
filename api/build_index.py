#!/usr/bin/env python3
"""
Build dense retrieval index for Mr.Roast.
Encodes roast anchors and paraphrases with normalized MiniLM embeddings.
Produces:
  - data/index/roasts.json
  - data/index/anchor_vecs.npy
  - data/index/anchor_owner.npy
"""

import json
import os
import sys
from pathlib import Path
import numpy as np
from sentence_transformers import SentenceTransformer

DEFAULT_RETRIEVER = "sentence-transformers/all-MiniLM-L6-v2"


def build_index(retriever_path: str = DEFAULT_RETRIEVER):
    base_dir = Path(__file__).resolve().parent
    data_dir = base_dir / "data"
    index_dir = data_dir / "index"
    index_dir.mkdir(parents=True, exist_ok=True)

    # Determine roast bank file
    roast_file = data_dir / "roasts.json"
    if not roast_file.exists():
        dev_file = data_dir / "dev_roasts.json"
        if dev_file.exists():
            roast_file = dev_file
        else:
            raise FileNotFoundError(f"Neither roasts.json nor dev_roasts.json found in {data_dir}")

    print(f"Reading roast bank from: {roast_file}")
    with open(roast_file, "r", encoding="utf-8") as f:
        all_roasts = json.load(f)

    allow_draft = os.getenv("ALLOW_DRAFT", "0").lower() in ("1", "true", "yes")

    if allow_draft:
        print("NOTICE: ALLOW_DRAFT=1 enabled. Indexing both 'approved' and 'draft' roasts.")
        eligible_roasts = [r for r in all_roasts if r.get("status") in ("approved", "draft")]
    else:
        eligible_roasts = [r for r in all_roasts if r.get("status") == "approved"]
        if len(eligible_roasts) < 100:
            raise ValueError(
                f"Production build requires at least 100 approved roasts, but found {len(eligible_roasts)}. "
                "Set ALLOW_DRAFT=1 for development builds."
            )

    print(f"Total eligible roasts to index: {len(eligible_roasts)}")

    # Prepare anchors and track owners
    indexed_roasts = []
    anchor_texts = []
    anchor_owners = []  # Index of roast in indexed_roasts

    for idx, r in enumerate(eligible_roasts):
        indexed_roasts.append(r)
        # Combine anchors and paraphrases
        phrases = r.get("anchors", []) + r.get("paraphrases", [])
        for phrase in phrases:
            cleaned = phrase.strip()
            if cleaned:
                anchor_texts.append(cleaned)
                anchor_owners.append(idx)

    print(f"Total anchor & paraphrase phrases to embed: {len(anchor_texts)}")

    print(f"Loading retriever model: '{retriever_path}'...")
    embedder = SentenceTransformer(retriever_path)

    if anchor_texts:
        print("Computing normalized dense embeddings (float32)...")
        anchor_vecs = embedder.encode(
            anchor_texts,
            normalize_embeddings=True,
            show_progress_bar=True,
            convert_to_numpy=True
        ).astype(np.float32)
    else:
        print("Warning: No anchor phrases found! Creating empty vector array.")
        anchor_vecs = np.empty((0, 384), dtype=np.float32)

    anchor_owners_arr = np.array(anchor_owners, dtype=np.int32)

    # Save artifacts
    out_roasts = index_dir / "roasts.json"
    out_vecs = index_dir / "anchor_vecs.npy"
    out_owners = index_dir / "anchor_owner.npy"

    with open(out_roasts, "w", encoding="utf-8") as f:
        json.dump(indexed_roasts, f, indent=2)

    np.save(out_vecs, anchor_vecs)
    np.save(out_owners, anchor_owners_arr)

    print(f"\n--- Index Build Complete ---")
    print(f"Indexed roasts saved to: {out_roasts} ({len(indexed_roasts)} roasts)")
    print(f"Anchor vectors saved to: {out_vecs} (shape: {anchor_vecs.shape})")
    print(f"Anchor owners saved to:  {out_owners} (shape: {anchor_owners_arr.shape})")


if __name__ == "__main__":
    retriever = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_RETRIEVER
    build_index(retriever)
